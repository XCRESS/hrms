import type { ReactNode } from 'react';
import { AlertCircle, Info, Maximize2, Redo2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Versions {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

interface Props {
  anchorId: string;
  title: string;
  subtitle?: string;
  notes?: string;
  issues?: string[];
  error?: string | null;
  versions?: Versions;
  onExpand?: () => void;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

const iconButton =
  'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30';

export function DraftFrame({ anchorId, title, subtitle, notes, issues = [], error, versions, onExpand, footer, children, className }: Props) {
  return (
    <section id={anchorId} className={cn('my-3 scroll-mt-4 rounded-xl border border-border bg-card text-card-foreground shadow-sm', className)} aria-label={title}>
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center">
          {versions && (
            <>
              <button type="button" className={iconButton} onClick={versions.undo} disabled={!versions.canUndo} aria-label="Undo">
                <Undo2 className="size-4" />
              </button>
              <button type="button" className={iconButton} onClick={versions.redo} disabled={!versions.canRedo} aria-label="Redo">
                <Redo2 className="size-4" />
              </button>
            </>
          )}
          {onExpand && (
            <button type="button" className={iconButton} onClick={onExpand} aria-label="Open full-screen editor">
              <Maximize2 className="size-4" />
            </button>
          )}
        </div>
      </header>

      <div className="space-y-3 px-4 py-3">
        {notes && (
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {notes}
          </p>
        )}
        {children}
        {issues.length > 0 && (
          <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-400">
            {issues.map((issue) => (
              <li key={issue} className="flex items-start gap-1.5">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {issue}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>

      {footer && <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">{footer}</footer>}
    </section>
  );
}
