import type { LetterDoc, LetterMark, LetterNode } from '../../validators/letter.schemas.js';
import type { FieldType } from './fields.js';
import { formatValue, type FieldFormat } from './format.js';

interface Candidate {
  key: string;
  text: string;
  format?: FieldFormat;
}

interface Segment {
  text: string;
  node: LetterNode;
}

const MIN_LENGTH = 3;
const SALUTATION_KEY = 'employee.salutation';
const NAME_KEY = 'employee.fullName';
const ROLE_MARKS = new Set(['superscript', 'subscript']);
/** Separates non-text inline nodes so a match can never span them. */
const BARRIER = '\u0000';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const variants = (key: string, raw: string, type: FieldType): Candidate[] => {
  const text = (format?: FieldFormat) => formatValue(raw, type, format).parts.map((p) => p.text).join('');
  try {
    if (type === 'date') return [{ key, text: text('ordinal'), format: 'ordinal' }, { key, text: text('long') }, { key, text: text('dotted'), format: 'dotted' }];
    if (type === 'money') return [{ key, text: text('words'), format: 'words' }, { key, text: text('inr') }];
    if (type === 'longText') return [];
    return [{ key, text: raw.trim() }];
  } catch {
    return [];
  }
};

const fieldNode = (candidate: Candidate, marks: LetterMark[] | undefined): LetterNode => {
  const kept = (marks ?? []).filter((m) => !ROLE_MARKS.has(m.type));
  return {
    type: 'field',
    attrs: { key: candidate.key, ...(candidate.format ? { format: candidate.format } : {}) },
    ...(kept.length ? { marks: kept } : {}),
  };
};

/**
 * Replaces the given person's details, wherever they appear in the text, with
 * field nodes — so a real letter written for someone becomes a template.
 * Matching is whole-word and case-insensitive; longer values win over the
 * shorter values they contain (full name before first name).
 */
export const detectFields = (
  doc: LetterDoc,
  values: Record<string, string>,
  types: Record<string, FieldType>
): { doc: LetterDoc; found: Record<string, number> } => {
  const found: Record<string, number> = {};
  const candidates = Object.entries(values)
    .filter(([key, raw]) => key !== SALUTATION_KEY && raw?.trim() && types[key])
    .flatMap(([key, raw]) => variants(key, raw, types[key]!))
    .filter((c) => c.text.length >= MIN_LENGTH)
    .sort((a, b) => b.text.length - a.text.length);
  const salutation = values[SALUTATION_KEY]?.trim();

  const textblock = (node: LetterNode): LetterNode => {
    const segments: Segment[] = (node.content ?? []).map((child) => ({ node: child, text: child.type === 'text' ? child.text ?? '' : BARRIER }));
    const joined = segments.map((s) => s.text).join('');
    const taken = new Array<boolean>(joined.length).fill(false);
    const matches: Array<{ start: number; end: number; candidate: Candidate }> = [];

    for (const candidate of candidates) {
      const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(candidate.text)}(?![\\p{L}\\p{N}])`, 'giu');
      for (const m of joined.matchAll(pattern)) {
        const start = m.index;
        const end = start + m[0].length;
        if (taken.slice(start, end).some(Boolean)) continue;
        taken.fill(true, start, end);
        matches.push({ start, end, candidate });

        if (candidate.key === NAME_KEY && salutation) {
          const before = new RegExp(`${escapeRegExp(salutation)}(\\s+)$`, 'i').exec(joined.slice(0, start));
          if (before && !taken.slice(before.index, start).some(Boolean)) {
            taken.fill(true, before.index, start);
            matches.push({ start: before.index, end: before.index + salutation.length, candidate: { key: SALUTATION_KEY, text: salutation } });
          }
        }
      }
    }
    if (!matches.length) return node;
    matches.sort((a, b) => a.start - b.start);

    const content: LetterNode[] = [];
    let offset = 0;
    let next = 0;
    const emitted = new Set<number>();
    for (const segment of segments) {
      const segStart = offset;
      const segEnd = offset + segment.text.length;
      offset = segEnd;
      if (segment.node.type !== 'text') {
        content.push(segment.node);
        continue;
      }
      let cursor = segStart;
      while (cursor < segEnd) {
        const match = matches[next];
        if (!match || match.start >= segEnd) {
          content.push({ ...segment.node, text: joined.slice(cursor, segEnd) });
          cursor = segEnd;
        } else if (match.start > cursor) {
          content.push({ ...segment.node, text: joined.slice(cursor, match.start) });
          cursor = match.start;
        } else {
          if (!emitted.has(next)) {
            content.push(fieldNode(match.candidate, segment.node.marks));
            found[match.candidate.key] = (found[match.candidate.key] ?? 0) + 1;
            emitted.add(next);
          }
          cursor = Math.min(match.end, segEnd);
          if (match.end <= segEnd) next++;
        }
      }
    }
    return { ...node, content };
  };

  const walk = (node: LetterNode): LetterNode => {
    if (node.type === 'paragraph' || node.type === 'heading') return textblock(node);
    return node.content ? { ...node, content: node.content.map(walk) } : node;
  };

  return { doc: walk(doc), found };
};
