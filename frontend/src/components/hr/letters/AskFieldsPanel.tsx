import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AskField, FieldType } from '@/types/letters';
import { keyFromLabel } from './shared';

const TYPE_LABEL: Record<FieldType, string> = { text: 'Text', longText: 'Long text', date: 'Date', money: 'Amount (₹)', number: 'Number' };

interface AskFieldsPanelProps {
  fields: AskField[];
  onChange: (fields: AskField[]) => void;
}

/** Fields HR fills in when issuing (grade, posting city…). Keys are fixed once created so chips keep working. */
export const AskFieldsPanel = ({ fields, onChange }: AskFieldsPanelProps) => {
  const [newLabel, setNewLabel] = useState('');

  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    onChange([...fields, { key: keyFromLabel(label, fields.map((f) => f.key)), label, type: 'text', required: true }]);
    setNewLabel('');
  };
  const update = (index: number, patch: Partial<AskField>) => onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  return (
    <section className="space-y-3" aria-labelledby="ask-fields-heading">
      <div>
        <h3 id="ask-fields-heading" className="text-sm font-semibold">Asked when issuing</h3>
        <p className="text-xs text-muted-foreground">Details the system doesn’t store, such as grade or posting city. HR fills them in for each letter.</p>
      </div>

      {fields.map((field, index) => (
        <div key={field.key} className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <Input aria-label="Field label" value={field.label} onChange={(e) => update(index, { label: e.target.value })} />
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${field.label}`} onClick={() => onChange(fields.filter((_, i) => i !== index))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={field.type} onValueChange={(type) => update(index, { type: type as FieldType })}>
              <SelectTrigger aria-label="Field type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input aria-label="Default value" placeholder="Default (optional)" value={field.default ?? ''} onChange={(e) => update(index, { default: e.target.value || undefined })} />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={field.required} onCheckedChange={(checked) => update(index, { required: checked === true })} />
              Required
            </label>
            <code className="text-xs text-muted-foreground">ask.{field.key}</code>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Label htmlFor="new-ask-field" className="sr-only">New field label</Label>
        <Input
          id="new-ask-field"
          placeholder="e.g. Grade"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!newLabel.trim()} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
    </section>
  );
};
