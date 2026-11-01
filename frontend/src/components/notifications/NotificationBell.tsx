import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useMarkNotificationsRead,
  useNotificationInbox,
  useUnreadNotificationCount,
  type InboxNotification,
} from '@/hooks/queries/useNotifications';
import { formatRelativeTime } from '@/utils/luxonUtils';
import PushToggle from './PushToggle';

export default function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unread = 0 } = useUnreadNotificationCount();
  const { data: inbox, isLoading } = useNotificationInbox(open);
  const markRead = useMarkNotificationsRead();

  const openItem = (item: InboxNotification) => {
    if (!item.readAt) markRead.mutate({ ids: [item._id] });
    setOpen(false);
    navigate(item.url);
  };

  const items = inbox?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          className={cn(
            'relative p-2.5 text-muted-foreground hover:text-foreground bg-card rounded-xl shadow-md hover:shadow-lg border border-border transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-[11px] font-semibold leading-5 text-center text-white tabular-nums">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          <Button
            variant="ghost"
            size="sm"
            disabled={unread === 0 || markRead.isPending}
            onClick={() => markRead.mutate({ all: true })}
          >
            <CheckCheck className="size-4 mr-1" />
            Mark all read
          </Button>
        </div>

        <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border" aria-busy={isLoading}>
          {isLoading && <li className="px-4 py-6 text-sm text-muted-foreground">Loading…</li>}
          {!isLoading && items.length === 0 && (
            <li className="flex flex-col items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
              <Inbox className="size-6" />
              You're all caught up
            </li>
          )}
          {items.map((item) => (
            <li key={item._id}>
              <button
                type="button"
                onClick={() => openItem(item)}
                className="w-full text-left px-4 py-3 flex gap-3 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span
                  aria-hidden
                  className={cn('mt-1.5 size-2 shrink-0 rounded-full', item.readAt ? 'bg-transparent' : 'bg-primary')}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm text-foreground', !item.readAt && 'font-semibold')}>
                    {item.title}
                  </span>
                  {item.body && <span className="block text-sm text-muted-foreground line-clamp-2">{item.body}</span>}
                  <span className="block mt-1 text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</span>
                </span>
                {!item.readAt && <span className="sr-only">Unread</span>}
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-border px-4 py-3">
          <PushToggle compact />
        </div>
      </PopoverContent>
    </Popover>
  );
}
