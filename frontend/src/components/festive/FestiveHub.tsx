import { useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ActiveFestival } from '@/lib/festivals';
import type { FestiveGameKey } from '@/types';
import MithaiMatch from './MithaiMatch';
import { FestiveBackdrop, GlowingDiya } from './decor';

const GAMES: Record<FestiveGameKey, { label: string; render: (instanceId: string) => ReactNode }> = {
  'mithai-match': { label: 'Mithai Match', render: (instanceId) => <MithaiMatch instanceId={instanceId} /> },
};

const tabTriggerClass =
  'rounded-md px-4 text-orange-50/60 hover:text-orange-50 data-[state=active]:bg-white/10 data-[state=active]:font-semibold data-[state=active]:text-[#FBBF24] data-[state=active]:shadow-none';

function Greeting({ greetings, username }: { greetings: readonly string[]; username: string }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * greetings.length));
  const another = () => {
    if (greetings.length < 2) return;
    const step = 1 + Math.floor(Math.random() * (greetings.length - 1));
    setIndex((i) => (i + step) % greetings.length);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-4 text-center">
      <GlowingDiya className="size-16" />
      <figure className="max-w-md rounded-2xl border border-[#F97316]/30 bg-white/5 p-6 shadow-[0_0_30px_-10px_rgba(249,115,22,0.5)] backdrop-blur-md">
        <blockquote key={index} className="animate-fade-in font-serif text-xl italic leading-relaxed text-orange-50 md:text-2xl">
          “{greetings[index]}”
        </blockquote>
        <figcaption className="mt-4 text-sm text-[#FBBF24]">Happy Diwali, {username}</figcaption>
      </figure>
      <button
        type="button"
        onClick={another}
        className="inline-flex items-center gap-2 rounded-lg border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-2 text-sm font-semibold text-orange-50 transition-colors hover:bg-[#F97316]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]"
      >
        <RefreshCw className="size-4" aria-hidden="true" /> Read another one
      </button>
    </div>
  );
}

interface FestiveHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: ActiveFestival;
  username: string;
}

export default function FestiveHub({ open, onOpenChange, active, username }: FestiveHubProps) {
  const { festival, instanceId } = active;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-festive-theme={festival.theme}
        className="flex flex-col gap-3 overflow-hidden border-white/10 bg-[#140A0D] p-3 text-orange-50 max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none max-sm:border-0 sm:h-[min(90dvh,820px)] sm:max-w-4xl sm:rounded-2xl sm:p-5 [&>button:last-child]:z-20 [&>button:last-child]:text-orange-50/70 [@media(max-height:500px)]:h-dvh! [@media(max-height:500px)]:max-w-none! [@media(max-height:500px)]:gap-2! [@media(max-height:500px)]:rounded-none! [@media(max-height:500px)]:border-0! [@media(max-height:500px)]:p-2!"
      >
        <FestiveBackdrop calm />

        <DialogHeader className="relative z-10 pr-8 text-left [@media(max-height:500px)]:sr-only">
          <DialogTitle className="text-xl font-bold tracking-tight text-[#FDE68A]">{festival.banner.title}</DialogTitle>
          <DialogDescription className="sr-only">Festive games and greetings</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={festival.games[0] ?? 'greeting'} className="relative z-10 flex min-h-0 flex-1 flex-col">
          <TabsList className="self-start border border-white/10 bg-white/[0.03]">
            {festival.games.map((game) => (
              <TabsTrigger key={game} value={game} className={tabTriggerClass}>
                {GAMES[game].label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="greeting" className={tabTriggerClass}>
              Greeting
            </TabsTrigger>
          </TabsList>

          {festival.games.map((game) => (
            // forceMount keeps a game in progress alive while the Greeting tab is open.
            <TabsContent key={game} value={game} forceMount className="min-h-0 flex-1 data-[state=inactive]:hidden">
              {GAMES[game].render(instanceId)}
            </TabsContent>
          ))}
          <TabsContent value="greeting" className="min-h-0 flex-1">
            <Greeting greetings={festival.greetings} username={username} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
