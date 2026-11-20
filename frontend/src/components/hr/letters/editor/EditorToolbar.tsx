import { useEditorState, type Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Scissors,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const COLORS = ['#000000', '#4472C4', '#1F3864', '#C00000', '#538135', '#7F7F7F'];

const ToolButton = ({ label, active, onClick, children, disabled }: { label: string; active?: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    aria-label={label}
    aria-pressed={active}
    title={label}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={cn('h-8 w-8', active && 'bg-accent text-accent-foreground')}
  >
    {children}
  </Button>
);

const Divider = () => <span className="mx-1 h-5 w-px bg-border" aria-hidden />;

export const EditorToolbar = ({ editor, onInsertField }: { editor: Editor; onInsertField?: () => void }) => {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      superscript: e.isActive('superscript'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      inTable: e.isActive('table'),
      align: (['left', 'center', 'right', 'justify'] as const).find((a) => e.isActive({ textAlign: a })) ?? 'left',
      color: (e.getAttributes('textStyle').color as string | undefined) ?? null,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-card px-2 py-1" role="toolbar" aria-label="Formatting">
      <ToolButton label="Undo" onClick={() => chain().undo().run()} disabled={!state.canUndo}><Undo2 className="h-4 w-4" /></ToolButton>
      <ToolButton label="Redo" onClick={() => chain().redo().run()} disabled={!state.canRedo}><Redo2 className="h-4 w-4" /></ToolButton>
      <Divider />
      <ToolButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}><Bold className="h-4 w-4" /></ToolButton>
      <ToolButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolButton>
      <ToolButton label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolButton>
      <ToolButton label="Superscript" active={state.superscript} onClick={() => chain().toggleSuperscript().run()}><SuperscriptIcon className="h-4 w-4" /></ToolButton>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Text colour" title="Text colour" onMouseDown={(e) => e.preventDefault()}>
            <span className="h-4 w-4 rounded-sm border border-border" style={{ backgroundColor: state.color ?? '#000000' }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex w-auto gap-1 p-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Colour ${color}`}
              className="h-6 w-6 rounded border border-border"
              style={{ backgroundColor: color }}
              onClick={() => (color === '#000000' ? chain().unsetColor().run() : chain().setColor(color).run())}
            />
          ))}
        </PopoverContent>
      </Popover>
      <Divider />
      <ToolButton label="Align left" active={state.align === 'left'} onClick={() => chain().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></ToolButton>
      <ToolButton label="Align centre" active={state.align === 'center'} onClick={() => chain().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></ToolButton>
      <ToolButton label="Align right" active={state.align === 'right'} onClick={() => chain().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></ToolButton>
      <ToolButton label="Justify" active={state.align === 'justify'} onClick={() => chain().setTextAlign('justify').run()}><AlignJustify className="h-4 w-4" /></ToolButton>
      <Divider />
      <ToolButton label="Bulleted list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}><List className="h-4 w-4" /></ToolButton>
      <ToolButton label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolButton>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={cn('h-8 w-8', state.inTable && 'bg-accent')} aria-label="Table" title="Table" onMouseDown={(e) => e.preventDefault()}>
            <TableIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1">
          {[
            ['Insert 3 × 3 table', () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), !state.inTable],
            ['Add row below', () => chain().addRowAfter().run(), state.inTable],
            ['Add column right', () => chain().addColumnAfter().run(), state.inTable],
            ['Delete row', () => chain().deleteRow().run(), state.inTable],
            ['Delete column', () => chain().deleteColumn().run(), state.inTable],
            ['Delete table', () => chain().deleteTable().run(), state.inTable],
          ].map(([label, run, enabled]) => (
            <button
              key={label as string}
              type="button"
              disabled={!enabled}
              onClick={run as () => void}
              className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
            >
              {label as string}
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <ToolButton label="Page break" onClick={() => chain().insertPageBreak().run()}><Scissors className="h-4 w-4" /></ToolButton>
      {onInsertField && (
        <>
          <Divider />
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onMouseDown={(e) => e.preventDefault()} onClick={onInsertField}>
            <Braces className="h-4 w-4" /> Insert field
          </Button>
        </>
      )}
    </div>
  );
};
