import { BellOff, BellRing, Share, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDisablePush, useEnablePush, usePushState } from '@/hooks/queries/useNotifications';
import type { PushState } from '@/services/pushClient';

const HINTS: Record<Exclude<PushState, 'prompt' | 'subscribed'>, string> = {
  unsupported: "This browser can't receive push notifications. Your inbox still collects everything.",
  'needs-install': 'On iPhone, tap Share → "Add to Home Screen", then open HRMS from there to turn on alerts.',
  unconfigured: 'Push is not configured on the server yet.',
  denied: 'Notifications are blocked. Allow them for this site in your browser settings.',
};

/** Device-level push switch. `compact` fits the inbox footer. */
export default function PushToggle({ compact = false }: { compact?: boolean }) {
  const { data: state } = usePushState();
  const enable = useEnablePush();
  const disable = useDisablePush();

  if (!state) return null;

  if (state === 'subscribed') {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <BellRing className="size-4 text-primary" />
          Push is on for this device
        </p>
        <Button variant="ghost" size="sm" disabled={disable.isPending} onClick={() => disable.mutate()}>
          Turn off
        </Button>
      </div>
    );
  }

  if (state === 'prompt') {
    return (
      <div className={compact ? 'flex items-center justify-between gap-3' : 'space-y-3'}>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <BellOff className="size-4" />
          Get check-in reminders and approvals on this device
        </p>
        <Button size="sm" disabled={enable.isPending} onClick={() => enable.mutate()}>
          {enable.isPending ? 'Enabling…' : 'Turn on'}
        </Button>
      </div>
    );
  }

  const Icon = state === 'needs-install' ? Share : ShieldAlert;
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Icon className="size-4 shrink-0 mt-0.5" />
      {HINTS[state]}
    </p>
  );
}
