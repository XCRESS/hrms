import JSZip from 'jszip';
import { DOMParser, type Element } from '@xmldom/xmldom';
import { ValidationError } from '../../utils/errors.js';
import type { LetterDoc, LetterMark, LetterNode } from '../../validators/letter.schemas.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const BASE_HALF_POINTS = 22;
const TAB = '    ';
const MAX_UNZIPPED_BYTES = 40 * 1024 * 1024;

interface RunProps {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  highlight?: string;
  halfPoints?: number;
  vertAlign?: 'superscript' | 'subscript';
}

interface StyleDef {
  basedOn?: string;
  name?: string;
  run: RunProps;
  align?: string;
}

const HIGHLIGHT: Record<string, string> = {
  yellow: '#FFFF00', green: '#00FF00', cyan: '#00FFFF', magenta: '#FF00FF', blue: '#0000FF', red: '#FF0000',
  darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000',
  darkYellow: '#808000', darkGray: '#808080', lightGray: '#C0C0C0', black: '#000000',
};

const ALIGN: Record<string, 'left' | 'center' | 'right' | 'justify'> = {
  left: 'left', start: 'left', center: 'center', right: 'right', end: 'right', both: 'justify', distribute: 'justify',
};

const elements = (node: Element | null | undefined, localName?: string): Element[] =>
  node ? (Array.from(node.childNodes) as Element[]).filter((n) => n.nodeType === 1 && (!localName || n.localName === localName)) : [];

const child = (node: Element | null | undefined, localName: string): Element | undefined => elements(node, localName)[0];

const val = (node: Element | undefined, name = 'val'): string | null => (node ? node.getAttributeNS(W, name) || node.getAttribute(`w:${name}`) : null);

/** `<w:b/>` means on; `<w:b w:val="0"/>` or "false" means off. */
const toggle = (node: Element | undefined): boolean | undefined => {
  if (!node) return undefined;
  const v = val(node);
  return v === null || !['0', 'false', 'off', 'none'].includes(v);
};

const readRunProps = (rPr: Element | undefined): RunProps => {
  if (!rPr) return {};
  const props: RunProps = {};
  const set = <K extends keyof RunProps>(key: K, value: RunProps[K] | undefined) => {
    if (value !== undefined) props[key] = value;
  };
  set('bold', toggle(child(rPr, 'b')));
  set('italic', toggle(child(rPr, 'i')));
  set('strike', toggle(child(rPr, 'strike')));
  const u = child(rPr, 'u');
  if (u) props.underline = val(u) !== 'none';
  const color = val(child(rPr, 'color'));
  if (color && /^[0-9a-f]{6}$/i.test(color)) props.color = `#${color.toUpperCase()}`;
  else if (color === 'auto') props.color = undefined;
  const highlight = val(child(rPr, 'highlight'));
  if (highlight && HIGHLIGHT[highlight]) props.highlight = HIGHLIGHT[highlight];
  const shading = child(rPr, 'shd');
  const fill = shading ? val(shading, 'fill') : null;
  if (!props.highlight && fill && /^[0-9a-f]{6}$/i.test(fill) && fill.toUpperCase() !== 'FFFFFF') props.highlight = `#${fill.toUpperCase()}`;
  const size = Number(val(child(rPr, 'sz')));
  if (size > 0) props.halfPoints = size;
  const vertAlign = val(child(rPr, 'vertAlign'));
  if (vertAlign === 'superscript' || vertAlign === 'subscript') props.vertAlign = vertAlign;
  return props;
};

const merge = (...layers: RunProps[]): RunProps => Object.assign({}, ...layers);

const readStyles = (xml: string | undefined) => {
  const styles = new Map<string, StyleDef>();
  let defaults: RunProps = {};
  if (!xml) return { styles, defaults };
  const root = new DOMParser().parseFromString(xml, 'text/xml').documentElement;
  defaults = readRunProps(child(child(child(root ?? undefined, 'docDefaults'), 'rPrDefault'), 'rPr'));
  for (const style of elements(root ?? undefined, 'style')) {
    const id = val(style, 'styleId');
    if (!id) continue;
    styles.set(id, {
      basedOn: val(child(style, 'basedOn')) ?? undefined,
      name: val(child(style, 'name'))?.toLowerCase(),
      run: readRunProps(child(style, 'rPr')),
      align: val(child(child(style, 'pPr'), 'jc')) ?? undefined,
    });
  }
  return { styles, defaults };
};

