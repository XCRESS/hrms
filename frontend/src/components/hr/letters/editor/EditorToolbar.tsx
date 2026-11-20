import { useEditorState, type Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Braces,
  Eraser,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Minus,
  Redo2,
  Scissors,
  Strikethrough,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const TEXT_COLORS = ['#000000', '#404040', '#7F7F7F', '#C00000', '#E36C09', '#B58A00', '#538135', '#1F7A7A', '#4472C4', '#1F3864', '#7030A0', '#A5276D'];
const HIGHLIGHTS = ['#FFFF00', '#C6EFCE', '#BDD7EE', '#FCE4D6', '#E2D0F0', '#D9D9D9'];
const SIZES = ['9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt'];
const SPACING = [
  { value: '1', label: 'Single' },
  { value: '1.15', label: '1.15' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: 'Double' },
];
const BLOCK_STYLES = [
  { value: 'p', label: 'Normal text' },
  { value: '1', label: 'Heading 1' },
  { value: '2', label: 'Heading 2' },
  { value: '3', label: 'Heading 3' },
] as const;

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

const DEFAULT = 'default';

export const EditorToolbar = ({ editor, onInsertField }: { editor: Editor; onInsertField?: () => void }) => {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const style = e.getAttributes('textStyle');
      const level = ([1, 2, 3] as const).find((l) => e.isActive('heading', { level: l }));
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        superscript: e.isActive('superscript'),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList'),
        inTable: e.isActive('table'),
        inList: e.isActive('listItem'),
        align: (['left', 'center', 'right', 'justify'] as const).find((a) => e.isActive({ textAlign: a })) ?? 'left',
        block: level ? String(level) : 'p',
        color: (style.color as string | undefined) ?? null,
        highlight: (style.backgroundColor as string | undefined) ?? null,
        size: (style.fontSize as string | undefined) ?? '',
        spacing: (style.lineHeight as string | undefined) ?? '',
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });
  const chain = () => editor.chain().focus();
  /** Line spacing and size apply to selected text; with nothing selected, the whole paragraph. */
  const onParagraphOrSelection = () => (editor.state.selection.empty ? chain().selectParentNode() : chain());

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-card px-2 py-1" role="toolbar" aria-label="Formatting">
      <ToolButton label="Undo" onClick={() => chain().undo().run()} disabled={!state.canUndo}><Undo2 className="h-4 w-4" /></ToolButton>
      <ToolButton label="Redo" onClick={() => chain().redo().run()} disabled={!state.canRedo}><Redo2 className="h-4 w-4" /></ToolButton>
      <Divider />
      <Select value={state.block} onValueChange={(v) => (v === 'p' ? chain().setParagraph().run() : chain().setHeading({ level: Number(v) as 1 | 2 | 3 }).run())}>
        <SelectTrigger aria-label="Paragraph style" className="h-8 w-[8.5rem]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {BLOCK_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={state.size || DEFAULT} onValueChange={(v) => (v === DEFAULT ? onParagraphOrSelection().unsetFontSize().run() : onParagraphOrSelection().setFontSize(v).run())}>
        <SelectTrigger aria-label="Text size" title="Text size" className="h-8 w-[4.75rem]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT}>11</SelectItem>
          {SIZES.filter((s) => s !== '11pt').map((s) => <SelectItem key={s} value={s}>{s.replace('pt', '')}</SelectItem>)}
        </SelectContent>
      </Select>
      <Divider />
      <ToolButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}><Bold className="h-4 w-4" /></ToolButton>
      <ToolButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolButton>
      <ToolButton label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolButton>
      <ToolButton label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolButton>
      <ToolButton label="Superscript" active={state.superscript} onClick={() => chain().toggleSuperscript().run()}><SuperscriptIcon className="h-4 w-4" /></ToolButton>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-col gap-0" aria-label="Text colour" title="Text colour" onMouseDown={(e) => e.preventDefault()}>
            <Baseline className="h-4 w-4" />
            <span className="h-1 w-4 rounded-sm" style={{ backgroundColor: state.color ?? '#000000' }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 space-y-2 p-2">
          <div className="grid grid-cols-6 gap-1">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Colour ${color}`}
                className={cn('h-7 w-7 rounded border border-border', state.color?.toUpperCase() === color && 'ring-2 ring-ring')}
                style={{ backgroundColor: color }}
                onClick={() => (color === '#000000' ? chain().unsetColor().run() : chain().setColor(color).run())}
              />
            ))}
          </div>
          <label className="flex items-center justify-between gap-2 text-sm">
            Custom colour
            <input type="color" aria-label="Custom colour" className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent" value={state.color?.startsWith('#') ? state.color : '#000000'} onChange={(e) => chain().setColor(e.target.value.toUpperCase()).run()} />
          </label>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-col gap-0" aria-label="Highlight" title="Highlight" onMouseDown={(e) => e.preventDefault()}>
            <Highlighter className="h-4 w-4" />
            <span className="h-1 w-4 rounded-sm border border-border" style={{ backgroundColor: state.highlight ?? 'transparent' }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex w-auto items-center gap-1 p-2">
          {HIGHLIGHTS.map((color) => (
            <button key={color} type="button" aria-label={`Highlight ${color}`} className="h-7 w-7 rounded border border-border" style={{ backgroundColor: color }} onClick={() => chain().setBackgroundColor(color).run()} />
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => chain().unsetBackgroundColor().run()}>None</Button>
        </PopoverContent>
      </Popover>
      <Divider />
      <ToolButton label="Align left" active={state.align === 'left'} onClick={() => chain().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></ToolButton>
      <ToolButton label="Align centre" active={state.align === 'center'} onClick={() => chain().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></ToolButton>
      <ToolButton label="Align right" active={state.align === 'right'} onClick={() => chain().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></ToolButton>
      <ToolButton label="Justify" active={state.align === 'justify'} onClick={() => chain().setTextAlign('justify').run()}><AlignJustify className="h-4 w-4" /></ToolButton>
      <Select value={state.spacing || DEFAULT} onValueChange={(v) => (v === DEFAULT ? onParagraphOrSelection().unsetLineHeight().run() : onParagraphOrSelection().setLineHeight(v).run())}>
        <SelectTrigger aria-label="Line spacing" title="Line spacing" className="h-8 w-[6.5rem]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT}>Spacing: normal</SelectItem>
          {SPACING.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Divider />
      <ToolButton label="Bulleted list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}><List className="h-4 w-4" /></ToolButton>
      <ToolButton label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolButton>
      <ToolButton label="Decrease indent" onClick={() => (state.inList ? chain().liftListItem('listItem').run() : chain().outdent().run())}><IndentDecrease className="h-4 w-4" /></ToolButton>
      <ToolButton label="Increase indent" onClick={() => (state.inList ? chain().sinkListItem('listItem').run() : chain().indent().run())}><IndentIncrease className="h-4 w-4" /></ToolButton>
      <Divider />
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
      <ToolButton label="Horizontal line" onClick={() => chain().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolButton>
      <ToolButton label="Page break" onClick={() => chain().insertPageBreak().run()}><Scissors className="h-4 w-4" /></ToolButton>
      <ToolButton label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}><Eraser className="h-4 w-4" /></ToolButton>
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
