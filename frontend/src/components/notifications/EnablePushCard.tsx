import { useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { usePushState } from '@/hooks/queries/useNotifications';
import PushToggle from './PushToggle';

const DISMISS_KEY = 'hrms:push-card-dismissed';

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Asks before the browser does: a blind permission prompt on load gets denied,
 * and a denial is permanent. The browser prompt only appears after "Turn on".
 */
export default function EnablePushCard() {
  const { data: state } = usePushState();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed || (state !== 'prompt' && state !== 'needs-install')) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private mode: the card just comes back next visit.
    }
  };

  return (
    <section
      aria-labelledby="enable-push-title"
      className="relative rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" />
      </button>
      <div className="flex gap-3 pr-6">
        <div className="rounded-full bg-primary/10 p-2 h-fit">
          <BellRing className="size-5 text-primary" />
        </div>
        <div className="space-y-2 min-w-0 flex-1">
          <h2 id="enable-push-title" className="text-sm font-semibold text-foreground">
            Never miss a check-in
          </h2>
          <p className="text-sm text-muted-foreground">
            A nudge before you're marked late, a reminder if you forget to check out, and an alert the moment a
            request is approved.
          </p>
          <PushToggle />
        </div>
      </div>
    </section>
  );
}
