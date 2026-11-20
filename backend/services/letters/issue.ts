import { createHash } from 'node:crypto';
import { DateTime } from 'luxon';
import type { Types } from 'mongoose';
import Letter, { type ILetter } from '../../models/Letter.model.js';
import LetterTemplate from '../../models/LetterTemplate.model.js';
import type { IAskField, LetterKind } from '../../models/LetterTemplate.model.js';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { IST_TIMEZONE } from '../../utils/timezone.js';
import type { LetterDoc } from '../../validators/letter.schemas.js';
import { fieldTypesFor, resolveAutoValues, type LetterEmployee } from './fields.js';
import { loadLetterhead } from './letterheads.js';
import { nextReferenceNo, previewReferenceNo } from './referenceNo.js';
import { renderLetterPdf } from './render.js';
import { assertResolvable, collectFieldKeys, resolveFields } from './resolve.js';

const isLetterKey = (key: string): boolean => key.startsWith('letter.');
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const STALE_ISSUE_MS = 2 * 60 * 1000;

/** Draft values: catalogue + recipient + ask defaults, then HR's overrides. `letter.*` is never stored; issue supplies it. */
export const buildDraftValues = ({
  kind,
  askFields,
  employee,
  company,
  letterhead,
  recipient,
  overrides,
}: {
  kind: LetterKind;
  askFields: IAskField[];
  employee?: LetterEmployee;
  company: { name: string; address?: string };
  letterhead: { signatory: { name: string; designation: string } };
  recipient?: { name: string; email?: string; address?: string };
  overrides: Record<string, string>;
}): Record<string, string> => {
  const auto = resolveAutoValues({ employee: kind === 'employee' ? employee : undefined, company, letterhead, letterDate: new Date() });
  const base: Record<string, string> = {
    ...Object.fromEntries(Object.entries(auto).filter(([key]) => !isLetterKey(key) && (kind === 'employee' || !key.startsWith('employee.')))),
    'recipient.name': recipient?.name ?? auto['employee.fullName'] ?? '',
    'recipient.email': recipient?.email ?? auto['employee.email'] ?? '',
    'recipient.address': recipient?.address ?? auto['employee.address'] ?? '',
    ...Object.fromEntries(askFields.map((f) => [`ask.${f.key}`, f.default ?? ''])),
  };
  const known = Object.entries(overrides).filter(([key]) => key in base);
  return { ...base, ...Object.fromEntries(known) };
};

export const withLetterValues = (values: Record<string, string>, prefix: string, at: Date, referenceNo?: string): Record<string, string> => ({
  ...values,
  'letter.date': DateTime.fromJSDate(at, { zone: IST_TIMEZONE }).toISODate() ?? '',
  'letter.referenceNo': referenceNo ?? previewReferenceNo(prefix, at),
});

/** The body HR edits for one letter: every field filled except `letter.*`, which only issue knows. */
export const wordingBody = (templateBody: LetterDoc, values: Record<string, string>, askFields: IAskField[]): LetterDoc => {
  const result = resolveFields(templateBody, values, fieldTypesFor(askFields), { keep: isLetterKey });
  assertResolvable(result);
  return result.doc;
};

export const assertWordingBody = (body: LetterDoc): void => {
  const stray = collectFieldKeys(body).filter((key) => !isLetterKey(key));
  if (stray.length) throw new ValidationError(`Edited wording may only keep letter.* fields, found: ${stray.join(', ')}`);
};

export const finalDoc = (body: LetterDoc, values: Record<string, string>, askFields: IAskField[]): LetterDoc => {
  const result = resolveFields(body, values, fieldTypesFor(askFields));
  assertResolvable(result);
  return result.doc;
};

export const assertIssuable = (letterhead: { configured: boolean }): void => {
  if (!letterhead.configured) throw new ValidationError('Set up this company’s letterhead (signatory and reference prefix) before issuing');
};

const loadTemplate = async (id: Types.ObjectId) => {
  const template = await LetterTemplate.findById(id).select('body askFields').lean();
  if (!template) throw new NotFoundError('The template for this letter no longer exists');
  return template;
};

/** PDF for the current draft, with the reference number shown as a placeholder. */
export const renderDraftPdf = async (letter: Pick<ILetter, 'template' | 'company' | 'values' | 'body'>): Promise<Buffer> => {
  const template = await loadTemplate(letter.template);
  const letterhead = await loadLetterhead(letter.company, { withPdf: true });
  const doc = finalDoc(letter.body ?? template.body, withLetterValues(letter.values, letterhead.referencePrefix, new Date()), template.askFields);
  return renderLetterPdf(doc, letterhead, { draft: true });
};

/**
 * Locks the draft, checks its values, assigns (or reuses) its reference number, renders and
 * stores the PDF. The number is taken only once the values resolve, and saved before rendering
 * so a failed render never leaves a gap; a lock
 * older than two minutes is treated as a crashed issue and taken over.
 */
export type LetterRecord = Omit<ILetter, 'pdf'>;

export const issueLetter = async (id: Types.ObjectId | string, userId: Types.ObjectId): Promise<LetterRecord> => {
  const locked = await Letter.findOneAndUpdate(
    { _id: id, $or: [{ status: 'draft' }, { status: 'issuing', updatedAt: { $lt: new Date(Date.now() - STALE_ISSUE_MS) } }] },
    { $set: { status: 'issuing' } },
    { new: true }
  ).lean();
  if (!locked) {
    if (!(await Letter.exists({ _id: id }))) throw new NotFoundError('Letter not found');
    throw new ConflictError('This letter is already issued or being issued');
  }

  try {
    const template = await loadTemplate(locked.template);
    const letterhead = await loadLetterhead(locked.company, { withPdf: true });
    assertIssuable(letterhead);
    const issuedAt = new Date();
    const body = locked.body ?? template.body;
    finalDoc(body, withLetterValues(locked.values, letterhead.referencePrefix, issuedAt), template.askFields);

    const referenceNo = locked.referenceNo ?? (await nextReferenceNo(locked.company, letterhead.referencePrefix, issuedAt));
    if (!locked.referenceNo) await Letter.updateOne({ _id: locked._id }, { $set: { referenceNo } });

    const doc = finalDoc(body, withLetterValues(locked.values, letterhead.referencePrefix, issuedAt, referenceNo), template.askFields);
    const pdf = await renderLetterPdf(doc, letterhead);
    if (pdf.length > MAX_PDF_BYTES) throw new ValidationError('Letter PDF is too large — use a smaller letterhead file');

    const issued = await Letter.findByIdAndUpdate(
      locked._id,
      { $set: { status: 'issued', body: doc, pdf, pdfSha256: createHash('sha256').update(pdf).digest('hex'), issuedAt, issuedBy: userId } },
      { new: true, projection: { pdf: 0 } }
    ).lean<LetterRecord>();
    return issued!;
  } catch (error) {
    await Letter.updateOne({ _id: locked._id, status: 'issuing' }, { $set: { status: 'draft' } });
    throw error;
  }
};
