import { AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  id: string;
  title: string;
  meta?: string;
  detail?: string;
  flag?: string;
}

interface Props {
  label: string;
  items: ChecklistItem[];
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}

export function ChecklistRows({ label, items, selected, onChange }: Props) {
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(next);
  };

  return (
    <div className="rounded-lg border border-border">
      <label className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
        <Checkbox checked={allSelected} onCheckedChange={(v) => onChange(v === true ? new Set(items.map((i) => i.id)) : new Set())} aria-label={`Select all ${label}`} />
        {selected.size} of {items.length} selected
      </label>
      <ul className="max-h-96 divide-y divide-border overflow-y-auto">
        {items.map((item) => (
          <li key={item.id}>
            <label className={cn('flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-accent/50', !selected.has(item.id) && 'opacity-70')}>
              <Checkbox className="mt-0.5" checked={selected.has(item.id)} onCheckedChange={(v) => toggle(item.id, v === true)} aria-label={`${item.title}${item.meta ? `, ${item.meta}` : ''}`} />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{item.title}</span>
                {item.meta && <span className="text-muted-foreground"> · {item.meta}</span>}
                {item.detail && <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>}
                {item.flag && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-3" aria-hidden />
                    {item.flag}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
