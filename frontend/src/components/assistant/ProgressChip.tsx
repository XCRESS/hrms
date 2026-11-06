import { useToolCallElapsed } from '@assistant-ui/react';
import { Loader2 } from 'lucide-react';
import { toolLabel, type Args } from './toolLabels';

export function ProgressChip({ toolName, args }: { toolName: string; args: Args }) {
  const elapsed = useToolCallElapsed();
  return (
    <div className="my-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground" role="status">
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
      <span>{toolLabel(toolName, args)}</span>
      {elapsed !== undefined && elapsed >= 2000 && <span className="tabular-nums">{Math.round(elapsed / 1000)}s</span>}
    </div>
  );
}
