import { z } from 'zod';

interface FestiveGame<R> {
  resultSchema: z.ZodType<R>;
  /** Finishes faster than this are rejected as implausible. */
  minDurationMs: number;
  /** Scores are always computed here from the result and the server-measured duration, never trusted from the client. */
  score(result: R, elapsedMs: number): number;
}

const MITHAI_PAIRS = 8;

const mithaiMatch: FestiveGame<{ moves: number }> = {
  resultSchema: z.object({ moves: z.number().int().min(MITHAI_PAIRS).max(500) }),
  minDurationMs: 8000,
  score: ({ moves }, elapsedMs) =>
    Math.max(100, 1000 - 15 * (moves - MITHAI_PAIRS) - 2 * Math.floor(elapsedMs / 1000)),
};

export const FESTIVE_GAMES = {
  'mithai-match': mithaiMatch,
} as const;

export type FestiveGameKey = keyof typeof FESTIVE_GAMES;

export const FESTIVE_GAME_KEYS = Object.keys(FESTIVE_GAMES) as [FestiveGameKey, ...FestiveGameKey[]];
