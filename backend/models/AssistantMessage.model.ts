import mongoose, { Schema, type Types } from 'mongoose';

export interface IAssistantMessage {
  _id: Types.ObjectId;
  thread: Types.ObjectId;
  user: Types.ObjectId;
  messageId: string;
  parentId: string | null;
  role: 'user' | 'assistant';
  parts: unknown[];
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const assistantMessageSchema = new Schema<IAssistantMessage>(
  {
    thread: { type: Schema.Types.ObjectId, ref: 'AssistantThread', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    messageId: { type: String, required: true },
    parentId: { type: String, default: null },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    parts: { type: [Schema.Types.Mixed], default: [] },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, minimize: false }
);

assistantMessageSchema.index({ thread: 1, messageId: 1 }, { unique: true });

export default mongoose.model<IAssistantMessage>('AssistantMessage', assistantMessageSchema);
