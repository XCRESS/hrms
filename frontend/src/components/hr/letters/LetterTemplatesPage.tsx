import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Archive, FileText, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { useArchiveLetterTemplate, useCompanies, useLetterTemplates } from '@/hooks/queries';
import { errorMessage } from './shared';

const LetterTemplatesPage = () => {
  const [showArchived, setShowArchived] = useState(false);
  const { data: templates = [], isLoading, error } = useLetterTemplates(showArchived);
  const { data: companies = [] } = useCompanies();
  const archive = useArchiveLetterTemplate();
  const confirm = useConfirm();
  const { toast } = useToast();
  const companyName = new Map(companies.map((c) => [c._id, c.name]));

  const onArchive = async (id: string, name: string) => {
    if (!(await confirm({ title: `Archive “${name}”?`, description: 'It disappears from the template list. Letters already issued from it are kept.', confirmText: 'Archive', destructive: true }))) return;
    try {
      await archive.mutateAsync(id);
      toast({ variant: 'success', title: 'Template archived' });
    } catch (e) {
      toast({ variant: 'error', title: 'Could not archive', description: errorMessage(e) });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Back to letters">
            <Link to="/letters"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-xl font-semibold">Letter templates</h1>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={showArchived} onCheckedChange={(c) => setShowArchived(c === true)} /> Show archived
          </label>
          <Button asChild className="gap-1.5">
            <Link to="/letters/templates/new"><Plus className="h-4 w-4" /> New template</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading templates…</p>}
        {error && <p className="p-6 text-center text-sm text-destructive">{errorMessage(error)}</p>}
        {!isLoading && !error && templates.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground">Start from scratch or import an existing Word letter.</p>
          </div>
        )}
        <ul className="divide-y divide-border">
          {templates.map((t) => (
            <li key={t._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link to={`/letters/templates/${t._id}`} className="font-medium hover:underline">{t.name}</Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={t.kind === 'employee' ? 'primary' : 'secondary'}>{t.kind === 'employee' ? 'Employee letter' : 'Offer / external'}</Badge>
                  <span>{companyName.get(t.company) ?? 'Unknown company'}</span>
                  {t.askFields.length > 0 && <span>· asks {t.askFields.length} field{t.askFields.length > 1 ? 's' : ''}</span>}
                  {!t.active && <Badge variant="warning">Archived</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/letters/new?template=${t._id}`}>Issue</Link>
                </Button>
                {t.active && (
                  <Button variant="ghost" size="icon" aria-label={`Archive ${t.name}`} onClick={() => onArchive(t._id, t.name)}>
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LetterTemplatesPage;
