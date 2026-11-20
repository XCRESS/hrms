import type { LetterDoc } from '../../validators/letter.schemas.js';

const p = (text: string, textAlign: 'left' | 'justify' = 'justify', bold = false): LetterDoc => ({
  type: 'paragraph',
  attrs: { textAlign },
  content: [{ type: 'text', text, ...(bold ? { marks: [{ type: 'bold' }] } : {}) }],
});

const PARAGRAPH =
  'We are pleased to confirm the terms set out in this letter. This sample text shows how the body flows inside the letterhead margins, how justified paragraphs wrap, and where each page breaks, so the margins can be adjusted until the text sits clear of the header and footer artwork.';

/** Body used to preview a letterhead before any template exists. */
export const LETTERHEAD_SAMPLE: LetterDoc = {
  type: 'doc',
  content: [
    p('Dated: 01.01.2026', 'left'),
    p('Mr. Sample Person', 'left', true),
    p('Dear Sample,', 'left'),
    ...Array.from({ length: 6 }, () => p(PARAGRAPH)),
    { type: 'pageBreak' },
    ...Array.from({ length: 3 }, () => p(PARAGRAPH)),
    p('Yours faithfully,', 'left'),
    p('Signatory Name', 'left', true),
  ],
};
