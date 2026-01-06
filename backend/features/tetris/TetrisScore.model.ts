// ============================================================================
// CHRISTMAS FEATURE - TETRIS LEADERBOARD
// This file can be safely deleted after the holiday season
// ============================================================================

import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export interface ITetrisScore extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  playerName: string;
  bestScore: number;
  bestLevel: number;
  bestLinesCleared: number;
  totalGames: number;
  lastPlayed: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tetrisScoreSchema = new Schema<ITetrisScore>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true, // One entry per employee
      index: true,
    },
    playerName: {
      type: String,
      required: true,
      trim: true,
    },
    bestScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      index: true, // For leaderboard sorting
    },
    bestLevel: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    bestLinesCleared: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalGames: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPlayed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt = first game, updatedAt = last improvement
  }
);

// Compound index for efficient leaderboard queries (sorted by score descending)
tetrisScoreSchema.index({ bestScore: -1, lastPlayed: -1 });

const TetrisScore: Model<ITetrisScore> = mongoose.model<ITetrisScore>(
  'TetrisScore',
  tetrisScoreSchema
);

export default TetrisScore;
