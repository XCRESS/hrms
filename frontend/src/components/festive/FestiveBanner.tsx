import { useEffect, useRef, useState } from 'react';
import { Flame, Gamepad2, Sparkles, X } from 'lucide-react';
import { useActiveFestival } from '@/hooks/useActiveFestival';
import { localDateKey, type ActiveFestival } from '@/lib/festivals';
import FestiveHub from './FestiveHub';
import { FestiveBackdrop, GlowingDiya, GOLD, MARIGOLD, MARIGOLD_LIGHT, MarigoldToran, ROSE, festiveButtonClass } from './decor';

const SPARK_COLORS = [GOLD, GOLD, MARIGOLD, MARIGOLD_LIGHT, ROSE];

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const timeLeftUntil = (target: Date): TimeLeft => {
  const diff = Math.max(0, target.getTime() - new Date().getTime());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

interface Ember {
  x: number;
  y: number;
  size: number;
  speedY: number;
  sway: number;
  opacity: number;
  color: string;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

/** Rising diya embers plus an occasional small firework burst. One static frame under reduced motion. */
function useDiwaliSky(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationId = 0;
    let lastBurst = 0;
    const sparks: Spark[] = [];

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const pick = () => SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
    const createEmber = (y = Math.random() * canvas.height): Ember => ({
      x: Math.random() * canvas.width,
      y,
      size: Math.random() < 0.2 ? Math.random() * 1.8 + 1.2 : Math.random() * 1.3 + 0.4,
      speedY: Math.random() * 0.35 + 0.15,
      sway: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.5 + 0.3,
      color: pick(),
    });
    const embers = Array.from({ length: 45 }, () => createEmber());

    const burst = () => {
      const x = canvas.width * (0.15 + Math.random() * 0.7);
      const y = canvas.height * (0.15 + Math.random() * 0.35);
      const color = pick();
      for (let i = 0; i < 26; i++) {
        const angle = (i / 26) * Math.PI * 2;
        const speed = 0.8 + Math.random() * 1.1;
        sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color });
      }
    };

    const dot = (x: number, y: number, size: number, color: string, alpha: number) => {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.shadowBlur = size > 1.5 ? 8 : 0;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    const frame = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      embers.forEach((e, i) => {
        e.sway += 0.02;
        e.y -= e.speedY;
        e.x += Math.sin(e.sway) * 0.2;
        if (e.y < -5) embers[i] = createEmber(canvas.height + 5);
        dot(e.x, e.y, e.size, e.color, e.opacity + Math.sin(time * 0.002 + i) * 0.15);
      });

      if (time - lastBurst > 2600) {
        burst();
        lastBurst = time;
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.025;
        s.vx *= 0.985;
        s.life -= 0.016;
        if (s.life <= 0) sparks.splice(i, 1);
        else dot(s.x, s.y, 1.4, s.color, s.life);
      }

      animationId = requestAnimationFrame(frame);
    };

    if (reduceMotion) {
      embers.forEach((e) => dot(e.x, e.y, e.size, e.color, e.opacity));
    } else {
      animationId = requestAnimationFrame(frame);
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [canvasRef]);
}

