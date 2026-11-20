import { InputRule, Node, type Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { BackgroundColor, Color, FontSize, LineHeight, TextStyle } from '@tiptap/extension-text-style';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { TableKit } from '@tiptap/extension-table';
import { Extension } from '@tiptap/core';
import { Placeholder } from '@tiptap/extensions';
import { FieldNode } from './FieldNode';
import { Indent } from './indent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: { insertPageBreak: () => ReturnType };
  }
}

export const PageBreakNode = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-page-break]' }];
  },

  renderHTML() {
    return ['div', { 'data-page-break': '', class: 'page-break' }];
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});

/** Typing `{{` removes it and asks the host to open the field picker. */
const FieldTrigger = Extension.create<{ onTrigger: () => void }>({
  name: 'fieldTrigger',
  addOptions() {
    return { onTrigger: () => {} };
  },
  addInputRules() {
    return [
      new InputRule({
        find: /\{\{$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).run();
          this.options.onTrigger();
        },
      }),
    ];
  },
});

export const letterExtensions = ({ onFieldTrigger, placeholder }: { onFieldTrigger?: () => void; placeholder?: string }): Extensions => [
  StarterKit.configure({ link: { protocols: ['http', 'https', 'mailto'], openOnClick: false } }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TextStyle,
  Color,
  BackgroundColor,
  FontSize,
  LineHeight,
  Indent,
  Superscript,
  Subscript,
  TableKit.configure({ table: { resizable: false } }),
  PageBreakNode,
  FieldNode,
  ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ...(onFieldTrigger ? [FieldTrigger.configure({ onTrigger: onFieldTrigger })] : []),
];
