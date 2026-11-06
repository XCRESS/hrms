import { Types } from 'mongoose';
import AssistantFile, { type IAssistantFile } from '../../../models/AssistantFile.model.js';
import { NotFoundError } from '../../../utils/errors.js';

export const MEDIA = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  csv: 'text/csv',
  txt: 'text/plain',
  png: 'image/png',
  jpeg: 'image/jpeg',
} as const;

const EXTENSION_MEDIA: Record<string, string> = {
  pdf: MEDIA.pdf,
  xlsx: MEDIA.xlsx,
  docx: MEDIA.docx,
  csv: MEDIA.csv,
  txt: MEDIA.txt,
  png: MEDIA.png,
  jpg: MEDIA.jpeg,
  jpeg: MEDIA.jpeg,
};

export const UPLOAD_ACCEPT = Object.keys(EXTENSION_MEDIA);

/** Browsers report Office and CSV types inconsistently, so the extension decides. */
export const mediaTypeFor = (filename: string): string | null => EXTENSION_MEDIA[filename.split('.').pop()?.toLowerCase() ?? ''] ?? null;

export interface FileSummary { id: string; name: string; mediaType: string; size: number }

export const toSummary = (f: Pick<IAssistantFile, '_id' | 'name' | 'mediaType' | 'size'>): FileSummary => ({
  id: f._id.toString(),
  name: f.name,
  mediaType: f.mediaType,
  size: f.size,
});

export const saveFile = async (user: Types.ObjectId, name: string, mediaType: string, data: Buffer, source: IAssistantFile['source']): Promise<FileSummary> => {
  const doc = await AssistantFile.create({ user, name: name.slice(0, 200), mediaType, size: data.length, data, source });
  return toSummary(doc);
};

export const loadOwnedFile = async (fileId: string, user: Types.ObjectId): Promise<IAssistantFile> => {
  if (!Types.ObjectId.isValid(fileId)) throw new NotFoundError('File not found');
  const file = await AssistantFile.findOne({ _id: fileId, user }).lean<IAssistantFile>();
  if (!file) throw new NotFoundError('File not found or expired');
  // Lean reads return BSON Binary for Buffer fields.
  const raw = file.data as unknown as Buffer | { buffer: Uint8Array };
  return { ...file, data: Buffer.isBuffer(raw) ? raw : Buffer.from(raw.buffer) };
};
