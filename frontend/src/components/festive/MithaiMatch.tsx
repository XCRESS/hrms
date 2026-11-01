import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Crown, Loader2, Play, Repeat2, RotateCcw, Sparkles, Timer, Trophy } from 'lucide-react';
import { useFestiveLeaderboard, useFinishFestiveGame, useStartFestiveGame } from '@/hooks/queries';
import {
  MISMATCH_DELAY_MS,
  MITHAI_IDS,
  MITHAI_LABELS,
  cardSrcSet,
  createDeck,
  describeFlip,
  isComplete,
  matchReducer,
  type MatchState,
  type MithaiId,
} from '@/lib/mithaiMatch';
import { cn } from '@/lib/utils';
import { EmployeeAvatar } from '@/components/hr/employeeDirectory/components/EmployeeAvatar';
import { festiveButtonClass } from './decor';

const GAME = 'mithai-match' as const;
const CARD_SIZES = '(min-width: 768px) 140px, 22vw';
const ARROW_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 };
const ZERO_WIDTH = '​';
const MEDAL = [
  { text: 'text-[#FCD34D]', ring: 'ring-2 ring-[#FCD34D]' },
  { text: 'text-[#E5E7EB]', ring: 'ring-2 ring-[#E5E7EB]' },
  { text: 'text-[#D97706]', ring: 'ring-2 ring-[#D97706]' },
];

type Phase = 'idle' | 'loading' | 'playing' | 'done';

function preloadCards(): Promise<void> {
  const ids: (MithaiId | 'card-back')[] = [...MITHAI_IDS, 'card-back'];
  return Promise.all(
    ids.map((id) => {
      const img = new Image();
      img.sizes = CARD_SIZES;
      img.srcset = cardSrcSet(id);
      // A broken image shouldn't block play; the card just renders empty.
      return img.decode().catch(() => undefined);
    })
  ).then(() => undefined);
}

const formatTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function CardImage({ id, className }: { id: MithaiId | 'card-back'; className?: string }) {
  return (
    <img
      src={`/games/mithai-match/${id}-256.webp`}
      srcSet={cardSrcSet(id)}
      sizes={CARD_SIZES}
      alt=""
      draggable={false}
      className={cn('absolute inset-0 size-full rounded-[11%] object-cover [backface-visibility:hidden]', className)}
    />
  );
}

function StatPill({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm">
      <span className="text-orange-50/50" aria-hidden="true">
        {icon}
      </span>
      <span className="text-orange-50/70">{label}</span>
      <strong className="tabular-nums text-orange-50">{value}</strong>
    </div>
  );
}

const overlayCardClass =
  'w-full max-w-sm rounded-2xl border border-white/10 bg-[#140A0D]/90 p-6 text-center text-orange-50 shadow-2xl backdrop-blur-md';