const readNumbering = (xml: string | undefined) => {
  const bulletNums = new Set<string>();
  if (!xml) return bulletNums;
  const root = new DOMParser().parseFromString(xml, 'text/xml').documentElement ?? undefined;
  const bulletAbstracts = new Set<string>();
  for (const abstract of elements(root, 'abstractNum')) {
    const first = elements(abstract, 'lvl').find((l) => (val(l, 'ilvl') ?? '0') === '0');
    if (val(child(first, 'numFmt')) === 'bullet') bulletAbstracts.add(val(abstract, 'abstractNumId') ?? '');
  }
  for (const num of elements(root, 'num')) {
    if (bulletAbstracts.has(val(child(num, 'abstractNumId')) ?? '')) bulletNums.add(val(num, 'numId') ?? '');
  }
  return bulletNums;
};

const marksFor = (props: RunProps): LetterMark[] => {
  const marks: LetterMark[] = [];
  if (props.bold) marks.push({ type: 'bold' });
  if (props.italic) marks.push({ type: 'italic' });
  if (props.underline) marks.push({ type: 'underline' });
  if (props.strike) marks.push({ type: 'strike' });
  if (props.vertAlign) marks.push({ type: props.vertAlign });
  const style: Record<string, string> = {};
  if (props.color && props.color !== '#000000') style.color = props.color;
  if (props.highlight) style.backgroundColor = props.highlight;
  if (props.halfPoints && props.halfPoints !== BASE_HALF_POINTS && !props.vertAlign) style.fontSize = `${props.halfPoints / 2}pt`;
  if (Object.keys(style).length) marks.push({ type: 'textStyle', attrs: style });
  return marks;
};

const sameMarks = (a?: LetterMark[], b?: LetterMark[]) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

const pushText = (inline: LetterNode[], text: string, marks: LetterMark[]) => {
  if (!text) return;
  const last = inline[inline.length - 1];
  if (last?.type === 'text' && sameMarks(last.marks, marks)) last.text += text;
  else inline.push({ type: 'text', text, ...(marks.length ? { marks } : {}) });
};

export interface DocxResult {
  doc: LetterDoc;
  warnings: string[];
}

