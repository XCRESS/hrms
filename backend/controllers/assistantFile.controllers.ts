import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import type { IAuthRequest } from '../types/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { formatResponse } from '../utils/response.js';
import { AuthenticationError, BadRequestError } from '../utils/errors.js';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '../utils/uploadLimits.js';
import { getValidatedParams } from '../middlewares/zodValidation.middleware.js';
import { loadOwnedFile, MEDIA, mediaTypeFor, saveFile } from '../services/assistant/files/store.js';
import { buildPdf, buildXlsx } from '../services/assistant/files/build.js';
import type { ExportTableInput } from '../validators/assistant.schemas.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });

export const handleAssistantUpload = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json(formatResponse(false, err.code === 'LIMIT_FILE_SIZE' ? `Files can be up to ${MAX_UPLOAD_MB} MB` : err.message));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
};

const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const PDF = Buffer.from('%PDF');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);

/** The extension picks the type; the first bytes have to agree, so a renamed file can't pose as another kind. */
const contentMatches = (mediaType: string, data: Buffer): boolean => {
  const starts = (sig: Buffer) => data.subarray(0, sig.length).equals(sig);
  if (mediaType === MEDIA.pdf) return starts(PDF);
  if (mediaType === MEDIA.xlsx || mediaType === MEDIA.docx) return starts(ZIP);
  if (mediaType === MEDIA.png) return starts(PNG);
  if (mediaType === MEDIA.jpeg) return starts(JPEG);
  return !data.subarray(0, 4096).includes(0);
};

export const uploadAssistantFile = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const user = req.user;
  if (!user) throw new AuthenticationError();
  const file = (req as IAuthRequest & { file?: Express.Multer.File }).file;
  if (!file) throw new BadRequestError('Attach a file');

  const mediaType = mediaTypeFor(file.originalname);
  if (!mediaType) throw new BadRequestError('HR Buddy reads PDF, Excel (.xlsx), CSV, Word (.docx), text and image files');
  if (!contentMatches(mediaType, file.buffer)) throw new BadRequestError("That file's contents don't match its type");

  const saved = await saveFile(user._id, file.originalname, mediaType, file.buffer, 'upload');
  res.status(201).json(formatResponse(true, 'File uploaded', saved));
});

export const downloadAssistantFile = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const user = req.user;
  if (!user) throw new AuthenticationError();
  const file = await loadOwnedFile(getValidatedParams<{ id: string }>(req).id, user._id);
  res.setHeader('Content-Type', file.mediaType);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(file.data);
});

const fileStem = (title: string) => title.split('·')[0]!.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'HR Buddy';

/** Any table shown in HR Buddy, as Excel or PDF. Built on demand; nothing is stored. */
export const exportTable = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { format, title, subtitle, columns, rows } = req.body as ExportTableInput;
  const sheet = { name: fileStem(title).slice(0, 31), columns: columns.map((c) => c.label), kinds: columns.map((c) => c.kind ?? undefined), rows };
  const data =
    format === 'xlsx'
      ? await buildXlsx([sheet])
      : await buildPdf({ title, sections: [{ ...(subtitle ? { paragraphs: [subtitle] } : {}), table: { columns: sheet.columns, rows } }] }, { landscape: columns.length > 5 });
  res.setHeader('Content-Type', format === 'xlsx' ? MEDIA.xlsx : MEDIA.pdf);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`${fileStem(title)}.${format}`)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(data);
});
