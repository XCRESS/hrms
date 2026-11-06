import { ShieldAlert, UserCog } from 'lucide-react';
import { useUpdateUserRole } from '@/hooks/queries/useUsers';
import { useEmployee, useToggleEmployeeStatus } from '@/hooks/queries/useEmployees';
import type { UserRole } from '@/types';
import type { EmployeeStatusFields, RoleChangeFields } from '../types';
import { type DraftEntry, lastOf } from './draftEntries';
import { useDraftCommit } from './useDraftActions';
import { DraftFrame } from './DraftFrame';
import { ConfirmBulk } from './ConfirmBulk';
import { Receipt } from './Receipt';

const ROLE_LABEL = { admin: 'Admin', hr: 'HR', employee: 'Employee' } as const;

export function RoleChangeBlock({ entries }: { entries: DraftEntry[] }) {
  const latest = lastOf(entries);
  const f = latest.draft.fields as unknown as RoleChangeFields;
  const { commit, pending, error, receipt } = useDraftCommit(latest);
  const updateRole = useUpdateUserRole();
  if (receipt) return <Receipt receipt={receipt} title="Role change" />;

  const sentence = `Change ${f.name}'s role from ${ROLE_LABEL[f.fromRole]} to ${ROLE_LABEL[f.toRole]}`;
  return (
    <DraftFrame
      anchorId={`draft-${latest.draft.draftId}`}
      title="Role change"
      issues={latest.draft.issues}
      error={error}
      footer={
        <>
          <span className="mr-auto text-xs text-muted-foreground">Takes effect on their next request</span>
          <ConfirmBulk
            label="Change role"
            confirmLabel="Yes"
            warning=""
            requireSecondPress={false}
            disabled={latest.draft.issues.length > 0}
            pending={pending}
            onConfirm={() =>
              commit(async () => {
                await updateRole.mutateAsync({ userId: f.userId, role: f.toRole as UserRole });
                return { summary: `${f.name} is now ${ROLE_LABEL[f.toRole]}`, committedFields: { userId: f.userId, role: f.toRole } };
              })
            }
          />
        </>
      }
    >
      <p className="flex items-center gap-2 text-sm">
        <UserCog className="size-4 text-muted-foreground" aria-hidden />
        {sentence}
        {f.email && <span className="text-muted-foreground">({f.email})</span>}
      </p>
    </DraftFrame>
  );
}

export function EmployeeStatusBlock({ entries }: { entries: DraftEntry[] }) {
  const latest = lastOf(entries);
  const f = latest.draft.fields as unknown as EmployeeStatusFields;
  const { commit, pending, error, receipt } = useDraftCommit(latest);
  const toggle = useToggleEmployeeStatus();
  const employee = useEmployee(f.employeeObjId);
  const title = f.toActive ? 'Reactivate employee' : 'Deactivate employee';
  if (receipt) return <Receipt receipt={receipt} title={title} />;

  const sentence = f.toActive
    ? `Reactivate ${f.name} (${f.employeeId}). They will be able to log in again.`
    : `Deactivate ${f.name} (${f.employeeId}). They will be signed out and can't log in.`;

  return (
    <DraftFrame
      anchorId={`draft-${latest.draft.draftId}`}
      title={title}
      issues={latest.draft.issues}
      error={error}
      footer={
        <>
          <span className="mr-auto" />
          <ConfirmBulk
            label={f.toActive ? 'Reactivate' : 'Deactivate'}
            confirmLabel="Yes"
            warning=""
            requireSecondPress={false}
            variant={f.toActive ? 'default' : 'destructive'}
            disabled={latest.draft.issues.length > 0}
            pending={pending}
            onConfirm={() =>
              commit(async () => {
                // The endpoint toggles rather than sets, so re-check before pressing it.
                const { data } = await employee.refetch();
                if ((data?.isActive !== false) !== f.fromActive) throw new Error('Status changed since this was proposed. Ask HR Buddy again.');
                await toggle.mutateAsync(f.employeeObjId);
                return { summary: `${f.name} ${f.toActive ? 'reactivated' : 'deactivated'}`, link: '/employees', committedFields: { employee: f.employeeObjId, active: f.toActive } };
              })
            }
          />
        </>
      }
    >
      <p className="flex items-start gap-2 text-sm">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        {sentence}
      </p>
    </DraftFrame>
  );
}