/** Converts a .docx into the editor's document. Headers and footers are skipped: they belong to the letterhead. */
export const docxToDoc = async (buffer: Buffer): Promise<DocxResult> => {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new ValidationError('This is not a Word (.docx) file');
  }
  const unzipped = Object.values(zip.files).reduce((sum, f) => sum + ((f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0), 0);
  if (unzipped > MAX_UNZIPPED_BYTES) throw new ValidationError('This Word file is too large to import');
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) throw new ValidationError('This is not a Word (.docx) file');

  const { styles, defaults } = readStyles(await zip.file('word/styles.xml')?.async('string'));
  const bulletNums = readNumbering(await zip.file('word/numbering.xml')?.async('string'));
  let skippedImages = 0;

  const styleChain = (id: string | undefined, depth = 0): StyleDef[] => {
    const style = id ? styles.get(id) : undefined;
    if (!style || depth > 10) return [];
    return [...styleChain(style.basedOn, depth + 1), style];
  };
  const normal = styleChain('Normal');

  const paragraph = (p: Element): LetterNode[] => {
    const pPr = child(p, 'pPr');
    const styleId = val(child(pPr, 'pStyle')) ?? undefined;
    const chain = styleId ? styleChain(styleId) : normal;
    const paragraphRun = merge(defaults, ...chain.map((s) => s.run), readRunProps(child(pPr, 'rPr')));
    const align = ALIGN[val(child(pPr, 'jc')) ?? [...chain].reverse().find((s) => s.align)?.align ?? ''];
    const headingLevel = /^heading ([1-3])$/.exec(chain[chain.length - 1]?.name ?? '')?.[1];
    const attrs = {
      ...(align && align !== 'left' ? { textAlign: align } : {}),
      ...(headingLevel ? { level: Number(headingLevel) } : {}),
    };
    const make = (inline: LetterNode[]): LetterNode => ({
      type: headingLevel ? 'heading' : 'paragraph',
      ...(Object.keys(attrs).length ? { attrs } : {}),
      ...(inline.length ? { content: inline } : {}),
    });

    const blocks: LetterNode[] = toggle(child(pPr, 'pageBreakBefore')) ? [{ type: 'pageBreak' }] : [];
    let inline: LetterNode[] = [];

    const run = (r: Element) => {
      const rStyle = val(child(child(r, 'rPr'), 'rStyle')) ?? undefined;
      const props = merge(paragraphRun, ...styleChain(rStyle).map((s) => s.run), readRunProps(child(r, 'rPr')));
      const marks = marksFor(props);
      for (const part of elements(r)) {
        switch (part.localName) {
          case 't':
            pushText(inline, part.textContent ?? '', marks);
            break;
          case 'tab':
            pushText(inline, TAB, marks);
            break;
          case 'noBreakHyphen':
            pushText(inline, '-', marks);
            break;
          case 'br':
          case 'cr':
            if (val(part, 'type') === 'page') {
              blocks.push(make(inline), { type: 'pageBreak' });
              inline = [];
            } else inline.push({ type: 'hardBreak' });
            break;
          case 'drawing':
          case 'pict':
          case 'object':
            skippedImages++;
            break;
        }
      }
    };

    const walk = (node: Element) => {
      for (const part of elements(node)) {
        if (part.localName === 'r') run(part);
        else if (['hyperlink', 'ins', 'smartTag', 'fldSimple', 'customXml'].includes(part.localName ?? '')) walk(part);
        else if (part.localName === 'sdt') walk(child(part, 'sdtContent') ?? part);
      }
    };
    walk(p);

    const last = blocks[blocks.length - 1];
    if (inline.length || !last || last.type !== 'pageBreak') blocks.push(make(inline));
    return blocks;
  };

  const table = (tbl: Element): LetterNode => ({
    type: 'table',
    content: elements(tbl, 'tr').map((tr) => {
      const header = toggle(child(child(tr, 'trPr'), 'tblHeader'));
      return {
        type: 'tableRow',
        content: elements(tr, 'tc').map((tc) => {
          const span = Number(val(child(child(tc, 'tcPr'), 'gridSpan'))) || 1;
          const content = blockList(tc);
          return {
            type: header ? 'tableHeader' : 'tableCell',
            ...(span > 1 ? { attrs: { colspan: span } } : {}),
            content: content.length ? content : [{ type: 'paragraph' }],
          };
        }),
      };
    }),
  });

  function blockList(container: Element): LetterNode[] {
    const out: LetterNode[] = [];
    let list: { node: LetterNode; numId: string } | null = null;

    for (const node of elements(container)) {
      if (node.localName === 'sdt') {
        out.push(...blockList(child(node, 'sdtContent') ?? node));
        list = null;
        continue;
      }
      if (node.localName === 'tbl') {
        out.push(table(node));
        list = null;
        continue;
      }
      if (node.localName !== 'p') continue;

      const numId = val(child(child(child(node, 'pPr'), 'numPr'), 'numId'));
      const blocks = paragraph(node);
      if (numId && numId !== '0') {
        if (!list || list.numId !== numId) {
          list = { node: { type: bulletNums.has(numId) ? 'bulletList' : 'orderedList', content: [] }, numId };
          out.push(list.node);
        }
        list.node.content!.push({ type: 'listItem', content: blocks.filter((b) => b.type !== 'pageBreak').map((b) => ({ type: 'paragraph', ...(b.content ? { content: b.content } : {}) })) });
        continue;
      }
      list = null;
      out.push(...blocks);
    }
    return out;
  }

  const body = child(new DOMParser().parseFromString(documentXml, 'text/xml').documentElement ?? undefined, 'body');
  const content = body ? blockList(body) : [];
  while (content[content.length - 1]?.type === 'pageBreak') content.pop();

  const warnings = skippedImages ? [`${skippedImages} picture(s) or text box(es) were left out. Logos belong in the letterhead.`] : [];
  return { doc: { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }, warnings };
};
