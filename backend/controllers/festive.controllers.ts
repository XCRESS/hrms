import type { Response } from 'express';
import type { Types } from 'mongoose';
import FestiveScore from '../models/FestiveScore.model.js';
import Employee from '../models/Employee.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthorizationError, ValidationError } from '../utils/errors.js';
import { formatResponse } from '../utils/response.js';
import { getValidatedParams, getValidatedQuery } from '../middlewares/zodValidation.middleware.js';
import { FESTIVE_GAMES } from '../services/festiveGames.js';
import { issueGameToken, verifyGameToken } from '../services/festiveGameToken.js';
import type { IAuthRequest } from '../types/index.js';
import type {
  FestiveGameParams,
  FinishFestiveGameInput,
  FestiveLeaderboardQuery,
} from '../validators/festive.schemas.js';

const findCallerEmployee = async (req: IAuthRequest) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return null;
  return Employee.findOne({ employeeId }, { _id: 1, firstName: 1 }).lean();
};

const rankOf = async (instanceId: string, game: string, bestScore: number, bestAt?: Date): Promise<number> => {
  const ahead = await FestiveScore.countDocuments({
    instanceId,
    game,
    $or: [
      { bestScore: { $gt: bestScore } },
      ...(bestAt ? [{ bestScore, bestAt: { $lt: bestAt } }] : []),
    ],
  });
  return ahead + 1;
};

/** POST /api/festive/:instanceId/:game/start — token is null for accounts without a linked employee. */
export const startFestiveGame = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
  const { instanceId, game } = getValidatedParams<FestiveGameParams>(req);
  const employee = await findCallerEmployee(req);
  const token = employee ? issueGameToken({ employee: String(employee._id), instanceId, game }) : null;
  res.json(formatResponse(true, 'Game started', { token }));
});

/** POST /api/festive/:instanceId/:game/finish */
export const finishFestiveGame = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
  const { instanceId, game } = getValidatedParams<FestiveGameParams>(req);
  const { token, result } = req.body as FinishFestiveGameInput;

  const employee = await findCallerEmployee(req);
  if (!employee) throw new AuthorizationError('Scores are saved for employee accounts only');

  const payload = verifyGameToken(token);
  if (payload.employee !== String(employee._id) || payload.instanceId !== instanceId || payload.game !== game) {
    throw new AuthorizationError('Game token does not match this game');
  }

  const gameDef = FESTIVE_GAMES[game];
  const parsed = gameDef.resultSchema.safeParse(result);
  if (!parsed.success) throw new ValidationError('Invalid game result');

  const now = new Date();
  const elapsedMs = now.getTime() - payload.startedAt;
  if (elapsedMs < gameDef.minDurationMs) throw new ValidationError('Finished too fast');

  const score = gameDef.score(parsed.data, elapsedMs);
  const key = { instanceId, game, employee: employee._id as Types.ObjectId };

  await FestiveScore.updateOne(
    key,
    { $inc: { totalGames: 1 }, $set: { playerName: employee.firstName, lastPlayed: now } },
    { upsert: true }
  );
  const improved = await FestiveScore.updateOne(
    { ...key, bestScore: { $lt: score } },
    { $set: { bestScore: score, bestStats: parsed.data, bestAt: now } }
  );

  const best = await FestiveScore.findOne(key, { bestScore: 1, bestAt: 1 }).lean();
  const bestScore = best?.bestScore ?? score;

  res.json(
    formatResponse(true, 'Score saved', {
      score,
      bestScore,
      isPersonalBest: improved.modifiedCount === 1,
      rank: await rankOf(instanceId, game, bestScore, best?.bestAt),
    })
  );
});

/** GET /api/festive/:instanceId/:game/leaderboard?limit=5 */
export const getFestiveLeaderboard = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
  const { instanceId, game } = getValidatedParams<FestiveGameParams>(req);
  const { limit } = getValidatedQuery<FestiveLeaderboardQuery>(req);

  const [rows, employee] = await Promise.all([
    FestiveScore.find({ instanceId, game, bestScore: { $gt: 0 } }, { playerName: 1, bestScore: 1, employee: 1 })
      .sort({ bestScore: -1, bestAt: 1 })
      .limit(limit)
      .populate<{ employee: { profilePicture?: string | null } | null }>('employee', 'profilePicture')
      .lean(),
    findCallerEmployee(req),
  ]);

  const mine = employee
    ? await FestiveScore.findOne(
        { instanceId, game, employee: employee._id, bestScore: { $gt: 0 } },
        { bestScore: 1, bestAt: 1 }
      ).lean()
    : null;

  res.json(
    formatResponse(true, 'Leaderboard', {
      leaderboard: rows.map((r, i) => ({
        rank: i + 1,
        name: r.playerName,
        score: r.bestScore,
        avatar: r.employee?.profilePicture ?? null,
      })),
      me: mine ? { rank: await rankOf(instanceId, game, mine.bestScore, mine.bestAt), score: mine.bestScore } : null,
    })
  );
});
