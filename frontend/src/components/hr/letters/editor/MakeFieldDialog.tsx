import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FieldOption } from './fieldContext';

interface MakeFieldDialogProps {
  text: string;
  elsewhere: number;
  fields: FieldOption[];
  onClose: () => void;
  onPick: (key: string, everywhere: boolean) => void;
  onCreate: (label: string, defaultValue: string | undefined, everywhere: boolean) => void;
}

/** "Turn this text into a field": pick an existing detail, or name a new one HR fills in per letter. */
export const MakeFieldDialog = ({ text, elsewhere, fields, onClose, onPick, onCreate }: MakeFieldDialogProps) => {
  const [query, setQuery] = useState('');
  const [label, setLabel] = useState('');
  const [useAsDefault, setUseAsDefault] = useState(false);
  const [everywhere, setEverywhere] = useState(elsewhere > 0);
  const q = query.trim().toLowerCase();
  const matches = fields.filter((f) => !q || f.label.toLowerCase().includes(q) || f.group.toLowerCase().includes(q));
  const preview = text.length > 60 ? `${text.slice(0, 57)}…` : text;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Make “{preview}” a field</DialogTitle>
          <DialogDescription>Each letter fills this spot with the right person’s details.</DialogDescription>
        </DialogHeader>

        {elsewhere > 0 && (
          <label className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
            <Checkbox checked={everywhere} onCheckedChange={(c) => setEverywhere(c === true)} />
            Also replace the {elsewhere} other place{elsewhere > 1 ? 's' : ''} where “{preview}” appears
          </label>
        )}

        <section className="space-y-2" aria-labelledby="existing-field-heading">
          <h3 id="existing-field-heading" className="text-sm font-semibold">It is one of these details</h3>
          <Input placeholder="Search, e.g. name, joining date" aria-label="Search details" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          <ul className="max-h-56 overflow-y-auto rounded-md border border-border">
            {matches.map((field) => (
              <li key={field.key}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  onClick={() => onPick(field.key, everywhere)}
                >
                  <span>{field.label}</span>
                  <span className="text-xs text-muted-foreground">{field.group}</span>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">No matching detail — create one below</li>}
          </ul>
        </section>

        <section className="space-y-2 border-t border-border pt-4" aria-labelledby="new-field-heading">
          <h3 id="new-field-heading" className="text-sm font-semibold">Or a new detail, filled in for each letter</h3>
          <div className="flex gap-2">
            <Label htmlFor="new-detail-label" className="sr-only">Name of the detail</Label>
            <Input id="new-detail-label" placeholder="e.g. Grade, Posting city" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Button type="button" disabled={!label.trim()} onClick={() => onCreate(label.trim(), useAsDefault ? text : undefined, everywhere)}>
              Create
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={useAsDefault} onCheckedChange={(c) => setUseAsDefault(c === true)} />
            Suggest “{preview}” as the usual value
          </label>
        </section>
      </DialogContent>
    </Dialog>
  );
};
