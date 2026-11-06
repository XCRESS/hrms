import type { ResultView } from '../views.js';
import type { ToolContext } from './types.js';

export const isTable = (value: unknown): value is ResultView => {
  const v = value as Partial<ResultView> | undefined;
  return v?.kind === 'result' && Array.isArray(v.columns) && v.columns.length > 0 && Array.isArray(v.rows) && v.rows.length > 0;
};

const NOT_ATTACHABLE = new Set(['find_employee']);

/** The most recent data table (directory lookups excluded): this turn first, then earlier turns. */
export const latestTable = (ctx: ToolContext, thisTurnOnly = false): ResultView | undefined => {
  const thisTurn = ctx.turnResults.filter((r) => !NOT_ATTACHABLE.has(r.tool) && isTable(r.output)).at(-1);
  if (thisTurn || thisTurnOnly) return thisTurn?.output as ResultView | undefined;
  for (const message of [...ctx.history].reverse()) {
    for (const part of [...message.parts].reverse()) {
      const output = (part as { output?: unknown }).output;
      if (!NOT_ATTACHABLE.has(part.type.replace(/^tool-/, '')) && isTable(output)) return output;
    }
  }
  return undefined;
};
