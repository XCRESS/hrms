import { Eye, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useLetterPdf, useMyLetters } from '@/hooks/queries';
import { PdfPreviewDialog } from '@/components/hr/letters/PdfPreviewDialog';
import { usePdfPreview } from '@/components/hr/letters/usePdfPreview';
import { errorMessage } from '@/components/hr/letters/shared';

const MyLetters = () => {
  const { data: letters = [], isLoading, error } = useMyLetters();
  const pdf = useLetterPdf();
  const { preview, show, close } = usePdfPreview();
  const { toast } = useToast();

  const open = async (id: string, title: string, filename: string) => {
    try {
      show(await pdf.mutateAsync({ kind: 'issued', id }), title, filename);
    } catch (e) {
      toast({ variant: 'error', title: 'Could not open the letter', description: errorMessage(e) });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold">My letters</h1>
      <div className="rounded-lg border border-border bg-card">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="p-6 text-center text-sm text-destructive">{errorMessage(error)}</p>}
        {!isLoading && !error && letters.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No letters yet.</p>
          </div>
        )}
        <ul className="divide-y divide-border">
          {letters.map((l) => (
            <li key={l._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{l.templateName}</p>
                <p className="text-xs text-muted-foreground">
                  {l.referenceNo}
                  {l.issuedAt && ` · ${new Date(l.issuedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={pdf.isPending && pdf.variables?.kind === 'issued' && pdf.variables.id === l._id}
                onClick={() => open(l._id, l.templateName, `${l.referenceNo ?? 'letter'} ${l.templateName}`)}
              >
                {pdf.isPending && pdf.variables?.kind === 'issued' && pdf.variables.id === l._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} View
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <PdfPreviewDialog preview={preview} onClose={close} />
    </div>
  );
};

export default MyLetters;
