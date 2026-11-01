import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ensureJWTSecret } from '../utils/jwt.js';
import { AuthorizationError } from '../utils/errors.js';
import { FESTIVE_GAME_KEYS, type FestiveGameKey } from './festiveGames.js';

const AUDIENCE = 'festive-game';

export interface GameTokenPayload {
  employee: string;
  instanceId: string;
  game: FestiveGameKey;
  startedAt: number;
}

// Derived key: a game token can never verify as a login token, nor the reverse.
const signingKey = (): Buffer => createHmac('sha256', ensureJWTSecret()).update(AUDIENCE).digest();

export function issueGameToken(p: { employee: string; instanceId: string; game: FestiveGameKey }): string {
  return jwt.sign(
    { sub: p.employee, instanceId: p.instanceId, game: p.game, startedAt: Date.now() },
    signingKey(),
    { algorithm: 'HS256', expiresIn: '30m', audience: AUDIENCE }
  );
}

export function verifyGameToken(token: string): GameTokenPayload {
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, signingKey(), { algorithms: ['HS256'], audience: AUDIENCE });
  } catch {
    throw new AuthorizationError('Invalid or expired game token');
  }
  if (
    typeof decoded === 'string' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.instanceId !== 'string' ||
    typeof decoded.startedAt !== 'number' ||
    !FESTIVE_GAME_KEYS.includes(decoded.game)
  ) {
    throw new AuthorizationError('Invalid game token');
  }
  return {
    employee: decoded.sub,
    instanceId: decoded.instanceId,
    game: decoded.game as FestiveGameKey,
    startedAt: decoded.startedAt,
  };
}
