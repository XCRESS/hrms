import type { IAskField, LetterKind } from '../../models/LetterTemplate.model.js';
import type { LetterDoc, LetterNode } from '../../validators/letter.schemas.js';
import { replaceTexts, type Candidate } from './detect.js';
import { AUTO_FIELDS, RECIPIENT_FIELDS, type FieldType } from './fields.js';
import type { FieldFormat } from './format.js';

export interface FieldSuggestion {
  /** Exact text from the letter. Lines of a multi-line value are separated by "\n". */
  text: string;
  field?: string;
  newDetail?: { label: string; type: FieldType; usualValue?: boolean };
  format?: FieldFormat;
}

export interface MappingResult {
  doc: LetterDoc;
  askFields: IAskField[];
  applied: Array<{ text: string; label: string; count: number }>;
  skipped: string[];
}

/** Keys a template of this kind may use from the catalogue. */
export const catalogueFor = (kind: LetterKind) =>
  kind === 'employee' ? AUTO_FIELDS : [...AUTO_FIELDS.filter((f) => f.group !== 'employee'), ...RECIPIENT_FIELDS];

/** camelCase key from a label, unique among `taken`. Mirrors the frontend's keyFromLabel. */
export const askKeyFromLabel = (label: string, taken: string[]): string => {
  const words = label.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const base = (words.map((w, i) => (i ? w[0]!.toUpperCase() + w.slice(1) : w)).join('') || 'field').replace(/^\d+/, '');
  const stem = /^[a-z]/.test(base) ? base : `field${base}`;
  let key = stem.slice(0, 36);
  for (let n = 2; taken.includes(key); n++) key = `${stem.slice(0, 33)}${n}`;
  return key;
};

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const plainText = (node: LetterNode): string =>
  node.type === 'text' ? node.text ?? '' : node.type === 'hardBreak' ? '\n' : (node.content ?? []).map(plainText).join('');

/** Folds runs of consecutive paragraphs whose text (one paragraph per line) equals a candidate into one field paragraph. */
const replaceParagraphRuns = (doc: LetterDoc, candidates: Candidate[], byText: Record<string, number>): LetterDoc => {
  const lines = candidates.map((c) => ({ c, lines: c.text.split('\n').map(normalize).filter(Boolean) })).filter((x) => x.lines.length > 1);
  if (!lines.length) return doc;

  const walk = (node: LetterNode): LetterNode => {
    if (!node.content) return node;
    const out: LetterNode[] = [];
    const kids = node.content.map(walk);
    for (let i = 0; i < kids.length; i++) {
      const hit = lines.find(({ lines: want }) =>
        want.every((line, j) => kids[i + j]?.type === 'paragraph' && normalize(plainText(kids[i + j]!)) === line)
      );
      if (!hit) {
        out.push(kids[i]!);
        continue;
      }
      const first = kids[i]!;
      const marks = first.content?.find((n) => n.type === 'text')?.marks;
      out.push({
        type: 'paragraph',
        ...(first.attrs ? { attrs: first.attrs } : {}),
        content: [{ type: 'field', attrs: { key: hit.c.key, ...(hit.c.format ? { format: hit.c.format } : {}) }, ...(marks?.length ? { marks } : {}) }],
      });
      byText[hit.c.text] = (byText[hit.c.text] ?? 0) + 1;
      i += hit.lines.length - 1;
    }
    return { ...node, content: out };
  };
  return walk(doc);
};

/** How many places each suggestion would replace, so HR sees when a text repeats. */
export const countSuggestionPlaces = (doc: LetterDoc, kind: LetterKind, suggestions: FieldSuggestion[]): number[] =>
  suggestions.map((s) => applyFieldMapping(doc, kind, [], [s]).applied[0]?.count ?? 0);

/**
 * Applies reviewed suggestions to a document: catalogue fields by key, new
 * details as ask fields. Text is matched exactly (whole words, any case), so
 * suggestions can never alter wording; ones that don't match are skipped.
 */
export const applyFieldMapping = (doc: LetterDoc, kind: LetterKind, existing: Pick<IAskField, 'key' | 'label'>[], suggestions: FieldSuggestion[]): MappingResult => {
  const allowed = new Map(catalogueFor(kind).map((f) => [f.key, f.label]));
  const taken = existing.map((f) => f.key);
  const newFields = new Map<string, IAskField>();
  const labels = new Map<string, string>();
  const candidates: Candidate[] = [];
  const skipped: string[] = [];

  for (const s of suggestions) {
    const text = s.text.replace(/\r/g, '');
    if (!text.trim()) continue;
    if (s.field && allowed.has(s.field)) {
      candidates.push({ key: s.field, text, ...(s.format ? { format: s.format } : {}) });
      labels.set(text, allowed.get(s.field)!);
    } else if (s.newDetail?.label.trim()) {
      const label = s.newDetail.label.trim().slice(0, 80);
      const sameLabel = [...newFields.values()].find((f) => f.label.toLowerCase() === label.toLowerCase()) ?? existing.find((f) => f.label.toLowerCase() === label.toLowerCase());
      const key = sameLabel?.key ?? askKeyFromLabel(label, [...taken, ...newFields.keys()]);
      if (!sameLabel) {
        newFields.set(key, {
          key,
          label,
          type: s.newDetail.type,
          required: !s.newDetail.usualValue,
          ...(s.newDetail.usualValue ? { default: text.slice(0, 500) } : {}),
        });
      }
      candidates.push({ key: `ask.${key}`, text, ...(s.format ? { format: s.format } : {}) });
      labels.set(text, label);
    } else {
      skipped.push(s.text);
    }
  }

  const inline = replaceTexts(doc, candidates);
  const result = replaceParagraphRuns(inline.doc, candidates.filter((c) => !inline.byText[c.text]), inline.byText);
  const appliedTexts = new Set(Object.keys(inline.byText));
  const usedKeys = new Set(candidates.filter((c) => appliedTexts.has(c.text)).map((c) => c.key));

  return {
    doc: result,
    askFields: [...newFields.values()].filter((f) => usedKeys.has(`ask.${f.key}`)),
    applied: candidates.filter((c) => appliedTexts.has(c.text)).map((c) => ({ text: c.text, label: labels.get(c.text) ?? c.key, count: inline.byText[c.text]! })),
    skipped: suggestions.map((s) => s.text).filter((text) => skipped.includes(text) || !appliedTexts.has(text.replace(/\r/g, ''))),
  };
};
