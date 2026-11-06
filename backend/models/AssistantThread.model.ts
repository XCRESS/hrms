import mongoose, { Schema, type Types } from 'mongoose';

export interface IAssistantThread {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  archived: boolean;
  headId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const assistantThreadSchema = new Schema<IAssistantThread>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: '', trim: true, maxlength: 200 },
    archived: { type: Boolean, default: false },
    headId: { type: String, default: null },
  },
  { timestamps: true }
);

assistantThreadSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model<IAssistantThread>('AssistantThread', assistantThreadSchema);
