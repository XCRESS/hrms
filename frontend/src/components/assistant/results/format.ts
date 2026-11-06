import type { Cell, ColumnKind } from '../types';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const formatCell = (value: Cell, kind: ColumnKind | undefined): string => {
  if (value === null || value === '') return '—';
  if (typeof value === 'number') {
    if (kind === 'currency') return currency.format(value);
    if (kind === 'hours') return `${value.toFixed(1)}h`;
    return number.format(value);
  }
  if (kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return value;
};

export const compareCells = (a: Cell, b: Cell): number => {
  if (a === b) return 0;
  if (a === null || a === '') return 1;
  if (b === null || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'en-IN', { numeric: true });
};

type BadgeTone = 'success' | 'error' | 'warning' | 'primary' | 'default';
const STATUS_TONES: Record<string, BadgeTone> = {
  present: 'success',
  approved: 'success',
  active: 'success',
  finalized: 'success',
  resolved: 'success',
  public: 'primary',
  absent: 'error',
  rejected: 'error',
  inactive: 'error',
  'half-day': 'warning',
  pending: 'warning',
  draft: 'warning',
  'in-progress': 'warning',
  'on leave': 'primary',
};
export const statusTone = (value: Cell): BadgeTone => STATUS_TONES[String(value).toLowerCase()] ?? 'default';
