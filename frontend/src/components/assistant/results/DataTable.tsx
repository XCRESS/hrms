import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Cell, ColumnSpec } from '../types';
import { compareCells, formatCell, statusTone } from './format';

const PAGE = 10;

interface Props {
  columns: ColumnSpec[];
  rows: Record<string, Cell>[];
}

export function DataTable({ columns, rows }: Props) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [visible, setVisible] = useState(PAGE);

  const sorted = sort ? [...rows].sort((a, b) => compareCells(a[sort.key] ?? null, b[sort.key] ?? null) * (sort.dir === 'asc' ? 1 : -1)) : rows;
  const shown = sorted.slice(0, visible);
  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));

  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">Nothing to show.</p>;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((c) => {
                const dir = sort?.key === c.key ? sort.dir : null;
                const numeric = c.kind === 'number' || c.kind === 'currency' || c.kind === 'hours';
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
                    className={cn('whitespace-nowrap px-3 py-2 font-medium text-muted-foreground', numeric ? 'text-right' : 'text-left')}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn('inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', numeric && 'flex-row-reverse')}
                    >
                      {c.label}
                      {dir === 'asc' ? <ArrowUp className="size-3" /> : dir === 'desc' ? <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-40" />}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={String(row.id ?? i)} className="border-t border-border">
                {columns.map((c) => {
                  const value = row[c.key] ?? null;
                  const numeric = c.kind === 'number' || c.kind === 'currency' || c.kind === 'hours';
                  return (
                    <td key={c.key} className={cn('px-3 py-2 align-top', numeric || c.kind === 'date' || c.kind === 'time' || c.kind === 'status' ? 'whitespace-nowrap' : 'min-w-28 max-w-80 break-words', numeric ? 'text-right tabular-nums' : 'text-left', c.key === 'name' && 'font-medium')}>
                      {c.kind === 'status' && value !== null ? (
                        <Badge variant={statusTone(value)} className="capitalize">
                          {String(value)}
                        </Badge>
                      ) : (
                        formatCell(value, c.kind)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + 50)}
          className="mt-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {sorted.length - visible <= 50 ? `Show ${sorted.length - visible} more` : `Show 50 more (${sorted.length - visible} hidden)`}
        </button>
      )}
    </div>
  );
}
