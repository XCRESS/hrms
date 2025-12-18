// ============================================================================
// CHRISTMAS FEATURE - TETRIS GAME CONTROLLER
// This file can be safely deleted after the holiday season
// ============================================================================

import TetrisScore from "./TetrisScore.model.js";
import Employee from "../../models/Employee.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ValidationError, NotFoundError } from "../../utils/errors.js";
import { formatResponse } from "../../utils/response.js";

/**
 * Save a new tetris score for the authenticated employee
 * POST /api/tetris/scores
 */
export const saveScore = asyncHandler(async (req, res) => {
  const { score, level, linesCleared } = req.body;

  // Validate input
  if (score === undefined || score < 0) {
    throw new ValidationError("Valid score is required");
  }

  if (level === undefined || level < 1) {
    throw new ValidationError("Valid level is required");
  }

  // Get employee from authenticated user
  const employeeId = req.user.employeeId;
  if (!employeeId) {
    throw new ValidationError("No linked employee profile found");
  }

  // Fetch employee details using employeeId string (not MongoDB _id)
  const employee = await Employee.findOne({ employeeId: employeeId });
  if (!employee) {
    throw new NotFoundError("Employee not found");
  }

  // Create score record with MongoDB ObjectId reference
  const tetrisScore = await TetrisScore.create({
    employee: employee._id, // Use MongoDB ObjectId, not employeeId string
    playerName: employee.firstName, // Use only first name to keep leaderboard clean
    score: score,
    level: level || 1,
    linesCleared: linesCleared || 0,
    gameDate: new Date(),
    department: employee.department,
    position: employee.position,
  });

  res.status(201).json(
    formatResponse(true, "Score saved successfully", {
      score: tetrisScore,
      isPersonalBest: await isPersonalBest(employee._id, score)
    })
  );
});

/**
 * Get global leaderboard (top scores from all employees)
 * GET /api/tetris/leaderboard?limit=10&period=all-time
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const period = req.query.period || 'all-time'; // all-time, today, week, month

  // Build date filter based on period
  let dateFilter = {};
  if (period !== 'all-time') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = null;
    }

    if (startDate) {
      dateFilter = { gameDate: { $gte: startDate } };
    }
  }

  // Get top scores - one best score per employee
  const leaderboard = await TetrisScore.aggregate([
    { $match: dateFilter },
    // Group by employee and get their best score
    {
      $group: {
        _id: "$employee",
        playerName: { $first: "$playerName" },
        score: { $max: "$score" },
        level: { $first: "$level" },
        linesCleared: { $first: "$linesCleared" },
        department: { $first: "$department" },
        position: { $first: "$position" },
        gameDate: { $first: "$gameDate" },
      }
    },
    // Sort by score descending
    { $sort: { score: -1 } },
    // Limit results
    { $limit: limit },
    // Add rank field
    {
      $group: {
        _id: null,
        scores: { $push: "$$ROOT" }
      }
    },
    {
      $unwind: {
        path: "$scores",
        includeArrayIndex: "rank"
      }
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            "$scores",
            { rank: { $add: ["$rank", 1] } }
          ]
        }
      }
    },
    // Clean up fields
    {
      $project: {
        _id: 0,
        employeeId: "$_id",
        playerName: 1,
        score: 1,
        level: 1,
        linesCleared: 1,
        department: 1,
        position: 1,
        gameDate: 1,
        rank: 1
      }
    }
  ]);

  res.json(
    formatResponse(true, "Leaderboard retrieved successfully", {
      leaderboard,
      period,
      total: leaderboard.length
    })
  );
});

/**
 * Get current employee's personal scores
 * GET /api/tetris/my-scores?limit=5
 */
