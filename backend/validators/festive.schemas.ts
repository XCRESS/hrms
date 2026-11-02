/**
 * Validation schemas for festive games (start / finish / leaderboard).
 */

import { z } from 'zod';
import { FESTIVE_GAME_KEYS } from '../services/festiveGames.js';

export const festiveGameParamsSchema = z.object({
  instanceId: z.string().regex(/^[a-z]+(-[a-z]+)*-\d{4}$/, 'Invalid festival instance'),
  game: z.enum(FESTIVE_GAME_KEYS),
});

export const finishFestiveGameSchema = z.object({
  token: z.string().min(1).max(2048),
  result: z.unknown(),
});

export const festiveLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(5),
});

export type FestiveGameParams = z.infer<typeof festiveGameParamsSchema>;
export type FinishFestiveGameInput = z.infer<typeof finishFestiveGameSchema>;
export type FestiveLeaderboardQuery = z.infer<typeof festiveLeaderboardQuerySchema>;
