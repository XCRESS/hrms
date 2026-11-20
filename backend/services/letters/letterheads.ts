import type { Types } from 'mongoose';
import Letterhead from '../../models/Letterhead.model.js';
import { toBuffer } from './upload.js';

export interface LetterheadSettings {
  pdf?: Buffer;
  marginsMm: { top: number; right: number; bottom: number; left: number };
  signatory: { name: string; designation: string };
  referencePrefix: string;
  pageSize: 'A4' | 'Letter';
}

const DEFAULTS: LetterheadSettings = {
  marginsMm: { top: 25, right: 20, bottom: 25, left: 20 },
  signatory: { name: '', designation: '' },
  referencePrefix: 'HR',
  pageSize: 'A4',
};

/** The company's letterhead, or plain-page defaults when none is set up yet. */
export const loadLetterhead = async (company: Types.ObjectId | string, { withPdf = false } = {}): Promise<LetterheadSettings & { configured: boolean }> => {
  const query = Letterhead.findOne({ company }).select(`marginsMm signatory referencePrefix pageSize${withPdf ? ' +pdf' : ''}`);
  const letterhead = await query.lean();
  if (!letterhead) return { ...DEFAULTS, configured: false };
  return {
    configured: true,
    marginsMm: letterhead.marginsMm,
    signatory: letterhead.signatory,
    referencePrefix: letterhead.referencePrefix,
    pageSize: letterhead.pageSize ?? 'A4',
    ...(withPdf && letterhead.pdf ? { pdf: toBuffer(letterhead.pdf) } : {}),
  };
};
