import { useImperativeHandle, useState, type Ref } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { LetterDoc, Margins, PageSize } from '@/types/letters';
import { cleanWordPaste } from './cleanWordPaste';
import { EditorToolbar } from './EditorToolbar';
import { letterExtensions } from './extensions';
import { FieldContext, type FieldOption } from './fieldContext';
import { FieldPicker } from './FieldPicker';

const PX_PER_MM = 96 / 25.4;
const DEFAULT_MARGINS: Margins = { top: 25, right: 20, bottom: 25, left: 20 };
const PAGE_PX: Record<PageSize, { width: number; height: number }> = { A4: { width: 794, height: 1123 }, Letter: { width: 816, height: 1056 } };

export interface LetterEditorHandle {
  setHtml: (html: string) => void;
  isEmpty: () => boolean;
}

interface LetterEditorProps {
  value: LetterDoc;
  onChange: (doc: LetterDoc) => void;
  fields: FieldOption[];
  marginsMm?: Margins;
  pageSize?: PageSize;
  mode: 'template' | 'letter';
  ref?: Ref<LetterEditorHandle>;
}

/** Page-width editing surface whose CSS matches the PDF renderer, so line lengths agree. */
export const LetterEditor = ({ value, onChange, fields, marginsMm = DEFAULT_MARGINS, pageSize = 'A4', mode, ref }: LetterEditorProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const canInsert = mode === 'template';

  const editor = useEditor({
    extensions: letterExtensions({ onFieldTrigger: canInsert ? () => setPickerOpen(true) : undefined }),
    content: value,
    editorProps: {
      transformPastedHTML: cleanWordPaste,
      attributes: { class: 'letter-content focus:outline-none', 'aria-label': 'Letter text', role: 'textbox', 'aria-multiline': 'true' },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
  });

  useImperativeHandle(ref, () => ({
    setHtml: (html: string) => {
      editor?.commands.setContent(html, { emitUpdate: true });
    },
    isEmpty: () => editor?.isEmpty ?? true,
  }), [editor]);

  const fieldMap = new Map(fields.map((f) => [f.key, f]));

  return (
    <FieldContext.Provider value={{ fields: fieldMap, mode }}>
      <div className="overflow-hidden rounded-lg border border-border bg-muted">
        {editor && <EditorToolbar editor={editor} onInsertField={canInsert ? () => setPickerOpen(true) : undefined} />}
        <div className="overflow-x-auto p-4 sm:p-6">
          <div
            className="mx-auto bg-white text-black shadow-sm"
            style={{ width: PAGE_PX[pageSize].width, minHeight: PAGE_PX[pageSize].height, padding: `${marginsMm.top * PX_PER_MM}px ${marginsMm.right * PX_PER_MM}px ${marginsMm.bottom * PX_PER_MM}px ${marginsMm.left * PX_PER_MM}px` }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
      {canInsert && (
        <FieldPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          fields={fields}
          onPick={(key) => editor?.chain().focus().insertField(key).run()}
        />
      )}
    </FieldContext.Provider>
  );
};
