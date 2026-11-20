import type { JSONContent } from '@tiptap/react';

export type LetterDoc = JSONContent;
export type LetterKind = 'employee' | 'manual';
export type LetterStatus = 'draft' | 'issuing' | 'issued' | 'sent' | 'void';
export type FieldType = 'text' | 'longText' | 'date' | 'money' | 'number';
export type FieldFormat = 'long' | 'ordinal' | 'dotted' | 'inr' | 'words' | 'upper';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  group: 'employee' | 'company' | 'letter' | 'signatory' | 'recipient';
}

export interface LetterFields {
  auto: FieldDef[];
  recipient: FieldDef[];
}

export interface AskField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  default?: string;
}

export interface LetterTemplateSummary {
  _id: string;
  name: string;
  kind: LetterKind;
  company: string;
  askFields: AskField[];
  email: { subject: string; body: string };
  active: boolean;
  updatedAt: string;
}

export interface LetterTemplate extends LetterTemplateSummary {
  body: LetterDoc;
}

export interface LetterTemplateInput {
  name: string;
  kind: LetterKind;
  company: string;
  body: LetterDoc;
  askFields: AskField[];
  email: { subject: string; body: string };
}

export type PageSize = 'A4' | 'Letter';

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Letterhead {
  company: string;
  marginsMm: Margins;
  signatory: { name: string; designation: string };
  referencePrefix: string;
  pageSize: PageSize;
  hasPdf: boolean;
  updatedAt: string;
}

export interface LetterheadInput {
  companyId: string;
  pdf?: File;
  data: { marginsMm: Margins; signatory: { name: string; designation: string }; referencePrefix: string };
}

export interface LetterSend {
  to: string;
  at: string;
  by: string;
}

export interface LetterSummary {
  _id: string;
  template: string;
  templateName: string;
  company: string;
  kind: LetterKind;
  employee?: string;
  recipient: { name: string; email?: string; address?: string };
  status: LetterStatus;
  referenceNo?: string;
  issuedAt?: string;
  sends: LetterSend[];
  voidReason?: string;
  createdAt: string;
}

export interface Letter extends LetterSummary {
  values: Record<string, string>;
  body?: LetterDoc | null;
  employeeCompanyMismatch?: boolean;
}

export interface MyLetter {
  _id: string;
  templateName: string;
  referenceNo?: string;
  issuedAt?: string;
  status: LetterStatus;
}

export interface LetterListParams {
  status?: Exclude<LetterStatus, 'issuing'>;
  template?: string;
  q?: string;
  page?: number;
}

export interface LetterList {
  letters: LetterSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateLetterInput {
  template: string;
  employee?: string;
  recipient?: { name: string; email: string; address?: string };
  values?: Record<string, string>;
}

export interface ImportedLetter {
  doc: LetterDoc;
  found: Array<{ key: string; label: string; count: number }>;
  warnings: string[];
}
