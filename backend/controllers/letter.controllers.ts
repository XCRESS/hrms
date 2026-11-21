import type { Response } from 'express';
import type { FilterQuery } from 'mongoose';
import Letter, { type ILetter } from '../models/Letter.model.js';
import LetterTemplate from '../models/LetterTemplate.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError, ValidationError } from '../utils/errors.js';
import EmailService from '../services/emailService.js';
import NotificationService from '../services/notificationService.js';
import { fieldTypesFor } from '../services/letters/fields.js';
import { fillTokens, letterEmailHtml, renderEmailText } from '../services/letters/email.js';
import { escapeRegExp, ownsEmployeeRecord } from '../utils/helpers.js';
import { formatResponse } from '../utils/response.js';
import { getValidatedParams, getValidatedQuery } from '../middlewares/zodValidation.middleware.js';
import type { IAuthRequest } from '../types/index.js';
import type { CreateLetterInput, LetterIdParams, LetterListQuery, SendLetterInput, UpdateLetterInput, VoidLetterInput } from '../validators/letter.schemas.js';
import { assertWordingBody, finalDoc, issueLetter, renderDraftPdf, withLetterValues, wordingBody } from '../services/letters/issue.js';
import { prepareLetter } from '../services/letters/prepare.js';
import { renderLetterPdf } from '../services/letters/render.js';
import { loadLetterhead } from '../services/letters/letterheads.js';
import { sendPdf, toBuffer } from '../services/letters/upload.js';

const LIST_PROJECTION = '-pdf -body -values';

const loadDraft = async (id: string) => {
  const letter = await Letter.findById(id);
  if (!letter) throw new NotFoundError('Letter not found');
  if (letter.status !== 'draft') throw new ConflictError('Only drafts can be changed');
  return letter;
};

const recipientFrom = (values: Record<string, string>): ILetter['recipient'] => ({
  name: values['recipient.name'] || 'Recipient',
  email: values['recipient.email'] || undefined,
  address: values['recipient.address'] || undefined,
});

export const listLetters = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { status, kind, employee, template, q, page, limit } = getValidatedQuery<LetterListQuery>(req);
  const filter: FilterQuery<ILetter> = {
    ...(status ? { status } : { status: { $ne: 'issuing' } }),
    ...(kind && { kind }),
    ...(employee && { employee }),
    ...(template && { template }),
  };
  if (q) {
    const pattern = new RegExp(escapeRegExp(q), 'i');
    filter.$or = [{ 'recipient.name': pattern }, { referenceNo: pattern }];
  }

  const [letters, total] = await Promise.all([
    Letter.find(filter).select(LIST_PROJECTION).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Letter.countDocuments(filter),
  ]);
  res.json(formatResponse(true, 'Letters retrieved', { letters, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }));
});

export const myLetters = asyncHandler(async (req: IAuthRequest, res: Response) => {
  if (!req.user?.employee) {
    res.json(formatResponse(true, 'Letters retrieved', []));
    return;
  }
  const letters = await Letter.find({ employee: req.user.employee, status: { $in: ['issued', 'sent'] } })
    .select('templateName referenceNo issuedAt status')
    .sort({ issuedAt: -1 })
    .lean();
  res.json(formatResponse(true, 'Letters retrieved', letters));
});

export const getLetter = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  const letter = await Letter.findById(id).select('-pdf').lean();
  if (!letter) throw new NotFoundError('Letter not found');
  res.json(formatResponse(true, 'Letter retrieved', letter));
});

export const createLetter = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const input = req.body as CreateLetterInput;
  const { template, employee, values, employeeCompanyMismatch } = await prepareLetter(input);

  const letter = await Letter.create({
    template: template._id,
    templateName: template.name,
    company: template.company,
    kind: template.kind,
    ...(employee && { employee: input.employee }),
    recipient: recipientFrom(values),
    values,
    createdBy: req.user!._id,
  });
  res.status(201).json(formatResponse(true, 'Draft created', { ...letter.toObject(), employeeCompanyMismatch }));
});

/** DRAFT-stamped PDF of a letter that hasn't been saved: HR Buddy previews without leaving drafts behind. */
export const previewUnsavedLetter = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { template, letterhead, values } = await prepareLetter(req.body as CreateLetterInput);
  const doc = finalDoc(template.body, withLetterValues(values, letterhead.referencePrefix, new Date()), template.askFields);
  sendPdf(res, await renderLetterPdf(doc, letterhead, { draft: true }), `draft ${values['recipient.name'] ?? 'letter'}`);
});

export const updateLetter = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  const { values, body } = req.body as UpdateLetterInput;
  const letter = await loadDraft(id);

  if (values) {
    const known = Object.entries(values).filter(([key]) => key in letter.values);
    const changed = known.some(([key, value]) => letter.values[key] !== value);
    letter.values = { ...letter.values, ...Object.fromEntries(known) };
    letter.recipient = recipientFrom(letter.values);
    if (changed && body === undefined) letter.body = null;
  }
  if (body !== undefined) {
    if (body) assertWordingBody(body);
    letter.body = body;
  }
  letter.markModified('values');
  letter.markModified('body');
  await letter.save();
  res.json(formatResponse(true, 'Draft saved', letter.toObject()));
});

