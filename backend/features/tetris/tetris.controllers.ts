// ============================================================================
// CHRISTMAS FEATURE - TETRIS GAME CONTROLLER
// This file can be safely deleted after the holiday season
// ============================================================================

import type { Response } from 'express';
import TetrisScore from './TetrisScore.model.js';
import Employee from '../../models/Employee.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { formatResponse } from '../../utils/response.js';
import type { IAuthRequest } from '../../types/index.js';

interface SaveScoreBody {
  score: number;
  level: number;
  linesCleared?: number;
}

interface LeaderboardQuery {
  limit?: string;
  period?: 'all-time' | 'today' | 'week' | 'month';
}

/**
 * Save a tetris score for the authenticated employee
 * Uses upsert to maintain only best score per employee
 * POST /api/tetris/scores
 */
export const saveScore = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
  const { score, level, linesCleared } = req.body as SaveScoreBody;

  // Validate input
  if (score === undefined || score < 0) {
    throw new ValidationError('Valid score is required');
  }

  if (level === undefined || level < 1) {
    throw new ValidationError('Valid level is required');
  }

  // Get employee from authenticated user
  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    throw new ValidationError('No linked employee profile found');
  }

  // Fetch employee details using employeeId string (not MongoDB _id)
  const employee = await Employee.findOne({ employeeId: employeeId });
  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  // Get existing record to check if this is a personal best
  const existingRecord = await TetrisScore.findOne({ employee: employee._id });
  const isPersonalBest = !existingRecord || score > existingRecord.bestScore;
  const isNewPlayer = !existingRecord;

  // Upsert: Update if score is better, or create new record
  const updateData: any = {
    $inc: { totalGames: 1 }, // Always increment games played
    $set: {
      playerName: employee.firstName,
      lastPlayed: new Date(),
    },
  };

  // Only update best score if this game beats the previous best
  if (isPersonalBest) {
    updateData.$set.bestScore = score;
    updateData.$set.bestLevel = level;
    updateData.$set.bestLinesCleared = linesCleared || 0;
  }

  const tetrisScore = await TetrisScore.findOneAndUpdate(
    { employee: employee._id },
    updateData,
    {
      new: true, // Return updated document
      upsert: true, // Create if doesn't exist
      runValidators: true,
    }
  );

  res.status(isNewPlayer ? 201 : 200).json(
    formatResponse(true, 'Score saved successfully', {
      score: tetrisScore,
      isPersonalBest,
      message: isPersonalBest ? 'New personal best!' : 'Keep trying to beat your best score!',
    })
  );
});

/**
 * Get global leaderboard (top scores from all employees)
 * GET /api/tetris/leaderboard?limit=10&period=all-time
 */
export const getLeaderboard = asyncHandler(
  async (req: IAuthRequest, res: Response): Promise<void> => {
    const query = req.query as LeaderboardQuery;
    const limit = parseInt(query.limit || '10');
    const period = query.period || 'all-time';

    // Build date filter based on period
    let dateFilter: any = {};
    if (period !== 'all-time') {
      const now = new Date();
      let startDate: Date | null = null;

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
        dateFilter = { lastPlayed: { $gte: startDate } };
      }
    }

    // Simple query - no aggregation needed!
    const scores = await TetrisScore.find(dateFilter)
      .sort({ bestScore: -1, lastPlayed: -1 }) // Sort by best score descending
      .limit(limit)
      .select('playerName bestScore bestLevel bestLinesCleared totalGames lastPlayed')
      .lean();

    // Add rank to each entry
    const leaderboard = scores.map((entry, index) => ({
      rank: index + 1,
      playerName: entry.playerName,
      score: entry.bestScore,
      level: entry.bestLevel,
      linesCleared: entry.bestLinesCleared,
      totalGames: entry.totalGames,
      lastPlayed: entry.lastPlayed,
    }));

    res.json(
      formatResponse(true, 'Leaderboard retrieved successfully', {
        leaderboard,
        period,
        total: leaderboard.length,
      })
    );
  }
);

