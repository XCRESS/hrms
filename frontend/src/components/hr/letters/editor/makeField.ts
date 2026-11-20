import type { Editor } from '@tiptap/core';
import type { Mark } from '@tiptap/pm/model';

interface Range {
  from: number;
  to: number;
  marks: readonly Mark[];
}

const ROLE_MARKS = new Set(['superscript', 'subscript']);

/** Places in single text runs where `text` appears, excluding the given range. */
const findElsewhere = (editor: Editor, text: string, exclude: { from: number; to: number }): Range[] => {
  const ranges: Range[] = [];
  if (!text.trim()) return ranges;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (let i = node.text.indexOf(text); i !== -1; i = node.text.indexOf(text, i + text.length)) {
      const from = pos + i;
      const to = from + text.length;
      if (to <= exclude.from || from >= exclude.to) ranges.push({ from, to, marks: node.marks });
    }
  });
  return ranges;
};

export const selectedText = (editor: Editor): string => {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, '\n').trim();
};

export const countElsewhere = (editor: Editor, text: string): number => findElsewhere(editor, text, editor.state.selection).length;

/** Replaces the selection (and optionally every other exact occurrence) with a field chip. */
export const replaceWithField = (editor: Editor, key: string, everywhere: boolean): number => {
  const { state } = editor;
  const { from, to, $from } = state.selection;
  const text = selectedText(editor);
  const firstMarks = state.doc.nodeAt(from)?.isText ? state.doc.nodeAt(from)!.marks : $from.marks();
  const ranges: Range[] = [{ from, to, marks: firstMarks }, ...(everywhere ? findElsewhere(editor, text, { from, to }) : [])];
  const fieldType = state.schema.nodes.field!;

  const tr = state.tr;
  for (const range of [...ranges].sort((a, b) => b.from - a.from)) {
    tr.replaceWith(range.from, range.to, fieldType.create({ key }, null, range.marks.filter((m) => !ROLE_MARKS.has(m.type.name))));
  }
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return ranges.length;
};
