const isWordHtml = (html: string): boolean => /urn:schemas-microsoft-com|class="?Mso|mso-/i.test(html);

const wrap = (el: Element, tag: string): void => {
  const wrapper = el.ownerDocument.createElement(tag);
  while (el.firstChild) wrapper.appendChild(el.firstChild);
  el.appendChild(wrapper);
};

const LIST_STYLE = /mso-list:\s*(l\d+)\s+level(\d+)/i;
const BULLET_MARKERS = /^[·•o§▪■◦\-–]$/;

/** Rebuilds Word's `mso-list` paragraphs (its list markup) into real <ol>/<ul> lists. */
const rebuildLists = (body: HTMLElement): void => {
  const paragraphs = Array.from(body.querySelectorAll('p')).filter((p) => LIST_STYLE.test(p.getAttribute('style') ?? ''));
  let list: HTMLElement | null = null;
  let listId: string | null = null;

  for (const p of paragraphs) {
    const [, id] = LIST_STYLE.exec(p.getAttribute('style') ?? '') ?? [];
    const marker = p.querySelector('span[style*="mso-list:Ignore"], span[style*="mso-list: Ignore"]');
    const markerText = marker?.textContent?.trim() ?? '';
    marker?.remove();

    const contiguous = list && listId === id && p.previousElementSibling === list;
    if (!contiguous) {
      list = body.ownerDocument.createElement(BULLET_MARKERS.test(markerText) ? 'ul' : 'ol');
      listId = id ?? null;
      p.before(list);
    }
    const item = body.ownerDocument.createElement('li');
    item.appendChild(p);
    list!.appendChild(item);
  }
};

/** Turns Word clipboard HTML into the plain semantic HTML the editor schema understands. */
export const cleanWordPaste = (html: string): string => {
  if (!isWordHtml(html)) return html;

  const doc = new DOMParser().parseFromString(html.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, ''), 'text/html');
  doc.querySelectorAll('o\\:p, meta, style, link, xml, script').forEach((el) => el.remove());
  rebuildLists(doc.body);

  doc.body.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    const style = el.style;
    if (/bold|[6-9]00/.test(style.fontWeight) && !el.closest('b, strong')) wrap(el, 'strong');
    if (style.fontStyle === 'italic' && !el.closest('i, em')) wrap(el, 'em');
    if (style.textDecoration.includes('underline') && !el.closest('u')) wrap(el, 'u');
    const align = style.textAlign;
    const color = style.color;
    const size = /^(\d{1,2}(\.\d+)?)pt$/.exec(style.fontSize)?.[1];
    const highlight = style.backgroundColor;
    el.removeAttribute('style');
    if (align && ['left', 'center', 'right', 'justify'].includes(align)) el.style.textAlign = align;
    if (el.tagName !== 'SPAN') return;
    if (color) el.style.color = color;
    if (size && Number(size) !== 11) el.style.fontSize = `${Number(size)}pt`;
    if (highlight && highlight !== 'transparent' && highlight !== 'white') el.style.backgroundColor = highlight;
  });
  doc.body.querySelectorAll('[class]').forEach((el) => el.removeAttribute('class'));
  return doc.body.innerHTML;
};
