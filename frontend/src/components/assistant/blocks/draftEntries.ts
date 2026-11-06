import { createContext, useContext } from 'react';
import type { Draft } from '../types';

export interface DraftEntry {
  messageId: string;
  toolCallId: string;
  draft: Draft;
}

export const DraftRegistryContext = createContext<ReadonlyMap<string, DraftEntry[]>>(new Map());

export const useDraftEntries = (draftId: string): DraftEntry[] => useContext(DraftRegistryContext).get(draftId) ?? [];

export const lastOf = <T,>(list: readonly T[]): T => list[list.length - 1]!;
