import { useState } from 'react';
import { Link } from 'react-router';
import { BarChart3, ExternalLink, FileSpreadsheet, FileType2, Loader2, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExportTable } from '@/hooks/queries/useAssistant';
import { cn } from '@/lib/utils';
import type { Cell, ColumnSpec, ResultView, Tile, TileFilter } from '../types';
import { StatTiles } from './StatTiles';
import { DataTable } from './DataTable';
import { ResultChart } from './ResultChart';

interface BodyProps {
  view: ResultView;
  columns: ColumnSpec[];
  rows: Record<string, Cell>[];
  tiles: Tile[];
  exportTitle: string;
}

function ResultBody({ view, columns, rows: allRows, tiles, exportTitle }: BodyProps) {
  const [filter, setFilter] = useState<TileFilter | null>(null);
  const [mode, setMode] = useState<'table' | 'chart'>(view.chart ? view.defaultView : 'table');
  const exportTable = useExportTable();

  const rows = filter ? allRows.filter((r) => String(r[filter.column] ?? '') === filter.equals) : allRows;
  const hasRows = columns.length > 0 && allRows.length > 0;

  return (
    <div className="space-y-3">
      {hasRows && (
        <div className="flex flex-wrap items-center justify-end gap-1">
          {view.chart && (
            <div className="mr-auto flex rounded-md border border-border p-0.5" role="group" aria-label="View">
              {(['chart', 'table'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    mode === m ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m === 'chart' ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
                  {m === 'chart' ? 'Chart' : 'Table'}
                </button>
              ))}
            </div>
          )}
          {(['xlsx', 'pdf'] as const).map((format) => {
            const busy = exportTable.isPending && exportTable.variables?.format === format;
            const Icon = busy ? Loader2 : format === 'xlsx' ? FileSpreadsheet : FileType2;
            return (
              <Button
                key={format}
                variant="ghost"
                size="sm"
                disabled={exportTable.isPending}
                aria-label={`Download as ${format === 'xlsx' ? 'Excel' : 'PDF'}`}
                onClick={() =>
                  exportTable.mutate({
                    format,
                    title: exportTitle,
                    ...(view.subtitle ? { subtitle: view.subtitle } : {}),
                    columns: columns.map((c) => ({ label: c.label, kind: c.kind })),
                    rows: rows.map((r) => columns.map((c) => r[c.key] ?? null)),
                  })
                }
              >
                <Icon className={busy ? 'size-3.5 animate-spin' : 'size-3.5'} />
                {format === 'xlsx' ? 'Excel' : 'PDF'}
              </Button>
            );
          })}
        </div>
      )}

      {tiles.length > 0 && <StatTiles tiles={tiles} active={filter} onSelect={setFilter} />}

      {hasRows &&
        (mode === 'chart' && view.chart ? <ResultChart spec={view.chart} columns={columns} rows={rows} /> : <DataTable columns={columns} rows={rows} />)}
    </div>
  );
}

/** Tiles for one tab: counts and sums are recomputed from that tab's rows; anything else can't be, so it's dropped. */
const tilesFor = (tiles: Tile[], rows: Record<string, Cell>[]): Tile[] =>
  tiles.flatMap((t) => {
    if (t.filter) return [{ ...t, value: rows.filter((r) => String(r[t.filter!.column] ?? '') === t.filter!.equals).length }];
    if (t.sumOf) return [{ ...t, value: Math.round(rows.reduce((s, r) => s + (Number(r[t.sumOf!]) || 0), 0) * 100) / 100 }];
    if (t.key === 'count') return [{ ...t, value: rows.length }];
    return [];
  });

export function ResultBlock({ view }: { view: ResultView }) {
  const splitBy = view.splitBy;
  const groups = splitBy ? [...new Set(view.rows.map((r) => String(r[splitBy] ?? '—')))] : [];
  const tabbed = Boolean(splitBy) && groups.length > 1;

  return (
    <section className="my-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm" aria-label={view.title}>
      <header className="mb-3 min-w-0">
        <h3 className="text-sm font-semibold">{view.title}</h3>
        {view.subtitle && <p className="text-xs text-muted-foreground">{view.subtitle}</p>}
      </header>

      {tabbed ? (
        <Tabs defaultValue="__all">
          <div className="-mx-1 mb-3 overflow-x-auto px-1">
            <TabsList className="h-auto w-max">
              <TabsTrigger value="__all">All</TabsTrigger>
              {groups.map((g) => (
                <TabsTrigger key={g} value={g}>
                  {g}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="__all">
            <ResultBody view={view} columns={view.columns} rows={view.rows} tiles={view.tiles ?? []} exportTitle={view.title} />
          </TabsContent>
          {groups.map((g) => {
            const rows = view.rows.filter((r) => String(r[splitBy!] ?? '—') === g);
            return (
              <TabsContent key={g} value={g}>
                <ResultBody
                  view={view}
                  columns={view.columns.filter((c) => c.key !== splitBy)}
                  rows={rows}
                  tiles={tilesFor(view.tiles ?? [], rows)}
                  exportTitle={`${view.title} · ${g}`}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <ResultBody view={view} columns={view.columns} rows={view.rows} tiles={view.tiles ?? []} exportTitle={view.title} />
      )}

      {view.link && (
        <Link to={view.link.href} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          {view.link.label}
          <ExternalLink className="size-3" />
        </Link>
      )}
    </section>
  );
}
