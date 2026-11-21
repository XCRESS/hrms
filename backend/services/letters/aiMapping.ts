import { generateText, Output } from 'ai';
import { z } from 'zod';
import type { UserRole } from '../../types/index.js';
import type { LetterKind } from '../../models/LetterTemplate.model.js';
import type { LetterDoc, LetterNode } from '../../validators/letter.schemas.js';
import { FIELD_TYPES } from '../../validators/letter.schemas.js';
import type { FieldType } from './fields.js';
import { ServiceUnavailableError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import { assistantModel, assistantProviderOptions } from '../assistant/model.js';
import { catalogueFor, type FieldSuggestion } from './mapping.js';

const MAX_TEXT = 24_000;
const MAX_SUGGESTIONS = 80;
const MAX_ATTEMPTS = 3;
const MIN_EXPECTED = 4;
const SHORT_LETTER = 300;
const QUOTES = /^["'“”‘’]+|["'“”‘’]+$/g;

type SuggestionOutput = z.infer<typeof suggestionSchema>;

// Kept deliberately bare: with a maxItems limit, field descriptions or enums, the model often stopped after one item.
export const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      text: z.string(),
      field: z.string().nullable(),
      newDetailLabel: z.string().nullable(),
      newDetailType: z.string().nullable(),
      usualValue: z.boolean(),
    })
  ),
});

const INSTRUCTIONS = `You turn a real letter that HR already sent into a reusable template.
Find every piece of text that would be different in the next letter of the same kind: the person's name and initials, salutation, employee code, address, position, department, joining or other dates, salary and amounts, grade or band, posting city, notice and probation periods, the letter's own date and reference number, the company name and the signatory.
Rules:
- Copy each text exactly as it appears, including punctuation and capitals. Never paraphrase.
- Select only the part that changes, never a label or title in front of it. For example, from "Staff No: AB-12" select "AB-12"; from "Ms. Priya Nair" select "Ms." as the salutation and "Priya Nair" as the full name.
- Prefer a listed field when its meaning matches; otherwise propose a new detail with a short label.
- Do not select fixed wording that every letter repeats (clauses, legal text, headings), and do not select text already shown as [field: …].
- A date the letter is written on is letter.date; the reference number is letter.referenceNo.
- List each distinct text once, and return the complete list: a typical letter has 8 to 20 such texts.
For each item: text is the exact text (use \\n between the lines of a multi-line value such as an address); field is a listed key or null; when field is null, newDetailLabel is a short plain-English name (e.g. "Grade") and newDetailType is one of text, longText, date, money, number; usualValue is true when the text is the value most letters would use (e.g. "3 months" probation).`;

const lineText = (node: LetterNode): string => {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'field') return `[field: ${String(node.attrs?.key)}]`;
  return (node.content ?? []).map(lineText).join('');
};

/** One line per paragraph; table cells separated by " | ". */
export const letterText = (doc: LetterDoc): string => {
  const lines: string[] = [];
  const walk = (node: LetterNode) => {
    if (node.type === 'paragraph' || node.type === 'heading') lines.push(lineText(node));
    else if (node.type === 'tableRow') lines.push((node.content ?? []).map((cell) => (cell.content ?? []).map(lineText).join(' ')).join(' | '));
    else node.content?.forEach(walk);
  };
  walk(doc);
  return lines.join('\n');
};

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** The format that reproduces the text as written, so "1st July 2025" stays ordinal. */
const inferFormat = (text: string, type: string | null | undefined): FieldSuggestion['format'] => {
  if (type === 'date') {
    if (/^\d{1,2}(st|nd|rd|th)\b/i.test(text)) return 'ordinal';
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(text)) return 'dotted';
    return undefined;
  }
  if (type === 'money' && /rupees/i.test(text)) return 'words';
  return undefined;
};

/** Asks the assistant model which texts in the letter should become fields. Suggestions only; nothing is applied here. */
export const suggestFieldMapping = async (doc: LetterDoc, kind: LetterKind, role: UserRole): Promise<FieldSuggestion[]> => {
  const text = letterText(doc).slice(0, MAX_TEXT);
  if (!text.trim()) return [];
  const catalogue = catalogueFor(kind);
  const fieldList = catalogue.map((f) => `${f.key} — ${f.label} (${f.type})`).join('\n');

  const ask = async (): Promise<SuggestionOutput['suggestions']> => {
    const result = await generateText({
      model: assistantModel(),
      instructions: INSTRUCTIONS,
      prompt: `Letter kind: ${kind === 'employee' ? 'for an existing employee' : 'for a candidate or someone outside the company'}\n\nFields you can use:\n${fieldList}\n\nLetter text:\n${text}`,
      output: Output.object({ schema: suggestionSchema }),
      // At the assistant's usual "low" effort this list often came back with one or two items.
      providerOptions: { openai: { ...assistantProviderOptions(role).openai, reasoningEffort: 'medium' } },
    });
    return (await result.output).suggestions;
  };

  const allowed = new Set(catalogue.map((f) => f.key));
  const types = new Map<string, string>(catalogue.map((f) => [f.key, f.type]));
  const haystack = normalize(text);
  const found = (value: string) => haystack.includes(normalize(value));

  /** Drops suggestions whose text isn't in the letter, cleans stray quotes and escaped line breaks, works out formats. */
  const usable = (raw: SuggestionOutput['suggestions']): FieldSuggestion[] => {
    const seen = new Set<string>();
    return raw.slice(0, MAX_SUGGESTIONS).flatMap((s): FieldSuggestion[] => {
      let value = s.text.replace(/\r/g, '').replace(/\\n/g, '\n').trim();
      const unquoted = value.replace(QUOTES, '').trim();
      if (unquoted !== value && unquoted && found(unquoted)) value = unquoted;
      const key = normalize(value);
      if (!value || seen.has(key) || !found(value)) return [];
      seen.add(key);
      const detailType: FieldType = (FIELD_TYPES as readonly string[]).includes(s.newDetailType ?? '') ? (s.newDetailType as FieldType) : 'text';
      const format = inferFormat(value, (s.field && types.get(s.field)) || detailType);
      if (s.field && allowed.has(s.field)) return [{ text: value, field: s.field, ...(format ? { format } : {}) }];
      if (s.newDetailLabel?.trim()) {
        return [{ text: value, newDetail: { label: s.newDetailLabel.trim().slice(0, 80), type: detailType, usualValue: s.usualValue }, ...(format ? { format } : {}) }];
      }
      return [];
    });
  };

  // A longer letter always has several details; if a reply has too few usable ones, ask again and keep the best.
  let best: FieldSuggestion[] = [];
  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const next = usable(await ask());
      if (next.length > best.length) best = next;
      if (best.length >= MIN_EXPECTED || text.length < SHORT_LETTER) break;
    }
  } catch (error) {
    logger.error({ err: error }, 'Letter field suggestions failed');
    if (!best.length) throw new ServiceUnavailableError('HR Buddy could not read this letter right now. You can still mark fields yourself.');
  }
  return best;
};
