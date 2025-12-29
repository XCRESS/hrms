// ============================================================================
// CHRISTMAS FEATURE - TETRIS GAME ROUTES
// This file can be safely deleted after the holiday season
// ============================================================================

import express from "express";
import {
  saveScore,
  getLeaderboard,
  getMyScores,
  getMyRank,
  getStats
} from "./tetris.controllers.js";
import authMiddleware from "../../middlewares/auth.middlewares.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware());

// Save a new score
router.post("/scores", saveScore);

// Get global leaderboard
router.get("/leaderboard", getLeaderboard);

// Get my personal scores
router.get("/my-scores", getMyScores);

// Get my rank
router.get("/my-rank", getMyRank);

// Get game statistics
router.get("/stats", getStats);

export default router;
