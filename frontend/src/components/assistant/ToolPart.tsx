import type { ToolCallMessagePartProps } from '@assistant-ui/react';
import { AlertCircle, UserRound } from 'lucide-react';
import { isDraft, isFileResult, isResultView, isToolError } from './types';
import { FileCard } from './FileCard';
import { ProgressChip } from './ProgressChip';
import { toolLabel } from './toolLabels';
import { ResultBlock } from './results/ResultBlock';
import { DraftPart } from './blocks/DraftPart';

export function ToolPart({ toolName, args, result, status, toolCallId, isError }: ToolCallMessagePartProps) {
  if (status.type === 'running' && result === undefined) return <ProgressChip toolName={toolName} args={args} />;

  if (isError || (status.type === 'incomplete' && result === undefined)) {
    if (status.type === 'incomplete' && status.reason === 'cancelled') return null;
    return (
      <p className="my-2 flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="size-4" aria-hidden />
        {toolLabel(toolName, args)} didn't finish.
      </p>
    );
  }

  // Name lookups that only resolve who the user meant read as a chip, like any other progress step.
  if (toolName === 'find_employee' && isResultView(result) && result.rows.length <= 3) {
    const query = typeof args.query === 'string' ? args.query : '';
    return (
      <div className="my-1 flex flex-wrap gap-1.5">
        {result.rows.length === 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <UserRound className="size-3.5" aria-hidden />
            No one called “{query}”
          </span>
        ) : (
          result.rows.map((r) => (
            <span key={String(r.id)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <UserRound className="size-3.5" aria-hidden />
              Found <span className="font-medium text-foreground">{String(r.name)}</span>
              {r.position ? ` · ${String(r.position)}` : ''}
            </span>
          ))
        )}
      </div>
    );
  }

  if (isFileResult(result)) return <FileCard file={result} />;
  if (isToolError(result)) {
    return (
      <p className="my-2 flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="size-4" aria-hidden />
        {result.message}
      </p>
    );
  }
  if (isResultView(result)) return <ResultBlock view={result} />;
  if (isDraft(result)) return <DraftPart draft={result} toolName={toolName} toolCallId={toolCallId} />;
  return null;
}
