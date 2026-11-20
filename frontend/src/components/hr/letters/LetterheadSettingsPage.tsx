import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Eye, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useCompanies, useLetterPdf, useLetterhead, useSaveLetterhead } from '@/hooks/queries';
import type { Letterhead, Margins } from '@/types/letters';
import { PdfPreviewDialog } from './PdfPreviewDialog';
import { usePdfPreview } from './usePdfPreview';
import { errorMessage } from './shared';

const SIDES: Array<{ key: keyof Margins; label: string }> = [
  { key: 'top', label: 'Top' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
];

const LetterheadForm = ({ companyId, letterhead }: { companyId: string; letterhead: Letterhead | null }) => {
  const { toast } = useToast();
  const save = useSaveLetterhead();
  const pdf = useLetterPdf();
  const { preview, show, close } = usePdfPreview();
  const [file, setFile] = useState<File | undefined>();
  const [margins, setMargins] = useState<Margins>(letterhead?.marginsMm ?? { top: 45, right: 20, bottom: 30, left: 20 });
  const [signatory, setSignatory] = useState(letterhead?.signatory ?? { name: '', designation: '' });
  const [prefix, setPrefix] = useState(letterhead?.referencePrefix ?? '');

  const valid = signatory.name.trim() && signatory.designation.trim() && /^[A-Z0-9/-]{1,20}$/.test(prefix);

  const onSave = async () => {
    try {
      await save.mutateAsync({ companyId, pdf: file, data: { marginsMm: margins, signatory, referencePrefix: prefix } });
      setFile(undefined);
      toast({ variant: 'success', title: 'Letterhead saved' });
    } catch (e) {
      toast({ variant: 'error', title: 'Could not save', description: errorMessage(e) });
    }
  };

  const onPreview = async () => {
    try {
      show(await pdf.mutateAsync({ kind: 'letterhead', companyId }), 'Letterhead preview', 'letterhead-preview');
    } catch (e) {
      toast({ variant: 'error', title: 'Preview failed', description: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-4 md:p-6">
      <div className="space-y-1.5">
        <Label htmlFor="letterhead-pdf">Letterhead PDF</Label>
        <Input id="letterhead-pdf" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0])} />
        <p className="text-xs text-muted-foreground">
          One A4 or US Letter page, up to 2 MB, with the logo, header and footer and an empty middle. Export it from your Word letterhead.
          {letterhead?.hasPdf && !file && ` A ${letterhead.pageSize === 'Letter' ? 'US Letter' : 'A4'} letterhead is already uploaded; choose a file only to replace it.`}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Text margins (mm)</legend>
        <p className="text-xs text-muted-foreground">Keep the letter text clear of the header and footer artwork. Preview to check.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SIDES.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`margin-${key}`}>{label}</Label>
              <Input id={`margin-${key}`} type="number" min={0} max={80} value={margins[key]} onChange={(e) => setMargins({ ...margins, [key]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="signatory-name">Signatory name</Label>
          <Input id="signatory-name" value={signatory.name} onChange={(e) => setSignatory({ ...signatory, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signatory-designation">Designation</Label>
          <Input id="signatory-designation" value={signatory.designation} onChange={(e) => setSignatory({ ...signatory, designation: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reference-prefix">Reference number prefix</Label>
          <Input id="reference-prefix" value={prefix} placeholder="CFG/HR" onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
          <p className="text-xs text-muted-foreground">Letters are numbered {prefix || 'PREFIX'}/{new Date().getFullYear()}/0001, 0002…</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" className="gap-1.5" onClick={onPreview} disabled={!letterhead || pdf.isPending}>
          {pdf.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview saved letterhead
        </Button>
        <Button className="gap-1.5" onClick={onSave} disabled={!valid || save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
      </div>
      <PdfPreviewDialog preview={preview} onClose={close} />
    </div>
  );
};

const LetterheadSettingsPage = () => {
  const { data: companies = [] } = useCompanies();
  const [chosen, setChosen] = useState<string>();
  const companyId = chosen ?? companies[0]?._id;
  const { data: letterhead, isLoading } = useLetterhead(companyId);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to letters">
          <Link to="/letters"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">Letterheads</h1>
      </div>
      <div className="max-w-sm space-y-1.5">
        <Label htmlFor="letterhead-company">Company</Label>
        <Select value={companyId ?? ''} onValueChange={setChosen}>
          <SelectTrigger id="letterhead-company"><SelectValue placeholder="Choose a company" /></SelectTrigger>
          <SelectContent>
            {companies.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {companyId && isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {companyId && !isLoading && letterhead !== undefined && (
        <LetterheadForm key={`${companyId}:${letterhead?.updatedAt ?? 'new'}`} companyId={companyId} letterhead={letterhead} />
      )}
    </div>
  );
};

export default LetterheadSettingsPage;
