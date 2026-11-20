/**
 * Checks for the letters feature. There is no test suite; this is it.
 *
 *   cd backend
 *   pnpm exec tsx scripts/verify-letters.ts             # pure checks (+ Gotenberg if GOTENBERG_URL is set)
 *   VERIFY_DB=1 pnpm exec tsx scripts/verify-letters.ts # also writes and deletes a scratch counter in MONGO_URL
 */

import 'dotenv/config';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument, PageSizes } from 'pdf-lib';
import mongoose, { Types } from 'mongoose';
import LetterCounter from '../models/LetterCounter.model.js';
import { counterKey, formatReferenceNo, nextReferenceNo } from '../services/letters/referenceNo.js';
import { renderLetterHtml, renderLetterPdf } from '../services/letters/render.js';
import { composeLetterPdf } from '../services/letters/pdf.js';
import { htmlToPdf } from '../services/letters/gotenberg.js';
import { ServiceUnavailableError } from '../utils/errors.js';
import { formatValue, salutationFor, type FormattedValue } from '../services/letters/format.js';
import { AUTO_FIELDS, RECIPIENT_FIELDS, fieldTypesFor, resolveAutoValues } from '../services/letters/fields.js';
import { letterDocSchema, letterheadBodySchema, type LetterDoc } from '../validators/letter.schemas.js';
import { letterheadPageSize } from '../services/letters/pdf.js';
import { createTemplateSchema } from '../validators/letter.schemas.js';
import { importWordLetter, sampleValues, templateFieldProblems } from '../services/letters/templates.js';
import { AlignmentType, Document, HeadingLevel, ImageRun, LevelFormat, Packer, PageBreak, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import { docxToDoc } from '../services/letters/docx.js';
import { detectFields } from '../services/letters/detect.js';
import { assertIssuable, assertWordingBody, buildDraftValues, finalDoc, withLetterValues, wordingBody } from '../services/letters/issue.js';
import { fillTokens, renderEmailText } from '../services/letters/email.js';
import { assertResolvable, collectFieldKeys, resolveFields } from '../services/letters/resolve.js';

let failed = 0;

const section = async (name: string, fn: () => unknown, skip?: string): Promise<void> => {
  if (skip) {
    console.log(`SKIP  ${name} (${skip})`);
    return;
  }
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL  ${name}`);
    console.log(error);
  }
};

await section(
  'gotenberg renders html',
  async () => {
    const pdf = await htmlToPdf({ html: '<!doctype html><html><body><p>Hello ₹</p></body></html>' });
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  },
  process.env.GOTENBERG_URL ? undefined : 'GOTENBERG_URL not set'
);

await section('gotenberg URL without a scheme fails fast as misconfigured', async () => {
  const saved = process.env.GOTENBERG_URL;
  process.env.GOTENBERG_URL = 'gotenberg-production.up.railway.app';
  const started = Date.now();
  try {
    await assert.rejects(htmlToPdf({ html: '<p>x</p>' }), (e: Error) => e instanceof ServiceUnavailableError && /GOTENBERG_URL/.test(e.message));
    assert.ok(Date.now() - started < 500, 'should not retry');
  } finally {
    if (saved === undefined) delete process.env.GOTENBERG_URL;
    else process.env.GOTENBERG_URL = saved;
  }
});

await section('gotenberg unreachable → ServiceUnavailableError', async () => {
  const saved = process.env.GOTENBERG_URL;
  process.env.GOTENBERG_URL = 'http://127.0.0.1:9';
  try {
    await assert.rejects(htmlToPdf({ html: '<p>x</p>' }, { retryBudgetMs: 1500 }), (e: Error) => e instanceof ServiceUnavailableError);
  } finally {
    if (saved === undefined) delete process.env.GOTENBERG_URL;
    else process.env.GOTENBERG_URL = saved;
  }
});

const t = (v: FormattedValue) => v.parts.map((p) => p.text).join('');

await section('formatValue', () => {
  assert.equal(t(formatValue('2025-07-01', 'date', 'long')), '1 July 2025');
  assert.deepEqual(formatValue('2025-07-01', 'date', 'ordinal').parts, [{ text: '1' }, { text: 'st', sup: true }, { text: ' July 2025' }]);
  assert.equal(t(formatValue('2025-07-22', 'date', 'ordinal')), '22nd July 2025');
  assert.equal(t(formatValue('2025-07-13', 'date', 'ordinal')), '13th July 2025');
  assert.equal(t(formatValue('2025-07-30', 'date', 'dotted')), '30.07.2025');
  assert.equal(t(formatValue('450000', 'money', 'inr')), '₹4,50,000');
  assert.equal(t(formatValue('450000', 'money', 'words')), 'Four Lakh Fifty Thousand Rupees Only');
  assert.equal(t(formatValue('beryl 13', 'text', 'upper')), 'BERYL 13');
  assert.equal(t(formatValue('2025-07-01', 'date')), '1 July 2025');
  assert.equal(t(formatValue('450000', 'money')), '₹4,50,000');
  assert.equal(t(formatValue('P-50\nSector 75', 'longText')), 'P-50\nSector 75');
  assert.throws(() => formatValue('1st July', 'date'));
  assert.throws(() => formatValue('4,50,000', 'money'));
});

await section('salutation and field catalogue', () => {
  assert.equal(salutationFor('male'), 'Mr.');
  assert.equal(salutationFor('female'), 'Ms.');
  assert.equal(salutationFor('other'), '');
  assert.ok(AUTO_FIELDS.some((f) => f.key === 'employee.code'));
  assert.deepEqual(RECIPIENT_FIELDS.map((f) => f.key), ['recipient.name', 'recipient.email', 'recipient.address']);
});

await section('resolveAutoValues', () => {
  const values = resolveAutoValues({
    employee: {
      firstName: 'Veshant', lastName: 'Singh Dahiya', gender: 'male', employeeId: 'CFG/CIAML/15FBD', position: 'Junior Web Developer',
      department: 'Tech', employmentType: 'fulltime', reportingSupervisor: 'Director', address: 'P-50, Sector 75',
      email: 'v@x.in', phone: '9999999999', joiningDate: new Date('2025-07-01T00:00:00+05:30'),
    },
    company: { name: 'COSMOS INVESTIFI ASSET MANAGEMENT LLP', address: 'Indore' },
    letterhead: { signatory: { name: 'Archana Sapra', designation: 'HR- HEAD' } },
    letterDate: new Date('2025-07-30T10:00:00+05:30'),
  });
  assert.equal(values['employee.salutation'], 'Mr.');
  assert.equal(values['employee.fullName'], 'Veshant Singh Dahiya');
  assert.equal(values['employee.code'], 'CFG/CIAML/15FBD');
  assert.equal(values['employee.joiningDate'], '2025-07-01');
  assert.equal(values['letter.date'], '2025-07-30');
  assert.equal(values['letter.referenceNo'], '');
  assert.equal(values['signatory.designation'], 'HR- HEAD');
  for (const f of AUTO_FIELDS) assert.ok(f.key in values, `no value for ${f.key}`);
});

const doc = { type: 'doc', content: [{ type: 'paragraph', content: [
  { type: 'text', text: 'Dear ' },
  { type: 'field', attrs: { key: 'employee.firstName' }, marks: [{ type: 'bold' }] },
  { type: 'text', text: ', from ' },
  { type: 'field', attrs: { key: 'employee.joiningDate', format: 'ordinal' } },
] }] };
const types = { 'employee.firstName': 'text', 'employee.joiningDate': 'date', 'employee.address': 'longText' } as const;
const para = (d: LetterDoc) => d.content![0]!.content!;

await section('resolveFields replaces chips with text, keeping marks', () => {
  const r = resolveFields(letterDocSchema.parse(doc), { 'employee.firstName': '<b>Ravi</b> & Co', 'employee.joiningDate': '2025-07-01' }, types);
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.unknown, []);
  assert.deepEqual(para(r.doc)[1], { type: 'text', text: '<b>Ravi</b> & Co', marks: [{ type: 'bold' }] });
  assert.deepEqual(para(r.doc).slice(3).map((n) => n.marks?.[0]?.type ?? null), [null, 'superscript', null]);
});

await section('resolveFields turns newlines into hard breaks', () => {
  const addr = resolveFields(letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'employee.address' } }] }] }), { 'employee.address': 'P-50\nSector 75' }, types);
  assert.deepEqual(para(addr.doc).map((n) => n.type), ['text', 'hardBreak', 'text']);
});

await section('resolveFields reports missing and unknown fields', () => {
  const miss = resolveFields(letterDocSchema.parse(doc), { 'employee.firstName': '  ', 'employee.joiningDate': '2025-07-01' }, types);
  assert.deepEqual(miss.missing, ['employee.firstName']);
  const unk = resolveFields(letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'employee.grade' } }] }] }), {}, types);
  assert.deepEqual(unk.unknown, ['employee.grade']);
  assert.throws(() => assertResolvable(miss), /Please fill in: First name/);
  assert.throws(() => assertResolvable(unk), /details that don’t exist: Grade/);
  assert.throws(() => resolveFields(letterDocSchema.parse(doc), { 'employee.firstName': 'A', 'employee.joiningDate': '1st July' }, types), /employee\.joiningDate/);
});

await section('resolveFields keeps chips matched by keep()', () => {
  const kept = resolveFields(letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'letter.referenceNo' } }, { type: 'field', attrs: { key: 'employee.firstName' } }] }] }), { 'employee.firstName': 'Ravi' }, { ...types, 'letter.referenceNo': 'text' }, { keep: (k) => k.startsWith('letter.') });
  assert.deepEqual(para(kept.doc).map((n) => n.type), ['field', 'text']);
  assert.deepEqual(kept.missing, []);
  assert.deepEqual(collectFieldKeys(kept.doc), ['letter.referenceNo']);
});

await section('letterDocSchema accepts real Tiptap output, rejects unsafe content', () => {
  const tiptapShaped = letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', attrs: { textAlign: null }, content: [{ type: 'text', text: 'x', marks: [{ type: 'textStyle', attrs: { color: 'rgb(68, 114, 196)', fontFamily: null } }, { type: 'link', attrs: { href: 'https://a.in', target: '_blank', rel: 'noopener', class: null } }] }] }, { type: 'orderedList', attrs: { start: 1, type: null }, content: [] }, { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: 'paragraph' }] }] }] }] });
  assert.equal(para(tiptapShaped)[0]!.marks![0]!.attrs!.color, 'rgb(68, 114, 196)');
  assert.throws(() => letterDocSchema.parse({ type: 'doc', content: [{ type: 'image', attrs: { src: 'x' } }] }));
  assert.throws(() => letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }] }));
  assert.throws(() => letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'textStyle', attrs: { color: 'red;background:url(x)' } }] }] }] }));
  assert.throws(() => letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'bad key' } }] }] }));
  assert.equal(fieldTypesFor([{ key: 'grade', type: 'text' }])['ask.grade'], 'text');
});

const layout = { marginsMm: { top: 45, right: 20, bottom: 30, left: 20 } };

await section('renderLetterHtml escapes values and prints superscript', () => {
  const resolved = resolveFields(letterDocSchema.parse(doc), { 'employee.firstName': '<script>x</script>', 'employee.joiningDate': '2025-07-01' }, types).doc;
  const html = renderLetterHtml(resolved, layout);
  assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('<sup>st</sup>'));
  assert.ok(html.includes('size: A4'));
  assert.ok(html.includes('margin: 45mm 20mm 30mm 20mm'));
  assert.ok(!/(html|body)\s*\{[^}]*background/.test(html));
  assert.throws(() => renderLetterHtml(letterDocSchema.parse(doc), layout), /unresolved field/i);
});

await section('renderLetterHtml renders page breaks, alignment, colour and line breaks', () => {
  const html = renderLetterHtml(letterDocSchema.parse({ type: 'doc', content: [
    { type: 'paragraph', attrs: { textAlign: 'justify' }, content: [{ type: 'text', text: 'COSMOS', marks: [{ type: 'textStyle', attrs: { color: '#4472C4' } }] }, { type: 'hardBreak' }, { type: 'text', text: 'B' }] },
    { type: 'pageBreak' },
    { type: 'paragraph', content: [{ type: 'text', text: 'after' }] },
  ] }), layout);
  assert.ok(html.includes('class="page-break"'));
  assert.ok(/text-align:\s*justify/.test(html));
  assert.ok(/color:\s*#4472C4/i.test(html));
  assert.ok(html.includes('<br'));
});

const blankPdf = async (pages: number, label?: string): Promise<Buffer> => {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = pdf.addPage(PageSizes.A4);
    if (label) page.drawText(`${label} ${i + 1}`, { x: 50, y: 700, size: 12 });
  }
  return Buffer.from(await pdf.save());
};

await section('composeLetterPdf puts the letterhead under every page', async () => {
  const out = await PDFDocument.load(await composeLetterPdf(await blankPdf(3, 'content'), { letterhead: await blankPdf(1, 'letterhead') }));
  assert.equal(out.getPageCount(), 3);
  const { width, height } = out.getPage(0).getSize();
  assert.ok(Math.abs(width - PageSizes.A4[0]) < 1 && Math.abs(height - PageSizes.A4[1]) < 1);
});

await section('composeLetterPdf without letterhead or stamp keeps the pages', async () => {
  const out = await PDFDocument.load(await composeLetterPdf(await blankPdf(2, 'content'), { draft: true }));
  assert.equal(out.getPageCount(), 2);
});

await section(
  'renderLetterPdf produces a PDF through Gotenberg',
  async () => {
    const resolved = resolveFields(letterDocSchema.parse(doc), { 'employee.firstName': 'Ravi', 'employee.joiningDate': '2025-07-01' }, types).doc;
    const pdf = await renderLetterPdf(resolved, { ...layout, pdf: await blankPdf(1, 'letterhead') }, { draft: true });
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    writeFileSync(join(tmpdir(), 'hrms-letter-check.pdf'), pdf);
  },
  process.env.GOTENBERG_URL ? undefined : 'GOTENBERG_URL not set'
);

await section('reference number format and IST year', () => {
  assert.equal(formatReferenceNo('CFG/HR', 2026, 42), 'CFG/HR/2026/0042');
  assert.equal(formatReferenceNo('CFG/HR', 2026, 12345), 'CFG/HR/2026/12345');
  const company = new Types.ObjectId('64b7f0c2a1b2c3d4e5f60718');
  assert.equal(counterKey(company, new Date('2026-12-31T19:00:00Z')), '64b7f0c2a1b2c3d4e5f60718:2027');
  assert.equal(counterKey(company, new Date('2026-12-31T18:00:00Z')), '64b7f0c2a1b2c3d4e5f60718:2026');
});

await section('letterhead PDF must be one A4 or US Letter page', async () => {
  assert.equal(await letterheadPageSize(await blankPdf(1, 'lh')), 'A4');
  const letter = await PDFDocument.create();
  letter.addPage(PageSizes.Letter).drawText('lh', { x: 50, y: 700 });
  assert.equal(await letterheadPageSize(Buffer.from(await letter.save())), 'Letter');
  await assert.rejects(letterheadPageSize(await blankPdf(2, 'lh')), /single A4 or US Letter page/);
  const a5 = await PDFDocument.create();
  a5.addPage(PageSizes.A5).drawText('lh', { x: 50, y: 300 });
  await assert.rejects(letterheadPageSize(Buffer.from(await a5.save())), /single A4 or US Letter page/);
  await assert.rejects(letterheadPageSize(Buffer.from('not a pdf')), /not a readable PDF/);
});

await section('renderLetterHtml uses the letterhead page size', () => {
  const plain = letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }] });
  assert.ok(renderLetterHtml(plain, { ...layout, pageSize: 'Letter' }).includes('size: letter'));
  assert.ok(renderLetterHtml(plain, layout).includes('size: A4'));
});

await section('letterhead body schema parses the multipart data field', () => {
  const ok = letterheadBodySchema.parse({ data: JSON.stringify({ marginsMm: { top: 45, right: 20, bottom: 30, left: 20 }, signatory: { name: 'Archana Sapra', designation: 'HR- HEAD' }, referencePrefix: 'CFG/HR' }) });
  assert.equal(ok.data.referencePrefix, 'CFG/HR');
  assert.throws(() => letterheadBodySchema.parse({ data: '{bad json' }));
  assert.throws(() => letterheadBodySchema.parse({ data: JSON.stringify({ marginsMm: { top: 200, right: 20, bottom: 30, left: 20 }, signatory: { name: 'A', designation: 'B' }, referencePrefix: 'cfg hr' }) }));
});

const chip = (key: string) => ({ type: 'paragraph', content: [{ type: 'field', attrs: { key } }] });
const docWith = (...keys: string[]) => letterDocSchema.parse({ type: 'doc', content: keys.map(chip) });

await section('templateFieldProblems checks keys against the template kind', () => {
  const ask = [{ key: 'grade', label: 'Grade', type: 'text' as const, required: true }];
  assert.deepEqual(templateFieldProblems('employee', docWith('employee.firstName', 'ask.grade', 'letter.referenceNo'), ask), []);
  assert.deepEqual(templateFieldProblems('employee', docWith('employee.salary', 'ask.city'), ask), ['employee.salary', 'ask.city']);
  assert.deepEqual(templateFieldProblems('manual', docWith('recipient.name', 'company.name', 'signatory.name'), []), []);
  assert.deepEqual(templateFieldProblems('manual', docWith('employee.firstName'), []), ['employee.firstName']);
});

await section('createTemplateSchema rejects duplicate ask keys', () => {
  const base = { name: 'Offer', kind: 'manual', company: '64b7f0c2a1b2c3d4e5f60718', body: { type: 'doc', content: [] }, email: { subject: 'Offer', body: 'Hi' } };
  assert.ok(createTemplateSchema.safeParse({ ...base, askFields: [] }).success);
  const dup = { key: 'grade', label: 'Grade', type: 'text', required: true };
  assert.equal(createTemplateSchema.safeParse({ ...base, askFields: [dup, dup] }).success, false);
});

await section('sampleValues fills every key a preview needs', () => {
  const ask = [{ key: 'grade', label: 'Grade', type: 'text' as const, required: true }, { key: 'probation', label: 'Probation', type: 'text' as const, required: false, default: '3 months' }, { key: 'start', label: 'Start', type: 'date' as const, required: true }];
  const values = sampleValues(ask, { name: 'ACME LLP' }, { signatory: { name: 'S', designation: 'D' }, referencePrefix: 'AC/HR' });
  assert.equal(values['ask.grade'], '[Grade]');
  assert.equal(values['ask.probation'], '3 months');
  assert.match(values['ask.start']!, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(values['letter.referenceNo']!, /^AC\/HR\/\d{4}\/____$/);
  assert.equal(values['employee.firstName'], 'Asha');
  assert.equal(values['recipient.name'], 'Asha Verma');
});

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

await section('docxToDoc leaves pictures out and says so', async () => {
  const file = await Packer.toBuffer(new Document({ sections: [{ children: [
    new Paragraph({ children: [new TextRun({ text: 'Bold', bold: true }), new ImageRun({ type: 'png', data: png, transformation: { width: 10, height: 10 } })] }),
  ] }] }));
  const { doc, warnings } = await docxToDoc(file);
  assert.deepEqual(doc.content![0]!.content, [{ type: 'text', text: 'Bold', marks: [{ type: 'bold' }] }]);
  assert.match(warnings[0]!, /1 picture/);
});

await section('importWordLetter turns a letter written for someone into a template', async () => {
  const file = await Packer.toBuffer(new Document({ sections: [{ children: [
    new Paragraph({ children: [new TextRun({ text: 'Mr. Veshant Singh Dahiya', bold: true })] }),
    new Paragraph({ children: [new TextRun('Dear Veshant, your grade is BERYL 13.')] }),
  ] }] }));
  const result = await importWordLetter(file, { 'employee.salutation': 'Mr.', 'employee.fullName': 'Veshant Singh Dahiya', 'employee.firstName': 'Veshant' });
  assert.deepEqual(result.found, [
    { key: 'employee.salutation', label: 'Salutation (Mr./Ms.)', count: 1 },
    { key: 'employee.fullName', label: 'Full name', count: 1 },
    { key: 'employee.firstName', label: 'First name', count: 1 },
  ]);
  assert.ok(JSON.stringify(result.doc).includes('BERYL 13'));
  const plain = await importWordLetter(file);
  assert.deepEqual(plain.found, []);
});

const lh = { signatory: { name: 'Archana Sapra', designation: 'HR- HEAD' }, referencePrefix: 'CFG/HR', marginsMm: layout.marginsMm };
const askFields = [{ key: 'grade', label: 'Grade', type: 'text' as const, required: true }, { key: 'probation', label: 'Probation', type: 'text' as const, required: false, default: '3 months' }];
const employee = {
  firstName: 'Veshant', lastName: 'Singh Dahiya', gender: 'male' as const, employeeId: 'CFG/CIAML/15FBD', position: 'Junior Web Developer',
  department: 'Tech', employmentType: 'fulltime', reportingSupervisor: 'Director', address: 'P-50, Sector 75', email: 'v@x.in', phone: '9999999999',
  joiningDate: new Date('2025-07-01T00:00:00+05:30'),
};

await section('buildDraftValues: employee letter', () => {
  const values = buildDraftValues({ kind: 'employee', askFields, employee, company: { name: 'COSMOS LLP' }, letterhead: lh, overrides: { 'ask.grade': 'BERYL 13', 'employee.address': 'P-50\nSector 75', 'letter.date': '1999-01-01', 'bogus.key': 'x' } });
  assert.equal(values['employee.code'], 'CFG/CIAML/15FBD');
  assert.equal(values['employee.address'], 'P-50\nSector 75');
  assert.equal(values['ask.grade'], 'BERYL 13');
  assert.equal(values['ask.probation'], '3 months');
  assert.equal(values['recipient.name'], 'Veshant Singh Dahiya');
  assert.equal(values['recipient.email'], 'v@x.in');
  assert.ok(!('letter.date' in values) && !('letter.referenceNo' in values) && !('bogus.key' in values));
});

await section('buildDraftValues: manual letter uses the recipient', () => {
  const values = buildDraftValues({ kind: 'manual', askFields: [], company: { name: 'COSMOS LLP' }, letterhead: lh, recipient: { name: 'Riya Sen', email: 'riya@x.in', address: 'Pune' }, overrides: {} });
  assert.equal(values['recipient.name'], 'Riya Sen');
  assert.equal(values['employee.firstName'], undefined);
  assert.equal(values['signatory.name'], 'Archana Sapra');
});

const letterBody = letterDocSchema.parse({ type: 'doc', content: [chip('letter.referenceNo'), chip('employee.firstName'), chip('ask.grade')] });

await section('wordingBody keeps letter.* chips and requires other values', () => {
  const values = buildDraftValues({ kind: 'employee', askFields, employee, company: { name: 'C' }, letterhead: lh, overrides: { 'ask.grade': 'BERYL 13' } });
  const wording = wordingBody(letterBody, values, askFields);
  assert.deepEqual(collectFieldKeys(wording), ['letter.referenceNo']);
  assert.throws(() => wordingBody(letterBody, { ...values, 'ask.grade': '' }, askFields), /Please fill in: Grade/);
});

await section('finalDoc resolves letter.* at issue time', () => {
  const values = buildDraftValues({ kind: 'employee', askFields, employee, company: { name: 'C' }, letterhead: lh, overrides: { 'ask.grade': 'BERYL 13' } });
  const at = new Date('2026-11-20T10:00:00+05:30');
  const issued = finalDoc(letterBody, withLetterValues(values, lh.referencePrefix, at, 'CFG/HR/2026/0007'), askFields);
  assert.deepEqual(collectFieldKeys(issued), []);
  assert.equal((issued.content![0]!.content![0] as { text: string }).text, 'CFG/HR/2026/0007');
  const preview = finalDoc(letterBody, withLetterValues(values, lh.referencePrefix, at), askFields);
  assert.equal((preview.content![0]!.content![0] as { text: string }).text, 'CFG/HR/2026/____');
});

await section('assertWordingBody allows only letter.* chips', () => {
  assertWordingBody(letterDocSchema.parse({ type: 'doc', content: [chip('letter.date')] }));
  assert.throws(() => assertWordingBody(letterDocSchema.parse({ type: 'doc', content: [chip('employee.firstName')] })), /letter\.\*/);
});

await section('email tokens: plain subject, escaped body, formatted values', () => {
  const values = { 'recipient.name': '<i>A</i> & Co', 'employee.joiningDate': '2025-07-01' };
  const emailTypes = { 'recipient.name': 'text', 'employee.joiningDate': 'date' } as const;
  assert.equal(fillTokens('Offer for {{recipient.name}}', values, emailTypes), 'Offer for <i>A</i> & Co');
  assert.equal(renderEmailText('Hi {{recipient.name}}', values, emailTypes), 'Hi &lt;i&gt;A&lt;/i&gt; &amp; Co');
  assert.equal(renderEmailText('Joining {{employee.joiningDate}}, {{nope.key}}!', values, emailTypes), 'Joining 1 July 2025, !');
  assert.equal(renderEmailText('a\nb <b>', {}, {}), 'a<br>b &lt;b&gt;');
});

await section('issuing requires a configured letterhead; previews still work without one', () => {
  assert.throws(() => assertIssuable({ configured: false }), /letterhead/i);
  assertIssuable({ configured: true });
  const values = sampleValues([], { name: 'ACME' }, { signatory: { name: '', designation: '' }, referencePrefix: 'HR' });
  assert.equal(values['signatory.name'], '[Signatory]');
  const draft = buildDraftValues({ kind: 'manual', askFields: [], company: { name: 'ACME' }, letterhead: { signatory: { name: '', designation: '' } }, recipient: { name: 'R', email: 'r@x.in' }, overrides: {} });
  assert.equal(draft['signatory.name'], '');
});

await section('email subject stays on one line', () => {
  assert.equal(fillTokens('Offer for {{recipient.address}}', { 'recipient.address': 'P-50\nSector 75' }, { 'recipient.address': 'longText' }, { singleLine: true }), 'Offer for P-50 Sector 75');
});

await section('letterDocSchema allows size, line spacing, highlight, indent and rules', () => {
  const ok = letterDocSchema.parse({ type: 'doc', content: [
    { type: 'paragraph', attrs: { indent: 2 }, content: [{ type: 'text', text: 'x', marks: [{ type: 'textStyle', attrs: { fontSize: '14pt', lineHeight: '1.5', backgroundColor: '#FFFF00' } }] }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'y', marks: [{ type: 'textStyle', attrs: { fontSize: '14.6667px' } }] }] },
    { type: 'horizontalRule' },
  ] });
  assert.equal(ok.content![0]!.attrs!.indent, 2);
  letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'textStyle', attrs: { color: 'red', backgroundColor: 'yellow' } }] }] }] });
  assert.throws(() => letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'textStyle', attrs: { fontSize: 'calc(1px)' } }] }] }] }));
  assert.throws(() => letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', attrs: { indent: 40 } }] }));
});

await section('renderLetterHtml prints size, highlight, indent and rules', () => {
  const html = renderLetterHtml(letterDocSchema.parse({ type: 'doc', content: [
    { type: 'paragraph', attrs: { indent: 1 }, content: [{ type: 'text', text: 'x', marks: [{ type: 'textStyle', attrs: { fontSize: '14pt', backgroundColor: '#FFFF00' } }] }] },
    { type: 'horizontalRule' },
  ] }), layout);
  assert.match(html, /font-size:\s*14pt/);
  assert.match(html, /background-color:\s*#FFFF00/i);
  assert.match(html, /margin-left:\s*1\.27cm/);
  assert.ok(html.includes('<hr'));
});

const sampleDocx = async (): Promise<Buffer> =>
  Packer.toBuffer(new Document({
    numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT }] }] },
    sections: [{ children: [
      new Paragraph({ text: 'Appointment', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [
        new TextRun({ text: '1. ' }),
        new TextRun({ text: 'Appointment', bold: true, underline: {} }),
        new TextRun({ text: ': with effect from 1' }),
        new TextRun({ text: 'st', superScript: true }),
        new TextRun({ text: ' July 2025 for ' }),
        new TextRun({ text: '“COSMOS”', bold: true, color: '4472C4', size: 28 }),
      ] }),
      new Paragraph({ children: [] }),
      new Paragraph({ text: 'First point', numbering: { reference: 'dots', level: 0 } }),
      new Paragraph({ text: 'Second point', numbering: { reference: 'dots', level: 0 } }),
      new Table({ rows: [
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Basic')] }), new TableCell({ children: [new Paragraph('10000')] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('HRA')] }), new TableCell({ children: [new Paragraph('5000')] })] }),
      ] }),
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('Agreed and Accepted')] }),
    ] }],
  }));

await section('docxToDoc keeps alignment, underline, colour, size, superscript, lists, tables and page breaks', async () => {
  const { doc } = await docxToDoc(await sampleDocx());
  letterDocSchema.parse(doc);
  const blocks = doc.content!;
  assert.equal(blocks[0]!.type, 'heading');
  assert.equal(blocks[0]!.attrs!.level, 1);
  const clause = blocks[1]!;
  assert.equal(clause.attrs!.textAlign, 'justify');
  const runs = clause.content!;
  const heading = runs.find((n) => n.text === 'Appointment')!;
  assert.deepEqual(heading.marks!.map((m) => m.type).sort(), ['bold', 'underline']);
  assert.ok(runs.find((n) => n.text === 'st')!.marks!.some((m) => m.type === 'superscript'));
  const cosmos = runs.find((n) => n.text === '“COSMOS”')!;
  const style = cosmos.marks!.find((m) => m.type === 'textStyle')!.attrs!;
  assert.equal(style.color, '#4472C4');
  assert.equal(style.fontSize, '14pt');
  assert.equal(blocks[2]!.type, 'paragraph');
  assert.equal(blocks[2]!.content, undefined);
  const list = blocks.find((b) => b.type === 'bulletList')!;
  assert.equal(list.content!.length, 2);
  const table = blocks.find((b) => b.type === 'table')!;
  assert.equal(table.content!.length, 2);
  assert.equal(table.content![0]!.content![1]!.content![0]!.content![0]!.text, '10000');
  const breakAt = blocks.findIndex((b) => b.type === 'pageBreak');
  assert.ok(breakAt > 0);
  assert.equal(blocks[breakAt + 1]!.attrs!.textAlign, 'center');
});

await section('docxToDoc rejects files that are not Word documents', async () => {
  await assert.rejects(docxToDoc(Buffer.from('not a zip')), /Word \(\.docx\)/);
});

const block = (...content: object[]) => ({ type: "paragraph", content });
const tx = (text: string, marks?: object[]) => ({ type: 'text', text, ...(marks ? { marks } : {}) });

await section('detectFields turns a real person’s details into fields', () => {
  const doc = letterDocSchema.parse({ type: 'doc', content: [
    block(tx('Mr. Veshant Singh Dahiya', [{ type: 'bold' }])),
    block(tx('E. Code- '), tx('CFG/CIAML/15FBD', [{ type: 'bold' }])),
    block(tx('Dear Veshant,')),
    block(tx('with effect from 1'), tx('st', [{ type: 'superscript' }]), tx(' July 2025. Veshantx stays.')),
    block(tx('Joined 01.07.2025 as Junior Web Developer.')),
  ] });
  const values = { 'employee.salutation': 'Mr.', 'employee.fullName': 'Veshant Singh Dahiya', 'employee.firstName': 'Veshant', 'employee.code': 'CFG/CIAML/15FBD', 'employee.joiningDate': '2025-07-01', 'employee.position': 'Junior Web Developer', 'company.name': 'NOT IN TEXT' };
  const typesFor = { 'employee.salutation': 'text', 'employee.fullName': 'text', 'employee.firstName': 'text', 'employee.code': 'text', 'employee.joiningDate': 'date', 'employee.position': 'text', 'company.name': 'text' } as const;
  const { doc: out, found } = detectFields(doc, values, typesFor);
  letterDocSchema.parse(out);
  const p0 = out.content![0]!.content!;
  assert.deepEqual(p0.map((n) => (n.type === 'field' ? n.attrs!.key : n.text)), ['employee.salutation', ' ', 'employee.fullName']);
  assert.deepEqual(p0[2]!.marks, [{ type: 'bold' }]);
  assert.equal(out.content![1]!.content![1]!.attrs!.key, 'employee.code');
  assert.deepEqual(out.content![2]!.content!.map((n) => (n.type === 'field' ? n.attrs!.key : n.text)), ['Dear ', 'employee.firstName', ',']);
  const p3 = out.content![3]!.content!;
  const date = p3.find((n) => n.type === 'field')!;
  assert.equal(date.attrs!.key, 'employee.joiningDate');
  assert.equal(date.attrs!.format, 'ordinal');
  assert.ok(p3.some((n) => n.text?.includes('Veshantx stays')));
  const p4 = out.content![4]!.content!;
  assert.deepEqual(p4.filter((n) => n.type === 'field').map((n) => [n.attrs!.key, n.attrs!.format ?? null]), [['employee.joiningDate', 'dotted'], ['employee.position', null]]);
  assert.deepEqual(found, { 'employee.salutation': 1, 'employee.fullName': 1, 'employee.code': 1, 'employee.firstName': 1, 'employee.joiningDate': 2, 'employee.position': 1 });
});

await section(
  'nextReferenceNo is unique under concurrency',
  async () => {
    await mongoose.connect(process.env.MONGO_URL!);
    const company = new Types.ObjectId();
    const at = new Date();
    try {
      const refs = await Promise.all(Array.from({ length: 20 }, () => nextReferenceNo(company, 'TEST', at)));
      assert.equal(new Set(refs).size, 20);
      const year = counterKey(company, at).split(':')[1];
      assert.deepEqual([...refs].sort(), Array.from({ length: 20 }, (_, i) => formatReferenceNo('TEST', Number(year), i + 1)));
    } finally {
      await LetterCounter.deleteOne({ _id: counterKey(company, at) });
      await mongoose.disconnect();
    }
  },
  process.env.VERIFY_DB ? undefined : 'VERIFY_DB not set'
);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
