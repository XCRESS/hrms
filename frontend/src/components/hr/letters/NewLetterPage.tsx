import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableEmployeeSelect from '@/components/ui/SearchableEmployeeSelect';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCreateLetter, useEmployees, useLetterTemplates } from '@/hooks/queries';
import { errorMessage } from './shared';

const EMAIL = /^\S+@\S+\.\S+$/;

const NewLetterPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { data: templates = [], isLoading } = useLetterTemplates();
  const { data: active = [] } = useEmployees({ status: 'active' });
  const { data: inactive = [] } = useEmployees({ status: 'inactive' });
  const create = useCreateLetter();

  const [templateId, setTemplateId] = useState(params.get('template') ?? '');
  const [employeeCode, setEmployeeCode] = useState('');
  const [recipient, setRecipient] = useState({ name: '', email: '', address: '' });

  const template = templates.find((t) => t._id === templateId);
  const employees = [...active, ...inactive];
  const employee = employees.find((e) => e.employeeId === employeeCode);
  const ready = template && (template.kind === 'employee' ? Boolean(employee) : recipient.name.trim() && EMAIL.test(recipient.email));

  const onCreate = async () => {
    if (!template) return;
    try {
      const letter = await create.mutateAsync(
        template.kind === 'employee'
          ? { template: template._id, employee: employee!._id }
          : { template: template._id, recipient: { name: recipient.name.trim(), email: recipient.email.trim(), address: recipient.address.trim() || undefined } }
      );
      if (letter.employeeCompanyMismatch) {
        toast({ variant: 'warning', title: 'Different company', description: 'This employee belongs to another company than the template’s letterhead. Check before issuing.' });
      }
      navigate(`/letters/${letter._id}`);
    } catch (e) {
      toast({ variant: 'error', title: 'Could not start the letter', description: errorMessage(e) });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to letters">
          <Link to="/letters"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">New letter</h1>
      </div>

      <div className="space-y-5 rounded-lg border border-border bg-card p-4 md:p-6">
        <div className="space-y-1.5">
          <Label htmlFor="letter-template">Template</Label>
          <Select value={templateId} onValueChange={setTemplateId} disabled={isLoading}>
            <SelectTrigger id="letter-template" className="w-full"><SelectValue placeholder={isLoading ? 'Loading…' : 'Choose a template'} /></SelectTrigger>
            <SelectContent>
              {templates.map((t) => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {!isLoading && templates.length === 0 && (
            <p className="text-xs text-muted-foreground">No templates yet. <Link className="underline" to="/letters/templates/new">Create one</Link></p>
          )}
        </div>

        {template?.kind === 'employee' && (
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <SearchableEmployeeSelect employees={employees} value={employeeCode} onValueChange={setEmployeeCode} placeholder="Search by name or code" />
            <p className="text-xs text-muted-foreground">Former employees are included, for relieving and experience letters.</p>
          </div>
        )}

        {template?.kind === 'manual' && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Recipient</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="recipient-name">Full name</Label>
                <Input id="recipient-name" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recipient-email">Email</Label>
                <Input id="recipient-email" type="email" value={recipient.email} onChange={(e) => setRecipient({ ...recipient, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recipient-address">Address</Label>
              <Textarea id="recipient-address" className="h-20" value={recipient.address} onChange={(e) => setRecipient({ ...recipient, address: e.target.value })} />
            </div>
          </fieldset>
        )}

        <div className="flex justify-end">
          <Button onClick={onCreate} disabled={!ready || create.isPending} className="gap-1.5">
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewLetterPage;
