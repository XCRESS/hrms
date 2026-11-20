import { useState } from 'react';
import { Edit2, KeyRound, Plus, Search, Trash2 } from 'lucide-react';
import {
    useAccessGrants, useDeleteAccessGrant, useEmployees, useUpsertAccessGrant, useUsers,
} from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { employeeDisplayName } from '@/components/hr/employeeDirectory/employeeName';
import type { AccessGrant } from '@/types';

const PERMISSION = 'attendance.view' as const;
const PREVIEW = 6;

type EditorState = { mode: 'add' } | { mode: 'edit'; grant: AccessGrant };

export default function AccessGrants() {
    const { toast } = useToast();
    const confirm = useConfirm();
    const { data: grants = [], isLoading } = useAccessGrants();
    const deleteGrant = useDeleteAccessGrant();
    const [editor, setEditor] = useState<EditorState | null>(null);

    const handleRemove = async (grant: AccessGrant) => {
        const ok = await confirm({
            title: 'Remove access?',
            description: `${grant.user.name} will no longer see attendance for these ${grant.employees.length} employee(s). Their own reporting line is unaffected.`,
            confirmText: 'Remove',
            destructive: true,
        });
        if (!ok) return;
        try {
            await deleteGrant.mutateAsync(grant._id);
            toast({ variant: 'success', title: 'Access removed' });
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Could not remove access',
                description: err instanceof Error ? err.message : 'Action failed',
            });
        }
    };

    return (
        <section aria-labelledby="access-grants-heading" className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 id="access-grants-heading" className="text-base font-semibold text-foreground">
                        Additional access
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Let someone see attendance for specific employees outside their reporting line.
                    </p>
                </div>
                <Button onClick={() => setEditor({ mode: 'add' })} className="shrink-0">
                    <Plus className="w-4 h-4" />
                    Grant access
                </Button>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border">
                {isLoading ? (
                    <p className="p-8 text-center text-muted-foreground">Loading access...</p>
                ) : grants.length === 0 ? (
                    <div className="p-8 text-center">
                        <KeyRound className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                        <p className="text-muted-foreground">No additional access granted.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {grants.map((grant) => (
                            <li key={grant._id} className="p-3 sm:p-4 flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                    <p className="font-semibold text-sm text-foreground truncate">
                                        {grant.user.name}
                                        <span className="font-normal text-muted-foreground"> · {grant.user.email}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {grant.permissionLabel} for {grant.employees.length} employee{grant.employees.length === 1 ? '' : 's'}
                                        {grant.grantedBy && ` · granted by ${grant.grantedBy}`}
                                    </p>
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {grant.employees.slice(0, PREVIEW).map((e) => (
                                            <span key={e._id} className="text-xs rounded-md bg-muted text-muted-foreground px-2 py-0.5">
                                                {e.firstName} {e.lastName}
                                            </span>
                                        ))}
                                        {grant.employees.length > PREVIEW && (
                                            <span className="text-xs text-muted-foreground px-1 py-0.5">
                                                +{grant.employees.length - PREVIEW} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditor({ mode: 'edit', grant })}
                                        aria-label={`Edit access for ${grant.user.name}`}
                                        title="Edit access"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleRemove(grant)}
                                        disabled={deleteGrant.isPending}
                                        aria-label={`Remove access for ${grant.user.name}`}
                                        title="Remove access"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Dialog open={!!editor} onOpenChange={(open) => !open && setEditor(null)}>
                {editor && (
                    <GrantEditor
                        key={editor.mode === 'edit' ? editor.grant._id : 'new'}
                        grant={editor.mode === 'edit' ? editor.grant : null}
                        takenUserIds={grants.map((g) => g.user._id)}
                        onDone={() => setEditor(null)}
                    />
                )}
            </Dialog>
        </section>
    );
}

function GrantEditor({
    grant, takenUserIds, onDone,
}: {
    grant: AccessGrant | null;
    takenUserIds: string[];
    onDone: () => void;
}) {
    const { toast } = useToast();
    const { data: users = [] } = useUsers();
    const { data: employees = [] } = useEmployees({ status: 'active' });
    const upsert = useUpsertAccessGrant();

    const [userId, setUserId] = useState(grant?.user._id ?? '');
    const [selected, setSelected] = useState<Set<string>>(() => new Set(grant?.employees.map((e) => e._id)));
    const [search, setSearch] = useState('');

    const candidates = users
        .filter((u) => u.role === 'employee' && (u._id === grant?.user._id || !takenUserIds.includes(u._id)))
        .sort((a, b) => a.name.localeCompare(b.name));
    const grantee = users.find((u) => u._id === userId);

    const needle = search.trim().toLowerCase();
    const visible = [...employees]
        .filter((e) => !grantee?.employeeId || e.employeeId !== grantee.employeeId)
        .filter((e) => !needle || [employeeDisplayName(e), e.employeeId, e.department]
            .some((v) => v?.toLowerCase().includes(needle)))
        .sort((a, b) => employeeDisplayName(a).localeCompare(employeeDisplayName(b)));

    const toggle = (id: string, on: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (on) next.add(id); else next.delete(id);
            return next;
        });
    };

    const handleSave = async () => {
        try {
            await upsert.mutateAsync({ userId, permission: PERMISSION, employeeIds: [...selected] });
            toast({ variant: 'success', title: 'Access saved' });
            onDone();
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Could not save access',
                description: err instanceof Error ? err.message : 'Action failed',
            });
        }
    };

    return (
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{grant ? `Edit access for ${grant.user.name}` : 'Grant attendance access'}</DialogTitle>
                <DialogDescription>
                    They'll see these employees in a Team Attendance view on their dashboard. View only.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
                {!grant && (
                    <div className="space-y-1">
                        <Label htmlFor="grant-user">Person</Label>
                        <Select value={userId} onValueChange={setUserId}>
                            <SelectTrigger id="grant-user" className="w-full">
                                <SelectValue placeholder="Choose a user" />
                            </SelectTrigger>
                            <SelectContent>
                                {candidates.map((u) => (
                                    <SelectItem key={u._id} value={u._id}>
                                        {u.name} ({u.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="grant-search">Employees</Label>
                        <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <Input
                            id="grant-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, ID, department"
                            className="pl-9"
                        />
                    </div>
                    <ul className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                        {visible.map((e) => {
                            const id = `grant-emp-${e._id}`;
                            return (
                                <li key={e._id} className="flex items-center gap-3 px-3 py-2">
                                    <Checkbox
                                        id={id}
                                        checked={selected.has(e._id)}
                                        onCheckedChange={(checked) => toggle(e._id, checked === true)}
                                    />
                                    <Label htmlFor={id} className="flex-1 min-w-0 font-normal cursor-pointer">
                                        <span className="block truncate text-sm text-foreground">{employeeDisplayName(e)}</span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {e.employeeId}{e.department && ` · ${e.department}`}
                                        </span>
                                    </Label>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onDone}>Cancel</Button>
                <Button onClick={handleSave} disabled={!userId || selected.size === 0 || upsert.isPending}>
                    {upsert.isPending ? 'Saving...' : 'Save access'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
