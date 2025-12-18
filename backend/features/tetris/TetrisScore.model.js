// ============================================================================
// CHRISTMAS FEATURE - TETRIS GAME
// This file can be safely deleted after the holiday season
// ============================================================================

import mongoose from "mongoose";

const tetrisScoreSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    playerName: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    linesCleared: {
      type: Number,
      default: 0,
      min: 0,
    },
    gameDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    department: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for leaderboard queries (sorted by score descending)
tetrisScoreSchema.index({ score: -1, gameDate: -1 });

// Index for employee-specific queries
tetrisScoreSchema.index({ employee: 1, score: -1 });

// Virtual for rank (calculated at query time)
tetrisScoreSchema.virtual("rank").get(function () {
  return this._rank || null;
});

// Ensure virtuals are included in JSON
tetrisScoreSchema.set("toJSON", { virtuals: true });
tetrisScoreSchema.set("toObject", { virtuals: true });

const TetrisScore = mongoose.model("TetrisScore", tetrisScoreSchema);

export default TetrisScore;