const TimeUnit = ({ val, label }: { val: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-black/25 shadow-inner md:size-12">
      <span className="font-mono text-lg font-bold text-amber-50 md:text-xl">{String(val).padStart(2, '0')}</span>
    </div>
    <span className="mt-1 text-[9px] font-bold tracking-widest text-[#FBBF24]/70 md:text-[10px]">{label}</span>
  </div>
);

function FestiveBannerContent({ active, username }: { active: ActiveFestival; username: string }) {
  const { festival, anchorDate } = active;
  const { banner } = festival;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [year, month, day] = anchorDate.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const targetMs = target.getTime();
  const isUpcoming = localDateKey() < anchorDate;
  const wishes = [banner.greeting(username), ...festival.greetings];

  // Not persisted on purpose: the banner returns on every app open or refresh.
  const [dismissed, setDismissed] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [wishIndex, setWishIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => timeLeftUntil(target));

  useDiwaliSky(canvasRef);

  useEffect(() => {
    if (!isUpcoming) return;
    const timer = setInterval(() => setTimeLeft(timeLeftUntil(new Date(targetMs))), 1000);
    return () => clearInterval(timer);
  }, [isUpcoming, targetMs]);

  useEffect(() => {
    const timer = setInterval(() => setWishIndex((i) => (i + 1) % wishes.length), 8000);
    return () => clearInterval(timer);
  }, [wishes.length]);

  if (dismissed) return null;

  const dismiss = () => setDismissed(true);

  const playButton = (
    <button
      type="button"
      onClick={() => setHubOpen(true)}
      className={`${festiveButtonClass} w-full`}
    >
      <Gamepad2 className="size-4" aria-hidden="true" />
      {banner.cta}
    </button>
  );

  return (
    <div className="group relative mb-0 w-full overflow-hidden rounded-none border-y border-white/10 shadow-2xl sm:rounded-xl sm:border">
      <FestiveBackdrop />

      <MarigoldToran />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[1] size-full" />

      <div className="relative z-10 flex flex-col items-center justify-between gap-6 px-6 pb-5 pt-8 backdrop-blur-[1px] md:flex-row">
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-1 shadow-lg shadow-orange-900/20 backdrop-blur-md">
            <Flame className="size-3.5 animate-pulse text-[#FBBF24] motion-reduce:animate-none" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest text-orange-50">
              {isUpcoming ? 'Countdown' : 'Festival of Lights'}
            </span>
          </div>

          <div>
            <h2 className="text-3xl font-black leading-none tracking-tight drop-shadow-sm md:text-4xl">
              <span className="bg-gradient-to-r from-[#FDE68A] via-[#FBBF24] to-[#FB7185] bg-clip-text text-transparent">
                {isUpcoming ? banner.name : banner.title}
              </span>
              <span className="ml-2 font-serif italic text-[#F97316]">{year}</span>
            </h2>

            <div className="mt-2 flex min-h-[3.5rem] items-center justify-center md:min-h-[1.75rem] md:justify-start">
              <p
                key={wishIndex}
                aria-live="off"
                className="mx-auto max-w-[90%] animate-fade-in text-sm font-medium leading-snug text-orange-50/90 md:mx-0 md:max-w-none md:text-base md:leading-normal"
              >
                {wishes[wishIndex]}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto">
          {isUpcoming ? (
            <div className="grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 shadow-xl backdrop-blur-md md:gap-4">
              <TimeUnit val={timeLeft.days} label="DAYS" />
              <TimeUnit val={timeLeft.hours} label="HRS" />
              <TimeUnit val={timeLeft.minutes} label="MIN" />
              <TimeUnit val={timeLeft.seconds} label="SEC" />
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-xl border border-[#F97316]/30 bg-gradient-to-br from-[#F97316]/15 via-white/5 to-[#BE185D]/15 px-6 py-4 shadow-[0_0_15px_rgba(249,115,22,0.15)] backdrop-blur-md transition-all group-hover:shadow-[0_0_25px_rgba(249,115,22,0.25)]">
              <GlowingDiya />
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-widest text-orange-100">Diwali {year}</div>
                <div className="flex items-center gap-1.5 text-lg font-bold text-white">
                  Happy Diwali, {username}!
                  <Sparkles className="size-4 text-[#FBBF24]" aria-hidden="true" />
                </div>
              </div>
            </div>
          )}
          {playButton}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[2] h-1 bg-gradient-to-r from-[#F97316] via-[#FCD34D] to-[#BE185D]" />

      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute right-3 top-7 z-20 rounded-full p-1.5 text-orange-50/70 hover:text-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]"
      >
        <X className="size-4" aria-hidden="true" />
      </button>

      <FestiveHub open={hubOpen} onOpenChange={setHubOpen} active={active} username={username} />
    </div>
  );
}

export default function FestiveBanner({ username }: { username: string }) {
  const active = useActiveFestival();
  if (!active) return null;
  return <FestiveBannerContent key={active.instanceId} active={active} username={username} />;
}
