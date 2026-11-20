import mongoose, { Schema, type Types } from 'mongoose';
import type { LetterDoc } from '../validators/letter.schemas.js';
import type { LetterKind } from './LetterTemplate.model.js';

export type LetterStatus = 'draft' | 'issuing' | 'issued' | 'sent' | 'void';

export interface ILetterSend {
  to: string;
  at: Date;
  by: Types.ObjectId;
  resendId?: string;
}

export interface ILetter {
  _id: Types.ObjectId;
  template: Types.ObjectId;
  templateName: string;
  company: Types.ObjectId;
  kind: LetterKind;
  employee?: Types.ObjectId;
  recipient: { name: string; email?: string; address?: string };
  values: Record<string, string>;
  /** Present only when HR edited this letter's wording; still holds `letter.*` field nodes until issue. */
  body?: LetterDoc | null;
  status: LetterStatus;
  referenceNo?: string;
  issuedAt?: Date;
  issuedBy?: Types.ObjectId;
  pdf?: Buffer;
  pdfSha256?: string;
  sends: ILetterSend[];
  voidReason?: string;
  voidedAt?: Date;
  voidedBy?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const letterSchema = new Schema<ILetter>(
  {
    template: { type: Schema.Types.ObjectId, ref: 'LetterTemplate', required: true },
    templateName: { type: String, required: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    kind: { type: String, enum: ['employee', 'manual'], required: true },
    employee: { type: Schema.Types.ObjectId, ref: 'Employee' },
    recipient: {
      name: { type: String, required: true, trim: true, maxlength: 150 },
      email: { type: String, trim: true, lowercase: true, maxlength: 254 },
      address: { type: String, trim: true, maxlength: 500 },
    },
    values: { type: Schema.Types.Mixed, default: {} },
    body: { type: Schema.Types.Mixed, default: null },
    status: { type: String, enum: ['draft', 'issuing', 'issued', 'sent', 'void'], default: 'draft', required: true },
    referenceNo: { type: String },
    issuedAt: { type: Date },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pdf: { type: Buffer, select: false },
    pdfSha256: { type: String },
    sends: {
      type: [
        new Schema<ILetterSend>(
          { to: { type: String, required: true }, at: { type: Date, required: true }, by: { type: Schema.Types.ObjectId, ref: 'User', required: true }, resendId: String },
          { _id: false }
        ),
      ],
      default: [],
    },
    voidReason: { type: String, maxlength: 300 },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, minimize: false }
);

letterSchema.index({ employee: 1, createdAt: -1 });
letterSchema.index({ status: 1, createdAt: -1 });
letterSchema.index({ referenceNo: 1 }, { unique: true, sparse: true });

export default mongoose.model<ILetter>('Letter', letterSchema);
