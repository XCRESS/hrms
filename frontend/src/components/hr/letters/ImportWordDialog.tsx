import { useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SearchableEmployeeSelect from '@/components/ui/SearchableEmployeeSelect';
import { useEmployees, useImportDocx } from '@/hooks/queries';
import type { ImportedLetter, LetterKind } from '@/types/letters';

interface ImportWordDialogProps {
  kind: LetterKind;
  replacing: boolean;
  onClose: () => void;
  onImported: (result: ImportedLetter) => void;
  onError: (error: unknown) => void;
}

/** Upload a Word letter; if it was written for an employee, their details become fields. */
export const ImportWordDialog = ({ kind, replacing, onClose, onImported, onError }: ImportWordDialogProps) => {
  const [file, setFile] = useState<File | undefined>();
  const [employeeCode, setEmployeeCode] = useState('');
  const importDocx = useImportDocx();
  const { data: active = [] } = useEmployees({ status: 'active' });
  const { data: inactive = [] } = useEmployees({ status: 'inactive' });
  const employees = [...active, ...inactive];
  const employee = employees.find((e) => e.employeeId === employeeCode);

  const onImport = async () => {
    if (!file) return;
    try {
      onImported(await importDocx.mutateAsync({ file, employee: employee?._id }));
    } catch (error) {
      onError(error);
    }
  };

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

        {kind === 'employee' && (
          <div className="space-y-1.5">
            <Label>Who was this letter written for? (optional)</Label>
            <SearchableEmployeeSelect employees={employees} value={employeeCode} onValueChange={setEmployeeCode} placeholder="Search by name or code" />
            <p className="text-xs text-muted-foreground">Their name, code, position, joining date and other details are found in the letter and turned into fields automatically.</p>
          </div>
        )}

        {replacing && <p className="text-sm text-muted-foreground">This replaces the text currently in the editor.</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onImport} disabled={!file || importDocx.isPending} className="gap-1.5">
            {importDocx.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
