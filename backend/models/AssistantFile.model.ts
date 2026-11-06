import mongoose, { Schema, type Types } from 'mongoose';

export interface IAssistantFile {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  mediaType: string;
  size: number;
  data: Buffer;
  source: 'upload' | 'generated';
  expiresAt: Date;
  createdAt: Date;
}

export const ASSISTANT_FILE_TTL_DAYS = 30;

const assistantFileSchema = new Schema<IAssistantFile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    mediaType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    source: { type: String, enum: ['upload', 'generated'], required: true },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + ASSISTANT_FILE_TTL_DAYS * 86_400_000) },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

assistantFileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IAssistantFile>('AssistantFile', assistantFileSchema);
