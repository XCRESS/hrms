import { useState } from 'react';
import { FileUp, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SearchableEmployeeSelect from '@/components/ui/SearchableEmployeeSelect';
import { useApplyMapping, useEmployees, useImportDocx } from '@/hooks/queries';
import type { AskField, FieldSuggestion, ImportedLetter, LetterDoc, LetterKind } from '@/types/letters';
import type { FieldOption } from './editor/fieldContext';

export interface ImportOutcome {
  doc: LetterDoc;
  newAskFields: AskField[];
  converted: Array<{ label: string; count: number }>;
  warnings: string[];
}

interface ImportWordDialogProps {
  kind: LetterKind;
  replacing: boolean;
  fields: FieldOption[];
  askFields: AskField[];
  onClose: () => void;
  onImported: (outcome: ImportOutcome) => void;
  onError: (error: unknown) => void;
}

const preview = (text: string) => {
  const flat = text.replace(/\n/g, ' / ');
  return flat.length > 70 ? `${flat.slice(0, 67)}…` : flat;
};

/** Upload a Word letter; the details that change per letter become fields (from a chosen employee's record and/or HR Buddy's suggestions, which HR reviews). */
export const ImportWordDialog = ({ kind, replacing, fields, askFields, onClose, onImported, onError }: ImportWordDialogProps) => {
  const [file, setFile] = useState<File | undefined>();
  const [employeeCode, setEmployeeCode] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [review, setReview] = useState<{ imported: ImportedLetter; selected: boolean[] } | null>(null);
  const importDocx = useImportDocx();
  const applyMapping = useApplyMapping();
  const { data: active = [] } = useEmployees({ status: 'active' });
  const { data: inactive = [] } = useEmployees({ status: 'inactive' });
  const employees = [...active, ...inactive];
  const employee = employees.find((e) => e.employeeId === employeeCode);
  const labelOf = new Map(fields.map((f) => [f.key, f.label]));

  const target = (s: FieldSuggestion) => (s.field ? labelOf.get(s.field) ?? s.field : `New detail: ${s.newDetail?.label}${s.newDetail?.usualValue ? ' (usually this)' : ''}`);

  const finish = (imported: ImportedLetter, doc: LetterDoc, newAskFields: AskField[], applied: Array<{ label: string; count: number }>) =>
    onImported({ doc, newAskFields, converted: [...imported.found.map((f) => ({ label: f.label, count: f.count })), ...applied], warnings: imported.warnings });

  const onImport = async () => {
    if (!file) return;
    try {
      const imported = await importDocx.mutateAsync({ file, employee: employee?._id, kind, suggest: useAi });
      if (imported.suggestions.length) setReview({ imported, selected: imported.suggestions.map(() => true) });
      else finish(imported, imported.doc, [], []);
    } catch (error) {
      onError(error);
    }
  };

  const onApply = async () => {
    if (!review) return;
    const chosen = review.imported.suggestions.filter((_, i) => review.selected[i]);
    if (!chosen.length) {
      finish(review.imported, review.imported.doc, [], []);
      return;
    }
    try {
      const result = await applyMapping.mutateAsync({ doc: review.imported.doc, kind, askFields: askFields.map((f) => ({ key: f.key, label: f.label })), suggestions: chosen });
      finish(review.imported, result.doc, result.askFields, result.applied);
    } catch (error) {
      onError(error);
    }
  };

  if (review) {
    const count = review.selected.filter(Boolean).length;
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Check the details HR Buddy found</DialogTitle>
            <DialogDescription>Ticked texts become fields that change per letter. Untick anything that should stay as written.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-[55vh] divide-y divide-border overflow-y-auto rounded-md border border-border">
            {review.imported.suggestions.map((s, i) => (
              <li key={`${s.text}-${i}`}>
                <label className="flex cursor-pointer items-start gap-3 px-3 py-2 text-sm hover:bg-accent/40">
                  <Checkbox
                    className="mt-0.5"
                    checked={review.selected[i]}
                    onCheckedChange={(c) => setReview({ ...review, selected: review.selected.map((v, j) => (j === i ? c === true : v)) })}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">“{preview(s.text)}”</span>
                    <span className="block text-muted-foreground">→ {target(s)}</span>
                    {(s.places ?? 1) > 1 && (
                      <span className="block text-xs text-amber-700 dark:text-amber-400">
                        Appears {s.places} times — all {s.places} will change. Untick if one of them means something else.
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {review.imported.found.length > 0 && (
            <p className="text-xs text-muted-foreground">Already converted from the employee’s record: {review.imported.found.map((f) => f.label).join(', ')}.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReview({ ...review, selected: review.selected.map(() => false) })}>Untick all</Button>
            <Button onClick={onApply} disabled={applyMapping.isPending} className="gap-1.5">
              {applyMapping.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {count ? `Turn ${count} into fields` : 'Import without fields'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import a Word letter</DialogTitle>
          <DialogDescription>Use a letter you already sent. Formatting is kept; the letterhead is set up separately.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="import-file">Word file (.docx)</Label>
          <Input id="import-file" type="file" accept=".docx" onChange={(e) => setFile(e.target.files?.[0])} />
        </div>

        <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
          <Checkbox className="mt-0.5" checked={useAi} onCheckedChange={(c) => setUseAi(c === true)} />
          <span>
            <span className="flex items-center gap-1.5 font-medium"><Sparkles className="h-4 w-4 text-primary" /> Let HR Buddy find the details that change</span>
            <span className="text-muted-foreground">Names, dates, grade, address, city… You check every suggestion before it’s applied. The letter’s text is sent to the AI service HR Buddy uses.</span>
          </span>
        </label>

        {kind === 'employee' && (
          <div className="space-y-1.5">
            <Label>Who was this letter written for? (optional)</Label>
            <SearchableEmployeeSelect employees={employees} value={employeeCode} onValueChange={setEmployeeCode} placeholder="Search by name or code" />
            <p className="text-xs text-muted-foreground">Their details from the HRMS are matched in the letter too.</p>
          </div>
        )}

        {replacing && <p className="text-sm text-muted-foreground">This replaces the text currently in the editor.</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onImport} disabled={!file || importDocx.isPending} className="gap-1.5">
            {importDocx.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} {importDocx.isPending && useAi ? 'Reading the letter…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
