// Web search can leave private-use citation markers (U+E200 to U+E201) in the text.
const OPEN = String.fromCharCode(0xe200);
const CLOSE = String.fromCharCode(0xe201);
export const CITATION_MARKERS = new RegExp(`${OPEN}[^${CLOSE}]*${CLOSE}`, 'g');
export const SUGGESTIONS_LINE = /\n*\s*Suggestions:[^\n]*\s*$/i;

export const parseSuggestions = (text: string): string[] => {
  const match = text.replace(CITATION_MARKERS, '').match(/(?:^|\n)\s*Suggestions:\s*([^\n]+)\s*$/i);
  if (!match?.[1]) return [];
  return match[1]
    .split('|')
    .map((s) => s.trim().replace(/^["“]|["”]$/g, ''))
    .filter(Boolean)
    .slice(0, 3);
};
