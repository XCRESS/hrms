import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { UIMessage } from 'ai';
import type { ReceiptInput } from '../../validators/assistant.schemas.js';
import type { ModelOutput } from './views.js';

export const BULK_CONFIRM_THRESHOLD = 20;

export type DraftKind =
  | 'announcement'
  | 'email'
  | 'holiday'
  | 'taskReportCheckout'
  | 'leave'
  | 'wfh'
  | 'regularization'
  | 'help'
  | 'approval'
  | 'salaryStructure'
  | 'salarySlip'
  | 'salaryBatch'
  | 'roleChange'
  | 'employeeStatus'
  | 'attendanceFix';

export type Receipt = ReceiptInput;

export interface Draft<F = Record<string, unknown>> {
  kind: 'draft';
  draftKind: DraftKind;
  draftId: string;
  revision: number;
  fields: F;
  issues: string[];
  notes?: string;
  alternatives?: { label: string; fields: Partial<F> }[];
  bulk?: { count: number; requiresSecondConfirm: boolean };
  receipt?: Receipt;
}

export const newDraftId = (): string => `d_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

export const checkAgainst = (schema: z.ZodType, fields: unknown): string[] => {
  const result = schema.safeParse(fields);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

const isDraftPart = (part: unknown, draftId: string): part is { output: Draft } => {
  const output = (part as { output?: Partial<Draft> } | null)?.output;
  return typeof output === 'object' && output !== null && output.kind === 'draft' && output.draftId === draftId;
};

/** Reuses `draftId` (next revision) when it names a draft in this thread, otherwise starts a new one. */
export const nextDraftIdentity = (history: UIMessage[], draftId: string | null | undefined): { draftId: string; revision: number } => {
  if (draftId) {
    let latest = 0;
    for (const message of history) {
      for (const part of message.parts) {
        if (isDraftPart(part, draftId)) latest = Math.max(latest, part.output.revision);
      }
    }
    if (latest > 0) return { draftId, revision: latest + 1 };
  }
  return { draftId: newDraftId(), revision: 1 };
};

export const draftForModel = <F>(draft: Draft<F>): ModelOutput => ({
  type: 'json',
  value: {
    draftId: draft.draftId,
    draftKind: draft.draftKind,
    revision: draft.revision,
    issues: draft.issues,
    ...(draft.notes ? { notes: draft.notes } : {}),
    ...(draft.bulk ? { selectedCount: draft.bulk.count } : {}),
    ...(draft.receipt ? { receipt: { summary: draft.receipt.summary, at: draft.receipt.at } } : {}),
    note: 'Shown to the user as an editable block. Nothing is saved until they confirm it; do not claim it was done.',
  },
});
