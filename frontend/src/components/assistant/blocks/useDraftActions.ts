import { useState } from 'react';
import { useAui, useAuiState } from '@assistant-ui/react';
import { asAssistantAction } from '@/lib/assistantAudit';
import { useSaveReceipt } from '@/hooks/queries/useAssistant';
import type { ApiError } from '@/types';
import type { Draft, Receipt } from '../types';
import type { DraftEntry } from './draftEntries';

const errorMessage = (error: unknown): string => {
  const e = error as Partial<ApiError> & { message?: string };
  return e?.validationDetails?.[0]?.message ?? e?.message ?? 'Something went wrong. Please try again.';
};

/** Asks the model to revise a draft, sending the block's current fields (with the user's edits) and any selection. */
export function useReviseDraft(draft: Draft) {
  const aui = useAui();
  return (instruction: string, fields: unknown, selection?: string) => {
    aui.thread.append({
      role: 'user',
      content: [
        { type: 'text', text: instruction },
        {
          type: 'data',
          name: 'draft-context',
          data: { draftId: draft.draftId, draftKind: draft.draftKind, fields, ...(selection ? { selection } : {}) },
        },
      ],
    });
  };
}

export type CommitOutcome = Omit<Receipt, 'at'>;

/** Runs a commit through the app's own mutation hooks, tagged for the audit log, then saves a receipt into the thread. */
export function useDraftCommit(latest: DraftEntry | undefined) {
  const threadId = useAuiState((s) => s.threadListItem.remoteId);
  const saveReceipt = useSaveReceipt();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localReceipt, setLocalReceipt] = useState<Receipt | null>(null);

  const commit = async (run: () => Promise<CommitOutcome>) => {
    if (!threadId) return;
    setPending(true);
    setError(null);
    try {
      const outcome = await asAssistantAction(threadId, run);
      const receipt: Receipt = { ...outcome, at: new Date().toISOString() };
      setLocalReceipt(receipt);
      if (latest) saveReceipt.mutate({ threadId, messageId: latest.messageId, toolCallId: latest.toolCallId, receipt });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return { commit, pending, error, setError, receipt: localReceipt ?? latest?.draft.receipt ?? null };
}
