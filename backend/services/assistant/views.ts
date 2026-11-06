import { z } from 'zod';
import type { JSONValue } from 'ai';

export type Cell = string | number | null;
export type ColumnKind = 'text' | 'number' | 'currency' | 'date' | 'time' | 'hours' | 'status';
export interface ColumnSpec { key: string; label: string; kind: ColumnKind }
export interface Tile {
  key: string;
  label: string;
  value: number;
  kind?: ColumnKind;
  tone?: 'neutral' | 'positive' | 'warning' | 'negative';
  filter?: { column: string; equals: string };
  /** Lets a per-tab view recompute the tile as the sum of this column. */
  sumOf?: string;
}
export interface ChartSpec { type: 'bar' | 'line' | 'donut'; x: string; series: { key: string; label: string }[] }
export interface ResultView {
  kind: 'result';
  title: string;
  subtitle?: string;
  columns: ColumnSpec[];
  rows: Record<string, Cell>[];
  tiles?: Tile[];
  chart?: ChartSpec;
  defaultView: 'table' | 'chart';
  link?: { label: string; href: string };
  /** Show one tab per distinct value of this column (plus All). */
  splitBy?: string;
}

export type ModelOutput = { type: 'json'; value: JSONValue } | { type: 'text'; value: string };

export const summarizeForModel = (view: ResultView, maxRows = 15, extra: Record<string, JSONValue> = {}): ModelOutput => ({
  type: 'json',
  value: {
    title: view.title,
    ...(view.subtitle ? { subtitle: view.subtitle } : {}),
    totalRows: view.rows.length,
    tiles: (view.tiles ?? []).map((t) => ({ label: t.label, value: t.value })),
    columns: view.columns.map((c) => c.key),
    firstRows: view.rows.slice(0, maxRows),
    note: 'The user sees the full result as an interactive component. Do not repeat its numbers or list its rows.',
    ...extra,
  },
});

export const emptyView = (title: string, subtitle: string): ResultView => ({
  kind: 'result',
  title,
  subtitle,
  columns: [],
  rows: [],
  defaultView: 'table',
});

export const splitByPersonInput = z.boolean().optional().describe('Show each person in their own tab, when the user asks for results separately or per person');

export const withPersonTabs = (view: ResultView, split: boolean | undefined): ResultView =>
  split && view.columns.some((c) => c.key === 'name') ? { ...view, splitBy: 'name' } : view;