export default function MithaiMatch({ instanceId }: { instanceId: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [game, setGame] = useState<MatchState>(() => createDeck());
  const [token, setToken] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [startError, setStartError] = useState(false);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { data: board, isPending: boardLoading } = useFestiveLeaderboard(instanceId, GAME);
  const startGame = useStartFestiveGame();
  const finishGame = useFinishFestiveGame();

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => setElapsed(performance.now() - startedAt), 500);
    return () => clearInterval(timer);
  }, [phase, startedAt]);

  useEffect(() => {
    if (!game.locked) return;
    const timer = setTimeout(() => setGame((g) => matchReducer(g, { type: 'resolve' })), MISMATCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [game.locked]);

  const start = async () => {
    setPhase('loading');
    setStartError(false);
    try {
      // Images first: the server clock starts on the start call, so a slow network mustn't cost time.
      await preloadCards();
      const { token: gameToken } = await startGame.mutateAsync({ instanceId, game: GAME });
      finishGame.reset();
      setToken(gameToken);
      setGame(createDeck());
      setStartedAt(performance.now());
      setElapsed(0);
      setFocusIndex(0);
      setAnnouncement('');
      setPhase('playing');
    } catch {
      setStartError(true);
      setPhase('idle');
    }
  };

  const flip = (id: number, at: number) => {
    const next = matchReducer(game, { type: 'flip', id });
    if (next === game) return;
    setGame(next);

    const text = describeFlip(game, next, id) ?? '';
    // Alternate a zero-width suffix so identical consecutive messages still change the live region.
    setAnnouncement((prev) => (prev.endsWith(ZERO_WIDTH) ? text : `${text}${ZERO_WIDTH}`));
    if (next.moves > game.moves && !next.locked) navigator.vibrate?.(30);

    if (isComplete(next)) {
      setElapsed(at - startedAt);
      setPhase('done');
      if (token) finishGame.mutate({ instanceId, game: GAME, token, result: { moves: next.moves } });
    }
  };

  const onCardKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = ARROW_STEP[e.key];
    if (step === undefined) return;
    const target = index + step;
    if (target < 0 || target >= game.cards.length) return;
    e.preventDefault();
    setFocusIndex(target);
    cardRefs.current[target]?.focus();
  };

  const result = finishGame.data;
  const leaderboard = board?.leaderboard ?? [];
  const meInList = board?.me ? leaderboard.some((row) => row.rank === board.me?.rank) : false;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 md:flex-row">
      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatPill icon={<Repeat2 className="size-3.5" />} label="Moves" value={game.moves} />
          <StatPill icon={<Timer className="size-3.5" />} label="Time" value={formatTime(elapsed)} />
          <StatPill icon={<Crown className="size-3.5" />} label="Best" value={board?.me?.score ?? '—'} />
        </div>

        <div className="relative min-h-0 flex-1 [container-type:size]">
          <div className="mx-auto grid aspect-square w-[min(100cqw,100cqh)] grid-cols-4 gap-2 sm:gap-3">
            {game.cards.map((card, i) => {
              const faceUp = card.state !== 'down';
              const matched = card.state === 'matched';
              const label =
                card.state === 'down'
                  ? `Card ${i + 1}, face down`
                  : `${MITHAI_LABELS[card.mithai]}, ${matched ? 'matched' : 'face up'}`;
              return (
                <button
                  key={card.id}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  type="button"
                  tabIndex={i === focusIndex ? 0 : -1}
                  aria-label={label}
                  disabled={phase !== 'playing'}
                  onClick={(e) => {
                    setFocusIndex(i);
                    flip(card.id, e.timeStamp);
                  }}
                  onKeyDown={(e) => onCardKeyDown(e, i)}
                  className={cn(
                    'relative aspect-square touch-manipulation select-none rounded-[11%] transition-[box-shadow,transform] duration-300 [-webkit-tap-highlight-color:transparent] [perspective:600px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A0B10] disabled:cursor-default',
                    phase === 'playing' && card.state === 'down' && 'hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
                    matched && 'shadow-[0_0_0_2px_rgba(252,211,77,0.55)]'
                  )}
                >
                  <span
                    className={cn(
                      'absolute inset-0 transition-transform duration-300 [transform-style:preserve-3d] motion-reduce:transition-none motion-reduce:![transform:none]',
                      faceUp && '[transform:rotateY(180deg)]'
                    )}
                  >
                    <CardImage id="card-back" className={cn('motion-reduce:transition-opacity', faceUp && 'motion-reduce:opacity-0')} />
                    <CardImage
                      id={card.mithai}
                      className={cn(
                        '[transform:rotateY(180deg)] motion-reduce:[transform:none] motion-reduce:transition-opacity',
                        !faceUp && 'motion-reduce:opacity-0'
                      )}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          {phase !== 'playing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0D0608]/40 p-4 backdrop-blur-[2px]">
              <div className={overlayCardClass}>
                {phase === 'loading' && (
                  <p className="flex items-center justify-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin text-[#FBBF24]" aria-hidden="true" /> Getting the sweets ready…
                  </p>
                )}

                {phase === 'idle' && (
                  <>
                    <p className="text-xl font-black tracking-tight">
                      <span className="bg-gradient-to-r from-[#FDE68A] via-[#FBBF24] to-[#FB7185] bg-clip-text text-transparent">
                        Match all 8 sweets
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-orange-50/75">Fewer moves and less time score higher.</p>
                    <div className="mt-4 grid grid-cols-8 gap-1" aria-hidden="true">
                      {MITHAI_IDS.map((id) => (
                        <img
                          key={id}
                          src={`/games/mithai-match/${id}-256.webp`}
                          alt=""
                          className="aspect-square w-full rounded-[11%] object-cover"
                        />
                      ))}
                    </div>
                    {startError && (
                      <p className="mt-3 text-sm text-[#FCA5A5]">Couldn't start the game. Check your connection and try again.</p>
                    )}
                    <button type="button" className={cn(festiveButtonClass, 'mt-5 w-full')} onClick={start}>
                      <Play className="size-4" aria-hidden="true" /> {startError ? 'Try again' : 'Start'}
                    </button>
                  </>
                )}

                {phase === 'done' && (
                  <>
                    <div className="relative mx-auto mb-3 size-14">
                      <div className="absolute inset-0 animate-pulse rounded-full bg-[#FCD34D] opacity-40 blur-lg motion-reduce:animate-none" />
                      <Trophy className="relative z-10 size-14 text-[#FCD34D]" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-orange-50/75">
                      All matched in {game.moves} moves, {formatTime(elapsed)}
                    </p>
                    {result && (
                      <>
                        <p className="mt-1 text-5xl font-black tabular-nums">
                          <span className="bg-gradient-to-r from-[#FDE68A] via-[#FBBF24] to-[#FB7185] bg-clip-text text-transparent">
                            {result.score}
                          </span>
                        </p>
                        {result.isPersonalBest ? (
                          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#FCD34D]/40 bg-[#FCD34D]/10 px-3 py-1 text-sm font-semibold text-[#FCD34D]">
                            <Sparkles className="size-3.5" aria-hidden="true" /> New personal best · Rank #{result.rank}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-orange-50/75">
                            Best {result.bestScore} · Rank #{result.rank}
                          </p>
                        )}
                      </>
                    )}
                    {token === null && <p className="mt-2 text-sm text-orange-50/75">Scores are saved for employee accounts.</p>}
                    {finishGame.isPending && <p className="mt-2 text-sm text-orange-50/75">Saving your score…</p>}
                    {finishGame.isError && <p className="mt-2 text-sm text-[#FCA5A5]">Couldn't save this score.</p>}
                    <button type="button" className={cn(festiveButtonClass, 'mt-5 w-full')} onClick={start}>
                      <RotateCcw className="size-4" aria-hidden="true" /> Play again
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>

        <button
          type="button"
          aria-expanded={showLeaderboard}
          onClick={() => setShowLeaderboard((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2 text-sm font-semibold text-orange-50 md:hidden"
        >
          <Trophy className="size-4 text-[#FCD34D]" aria-hidden="true" /> {showLeaderboard ? 'Hide leaderboard' : 'Leaderboard'}
        </button>
      </section>

      <aside
        className={cn(
          'shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:block md:w-72',
          showLeaderboard ? 'block' : 'hidden'
        )}
      >
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-orange-50">
          <Trophy className="size-4 text-[#FCD34D]" aria-hidden="true" /> Leaderboard
        </h3>
        {boardLoading ? (
          <p className="text-sm text-orange-50/70">Loading…</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-sm text-orange-50/70">No scores yet. Finish a game to take the top spot.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {leaderboard.map((row) => {
              const isMe = board?.me?.rank === row.rank;
              const medal = MEDAL[row.rank - 1];
              return (
                <li
                  key={row.rank}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5',
                    isMe ? 'border border-white/15 bg-white/[0.07]' : 'bg-white/[0.03]'
                  )}
                >
                  <span className={cn('w-4 shrink-0 text-center text-xs font-bold', medal?.text ?? 'text-orange-50/50')}>
                    {row.rank}
                  </span>
                  <EmployeeAvatar
                    name={row.name}
                    src={row.avatar ?? undefined}
                    className={cn('size-10 ring-offset-2 ring-offset-[#140A0D]', medal?.ring)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-orange-50" title={row.name}>
                      {row.name}
                    </span>
                    {isMe && <span className="block text-xs text-orange-50/55">You</span>}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-orange-50">{row.score}</span>
                </li>
              );
            })}
          </ol>
        )}
        {board?.me && !meInList && (
          <p className="mt-3 rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2 text-sm text-orange-50">
            You: #{board.me.rank} · {board.me.score}
          </p>
        )}
      </aside>
    </div>
  );
}
