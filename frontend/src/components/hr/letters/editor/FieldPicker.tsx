import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { FieldOption } from './fieldContext';

interface FieldPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FieldOption[];
  onPick: (key: string) => void;
}

const GROUP_ORDER = ['Employee', 'Recipient', 'Company', 'Letter', 'Signatory', 'Details to fill in'];

export const FieldPicker = ({ open, onOpenChange, fields, onPick }: FieldPickerProps) => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = fields.filter((f) => !q || f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q));
  const groups = GROUP_ORDER.map((group) => ({ group, items: matches.filter((f) => f.group === group) })).filter((g) => g.items.length);

  const pick = (key: string) => {
    onPick(key);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setQuery(''); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Insert field</DialogTitle>
          <DialogDescription>Fields are filled in when the letter is issued.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Search fields"
          aria-label="Search fields"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) {
              e.preventDefault();
              pick(matches[0].key);
            }
          }}
        />
        <div className="max-h-80 overflow-y-auto">
          {groups.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matching fields</p>}
          {groups.map(({ group, items }) => (
            <div key={group} className="py-1">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{group}</p>
              {items.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => pick(field.key)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <span>{field.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
