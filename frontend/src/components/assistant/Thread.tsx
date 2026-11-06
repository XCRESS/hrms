import type { ReactNode } from 'react';
import {
  ActionBarPrimitive,
  AttachmentPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react';
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Copy, FileText, FileUp, Globe, Paperclip, Pencil, RefreshCw, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MarkdownText } from './MarkdownText';
import { parseSuggestions } from './text';
import { ToolPart } from './ToolPart';
import { DraftRegistryProvider } from './blocks/draftRegistry';
import { Mascot } from './Mascot';
import { kindOf } from './fileKinds';

const STARTERS: Record<'staff' | 'employee', string[]> = {
  staff: ["Who's absent today?", 'Expenses last month by person', 'Show pending approvals', 'Draft an announcement'],
  employee: ['My attendance this month', 'Fill my task report and check me out', 'My leave requests', 'My pay for days worked this month'],
};

const iconButton =
  'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40';

function Welcome({ firstName, isStaff }: { firstName: string; isStaff: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
      <Mascot className="size-16" />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Hi {firstName}, what do you need?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ask about attendance, pay, requests or policies, or ask HR Buddy to do something for you.</p>
      </div>
      <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {STARTERS[isStaff ? 'staff' : 'employee'].map((prompt) => (
          <ThreadPrimitive.Suggestion
            key={prompt}
            prompt={prompt}
            send
            className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {prompt}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}

function BranchPicker({ className }: { className?: string }) {
  return (
    <BranchPickerPrimitive.Root hideWhenSingleBranch className={cn('inline-flex items-center text-xs text-muted-foreground', className)}>
      <BranchPickerPrimitive.Previous className={iconButton} aria-label="Previous version">
        <ChevronLeft className="size-4" />
      </BranchPickerPrimitive.Previous>
      <span className="tabular-nums">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next className={iconButton} aria-label="Next version">
        <ChevronRight className="size-4" />
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
}

function EditComposer() {
  return (
    <ComposerPrimitive.Root className="ml-auto flex w-full max-w-[85%] flex-col gap-2 rounded-2xl border border-border bg-muted p-3">
      <ComposerPrimitive.Input className="min-h-16 w-full resize-none bg-transparent text-[15px] outline-none" autoFocus />
      <div className="flex justify-end gap-2">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost" size="sm">Cancel</Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button size="sm">Send</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
}

function UserMessage() {
  const isEditing = useAuiState((s) => s.message.composer.isEditing);
  if (isEditing) {
    return (
      <MessagePrimitive.Root className="py-3">
        <EditComposer />
      </MessagePrimitive.Root>
    );
  }
  return (
    <MessagePrimitive.Root className="group flex flex-col items-end gap-1.5 py-2">
      <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5 empty:hidden">
        <MessagePrimitive.Attachments>{() => <SentAttachment />}</MessagePrimitive.Attachments>
      </div>
      <div className="flex max-w-[85%] items-center gap-1 empty:hidden">
        <ActionBarPrimitive.Root className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <ActionBarPrimitive.Edit className={iconButton} aria-label="Edit message">
            <Pencil className="size-4" />
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>
        <AuiIf condition={(s) => s.message.parts.some((p) => p.type === 'text' && p.text.trim() !== '')}>
          <div className="min-w-0 whitespace-pre-wrap rounded-2xl bg-muted px-4 py-2.5 text-[15px] text-foreground">
            <MessagePrimitive.Parts>{({ part }) => (part.type === 'text' ? <span>{part.text}</span> : null)}</MessagePrimitive.Parts>
          </div>
        </AuiIf>
      </div>
      <BranchPicker className="mt-1" />
    </MessagePrimitive.Root>
  );
}

function Sources() {
  const sources = useAuiState((s) => s.message.parts).filter(
    (p): p is Extract<typeof p, { type: 'source'; sourceType: 'url' }> => p.type === 'source' && p.sourceType === 'url'
  );
  if (!sources.length) return null;
  const unique = [...new Map(sources.map((s) => [s.url.split('?')[0], s])).values()].slice(0, 5);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <Globe className="size-3.5 text-muted-foreground" aria-hidden />
      {unique.map((s) => (
        <a
          key={s.id}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="max-w-56 truncate rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {s.title || new URL(s.url).hostname.replace(/^www\./, '')}
        </a>
      ))}
    </div>
  );
}

function FollowUps() {
  const isLast = useAuiState((s) => s.message.isLast);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const text = useAuiState((s) => s.message.parts)
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('\n');
  const suggestions = isLast && !isRunning ? parseSuggestions(text) : [];
  if (!suggestions.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {suggestions.map((prompt) => (
        <ThreadPrimitive.Suggestion
          key={prompt}
          prompt={prompt}
          send
          className="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {prompt}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="group py-2">
      <div className="min-w-0">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === 'text') return <MarkdownText />;
            if (part.type === 'tool-call') return part.toolUI ?? <ToolPart {...part} />;
            return null;
          }}
        </MessagePrimitive.Parts>
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
            <ErrorPrimitive.Message />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
        <Sources />
      </div>
      <div className="mt-1 flex items-center gap-1">
        <BranchPicker />
        <ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className="flex items-center gap-1">
          <ActionBarPrimitive.Copy className={cn(iconButton, 'group/copy')} aria-label="Copy">
            <Copy className="size-4 group-data-[copied]/copy:hidden" />
            <Check className="hidden size-4 group-data-[copied]/copy:block" />
          </ActionBarPrimitive.Copy>
          <ActionBarPrimitive.Reload className={iconButton} aria-label="Regenerate">
            <RefreshCw className="size-4" />
          </ActionBarPrimitive.Reload>
        </ActionBarPrimitive.Root>
      </div>
      <FollowUps />
    </MessagePrimitive.Root>
  );
}

function FileChip({ name, children }: { name: string; children?: ReactNode }) {
  return (
    <span className="inline-flex max-w-60 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">
      <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="truncate font-medium">{name}</span>
      <span className="shrink-0 text-muted-foreground">{kindOf(name).label}</span>
      {children}
    </span>
  );
}

function SentAttachment() {
  const name = useAuiState((s) => s.attachment.name);
  const kind = kindOf(name);
  return (
    <AttachmentPrimitive.Root className="flex w-60 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <FileText className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block text-xs text-muted-foreground">{kind.label}</span>
      </span>
    </AttachmentPrimitive.Root>
  );
}

function ComposerAttachment() {
  const name = useAuiState((s) => s.attachment.name);
  return (
    <AttachmentPrimitive.Root>
      <FileChip name={name}>
        <AttachmentPrimitive.Remove className="rounded-full text-muted-foreground hover:text-destructive" aria-label={`Remove ${name}`}>
          <X className="size-3.5" />
        </AttachmentPrimitive.Remove>
      </FileChip>
    </AttachmentPrimitive.Root>
  );
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="flex w-full flex-wrap items-end gap-2 rounded-3xl border border-border bg-card px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
      <AuiIf condition={(s) => s.composer.attachments.length > 0}>
        <div className="flex w-full flex-wrap gap-1.5 px-1 pt-1">
          <ComposerPrimitive.Attachments>{() => <ComposerAttachment />}</ComposerPrimitive.Attachments>
        </div>
      </AuiIf>
      <ComposerPrimitive.AddAttachment className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Attach a file">
        <Paperclip className="size-4" />
      </ComposerPrimitive.AddAttachment>
      <ComposerPrimitive.Input
        placeholder="Ask HR Buddy…"
        rows={1}
        autoFocus
        className="max-h-48 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-muted-foreground"
        aria-label="Message HR Buddy"
      />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30" aria-label="Send">
          <ArrowUp className="size-4" />
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Stop">
          <Square className="size-3.5 fill-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </ComposerPrimitive.Root>
  );
}

export function Thread({ firstName, isStaff }: { firstName: string; isStaff: boolean }) {
  return (
    <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col">
      <DraftRegistryProvider>
        <ComposerPrimitive.AttachmentDropzone className="group/drop relative flex min-h-0 flex-1 flex-col">
          <div
            className="pointer-events-none absolute inset-3 z-20 hidden flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary bg-background/90 text-sm font-medium group-data-[dragging=true]/drop:flex"
            aria-hidden
          >
            <FileUp className="size-8 text-primary" />
            Drop files to attach
            <span className="text-xs font-normal text-muted-foreground">PDF, Excel, CSV, Word, text or images · up to 10 MB</span>
          </div>
          <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pt-14 md:pt-6">
              <AuiIf condition={(s) => s.thread.isEmpty}>
                <Welcome firstName={firstName} isStaff={isStaff} />
              </AuiIf>
              <ThreadPrimitive.Messages>{({ message }) => (message.role === 'user' ? <UserMessage /> : <AssistantMessage />)}</ThreadPrimitive.Messages>
            </div>
            <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto flex w-full max-w-3xl flex-col items-center gap-1.5 bg-background pt-1 pb-3">
              <ThreadPrimitive.ScrollToBottom
                className="absolute -top-11 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background p-2 shadow-sm hover:bg-accent disabled:hidden"
                aria-label="Scroll to latest"
              >
                <ArrowDown className="size-4" />
              </ThreadPrimitive.ScrollToBottom>
              <Composer />
              <p className="text-center text-[11px] text-muted-foreground">HR Buddy can make mistakes. Nothing is saved until you press a button.</p>
            </ThreadPrimitive.ViewportFooter>
          </ThreadPrimitive.Viewport>
        </ComposerPrimitive.AttachmentDropzone>
      </DraftRegistryProvider>
    </ThreadPrimitive.Root>
  );
}
