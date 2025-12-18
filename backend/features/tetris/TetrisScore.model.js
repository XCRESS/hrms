// ============================================================================
// CHRISTMAS FEATURE - TETRIS LEADERBOARD
// This file can be safely deleted after the holiday season
// ============================================================================

import mongoose from "mongoose";

const tetrisScoreSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
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

const TetrisScore = mongoose.model("TetrisScore", tetrisScoreSchema);

export default TetrisScore;
