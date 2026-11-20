import mongoose, { Schema } from 'mongoose';

export interface ILetterCounter {
  _id: string;
  seq: number;
}

const letterCounterSchema = new Schema<ILetterCounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export default mongoose.model<ILetterCounter>('LetterCounter', letterCounterSchema);
