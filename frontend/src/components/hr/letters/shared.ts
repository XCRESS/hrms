import type { AskField, FieldDef, LetterDoc, LetterFields, LetterKind } from '@/types/letters';
import type { FieldOption } from './editor/fieldContext';

const GROUP_LABEL: Record<FieldDef['group'], string> = {
  employee: 'Employee',
  recipient: 'Recipient',
  company: 'Company',
  letter: 'Letter',
  signatory: 'Signatory',
};

export const ASK_GROUP = 'Details to fill in';

/** Every field a template of this kind may use, in picker order. */
export const fieldOptionsFor = (kind: LetterKind, catalogue: LetterFields | undefined, askFields: AskField[]): FieldOption[] => {
  const auto = (catalogue?.auto ?? []).filter((f) => kind === 'employee' || f.group !== 'employee');
  const recipient = kind === 'manual' ? (catalogue?.recipient ?? []) : [];
  return [
    ...auto.map((f) => ({ key: f.key, label: f.label, type: f.type, source: 'auto' as const, group: GROUP_LABEL[f.group] })),
    ...recipient.map((f) => ({ key: f.key, label: f.label, type: f.type, source: 'recipient' as const, group: GROUP_LABEL[f.group] })),
    ...askFields.map((f) => ({ key: `ask.${f.key}`, label: f.label, type: f.type, source: 'ask' as const, group: ASK_GROUP })),
  ];
};

/** camelCase key from a label, unique among `taken`. */
export const keyFromLabel = (label: string, taken: string[]): string => {
  const words = label.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const base = (words.map((w, i) => (i ? w[0]!.toUpperCase() + w.slice(1) : w)).join('') || 'field').replace(/^\d+/, '');
  const stem = /^[a-z]/.test(base) ? base : `field${base}`;
  let key = stem.slice(0, 36);
  for (let n = 2; taken.includes(key); n++) key = `${stem.slice(0, 33)}${n}`;
  return key;
};

/** Field keys used in a document, in order of first appearance. */
export const collectFieldKeys = (doc: LetterDoc | null | undefined): string[] => {
  const keys = new Set<string>();
  const walk = (node: LetterDoc) => {
    if (node.type === 'field' && typeof node.attrs?.key === 'string') keys.add(node.attrs.key);
    node.content?.forEach(walk);
  };
  if (doc) walk(doc);
  return [...keys];
};

/** Copy of `doc` without the field nodes whose key `drop` matches. */
export const removeFields = (doc: LetterDoc, drop: (key: string) => boolean): LetterDoc => ({
  ...doc,
  ...(doc.content && {
    content: doc.content
      .filter((node) => !(node.type === 'field' && typeof node.attrs?.key === 'string' && drop(node.attrs.key)))
      .map((node) => removeFields(node, drop)),
  }),
});

export const hasContent = (doc: LetterDoc): boolean =>
  doc.type === 'text' ? Boolean(doc.text?.trim()) : doc.type === 'field' || doc.type === 'table' || Boolean(doc.content?.some(hasContent));

export const errorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  const response = (error as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message ?? (error instanceof Error ? error.message : fallback);
};

export const STATUS_LABEL = { draft: 'Draft', issuing: 'Issuing', issued: 'Issued', sent: 'Sent', void: 'Void' } as const;
export const STATUS_VARIANT = { draft: 'default', issuing: 'warning', issued: 'primary', sent: 'success', void: 'error' } as const;
