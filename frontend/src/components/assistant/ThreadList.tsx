import { useState } from 'react';
import { ThreadListItemMorePrimitive, ThreadListItemPrimitive, ThreadListPrimitive, useAuiState } from '@assistant-ui/react';
import { Archive, ArchiveRestore, ChevronRight, MoreHorizontal, SquarePen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const GROUPS = ['Today', 'Previous 7 days', 'Older'] as const;

const groupOf = (updatedAt: unknown): (typeof GROUPS)[number] => {
  const time = typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : NaN;
  if (Number.isNaN(time)) return 'Today';
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (time >= startOfToday.getTime()) return 'Today';
  if (time >= startOfToday.getTime() - 7 * 86_400_000) return 'Previous 7 days';
  return 'Older';
};

const menuItem = 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent';

function GroupHeading({ id }: { id: string }) {
  const ids = useAuiState((s) => s.threads.threadIds);
  const items = useAuiState((s) => s.threads.threadItems);
  const index = ids.indexOf(id);
  const group = groupOf(items.find((t) => t.id === id)?.custom?.updatedAt);
  const previousGroup = index > 0 ? groupOf(items.find((t) => t.id === ids[index - 1])?.custom?.updatedAt) : null;
  if (group === previousGroup) return null;
  return <p className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground">{group}</p>;
}

function ThreadItem({ archived }: { archived?: boolean }) {
  return (
    <ThreadListItemPrimitive.Root className="group relative flex h-9 items-center rounded-lg hover:bg-accent data-active:bg-accent">
      <ThreadListItemPrimitive.Trigger data-navigates className={cn('min-w-0 flex-1 truncate rounded-lg px-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring', archived && 'text-muted-foreground')}>
        <ThreadListItemPrimitive.Title fallback="New chat" />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemMorePrimitive.Root sharedFocusGroup>
        <ThreadListItemMorePrimitive.Trigger
          className="absolute end-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 hover:bg-background group-hover:opacity-100 group-has-focus-visible:opacity-100 data-[state=open]:opacity-100"
          aria-label="Conversation options"
        >
          <MoreHorizontal className="size-4" />
        </ThreadListItemMorePrimitive.Trigger>
        <ThreadListItemMorePrimitive.Content className="z-50 min-w-36 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md" align="end">
          {archived ? (
            <ThreadListItemPrimitive.Unarchive asChild>
              <ThreadListItemMorePrimitive.Item className={menuItem}>
                <ArchiveRestore className="size-4" />
                Restore
              </ThreadListItemMorePrimitive.Item>
            </ThreadListItemPrimitive.Unarchive>
          ) : (
            <ThreadListItemPrimitive.Archive asChild>
              <ThreadListItemMorePrimitive.Item className={menuItem}>
                <Archive className="size-4" />
                Archive
              </ThreadListItemMorePrimitive.Item>
            </ThreadListItemPrimitive.Archive>
          )}
          <ThreadListItemPrimitive.Delete asChild>
            <ThreadListItemMorePrimitive.Item className={cn(menuItem, 'text-destructive data-highlighted:bg-destructive/10')}>
              <Trash2 className="size-4" />
              Delete
            </ThreadListItemMorePrimitive.Item>
          </ThreadListItemPrimitive.Delete>
        </ThreadListItemMorePrimitive.Content>
      </ThreadListItemMorePrimitive.Root>
    </ThreadListItemPrimitive.Root>
  );
}

export function ThreadList({ onNavigate }: { onNavigate?: () => void }) {
  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = useAuiState((s) => s.threads.archivedThreadIds.length);

  return (
    <ThreadListPrimitive.Root className="flex h-full min-h-0 flex-col gap-1" onClick={(e) => (e.target as HTMLElement).closest('[data-navigates]') && onNavigate?.()}>
      <ThreadListPrimitive.New
        data-navigates
        className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SquarePen className="size-4" />
        New chat
      </ThreadListPrimitive.New>
      <nav className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1" aria-label="Conversations">
        <ThreadListPrimitive.Items>
          {({ threadListItem }) => (
            <div>
              <GroupHeading id={threadListItem.id} />
              <ThreadItem />
            </div>
          )}
        </ThreadListPrimitive.Items>

        {archivedCount > 0 && (
          <div className="mt-4 border-t border-border pt-2">
            <button
              type="button"
              aria-expanded={showArchived}
              onClick={() => setShowArchived((v) => !v)}
              className="flex w-full items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className={cn('size-3.5 transition-transform', showArchived && 'rotate-90')} />
              Archived ({archivedCount})
            </button>
            {showArchived && (
              <ThreadListPrimitive.Items archived>
                {() => <ThreadItem archived />}
              </ThreadListPrimitive.Items>
            )}
          </div>
        )}
      </nav>
    </ThreadListPrimitive.Root>
  );
}
