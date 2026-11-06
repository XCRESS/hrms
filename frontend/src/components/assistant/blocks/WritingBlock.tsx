import { useState } from 'react';
import { Mail, Megaphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useCreateAnnouncement } from '@/hooks/queries/useAnnouncements';
import { useSendAssistantEmail } from '@/hooks/queries/useAssistant';
import type { CreateAnnouncementDto } from '@/types';
import type { AnnouncementFields, EmailFields, Recipient } from '../types';
import { DataTable } from '../results/DataTable';
import { type DraftEntry, lastOf } from './draftEntries';
import { useDraftVersions } from './useDraftVersions';
import { useDraftCommit, useReviseDraft } from './useDraftActions';
import { DraftFrame } from './DraftFrame';
import { BodyEditor } from './BodyEditor';
import { ConfirmBulk } from './ConfirmBulk';
import { Receipt } from './Receipt';

const AUDIENCES: { value: AnnouncementFields['targetAudience']; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'employee', label: 'Employees' },
  { value: 'hr', label: 'HR' },
  { value: 'admin', label: 'Admins' },
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AnnouncementBlock({ entries }: { entries: DraftEntry[] }) {
  const latest = lastOf(entries);
  const versions = useDraftVersions(entries.map((e) => e.draft.fields as unknown as AnnouncementFields));
  const fields = versions.current;
  const revise = useReviseDraft(latest.draft);
  const { commit, pending, error, receipt } = useDraftCommit(latest);
  const createAnnouncement = useCreateAnnouncement();
  const [expanded, setExpanded] = useState(false);

  const audience = AUDIENCES.find((a) => a.value === fields.targetAudience)?.label ?? 'Everyone';
  if (receipt) return <Receipt receipt={receipt} title="Announcement" />;

  const set = (patch: Partial<AnnouncementFields>) => versions.edit({ ...fields, ...patch });
  const onRevise = (instruction: string, selection?: string) => {
    versions.followLatest();
    setExpanded(false);
    revise(instruction, fields, selection);
  };
  const issues = [...(!fields.title.trim() ? ['Add a title'] : []), ...(!fields.content.trim() ? ['Write the announcement'] : [])];
  const publish = () =>
    commit(async () => {
      await createAnnouncement.mutateAsync({
        title: fields.title.trim(),
        content: fields.content.trim(),
        targetAudience: fields.targetAudience as CreateAnnouncementDto['targetAudience'],
        status: 'published',
      });
      return { summary: `Announcement “${fields.title.trim()}” published to ${audience}`, link: '/announcements', committedFields: { ...fields } };
    });

  const editor = (idPrefix: string) => (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
        <div>
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <Input id={`${idPrefix}-title`} value={fields.title} onChange={(e) => set({ title: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-audience`}>Audience</Label>
          <Select value={fields.targetAudience} onValueChange={(v) => set({ targetAudience: v as AnnouncementFields['targetAudience'] })}>
            <SelectTrigger id={`${idPrefix}-audience`} className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCES.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <BodyEditor id={`${idPrefix}-body`} label="Announcement text" value={fields.content} onChange={(content) => set({ content })} onRevise={onRevise} minRows={idPrefix === 'full' ? 16 : 6} />
    </div>
  );

  return (
    <>
      <DraftFrame
        anchorId={`draft-${latest.draft.draftId}`}
        title="Announcement"
        subtitle={entries.length > 1 ? `Version ${entries.length}` : undefined}
        issues={issues}
        error={error}
        versions={versions}
        onExpand={() => setExpanded(true)}
        footer={
          <>
            <Megaphone className="size-4 text-muted-foreground" aria-hidden />
            <span className="mr-auto text-xs text-muted-foreground">Goes to {audience}</span>
            <ConfirmBulk label="Publish" confirmLabel="Yes, publish" warning="" requireSecondPress={false} disabled={issues.length > 0} pending={pending} onConfirm={publish} />
          </>
        }
      >
        {editor('inline')}
      </DraftFrame>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="flex h-[90dvh] max-w-3xl flex-col overflow-y-auto">
          <DialogTitle>Announcement</DialogTitle>
          {editor('full')}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecipientField({ fields, onChange }: { fields: EmailFields; onChange: (patch: Partial<EmailFields>) => void }) {
  const [typed, setTyped] = useState('');
  const add = (r: Recipient) => {
    if (fields.to.some((t) => t.email.toLowerCase() === r.email.toLowerCase())) return;
    onChange({ to: [...fields.to, r] });
  };
  const addTyped = () => {
    const email = typed.trim();
    if (!EMAIL.test(email)) return;
    add({ name: email, email });
    setTyped('');
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="email-to">To</Label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5">
        {fields.to.map((r) => (
          <span key={r.email} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs" title={r.email}>
            {r.name}
            <button type="button" onClick={() => onChange({ to: fields.to.filter((t) => t.email !== r.email) })} aria-label={`Remove ${r.name}`} className="rounded-full hover:text-destructive">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id="email-to"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTyped();
            }
          }}
          onBlur={addTyped}
          placeholder={fields.to.length ? '' : 'Type an email address'}
          className="min-w-40 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {fields.unresolved.map((u) => (
        <div key={u.query} className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
          <p className="mb-1.5 text-foreground">
            Who is “{u.query}”?{u.candidates.length === 0 && ' No match in the directory — type their address above.'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {u.candidates.map((c) => (
              <Button
                key={c.email}
                type="button"
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => onChange({ to: [...fields.to, c], unresolved: fields.unresolved.filter((x) => x.query !== u.query) })}
              >
                {c.name} · {c.email}
              </Button>
            ))}
            <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => onChange({ unresolved: fields.unresolved.filter((x) => x.query !== u.query) })}>
              Skip
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmailBlock({ entries }: { entries: DraftEntry[] }) {
  const latest = lastOf(entries);
  const versions = useDraftVersions(entries.map((e) => e.draft.fields as unknown as EmailFields));
  const fields = versions.current;
  const revise = useReviseDraft(latest.draft);
  const { commit, pending, error, receipt } = useDraftCommit(latest);
  const sendEmail = useSendAssistantEmail();
  const [expanded, setExpanded] = useState(false);

  if (receipt) return <Receipt receipt={receipt} title="Email" />;

  const set = (patch: Partial<EmailFields>) => versions.edit({ ...fields, ...patch });
  const onRevise = (instruction: string, selection?: string) => {
    versions.followLatest();
    setExpanded(false);
    revise(instruction, fields, selection);
  };
  const issues = [
    ...(fields.to.length === 0 ? ['Add at least one recipient'] : []),
    ...(fields.unresolved.length ? ['Choose or skip the recipients above'] : []),
    ...(!fields.subject.trim() ? ['Add a subject'] : []),
    ...(!fields.body.trim() ? ['Write the email'] : []),
  ];
  const send = () =>
    commit(async () => {
      const result = await sendEmail.mutateAsync({ to: fields.to.map((r) => r.email), subject: fields.subject.trim(), body: fields.body.trim(), table: fields.table ?? null });
      const failed = result.failed.length ? ` (failed: ${result.failed.map((f) => f.email).join(', ')})` : '';
      return {
        summary: `Email “${fields.subject.trim()}” sent to ${result.sent.length} recipient${result.sent.length === 1 ? '' : 's'}${failed}`,
        committedFields: { to: result.sent, subject: fields.subject, hasTable: Boolean(fields.table) },
      };
    });

  const editor = (idPrefix: string) => (
    <div className="space-y-3">
      <RecipientField fields={fields} onChange={set} />
      <div>
        <Label htmlFor={`${idPrefix}-subject`}>Subject</Label>
        <Input id={`${idPrefix}-subject`} value={fields.subject} onChange={(e) => set({ subject: e.target.value })} className="mt-1" />
      </div>
      <BodyEditor id={`${idPrefix}-body`} label="Email text" value={fields.body} onChange={(body) => set({ body })} onRevise={onRevise} minRows={idPrefix === 'full' ? 14 : 6} />
      {fields.table && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Attached table · {fields.table.rows.length} rows</span>
            <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => set({ table: null })}>
              Remove table
            </Button>
          </div>
          <DataTable columns={fields.table.columns.map((c) => ({ ...c, kind: 'text' as const }))} rows={fields.table.rows} />
        </div>
      )}
    </div>
  );

  return (
    <>
      <DraftFrame
        anchorId={`draft-${latest.draft.draftId}`}
        title="Email"
        subtitle={entries.length > 1 ? `Version ${entries.length}` : undefined}
        issues={issues}
        error={error}
        versions={versions}
        onExpand={() => setExpanded(true)}
        footer={
          <>
            <Mail className="size-4 text-muted-foreground" aria-hidden />
            <span className="mr-auto text-xs text-muted-foreground">Sent from the HRMS; replies come to you</span>
            <ConfirmBulk label="Send" confirmLabel="Yes, send" warning="" requireSecondPress={false} disabled={issues.length > 0} pending={pending} onConfirm={send} />
          </>
        }
      >
        {editor('inline')}
      </DraftFrame>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="flex h-[90dvh] max-w-3xl flex-col overflow-y-auto">
          <DialogTitle>Email</DialogTitle>
          {editor('full')}
        </DialogContent>
      </Dialog>
    </>
  );
}
