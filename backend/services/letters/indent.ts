import { Extension } from '@tiptap/core';

/** Must match frontend/src/components/hr/letters/editor/indent.ts so editor and PDF indent alike. */
export const INDENT_STEP_CM = 1.27;
export const MAX_INDENT = 8;

export const Indent = Extension.create({
  name: 'indent',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
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
});