export const getLetterWording = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  const letter = await loadDraft(id);
  if (letter.body) {
    res.json(formatResponse(true, 'Wording retrieved', letter.body));
    return;
  }
  const template = await LetterTemplate.findById(letter.template).select('body askFields').lean();
  if (!template) throw new NotFoundError('The template for this letter no longer exists');
  res.json(formatResponse(true, 'Wording retrieved', wordingBody(template.body, letter.values, template.askFields)));
});

export const previewLetter = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  const letter = await loadDraft(id);
  sendPdf(res, await renderDraftPdf(letter), `draft ${letter.recipient.name}`);
});

export const issue = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  res.json(formatResponse(true, 'Letter issued', await issueLetter(id, req.user!._id)));
});

export const voidLetter = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  const { reason } = req.body as VoidLetterInput;
  const letter = await Letter.findOneAndUpdate(
    { _id: id, status: { $in: ['issued', 'sent'] } },
    { $set: { status: 'void', voidReason: reason, voidedAt: new Date(), voidedBy: req.user!._id } },
    { new: true, projection: { pdf: 0 } }
  ).lean();
  if (!letter) throw new ConflictError('Only issued letters can be voided');
  res.json(formatResponse(true, 'Letter voided', letter));
});

export const deleteLetter = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  const letter = await Letter.findById(id).select('status kind').lean();
  if (!letter) throw new NotFoundError('Letter not found');

  const deletableVoid = letter.status === 'void' && letter.kind === 'manual';
  if (letter.status !== 'draft' && !deletableVoid) throw new ConflictError('Only drafts, or voided offer letters, can be deleted');
  if (deletableVoid && req.user?.role !== 'admin') throw new ForbiddenError('Only an admin can delete a voided offer letter');

  await Letter.deleteOne({ _id: id });
  res.json(formatResponse(true, 'Letter deleted'));
});

const senderConfigured = (): boolean => {
  const from = process.env.EMAIL_FROM ?? '';
  return Boolean(process.env.RESEND_API_KEY) && /@/.test(from) && !/@resend\.dev\b/i.test(from);
};

export const sendLetter = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  const { to: requestedTo } = req.body as SendLetterInput;
  if (!senderConfigured()) throw new ServiceUnavailableError('Email sender is not configured');

  const letter = await Letter.findById(id).select('+pdf').lean();
  if (!letter) throw new NotFoundError('Letter not found');
  if (!['issued', 'sent'].includes(letter.status) || !letter.pdf) throw new ConflictError('Issue the letter before sending it');

  const to = requestedTo ?? letter.recipient.email;
  if (!to) throw new ValidationError('Enter the email address to send this letter to');

  const template = await LetterTemplate.findById(letter.template).select('email askFields').lean();
  if (!template) throw new NotFoundError('The template for this letter no longer exists');
  const letterhead = await loadLetterhead(letter.company);
  const values = withLetterValues(letter.values, letterhead.referencePrefix, letter.issuedAt ?? new Date(), letter.referenceNo);
  const types = fieldTypesFor(template.askFields);

  const result = await EmailService.send(
    to,
    fillTokens(template.email.subject, values, types, { singleLine: true }),
    letterEmailHtml(renderEmailText(template.email.body, values, types)),
    {
      replyTo: req.user!.email,
      attachments: [{ filename: `${`${letter.referenceNo ?? ''} ${letter.recipient.name}`.replace(/[^\w .()-]+/g, '_').trim()}.pdf`, content: toBuffer(letter.pdf) }],
    }
  );

  const firstSend = letter.status === 'issued';
  const updated = await Letter.findByIdAndUpdate(
    letter._id,
    { $set: { status: 'sent' }, $push: { sends: { to, at: new Date(), by: req.user!._id, resendId: result.data?.id } } },
    { new: true, projection: { pdf: 0 } }
  ).lean();
  if (firstSend && letter.employee) {
    await NotificationService.notifyEmployee(letter.employee, 'letter_issued', { title: letter.templateName }, { email: false });
  }
  res.json(formatResponse(true, `Letter sent to ${to}`, updated));
});

export const getLetterPdf = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  const letter = await Letter.findById(id).select('+pdf employee status referenceNo recipient').lean();
  const isStaff = req.user?.role === 'admin' || req.user?.role === 'hr';
  const visible = letter && (isStaff || (ownsEmployeeRecord(req.user, letter.employee) && ['issued', 'sent'].includes(letter.status)));
  if (!letter || !visible || !letter.pdf) throw new NotFoundError('Letter not found');
  sendPdf(res, toBuffer(letter.pdf), `${letter.referenceNo ?? 'letter'} ${letter.recipient.name}`);
});
