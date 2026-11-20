import type { Response } from 'express';
import Company from '../models/Company.model.js';
import LetterTemplate from '../models/LetterTemplate.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { formatResponse } from '../utils/response.js';
import { getValidatedParams, getValidatedQuery } from '../middlewares/zodValidation.middleware.js';
import type { IAuthRequest } from '../types/index.js';
import type { CreateTemplateInput, ImportDocxInput, LetterIdParams, PreviewTemplateInput, TemplateListQuery, UpdateTemplateInput } from '../validators/letter.schemas.js';
import { AUTO_FIELDS, RECIPIENT_FIELDS, fieldLabelsFor, fieldTypesFor } from '../services/letters/fields.js';
import { loadLetterhead } from '../services/letters/letterheads.js';
import { renderLetterPdf } from '../services/letters/render.js';
import { assertResolvable, humanizeKey, resolveFields } from '../services/letters/resolve.js';
import { importWordLetter, sampleValues, templateFieldProblems } from '../services/letters/templates.js';
import { personValues } from '../services/letters/person.js';
import { sendPdf, singleUpload } from '../services/letters/upload.js';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const handleDocxUpload = singleUpload('docx', 10 * 1024 * 1024, (f) => f.mimetype === DOCX_MIME || f.originalname.toLowerCase().endsWith('.docx'), 'Word file');

const assertKnownFields = (kind: CreateTemplateInput['kind'], body: CreateTemplateInput['body'], askFields: CreateTemplateInput['askFields']): void => {
  const problems = templateFieldProblems(kind, body, askFields);
  if (problems.length) throw new ValidationError(`This template uses details it can’t fill: ${problems.map(humanizeKey).join(', ')}. Remove them from the text, or add them under “Details to fill in for each letter”.`);
};

const findCompany = async (id: string) => {
  const company = await Company.findById(id).select('name address').lean();
  if (!company) throw new NotFoundError('Company not found');
  return company;
};

export const getLetterFields = asyncHandler(async (_req: IAuthRequest, res: Response) => {
  res.json(formatResponse(true, 'Letter fields retrieved', { auto: AUTO_FIELDS, recipient: RECIPIENT_FIELDS }));
});

export const listTemplates = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { all } = getValidatedQuery<TemplateListQuery>(req);
  const templates = await LetterTemplate.find(all === '1' ? {} : { active: true }).select('-body').sort({ name: 1 }).lean();
  res.json(formatResponse(true, 'Templates retrieved', templates));
});

export const getTemplate = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  const template = await LetterTemplate.findById(id).lean();
  if (!template) throw new NotFoundError('Template not found');
  res.json(formatResponse(true, 'Template retrieved', template));
});

export const createTemplate = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const input = req.body as CreateTemplateInput;
  await findCompany(input.company);
  assertKnownFields(input.kind, input.body, input.askFields);
  const template = await LetterTemplate.create({ ...input, createdBy: req.user!._id, updatedBy: req.user!._id });
  res.status(201).json(formatResponse(true, 'Template created', template.toObject()));
});

export const updateTemplate = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  const input = req.body as UpdateTemplateInput;
  const template = await LetterTemplate.findById(id);
  if (!template) throw new NotFoundError('Template not found');
  if (input.company) await findCompany(input.company);

  assertKnownFields(template.kind, input.body ?? template.body, input.askFields ?? template.askFields);
  template.set({ ...input, updatedBy: req.user!._id });
  if (input.body) template.markModified('body');
  await template.save();
  res.json(formatResponse(true, 'Template saved', template.toObject()));
});

export const deactivateTemplate = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<LetterIdParams>(req);
  const template = await LetterTemplate.findByIdAndUpdate(id, { active: false, updatedBy: req.user!._id }, { new: true }).select('-body').lean();
  if (!template) throw new NotFoundError('Template not found');
  res.json(formatResponse(true, 'Template archived', template));
});

export const previewTemplate = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { kind, company: companyId, body, askFields } = req.body as PreviewTemplateInput;
  const company = await findCompany(companyId);
  assertKnownFields(kind, body, askFields);

  const letterhead = await loadLetterhead(companyId, { withPdf: true });
  const result = resolveFields(body, sampleValues(askFields, company, letterhead), fieldTypesFor(askFields));
  assertResolvable(result, fieldLabelsFor(askFields));
  sendPdf(res, await renderLetterPdf(result.doc, letterhead, { draft: true }), 'template-preview');
});

export const importDocx = asyncHandler(async (req: IAuthRequest, res: Response) => {
  if (!req.file) throw new ValidationError('Attach a .docx file');
  const { employee } = req.body as ImportDocxInput;
  const values = employee ? await personValues(employee) : undefined;
  res.json(formatResponse(true, 'Word file converted', await importWordLetter(req.file.buffer, values)));
});
