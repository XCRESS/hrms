import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanies, useLetterPdf, useSaveLetterTemplate } from '@/hooks/queries';
import { PdfPreviewDialog } from '@/components/hr/letters/PdfPreviewDialog';
import { usePdfPreview } from '@/components/hr/letters/usePdfPreview';
import { DEFAULT_TEMPLATE_EMAIL, errorMessage } from '@/components/hr/letters/shared';
import type { LetterTemplateDraftFields } from '../types';
import { type DraftEntry, lastOf } from './draftEntries';
import { useDraftVersions } from './useDraftVersions';
import { useDraftCommit, type CommitOutcome } from './useDraftActions';
import { DraftFrame } from './DraftFrame';
import { ConfirmBulk } from './ConfirmBulk';
import { Receipt } from './Receipt';

/** A template HR Buddy built from an attached Word letter: name it, pick the company, preview and save. */
export function LetterTemplateDraftBlock({ entries }: { entries: DraftEntry[] }) {
  const latest = lastOf(entries);
  const versions = useDraftVersions(entries.map((e) => e.draft.fields as unknown as LetterTemplateDraftFields));
  const fields = versions.current;
  const { commit, pending, error, setError, receipt } = useDraftCommit(latest);
  const { data: companies = [] } = useCompanies();
  const save = useSaveLetterTemplate();
  const pdf = useLetterPdf();
  const { preview, show, close } = usePdfPreview();

  const title = `Letter template${fields.name ? ` · ${fields.name}` : ''}`;
  if (receipt) return <Receipt receipt={receipt} title={title} />;

  const set = (patch: Partial<LetterTemplateDraftFields>) => versions.edit({ ...fields, ...patch });
  const issues = [
    ...latest.draft.issues.filter((i) => !/company|name/i.test(i)),
    ...(fields.name.trim() ? [] : ['Give the template a name.']),
    ...(fields.companyId ? [] : ['Choose the company whose letterhead this template uses.']),
  ];
  const fieldCount = fields.applied.reduce((n, a) => n + a.count, 0);

  const onPreview = async () => {
    if (!fields.companyId) return;
    try {
      show(await pdf.mutateAsync({ kind: 'template', input: { kind: fields.kind, company: fields.companyId, body: fields.body, askFields: fields.askFields } }), `${fields.name || 'Template'} — preview`);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onSave = () =>
    commit(async (): Promise<CommitOutcome> => {
      const saved = await save.mutateAsync({
        input: { name: fields.name.trim(), kind: fields.kind, company: fields.companyId!, body: fields.body, askFields: fields.askFields, email: DEFAULT_TEMPLATE_EMAIL },
      });
      return {
        summary: `Template “${saved.name}” saved with ${fieldCount} field${fieldCount === 1 ? '' : 's'}`,
        link: `/letters/templates/${saved._id}`,
        committedFields: { templateId: saved._id },
      };
    });

  return (
    <DraftFrame
      anchorId={`draft-${latest.draft.draftId}`}
      title={title}
      subtitle="Built from your Word letter — formatting kept"
      issues={issues}
      error={error}
      versions={versions}
      footer={
        <>
          <Button size="sm" variant="outline" className="mr-auto gap-1.5" onClick={onPreview} disabled={!fields.companyId || pdf.isPending}>
            {pdf.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />} Preview
          </Button>
          <ConfirmBulk label="Save template" confirmLabel="Yes, save" warning="" requireSecondPress={false} disabled={issues.length > 0} pending={pending} onConfirm={onSave} />
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${latest.draft.draftId}-name`}>Template name</Label>
          <Input id={`${latest.draft.draftId}-name`} value={fields.name} placeholder="Appointment letter" onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${latest.draft.draftId}-company`}>Company and letterhead</Label>
          <Select value={fields.companyId ?? ''} onValueChange={(companyId) => set({ companyId })}>
            <SelectTrigger id={`${latest.draft.draftId}-company`} className="w-full"><SelectValue placeholder="Choose a company" /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="space-y-1 text-sm" aria-label="Fields found">
        <p className="font-medium">{fieldCount ? `Turned ${fieldCount} details into fields` : 'No changing details were found'}</p>
        {fields.applied.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {fields.applied.map((a) => (
              <li key={`${a.label}-${a.text}`} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary" title={a.text}>
                {a.label}{a.count > 1 ? ` ×${a.count}` : ''}
              </li>
            ))}
          </ul>
        )}
        {fields.askFields.length > 0 && (
          <p className="text-muted-foreground">Asked each time you issue: {fields.askFields.map((f) => f.label).join(', ')}.</p>
        )}
        {fields.warnings.map((w) => <p key={w} className="text-muted-foreground">{w}</p>)}
        <p className="text-muted-foreground">After saving you can fine-tune the wording and fields in the template editor.</p>
      </section>
      <PdfPreviewDialog preview={preview} onClose={close} />
    </DraftFrame>
  );
}
