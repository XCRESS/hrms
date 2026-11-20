import { Node, mergeAttributes, type NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { FieldFormat, FieldType } from '@/types/letters';
import { LETTER_PLACEHOLDERS, useFieldContext } from './fieldContext';

const FORMATS: Partial<Record<FieldType, Array<{ value: FieldFormat | null; label: string }>>> = {
  date: [
    { value: null, label: '1 July 2025' },
    { value: 'ordinal', label: '1st July 2025' },
    { value: 'dotted', label: '01.07.2025' },
  ],
  money: [
    { value: null, label: '₹4,50,000' },
    { value: 'words', label: 'Four Lakh Fifty Thousand Rupees Only' },
  ],
  text: [
    { value: null, label: 'As typed' },
    { value: 'upper', label: 'UPPER CASE' },
  ],
};

const FieldChip = ({ node, updateAttributes, selected }: NodeViewProps) => {
  const { fields, mode } = useFieldContext();
  const key = String(node.attrs.key);
  const format = (node.attrs.format ?? null) as FieldFormat | null;
  const field = fields.get(key);
  const label = LETTER_PLACEHOLDERS[key] ?? field?.label ?? key;
  const formats = mode === 'template' && field ? FORMATS[field.type] : undefined;
  const formatLabel = formats?.find((f) => f.value === format && f.value !== null)?.label;

  const chip = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1 py-px align-baseline text-[0.9em] leading-tight',
        field || LETTER_PLACEHOLDERS[key] ? 'border-primary/40 bg-primary/10 text-primary' : 'border-destructive/50 bg-destructive/10 text-destructive',
        selected && 'ring-2 ring-ring'
      )}
      title={field || LETTER_PLACEHOLDERS[key] ? key : `Unknown field: ${key}`}
    >
      {label}
      {formatLabel && <span className="opacity-70">· {formatLabel}</span>}
    </span>
  );

  return (
    <NodeViewWrapper as="span" className="field-chip">
      {formats ? (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="cursor-pointer" aria-label={`Format of ${label}`}>
              {chip}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1" align="start">
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Show {label} as</p>
            {formats.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => updateAttributes({ format: option.value })}
                className={cn('w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent', option.value === format && 'bg-accent')}
              >
                {option.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      ) : (
        chip
      )}
    </NodeViewWrapper>
  );
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    field: { insertField: (key: string) => ReturnType };
  }
}

export const FieldNode = Node.create({
  name: 'field',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      key: { default: null, parseHTML: (el) => el.getAttribute('data-field') },
      format: { default: null, parseHTML: (el) => el.getAttribute('data-format') },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-field]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-field': node.attrs.key, 'data-format': node.attrs.format }), `{{${node.attrs.key}}}`];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FieldChip, { as: 'span' });
  },

  addCommands() {
    return {
      insertField:
        (key) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { key } }),
    };
  },
});
