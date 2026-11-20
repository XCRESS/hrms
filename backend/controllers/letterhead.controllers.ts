import type { Response } from 'express';
import Company from '../models/Company.model.js';
import Letterhead from '../models/Letterhead.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { formatResponse } from '../utils/response.js';
import { getValidatedParams } from '../middlewares/zodValidation.middleware.js';
import type { IAuthRequest } from '../types/index.js';
import type { CompanyParams, LetterheadBody } from '../validators/letter.schemas.js';
import { letterheadPageSize } from '../services/letters/pdf.js';
import { renderLetterPdf } from '../services/letters/render.js';
import { LETTERHEAD_SAMPLE } from '../services/letters/samples.js';
import { sendPdf, singleUpload, toBuffer } from '../services/letters/upload.js';

export const handleLetterheadUpload = singleUpload('pdf', 2 * 1024 * 1024, (f) => f.mimetype === 'application/pdf', 'Letterhead PDF');

const LETTERHEAD_FIELDS = 'company marginsMm signatory referencePrefix pdfSize pageSize updatedAt';

export const listLetterheads = asyncHandler(async (_req: IAuthRequest, res: Response) => {
  const letterheads = await Letterhead.find().select(LETTERHEAD_FIELDS).lean();
  res.json(formatResponse(true, 'Letterheads retrieved', letterheads.map((l) => ({ ...l, hasPdf: Boolean(l.pdfSize) }))));
});

export const getLetterhead = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { companyId } = getValidatedParams<CompanyParams>(req);
  const letterhead = await Letterhead.findOne({ company: companyId }).select(LETTERHEAD_FIELDS).lean();
  res.json(formatResponse(true, 'Letterhead retrieved', letterhead ? { ...letterhead, hasPdf: Boolean(letterhead.pdfSize) } : null));
});

export const saveLetterhead = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { companyId } = getValidatedParams<CompanyParams>(req);
  const { data } = req.body as LetterheadBody;
  if (!(await Company.exists({ _id: companyId }))) throw new NotFoundError('Company not found');

  const file = req.file?.buffer;
  const pageSize = file ? await letterheadPageSize(file) : undefined;

  const letterhead = await Letterhead.findOneAndUpdate(
    { company: companyId },
    { $set: { ...data, updatedBy: req.user!._id, ...(file ? { pdf: file, pdfSize: file.length, pageSize } : {}) } },
    { upsert: true, new: true, runValidators: true, projection: LETTERHEAD_FIELDS }
  ).lean();
  res.json(formatResponse(true, 'Letterhead saved', { ...letterhead, hasPdf: Boolean(letterhead?.pdfSize) }));
});

export const previewLetterhead = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { companyId } = getValidatedParams<CompanyParams>(req);
  const letterhead = await Letterhead.findOne({ company: companyId }).select('+pdf marginsMm pageSize').lean();
  if (!letterhead) throw new NotFoundError('Set up this company’s letterhead first');

  const pdf = await renderLetterPdf(LETTERHEAD_SAMPLE, { marginsMm: letterhead.marginsMm, pageSize: letterhead.pageSize ?? 'A4', pdf: letterhead.pdf ? toBuffer(letterhead.pdf) : undefined }, { draft: true });
  sendPdf(res, pdf, 'letterhead-preview');
});