/**
 * Get current employee's personal stats
 * GET /api/tetris/my-scores
 */
export const getMyScores = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
  const employeeId = req.user?.employeeId;

  if (!employeeId) {
    throw new ValidationError('No linked employee profile found');
  }

  // Find employee by employeeId string, get MongoDB _id
  const employee = await Employee.findOne({ employeeId: employeeId });
  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  // Get employee's record
  const myRecord = await TetrisScore.findOne({ employee: employee._id })
    .select('-__v')
    .lean();

  if (!myRecord) {
    res.json(
      formatResponse(true, 'No games played yet', {
        personalBest: null,
        globalRank: null,
        totalGames: 0,
        hasPlayed: false,
      })
    );
    return;
  }

  // Get rank in global leaderboard (count how many have better scores)
  const betterScoresCount = await TetrisScore.countDocuments({
    bestScore: { $gt: myRecord.bestScore },
  });
  const globalRank = betterScoresCount + 1;

  res.json(
    formatResponse(true, 'Personal stats retrieved successfully', {
      personalBest: {
        score: myRecord.bestScore,
        level: myRecord.bestLevel,
        linesCleared: myRecord.bestLinesCleared,
      },
      globalRank,
      totalGames: myRecord.totalGames,
      lastPlayed: myRecord.lastPlayed,
      hasPlayed: true,
    })
  );
});

/**
 * Get current employee's rank in leaderboard
 * GET /api/tetris/my-rank
 */
export const getMyRank = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
  const employeeId = req.user?.employeeId;

  if (!employeeId) {
    throw new ValidationError('No linked employee profile found');
  }

  // Find employee by employeeId string, get MongoDB _id
  const employee = await Employee.findOne({ employeeId: employeeId });
  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  // Get employee's record
  const myRecord = await TetrisScore.findOne({ employee: employee._id })
    .select('playerName bestScore bestLevel')
    .lean();

  if (!myRecord) {
    res.json(
      formatResponse(true, 'No scores found', {
        rank: null,
        hasPlayed: false,
      })
    );
    return;
  }

  // Count employees with better scores
  const betterScoresCount = await TetrisScore.countDocuments({
    bestScore: { $gt: myRecord.bestScore },
  });
  const rank = betterScoresCount + 1;

  res.json(
    formatResponse(true, 'Rank retrieved successfully', {
      rank,
      score: myRecord.bestScore,
      level: myRecord.bestLevel,
      playerName: myRecord.playerName,
      hasPlayed: true,
    })
  );
});

/**
 * Get leaderboard statistics
 * GET /api/tetris/stats
 */
export const getStats = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
  // Simple aggregation on the single-record-per-player model
  const stats = await TetrisScore.aggregate([
    {
      $group: {
        _id: null,
        totalGames: { $sum: '$totalGames' }, // Sum all games played
        totalPlayers: { $sum: 1 }, // Count documents = count players
        highestScore: { $max: '$bestScore' },
        averageScore: { $avg: '$bestScore' },
        highestLevel: { $max: '$bestLevel' },
        totalLinesCleared: { $sum: '$bestLinesCleared' },
      },
    },
    {
      $project: {
        _id: 0,
        totalGames: 1,
        totalPlayers: 1,
        highestScore: 1,
        averageScore: { $round: ['$averageScore', 0] },
        highestLevel: 1,
        totalLinesCleared: 1,
      },
    },
  ]);

  const statistics =
    stats.length > 0
      ? stats[0]
      : {
          totalGames: 0,
          totalPlayers: 0,
          highestScore: 0,
          averageScore: 0,
          highestLevel: 0,
          totalLinesCleared: 0,
        };

  res.json(formatResponse(true, 'Statistics retrieved successfully', { stats: statistics }));
});
