import type { ReactNode } from 'react';
import { useAuiState } from '@assistant-ui/react';
import { isDraft } from '../types';
import { DraftRegistryContext, type DraftEntry } from './draftEntries';

/** Every revision of every draft on the current branch, oldest first, so a draft renders once and updates in place. */
export function DraftRegistryProvider({ children }: { children: ReactNode }) {
  const messages = useAuiState((s) => s.thread.messages);
  const registry = new Map<string, DraftEntry[]>();
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== 'tool-call' || !isDraft(part.result)) continue;
      const entries = registry.get(part.result.draftId) ?? [];
      entries.push({ messageId: message.id, toolCallId: part.toolCallId, draft: part.result });
      registry.set(part.result.draftId, entries);
    }
  }
  return <DraftRegistryContext.Provider value={registry}>{children}</DraftRegistryContext.Provider>;
}
