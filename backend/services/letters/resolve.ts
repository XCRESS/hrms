import { APIError, ValidationError } from '../../utils/errors.js';
import type { LetterDoc, LetterMark, LetterNode } from '../../validators/letter.schemas.js';
import type { FieldType } from './fields.js';
import { formatValue, type FieldFormat } from './format.js';

export interface ResolveResult {
  doc: LetterDoc;
  missing: string[];
  unknown: string[];
}

const walk = (node: LetterNode, visit: (n: LetterNode) => void): void => {
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
};

export const collectFieldKeys = (doc: LetterDoc): string[] => {
  const keys = new Set<string>();
  walk(doc, (n) => {
    if (n.type === 'field' && typeof n.attrs?.key === 'string') keys.add(n.attrs.key);
  });
  return [...keys];
};

const textNodes = (text: string, marks: LetterMark[]): LetterNode[] =>
  text.split('\n').flatMap((line, i) => [
    ...(i > 0 ? [{ type: 'hardBreak' }] : []),
    ...(line ? [{ type: 'text', text: line, ...(marks.length ? { marks } : {}) }] : []),
  ]);

/** Replaces field nodes with formatted text. Fields matching `keep` stay as field nodes. Never mutates `doc`. */
export const resolveFields = (
  doc: LetterDoc,
  values: Record<string, string>,
  types: Record<string, FieldType>,
  opts: { keep?: (key: string) => boolean } = {}
): ResolveResult => {
  const missing = new Set<string>();
  const unknown = new Set<string>();

  const resolveNode = (node: LetterNode): LetterNode[] => {
    if (node.type !== 'field') return [node.content ? { ...node, content: node.content.flatMap(resolveNode) } : node];

    const key = String(node.attrs?.key);
    if (opts.keep?.(key)) return [node];
    const type = types[key];
    if (!type) {
      unknown.add(key);
      return [node];
    }
    const raw = values[key]?.trim();
    if (!raw) {
      missing.add(key);
      return [node];
    }

    let parts;
    try {
      parts = formatValue(raw, type, (node.attrs?.format ?? undefined) as FieldFormat | undefined).parts;
    } catch (error) {
      throw new ValidationError(`${key}: ${error instanceof APIError ? error.message : 'invalid value'}`);
    }
    const marks = node.marks ?? [];
    return parts.flatMap((part) => textNodes(part.text, part.sup ? [...marks, { type: 'superscript' }] : marks));
  };

  const [resolved] = resolveNode(doc);
  return { doc: resolved ?? doc, missing: [...missing], unknown: [...unknown] };
};

/** "employee.joiningDate" → "Joining date", for keys with no catalogue label. */
export const humanizeKey = (key: string): string => {
  const words = (key.split('.').pop() ?? key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Throws a message HR can act on, naming fields by their labels. */
export const assertResolvable = ({ missing, unknown }: ResolveResult, labels: Record<string, string> = {}): void => {
  const name = (key: string) => labels[key] ?? humanizeKey(key);
  const problems = [
    ...(unknown.length ? [`This uses details that don’t exist: ${unknown.map(name).join(', ')}. Remove them from the text`] : []),
    ...(missing.length ? [`Please fill in: ${missing.map(name).join(', ')}`] : []),
  ];
  if (problems.length) throw new ValidationError(`${problems.join('. ')}.`);
};
