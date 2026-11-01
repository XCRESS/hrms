import { useId } from 'react';
import { cn } from '@/lib/utils';

export const GOLD = '#FCD34D';
export const MARIGOLD = '#F97316';
export const MARIGOLD_LIGHT = '#FBBF24';
export const ROSE = '#FB7185';
const LEAF = '#4D7C0F';

export const festiveButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#F97316] to-[#FBBF24] px-5 py-2.5 text-sm font-bold text-[#2A0E00] shadow-[0_0_18px_rgba(249,115,22,0.35)] transition-shadow hover:shadow-[0_0_26px_rgba(249,115,22,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A0B10] disabled:opacity-60';

/** calm: one faint glow, for surfaces where the content rather than the decoration needs attention. */
export function FestiveBackdrop({ calm = false }: { calm?: boolean }) {
  if (calm) {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#140A0D]">
        <div className="absolute -left-24 -top-28 size-72 rounded-full bg-[#F97316]/[0.07] blur-[90px]" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#3B1024] via-[#1A0B10] to-[#0D0608]" />
      <div className="absolute -left-20 -top-24 size-64 rounded-full bg-[#F97316]/25 blur-[80px]" />
      <div className="absolute -bottom-24 -right-20 size-64 rounded-full bg-[#BE185D]/25 blur-[80px]" />
      <div className="absolute left-1/2 top-1/2 h-32 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FCD34D]/10 blur-[70px]" />
    </div>
  );
}

export function MarigoldToran({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg aria-hidden="true" className={cn('pointer-events-none absolute inset-x-0 top-0 z-[2] h-6 w-full', className)}>
      <defs>
        <pattern id={id} width="64" height="24" patternUnits="userSpaceOnUse">
          {Array.from({ length: 8 }, (_, i) => (
            <circle key={i} cx={i * 8 + 4} cy="4" r="3.6" fill={i % 2 ? MARIGOLD_LIGHT : MARIGOLD} />
          ))}
          <circle cx="36" cy="10.5" r="3" fill={MARIGOLD_LIGHT} />
          <circle cx="36" cy="16" r="2.6" fill={MARIGOLD} />
          <path d="M36 18.5c2.2 1.4 2.2 4 0 5.5-2.2-1.5-2.2-4.1 0-5.5Z" fill={LEAF} />
        </pattern>
      </defs>
      <rect width="100%" height="24" fill={`url(#${id})`} />
    </svg>
  );
}

export function GlowingDiya({ className = 'size-11' }: { className?: string }) {
  return (
    <div className={cn('relative shrink-0', className)}>
      <div className="absolute inset-0 animate-pulse rounded-full bg-[#F97316] opacity-40 blur-lg motion-reduce:animate-none" />
      <svg viewBox="0 0 32 40" className="relative z-10 size-full" aria-hidden="true">
        <g
          className="animate-[diya-flicker_1.8s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
        >
          <path d="M16 3C19.5 9.5 21.5 13 21.5 17.2a5.5 5.5 0 0 1-11 0C10.5 13 12.5 9.5 16 3Z" fill={MARIGOLD} />
          <path d="M16 9.5c1.5 3.2 2.5 5.2 2.5 7.6a2.5 2.5 0 0 1-5 0c0-2.4 1-4.4 2.5-7.6Z" fill="#FFE7A3" />
        </g>
        <path d="M3 24.5Q16 22 29 24.5 27 36.5 16 36.5T3 24.5Z" fill="#9A3412" />
        <ellipse cx="16" cy="24.5" rx="13" ry="2.4" fill="#5C1A08" />
        <circle cx="10" cy="30" r="1.1" fill={MARIGOLD_LIGHT} />
        <circle cx="16" cy="31.5" r="1.1" fill={MARIGOLD_LIGHT} />
        <circle cx="22" cy="30" r="1.1" fill={MARIGOLD_LIGHT} />
      </svg>
    </div>
  );
}
