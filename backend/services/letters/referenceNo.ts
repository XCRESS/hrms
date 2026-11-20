import { DateTime } from 'luxon';
import type { Types } from 'mongoose';
import LetterCounter from '../../models/LetterCounter.model.js';
import { IST_TIMEZONE } from '../../utils/timezone.js';

export const counterKey = (companyId: Types.ObjectId, at: Date): string =>
  `${companyId.toString()}:${DateTime.fromJSDate(at, { zone: IST_TIMEZONE }).year}`;

export const formatReferenceNo = (prefix: string, year: number, seq: number): string => `${prefix}/${year}/${String(seq).padStart(4, '0')}`;

/** Shown wherever the number is not assigned yet (previews, drafts). */
export const previewReferenceNo = (prefix: string, at: Date): string => `${prefix}/${DateTime.fromJSDate(at, { zone: IST_TIMEZONE }).year}/____`;

/** Atomically takes the next number in the company's sequence for the IST year of `at`. */
export const nextReferenceNo = async (companyId: Types.ObjectId, prefix: string, at: Date): Promise<string> => {
  const key = counterKey(companyId, at);
  const counter = await LetterCounter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean();
  return formatReferenceNo(prefix, Number(key.split(':')[1]), counter.seq);
};
