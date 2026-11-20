import { Extension } from '@tiptap/core';

/** Must match backend/services/letters/indent.ts so editor and PDF indent alike. */
const INDENT_STEP_CM = 1.27;
const MAX_INDENT = 8;
const TYPES = ['paragraph', 'heading'];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: { indent: () => ReturnType; outdent: () => ReturnType };
  }
}

const shift =
  (delta: number) =>
  ({ tr, state, dispatch }: { tr: import('@tiptap/pm/state').Transaction; state: import('@tiptap/pm/state').EditorState; dispatch?: (tr: import('@tiptap/pm/state').Transaction) => void }) => {
    let changed = false;
    state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
      if (!TYPES.includes(node.type.name)) return;
      const next = Math.max(0, Math.min(MAX_INDENT, (node.attrs.indent ?? 0) + delta));
      if (next !== node.attrs.indent) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
        changed = true;
      }
      return false;
    });
    if (changed && dispatch) dispatch(tr);
    return changed;
  };

export const Indent = Extension.create({
  name: 'indent',
  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => Math.min(MAX_INDENT, Number(element.getAttribute('data-indent')) || 0),
            renderHTML: (attributes) =>
              attributes.indent ? { 'data-indent': attributes.indent, style: `margin-left: ${(attributes.indent * INDENT_STEP_CM).toFixed(2)}cm` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return { indent: () => shift(1), outdent: () => shift(-1) };
  },
});
