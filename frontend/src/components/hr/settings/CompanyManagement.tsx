import React, { useState } from 'react';
import { Landmark, Plus, Edit2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useCompanies, useAddCompany, useUpdateCompany, useDeleteCompany } from '@/hooks/queries';
import { useToast } from '../../ui/toast';
import type { Company } from '@/types';

type EditorState = { mode: 'add' } | { mode: 'edit'; company: Company } | null;

const CompanyManagement: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const { toast } = useToast();
  const confirm = useConfirm();

  const { data: companies = [], isLoading } = useCompanies({ enabled });
  const addCompany = useAddCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const [editor, setEditor] = useState<EditorState>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const openEditor = (next: NonNullable<EditorState>) => {
    setName(next.mode === 'edit' ? next.company.name : '');
    setAddress(next.mode === 'edit' ? next.company.address ?? '' : '');
    setEditor(next);
  };

  const showError = (err: unknown, title: string) => {
    toast({ variant: 'destructive', title, description: err instanceof Error ? err.message : 'Action failed' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor || !name.trim()) return;
    const input = { name: name.trim(), address: address.trim() };
    try {
      if (editor.mode === 'add') {
        await addCompany.mutateAsync(input);
        toast({ variant: 'success', title: 'Company Added', description: `${input.name} added.` });
      } else {
        const result = await updateCompany.mutateAsync({ id: editor.company._id, ...input });
        const moved = result?.employeesUpdated ?? 0;
        toast({
          variant: 'success',
          title: 'Company Updated',
          description: moved ? `${moved} employee record${moved === 1 ? '' : 's'} renamed.` : `${input.name} saved.`,
        });
      }
      setEditor(null);
    } catch (err) {
      showError(err, editor.mode === 'add' ? 'Add Failed' : 'Update Failed');
    }
  };

  const handleDelete = async (company: Company) => {
    const confirmed = await confirm({
      title: 'Delete company?',
      description: `Delete ${company.name}? This cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteCompany.mutateAsync(company._id);
      toast({ variant: 'success', title: 'Company Deleted', description: `${company.name} deleted.` });
    } catch (err) {
      showError(err, 'Delete Failed');
    }
  };

  const saving = addCompany.isPending || updateCompany.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Legal entities employees belong to. The name and address appear on salary slips.
        </p>
        <Button onClick={() => openEditor({ mode: 'add' })} className="shrink-0">
          <Plus className="w-4 h-4" />
          Add Company
        </Button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border">
        {isLoading ? (
          <p className="p-8 text-center text-muted-foreground">Loading companies...</p>
        ) : companies.length === 0 ? (
          <div className="p-8 text-center">
            <Landmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
            <p className="text-muted-foreground">No companies yet. Add one before creating employees.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {companies.map((company) => {
              const count = company.employeeCount ?? 0;
              return (
                <li key={company._id} className="p-3 sm:p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                      <Landmark className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">{company.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {company.address || <span className="italic">No address set</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {count} active employee{count === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditor({ mode: 'edit', company })}
                      aria-label={`Edit ${company.name}`}
                      title="Edit company"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(company)}
                      disabled={count > 0 || deleteCompany.isPending}
                      aria-label={`Delete ${company.name}`}
                      title={count > 0 ? 'Reassign its employees before deleting' : 'Delete company'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editor?.mode === 'edit' ? 'Edit Company' : 'Add Company'}</DialogTitle>
              <DialogDescription>
                {editor?.mode === 'edit'
                  ? 'Renaming updates every employee assigned to this company.'
                  : 'Create a company employees can be assigned to.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Acme Private Limited"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-address">Address</Label>
              <Textarea
                id="company-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Printed under the company name on salary slips"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditor(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || saving}>
                {saving ? 'Saving...' : editor?.mode === 'edit' ? 'Save' : 'Add Company'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyManagement;
