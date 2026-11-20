import mongoose, { Schema, type Types } from 'mongoose';

export interface ILetterhead {
  _id: Types.ObjectId;
  company: Types.ObjectId;
  pdf?: Buffer;
  pdfSize?: number;
  pageSize: 'A4' | 'Letter';
  marginsMm: { top: number; right: number; bottom: number; left: number };
  signatory: { name: string; designation: string };
  referencePrefix: string;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const margin = { type: Number, required: true, min: 0, max: 80 };

const letterheadSchema = new Schema<ILetterhead>(
  {
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
    pdf: { type: Buffer, select: false },
    pdfSize: { type: Number },
    pageSize: { type: String, enum: ['A4', 'Letter'], default: 'A4' },
    marginsMm: { top: margin, right: margin, bottom: margin, left: margin },
    signatory: {
      name: { type: String, required: true, trim: true, maxlength: 100 },
      designation: { type: String, required: true, trim: true, maxlength: 100 },
    },
    referencePrefix: { type: String, required: true, trim: true, maxlength: 20 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ILetterhead>('Letterhead', letterheadSchema);
