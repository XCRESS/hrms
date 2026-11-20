import { format, parseISO } from 'date-fns';
import EnhancedDatePicker from '@/components/ui/enhanced-datepicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { FieldOption } from './editor/fieldContext';

interface LetterValuesFormProps {
  fields: FieldOption[];
  required: Set<string>;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const inputId = (key: string) => `value-${key.replace(/\./g, '-')}`;

/** Every value the letter prints; auto values arrive prefilled and stay editable for this letter. */
export const LetterValuesForm = ({ fields, required, values, onChange }: LetterValuesFormProps) => {
  const groups = [...new Set(fields.map((f) => f.group))];

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <fieldset key={group} className="space-y-3">
          <legend className="text-sm font-semibold">{group}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.filter((f) => f.group === group).map((field) => {
              const id = inputId(field.key);
              const value = values[field.key] ?? '';
              const isRequired = required.has(field.key);
              const numeric = field.type === 'money' || field.type === 'number';
              return (
                <div key={field.key} className={field.type === 'longText' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
                  <Label htmlFor={id}>
                    {field.label}
                    {isRequired && <span className="text-destructive" aria-hidden> *</span>}
                  </Label>
                  {field.type === 'longText' ? (
                    <Textarea id={id} className="h-20" value={value} onChange={(e) => onChange(field.key, e.target.value)} aria-required={isRequired} />
                  ) : field.type === 'date' ? (
                    <EnhancedDatePicker value={value ? parseISO(value) : null} onChange={(d) => onChange(field.key, d ? format(d, 'yyyy-MM-dd') : '')} />
                  ) : (
                    <Input
                      id={id}
                      inputMode={numeric ? 'decimal' : undefined}
                      value={value}
                      onChange={(e) => onChange(field.key, numeric ? e.target.value.replace(/[^\d.]/g, '') : e.target.value)}
                      aria-required={isRequired}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
};