export const getMyScores = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const employeeId = req.user.employeeId;

  if (!employeeId) {
    throw new ValidationError("No linked employee profile found");
  }

  // Find employee by employeeId string, get MongoDB _id
  const employee = await Employee.findOne({ employeeId: employeeId });
  if (!employee) {
    throw new NotFoundError("Employee not found");
  }

  const myScores = await TetrisScore.find({ employee: employee._id })
    .sort({ score: -1, gameDate: -1 })
    .limit(limit)
    .select("-__v");

  // Get personal best
  const personalBest = myScores.length > 0 ? myScores[0] : null;

  // Get rank in global leaderboard
  let globalRank = null;
  if (personalBest) {
    const betterScores = await TetrisScore.aggregate([
      {
        $group: {
          _id: "$employee",
          maxScore: { $max: "$score" }
        }
      },
      {
        $match: {
          maxScore: { $gt: personalBest.score }
        }
      },
      {
        $count: "count"
      }
    ]);

    globalRank = betterScores.length > 0 ? betterScores[0].count + 1 : 1;
  }

  res.json(
    formatResponse(true, "Personal scores retrieved successfully", {
      scores: myScores,
      personalBest,
      globalRank,
      totalGames: myScores.length
    })
  );
});

/**
 * Get current employee's rank in leaderboard
 * GET /api/tetris/my-rank
 */
export const getMyRank = asyncHandler(async (req, res) => {
  const employeeId = req.user.employeeId;

  if (!employeeId) {
    throw new ValidationError("No linked employee profile found");
  }

  // Find employee by employeeId string, get MongoDB _id
  const employee = await Employee.findOne({ employeeId: employeeId });
  if (!employee) {
    throw new NotFoundError("Employee not found");
  }

  // Get employee's best score
  const myBestScore = await TetrisScore.findOne({ employee: employee._id })
    .sort({ score: -1 })
    .select("score level playerName");

  if (!myBestScore) {
    return res.json(
      formatResponse(true, "No scores found", {
        rank: null,
        hasPlayed: false
      })
    );
  }

  // Count employees with better scores
  const betterScores = await TetrisScore.aggregate([
    {
      $group: {
        _id: "$employee",
        maxScore: { $max: "$score" }
      }
    },
    {
      $match: {
        maxScore: { $gt: myBestScore.score }
      }
    },
    {
      $count: "count"
    }
  ]);

  const rank = betterScores.length > 0 ? betterScores[0].count + 1 : 1;

  res.json(
    formatResponse(true, "Rank retrieved successfully", {
      rank,
      score: myBestScore.score,
      level: myBestScore.level,
      playerName: myBestScore.playerName,
      hasPlayed: true
    })
  );
});

/**
 * Get leaderboard statistics
 * GET /api/tetris/stats
 */
export const getStats = asyncHandler(async (req, res) => {
  const stats = await TetrisScore.aggregate([
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        totalPlayers: { $addToSet: "$employee" },
        highestScore: { $max: "$score" },
        averageScore: { $avg: "$score" },
        highestLevel: { $max: "$level" },
        totalLinesCleared: { $sum: "$linesCleared" }
      }
    },
    {
      $project: {
        _id: 0,
        totalGames: 1,
        totalPlayers: { $size: "$totalPlayers" },
        highestScore: 1,
        averageScore: { $round: ["$averageScore", 0] },
        highestLevel: 1,
        totalLinesCleared: 1
      }
    }
  ]);

  const statistics = stats.length > 0 ? stats[0] : {
    totalGames: 0,
    totalPlayers: 0,
    highestScore: 0,
    averageScore: 0,
    highestLevel: 0,
    totalLinesCleared: 0
  };

  res.json(
    formatResponse(true, "Statistics retrieved successfully", { stats: statistics })
  );
});

// Helper function to check if score is personal best
// Note: employeeObjectId should be MongoDB ObjectId (_id), not employeeId string
async function isPersonalBest(employeeObjectId, newScore) {
  const previousBest = await TetrisScore.findOne({ employee: employeeObjectId })
    .sort({ score: -1 })
    .select("score");

  if (!previousBest) return true;
  return newScore > previousBest.score;
}
