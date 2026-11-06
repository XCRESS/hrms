import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const QUICK_CHANGES = ['Shorter', 'More formal', 'Softer'] as const;

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRevise: (instruction: string, selection?: string) => void;
  minRows?: number;
}

export function BodyEditor({ id, label, value, onChange, onRevise, minRows = 6 }: Props) {
  const [selection, setSelection] = useState('');
  const [ask, setAsk] = useState('');

  const submitAsk = () => {
    if (!ask.trim()) return;
    onRevise(ask.trim(), selection || undefined);
    setAsk('');
    setSelection('');
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Textarea
        id={id}
        value={value}
        rows={Math.max(minRows, Math.min(18, value.split('\n').length + 1))}
        onChange={(e) => onChange(e.target.value)}
        onSelect={(e) => {
          const t = e.currentTarget;
          setSelection(t.value.slice(t.selectionStart, t.selectionEnd).trim());
        }}
        className="resize-y"
      />
      {selection ? (
        <form
          className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            submitAsk();
          }}
        >
          <Sparkles className="ml-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            placeholder="Ask HR Buddy to change this…"
            aria-label="Ask HR Buddy to change the selected text"
            className="h-8"
          />
          <Button type="submit" size="sm" disabled={!ask.trim()}>
            Change
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHANGES.map((change) => (
            <Button key={change} type="button" variant="outline" size="sm" className="h-7 rounded-full px-3" onClick={() => onRevise(`${change}, please.`)}>
              {change}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
