import mongoose, { Schema, type Document } from 'mongoose';

export interface IPasswordResetCodeDoc extends Document {
  user: mongoose.Types.ObjectId;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
}

const passwordResetCodeSchema = new Schema<IPasswordResetCodeDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

passwordResetCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetCode = mongoose.model<IPasswordResetCodeDoc>('PasswordResetCode', passwordResetCodeSchema);

export default PasswordResetCode;
