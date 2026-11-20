import { createContext, useContext } from 'react';
import type { FieldDef } from '@/types/letters';

export type FieldSource = 'auto' | 'recipient' | 'ask';
export type FieldOption = Pick<FieldDef, 'key' | 'label' | 'type'> & { source: FieldSource; group: string };

export interface FieldContextValue {
  fields: Map<string, FieldOption>;
  mode: 'template' | 'letter';
}

export const FieldContext = createContext<FieldContextValue>({ fields: new Map(), mode: 'template' });

export const useFieldContext = () => useContext(FieldContext);

export const LETTER_PLACEHOLDERS: Record<string, string> = {
  'letter.referenceNo': 'Reference no. (assigned on issue)',
  'letter.date': 'Letter date (issue date)',
};
