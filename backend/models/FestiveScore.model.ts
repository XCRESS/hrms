import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export interface IFestiveScore extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  instanceId: string;
  game: string;
  playerName: string;
  bestScore: number;
  bestStats?: unknown;
  bestAt?: Date;
  totalGames: number;
  lastPlayed: Date;
  createdAt: Date;
  updatedAt: Date;
}

const festiveScoreSchema = new Schema<IFestiveScore>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    instanceId: { type: String, required: true, trim: true },
    game: { type: String, required: true, trim: true },
    playerName: { type: String, required: true, trim: true },
    bestScore: { type: Number, required: true, default: 0, min: 0 },
    bestStats: { type: Schema.Types.Mixed },
    // Tie-break: whoever reached the score first ranks higher. lastPlayed moves on every game, so it can't serve.
    bestAt: { type: Date },
    totalGames: { type: Number, default: 0, min: 0 },
    lastPlayed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

festiveScoreSchema.index({ instanceId: 1, game: 1, employee: 1 }, { unique: true });
festiveScoreSchema.index({ instanceId: 1, game: 1, bestScore: -1, bestAt: 1 });

const FestiveScore: Model<IFestiveScore> = mongoose.model<IFestiveScore>('FestiveScore', festiveScoreSchema);

export default FestiveScore;
