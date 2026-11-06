import { cn } from '@/lib/utils';
import type { Tile, TileFilter } from '../types';
import { formatCell } from './format';

const TONE_TEXT: Record<NonNullable<Tile['tone']>, string> = {
  neutral: 'text-foreground',
  positive: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  negative: 'text-destructive',
};

const sameFilter = (a: TileFilter | null, b: TileFilter | undefined) => !!a && !!b && a.column === b.column && a.equals === b.equals;

interface Props {
  tiles: Tile[];
  active: TileFilter | null;
  onSelect: (filter: TileFilter | null) => void;
}

export function StatTiles({ tiles, active, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))]">
      {tiles.map((tile) => {
        const isActive = sameFilter(active, tile.filter);
        const content = (
          <>
            <span className="text-xs text-muted-foreground">{tile.label}</span>
            <span className={cn('text-xl font-semibold tabular-nums', TONE_TEXT[tile.tone ?? 'neutral'])}>{formatCell(tile.value, tile.kind)}</span>
          </>
        );
        const base = 'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left';
        return tile.filter ? (
          <button
            key={tile.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(isActive ? null : tile.filter!)}
            className={cn(
              base,
              'transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive ? 'border-primary bg-primary/5' : 'border-border bg-background'
            )}
          >
            {content}
          </button>
        ) : (
          <div key={tile.key} className={cn(base, 'border-border bg-background')}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
