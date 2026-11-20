import mongoose, { Schema, type Types } from 'mongoose';
import { FIELD_TYPES, type LetterDoc } from '../validators/letter.schemas.js';
import type { FieldType } from '../services/letters/fields.js';

export type LetterKind = 'employee' | 'manual';

export interface IAskField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  default?: string;
}

export interface ILetterTemplate {
  _id: Types.ObjectId;
  name: string;
  kind: LetterKind;
  company: Types.ObjectId;
  body: LetterDoc;
  askFields: IAskField[];
  email: { subject: string; body: string };
  active: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const askFieldSchema = new Schema<IAskField>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: FIELD_TYPES, required: true },
    required: { type: Boolean, required: true },
    default: { type: String },
  },
  { _id: false }
);

const letterTemplateSchema = new Schema<ILetterTemplate>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    kind: { type: String, enum: ['employee', 'manual'], required: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    body: { type: Schema.Types.Mixed, required: true },
    askFields: { type: [askFieldSchema], default: [] },
    email: {
      subject: { type: String, required: true, maxlength: 200 },
      body: { type: String, required: true, maxlength: 5000 },
    },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, minimize: false }
);

letterTemplateSchema.index({ active: 1, name: 1 });

export default mongoose.model<ILetterTemplate>('LetterTemplate', letterTemplateSchema);
