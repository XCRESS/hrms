import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { formatErrorResponse } from '../../utils/response.js';
import logger from '../../utils/logger.js';

/** Single-file memory upload; multer errors become the standard 400 JSON shape. */
export const singleUpload = (field: string, maxBytes: number, accept: (file: Express.Multer.File) => boolean, kind: string) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => cb(null, accept(file)),
  });

  return (req: Request, res: Response, next: NextFunction): void => {
    upload.single(field)(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE' ? `${kind} must be at most ${Math.round(maxBytes / 1024 / 1024)}MB` : err.message;
        res.status(400).json(formatErrorResponse(message));
        return;
      }
      if (err) {
        logger.error({ err }, `${kind} upload failed`);
        res.status(500).json(formatErrorResponse('Upload failed'));
        return;
      }
      next();
    });
  };
};

/** Lean reads return BSON Binary for Buffer fields. */
export const toBuffer = (raw: unknown): Buffer => {
  if (Buffer.isBuffer(raw)) return raw;
  const binary = raw as { buffer: Uint8Array };
  return Buffer.from(binary.buffer);
};

const unsafeFilenameChars = /[^\w .()-]+/g;

export const sendPdf = (res: Response, pdf: Buffer, filename: string): void => {
  const safe = filename.replace(unsafeFilenameChars, '_').slice(0, 120) || 'letter';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${safe}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(pdf);
};
