import mongoose, { Schema, type Types } from 'mongoose';

export interface IAssistantAuditLog {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  thread: Types.ObjectId;
  method: string;
  endpoint: string;
  status: number;
  targetIds: string[];
  createdAt: Date;
}

const assistantAuditLogSchema = new Schema<IAssistantAuditLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    thread: { type: Schema.Types.ObjectId, ref: 'AssistantThread', required: true },
    method: { type: String, required: true },
    endpoint: { type: String, required: true },
    status: { type: Number, required: true },
    targetIds: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

assistantAuditLogSchema.index({ user: 1, createdAt: -1 });
assistantAuditLogSchema.index({ thread: 1 });

export default mongoose.model<IAssistantAuditLog>('AssistantAuditLog', assistantAuditLogSchema);
