import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { BackgroundColor, Color, FontSize, LineHeight, TextStyle } from '@tiptap/extension-text-style';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { TableKit } from '@tiptap/extension-table';
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string';
import type { LetterDoc } from '../../validators/letter.schemas.js';
import { htmlToPdf, type PdfAsset } from './gotenberg.js';
import { composeLetterPdf, type PageSize } from './pdf.js';
import { Indent } from './indent.js';
import { collectFieldKeys } from './resolve.js';

export interface PageLayout {
  marginsMm: { top: number; right: number; bottom: number; left: number };
  pageSize?: PageSize;
}

const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  renderHTML: () => ['div', { class: 'page-break' }],
});

const EXTENSIONS = [
  StarterKit.configure({ link: { protocols: ['http', 'https', 'mailto'] } }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TextStyle,
  Color,
  BackgroundColor,
  FontSize,
  LineHeight,
  Indent,
  Superscript,
  Subscript,
  TableKit,
  PageBreak,
];

const FONT_FILES = ['Carlito-Regular.ttf', 'Carlito-Bold.ttf', 'Carlito-Italic.ttf', 'Carlito-BoldItalic.ttf'] as const;

// Sources run from services/letters/, the build from dist/services/letters/.
const fontDir = (): string => {
  const candidates = ['../../assets/fonts/', '../../../assets/fonts/'].map((p) => fileURLToPath(new URL(p, import.meta.url)));
  const dir = candidates.find((d) => existsSync(`${d}${FONT_FILES[0]}`));
  if (!dir) throw new Error(`Letter fonts not found in ${candidates.join(' or ')}`);
  return dir;
};

let fontAssets: PdfAsset[] | undefined;
const loadFonts = (): PdfAsset[] => (fontAssets ??= FONT_FILES.map((name) => ({ name, data: readFileSync(`${fontDir()}${name}`) })));

const fontFace = (file: string, weight: number, style: string) =>
  `@font-face { font-family: 'Carlito'; src: url('${file}') format('truetype'); font-weight: ${weight}; font-style: ${style}; }`;

const STYLES = `
${fontFace('Carlito-Regular.ttf', 400, 'normal')}
${fontFace('Carlito-Bold.ttf', 700, 'normal')}
${fontFace('Carlito-Italic.ttf', 400, 'italic')}
${fontFace('Carlito-BoldItalic.ttf', 700, 'italic')}
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Carlito', sans-serif; font-size: 11pt; line-height: 1.25; color: #000; }
p { margin: 0 0 6pt; }
p:empty::after { content: '\\00a0'; }
h1 { font-size: 16pt; margin: 0 0 8pt; }
h2 { font-size: 13pt; margin: 0 0 6pt; }
h3 { font-size: 11pt; margin: 0 0 6pt; }
ul, ol { margin: 0 0 6pt; padding-left: 1.5em; }
li > p { margin: 0; }
a { color: inherit; }
table { width: 100%; border-collapse: collapse; margin: 0 0 6pt; }
th, td { border: 0.75pt solid #000; padding: 3pt 6pt; vertical-align: top; text-align: left; }
th { font-weight: 700; }
tr { break-inside: avoid; }
thead { display: table-header-group; }
.page-break { break-before: page; height: 0; }
hr { border: 0; border-top: 0.75pt solid #000; margin: 6pt 0; }
`;

export const renderLetterHtml = (doc: LetterDoc, { marginsMm: m, pageSize = 'A4' }: PageLayout): string => {
  const unresolved = collectFieldKeys(doc);
  if (unresolved.length) throw new Error(`Cannot render unresolved fields: ${unresolved.join(', ')}`);

  const body = renderToHTMLString({ extensions: EXTENSIONS, content: doc });
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
@page { size: ${pageSize === 'Letter' ? 'letter' : 'A4'}; margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm; }
${STYLES}
</style>
</head>
<body>${body}</body>
</html>`;
};

export const renderLetterPdf = async (
  doc: LetterDoc,
  letterhead: PageLayout & { pdf?: Buffer },
  opts: { draft?: boolean } = {}
): Promise<Buffer> => {
  const content = await htmlToPdf({ html: renderLetterHtml(doc, letterhead), assets: loadFonts() });
  return composeLetterPdf(content, { letterhead: letterhead.pdf, draft: opts.draft });
};
