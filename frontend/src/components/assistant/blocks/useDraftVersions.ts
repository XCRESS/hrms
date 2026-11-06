import { useRef, useState } from 'react';

const COALESCE_MS = 800;

/**
 * Undo/redo over one draft. The timeline is each AI revision followed by the
 * user's edits made on top of it; new AI revisions append and become current.
 */
export function useDraftVersions<F>(aiRevisions: F[]) {
  const [edits, setEdits] = useState<Record<number, F[]>>({});
  const [cursor, setCursor] = useState<number | null>(null);
  const lastEditAt = useRef(0);

  const timeline = aiRevisions.flatMap((revision, i) => [revision, ...(edits[i] ?? [])]);
  const position = cursor === null ? timeline.length - 1 : Math.min(cursor, timeline.length - 1);
  const latestRevision = aiRevisions.length - 1;

  const edit = (next: F) => {
    const now = Date.now();
    const coalesce = cursor === null && now - lastEditAt.current < COALESCE_MS && (edits[latestRevision]?.length ?? 0) > 0;
    lastEditAt.current = now;
    setEdits((prev) => {
      const list = prev[latestRevision] ?? [];
      return { ...prev, [latestRevision]: coalesce ? [...list.slice(0, -1), next] : [...list, next] };
    });
    setCursor(null);
  };

  return {
    current: timeline[position] as F,
    edit,
    undo: () => setCursor(Math.max(0, position - 1)),
    redo: () => setCursor(position + 1 >= timeline.length - 1 ? null : position + 1),
    /** Before asking the AI for a revision, so the new revision shows when it lands. */
    followLatest: () => setCursor(null),
    canUndo: position > 0,
    canRedo: position < timeline.length - 1,
  };
}
