import type { Types } from 'mongoose';
import type { DateTime } from 'luxon';
import type { Tool, UIMessage } from 'ai';
import type { UserRole } from '../../../types/index.js';

export interface ToolCaller {
  userId: Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  employee?: Types.ObjectId;
}

export interface ToolContext {
  caller: ToolCaller;
  now: DateTime;
  threadId: Types.ObjectId;
  history: UIMessage[];
  latestUserText: string;
  /** Outputs of tools already run in this turn, in order; `history` only covers earlier turns. */
  turnResults: { tool: string; output: unknown }[];
}

export interface AssistantToolDef {
  name: string;
  roles: readonly UserRole[];
  build: (ctx: ToolContext) => Tool;
}

export const ALL_ROLES = ['admin', 'hr', 'employee'] as const satisfies readonly UserRole[];
export const STAFF_ROLES = ['admin', 'hr'] as const satisfies readonly UserRole[];
