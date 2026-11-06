import { useState } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { History } from 'lucide-react';
import useAuth from '@/hooks/authjwt';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useHrBuddyRuntime } from './runtime';
import { Thread } from './Thread';
import { ThreadList } from './ThreadList';
import { Mascot } from './Mascot';

export default function AssistantPage() {
  const runtime = useHrBuddyRuntime();
  const user = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';
  const isStaff = user?.role === 'admin' || user?.role === 'hr';

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] min-h-0 bg-background md:h-dvh">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border p-3 md:flex" aria-label="HR Buddy conversations">
          <p className="mb-2 flex items-center gap-2 px-3 text-sm font-semibold">
            <Mascot className="size-7" />
            HR Buddy
          </p>
          <ThreadList />
        </aside>
        <main className="relative flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="absolute top-3 left-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Conversation history"
          >
            <History className="size-4" />
          </button>
          <Thread firstName={firstName} isStaff={isStaff} />
        </main>
      </div>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="flex h-[80dvh] max-w-sm flex-col">
          <DialogTitle>Conversations</DialogTitle>
          <ThreadList onNavigate={() => setHistoryOpen(false)} />
        </DialogContent>
      </Dialog>
    </AssistantRuntimeProvider>
  );
}
