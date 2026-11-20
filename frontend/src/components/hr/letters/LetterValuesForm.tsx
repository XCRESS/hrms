import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EnhancedDatePicker from '@/components/ui/enhanced-datepicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { FieldOption } from './editor/fieldContext';

interface LetterValuesFormProps {
  fields: FieldOption[];
  required: Set<string>;
  initial: Record<string, string>;
  saving: boolean;
  onSave: (values: Record<string, string>) => void;
}

const inputId = (key: string) => `value-${key.replace(/\./g, '-')}`;

/** Every value the letter prints; auto values arrive prefilled and stay editable for this letter. */
export const LetterValuesForm = ({ fields, required, initial, saving, onSave }: LetterValuesFormProps) => {
  const [values, setValues] = useState(initial);
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const dirty = fields.some((f) => (values[f.key] ?? '') !== (initial[f.key] ?? ''));
  const missing = fields.filter((f) => required.has(f.key) && !values[f.key]?.trim());

  const groups = [...new Set(fields.map((f) => f.group))];

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? ''])));
      }}
    >
      {groups.map((group) => (
        <fieldset key={group} className="space-y-3">
          <legend className="text-sm font-semibold">{group}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.filter((f) => f.group === group).map((field) => {
              const id = inputId(field.key);
              const value = values[field.key] ?? '';
              const label = (
                <Label htmlFor={id}>
                  {field.label}
                  {required.has(field.key) && <span className="text-destructive" aria-hidden> *</span>}
                </Label>
              );
              return (
                <div key={field.key} className={field.type === 'longText' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
                  {label}
                  {field.type === 'longText' ? (
                    <Textarea id={id} className="h-20" value={value} onChange={(e) => set(field.key, e.target.value)} aria-required={required.has(field.key)} />
                  ) : field.type === 'date' ? (
                    <EnhancedDatePicker value={value ? parseISO(value) : null} onChange={(d) => set(field.key, d ? format(d, 'yyyy-MM-dd') : '')} />
                  ) : (
                    <Input
                      id={id}
                      inputMode={field.type === 'money' || field.type === 'number' ? 'decimal' : undefined}
                      value={value}
                      onChange={(e) => set(field.key, field.type === 'money' || field.type === 'number' ? e.target.value.replace(/[^\d.]/g, '') : e.target.value)}
                      aria-required={required.has(field.key)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {missing.length ? `Still needed: ${missing.map((f) => f.label).join(', ')}` : 'All required values are filled in.'}
        </p>
        <Button type="submit" className="gap-1.5" disabled={!dirty || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save values
        </Button>
      </div>
    </form>
  );
};
