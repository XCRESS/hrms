import { useImperativeHandle, type Ref } from 'react';
import { Extension, type JSONContent } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@/lib/utils';
import { FieldContext, type FieldOption } from './fieldContext';
import { FieldNode } from './FieldNode';

const TOKEN = /\{\{\s*([a-z]+\.[A-Za-z0-9_]+)\s*\}\}/g;

const lineToContent = (line: string): JSONContent[] => {
  const content: JSONContent[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    if (match.index > last) content.push({ type: 'text', text: line.slice(last, match.index) });
    content.push({ type: 'field', attrs: { key: match[1] } });
    last = match.index + match[0].length;
  }
  if (last < line.length) content.push({ type: 'text', text: line.slice(last) });
  return content;
};

/** Plain text with `{{key}}` tokens ⇄ editor document with field chips. */
const toDoc = (text: string): JSONContent => ({
  type: 'doc',
  content: text.split('\n').map((line) => {
    const content = lineToContent(line);
    return { type: 'paragraph', ...(content.length ? { content } : {}) };
  }),
});

const toText = (doc: JSONContent, singleLine: boolean): string =>
  (doc.content ?? [])
    .map((p) => (p.content ?? []).map((n) => (n.type === 'field' ? `{{${n.attrs?.key}}}` : n.type === 'hardBreak' ? '\n' : (n.text ?? ''))).join(''))
    .join(singleLine ? ' ' : '\n');

const SingleLine = Extension.create({
  name: 'singleLine',
  addKeyboardShortcuts: () => ({ Enter: () => true }),
});

export interface TokenTextEditorHandle {
  insertField: (key: string) => void;
}

interface TokenTextEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  fields: FieldOption[];
  singleLine?: boolean;
  onFocus?: () => void;
  className?: string;
  ref?: Ref<TokenTextEditorHandle>;
}

/** A text box where fields show as labelled pills instead of `{{codes}}`. */
export const TokenTextEditor = ({ id, value, onChange, fields, singleLine = false, onFocus, className, ref }: TokenTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false, bold: false, bulletList: false, code: false, codeBlock: false, dropcursor: false, gapcursor: false,
        hardBreak: false, heading: false, horizontalRule: false, italic: false, listItem: false, listKeymap: false, link: false,
        orderedList: false, strike: false, underline: false, trailingNode: false,
      }),
      FieldNode,
      ...(singleLine ? [SingleLine] : []),
    ],
    content: toDoc(value),
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': singleLine ? 'false' : 'true',
        'data-gramm': 'false',
        class: cn(
          'w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_p]:min-h-[1.25rem]',
          className
        ),
      },
    },
    onUpdate: ({ editor: e }) => onChange(toText(e.getJSON(), singleLine)),
    onFocus: () => onFocus?.(),
  });

  useImperativeHandle(ref, () => ({ insertField: (key: string) => editor?.chain().focus().insertField(key).run() }), [editor]);

  return (
    <FieldContext.Provider value={{ fields: new Map(fields.map((f) => [f.key, f])), mode: 'letter' }}>
      <EditorContent editor={editor} />
    </FieldContext.Provider>
  );
};
