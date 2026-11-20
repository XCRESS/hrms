import { Plus } from 'lucide-react';
import type { FieldOption } from './editor/fieldContext';
import { ASK_GROUP } from './shared';

/** Click-to-insert list of the fields a template can use. Ask fields are listed in their own panel. */
export const FieldListPanel = ({ fields, onInsert }: { fields: FieldOption[]; onInsert: (key: string) => void }) => {
  const groups = [...new Set(fields.map((f) => f.group))].filter((g) => g !== ASK_GROUP);

  return (
    <section className="space-y-2" aria-labelledby="field-list-heading">
      <div>
        <h3 id="field-list-heading" className="text-sm font-semibold">Fields</h3>
        <p className="text-xs text-muted-foreground">Click to insert at the cursor. Filled in when the letter is issued.</p>
      </div>
      {groups.map((group) => (
        <details key={group} className="group rounded-md border border-border" open={group === 'Employee' || group === 'Recipient'}>
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">{group}</summary>
          <ul className="space-y-0.5 px-1 pb-2">
            {fields.filter((f) => f.group === group).map((field) => (
              <li key={field.key}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onInsert(field.key)}
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <span>{field.label}</span>
                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
};
