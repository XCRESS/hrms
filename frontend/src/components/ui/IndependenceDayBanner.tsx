import { useState, useEffect, useMemo, useRef } from 'react';
import { Flag, Sparkles } from 'lucide-react';

const buildWishes = (years: number) => [
  "Freedom in the mind, faith in the words, pride in our hearts. Happy Independence Day! 🇮🇳",
  `${years} years of freedom, and still the best team in the country works right here. 🧡🤍💚`,
  "May the tricolour always fly high — and may your deadlines always fly low. 🪁",
  "Saluting the heroes who gave us the freedom to work, dream, and take chai breaks. ☕",
  "Let freedom be your fuel and unity be your strength. Jai Hind! 🎖️",
  "Independence isn't just a date — it's a responsibility we carry every single day. 🌸",
  "Sky full of kites, heart full of pride. Wishing you a glorious 15th of August! 🎉"
];

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  sway: number;
  color: string;
}

interface TimeUnitProps {
  val: number;
  label: string;
}

interface IndependenceDayBannerProps {
  username?: string;
}

type SeasonStatus = 'inactive' | 'upcoming' | 'arrived';

const INDEPENDENCE_YEAR = 1947;

/* Tiranga palette */
const SAFFRON = '#FF9933';
const WHITE = '#FFFFFF';
const GREEN = '#138808';
const CHAKRA_BLUE = '#3B5BDB';

/**
 * Premium Independence Day Banner
 * Design: "Tiranga" - Saffron / White / Green over a deep navy sky,
 * with a spinning Ashoka Chakra and drifting tricolour confetti.
 */
const IndependenceDayBanner = ({ username = 'Team' }: IndependenceDayBannerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wishIndex, setWishIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Season & Year Logic
  const { seasonStatus, celebrationYear, milestone } = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const date = now.getDate();
    const year = now.getFullYear();

    let status: SeasonStatus = 'inactive';
    if (month === 7 && date >= 8 && date <= 14) status = 'upcoming';
    if (month === 7 && date >= 15 && date <= 18) status = 'arrived';

    return {
      seasonStatus: status,
      celebrationYear: year,
      milestone: year - INDEPENDENCE_YEAR
    };
  }, []);

  // Countdown to 15th August, midnight
  useEffect(() => {
    if (seasonStatus !== 'upcoming') return;
    const tick = () => {
      const now = new Date();
      const target = new Date(celebrationYear, 7, 15);
      const diff = target.getTime() - now.getTime();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [seasonStatus, celebrationYear]);

  const wishes = useMemo(() => buildWishes(milestone), [milestone]);

  // Rotate Wishes
  useEffect(() => {
    const interval = setInterval(() => {
      setWishIndex(prev => (prev + 1) % wishes.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [wishes.length]);

  // Tricolour Confetti System
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;
    const particles: Particle[] = [];

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const pickColor = () => {
      const r = Math.random();
      if (r < 0.4) return SAFFRON;
      if (r < 0.7) return GREEN;
      if (r < 0.92) return WHITE;
      return CHAKRA_BLUE;
    };

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() < 0.25 ? Math.random() * 2 + 1.2 : Math.random() * 1.5,
      speedY: Math.random() * 0.35 + 0.12,
      speedX: (Math.random() - 0.5) * 0.15,
      opacity: Math.random() * 0.5 + 0.2,
      sway: Math.random() * Math.PI * 2,
      color: pickColor()
    });

    for (let i = 0; i < 45; i++) particles.push(createParticle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        // Gentle kite-like drift
        p.sway += 0.02;
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.sway) * 0.25;

        if (p.y > canvas.height + 5 || p.x < -10 || p.x > canvas.width + 10) {
          particles[i] = { ...createParticle(), y: -5, x: Math.random() * canvas.width };
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
        ctx.fill();
        ctx.globalAlpha = 1;

        if (p.size > 2) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  if (seasonStatus === 'inactive') return null;

  return (
    <div className="relative w-full overflow-hidden mb-0 rounded-none sm:rounded-xl shadow-2xl border-y sm:border border-white/10 group">

      {/* 1. Base Background - Warm night sky, matched to the theme's ink base
             so the hero doesn't sit on the page as a cold blue slab */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#2A1E12] via-[#15100A] to-[#0C0A07] z-0"></div>

      {/* 2. Texture Overlay (Subtle Noise) */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-0 mix-blend-overlay"></div>

      {/* 3. Tricolour Accent Glows */}
      <div className="absolute -top-24 -left-20 w-64 h-64 bg-[#FF9933]/25 blur-[80px] rounded-full z-0"></div>
      <div className="absolute -bottom-24 -right-20 w-64 h-64 bg-[#138808]/25 blur-[80px] rounded-full z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-32 bg-white/5 blur-[70px] rounded-full z-0"></div>
      {/* Chakra blue kept as a single small accent, not a field */}
      <div className="absolute top-0 right-1/3 w-40 h-24 bg-[#3B5BDB]/15 blur-[70px] rounded-full z-0"></div>

      {/* 4. Tricolour Ribbon (top edge) */}
      <div className="absolute top-0 inset-x-0 h-1 flex z-[2]">
        <div className="flex-1 bg-[#FF9933]"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-[#138808]"></div>
      </div>

      {/* 5. Canvas Confetti */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-[1] pointer-events-none" />

      {/* 6. Glass Content Container */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between px-6 py-5 gap-6 backdrop-blur-[1px]">

        {/* Left: Title & Wish */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#FF9933]/40 bg-[#FF9933]/10 backdrop-blur-md shadow-lg shadow-orange-900/20">
            <Flag className="w-3.5 h-3.5 text-[#FF9933] animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-orange-50 uppercase">
              {seasonStatus === 'upcoming' ? 'Countdown' : 'Jai Hind'}
            </span>
          </div>

          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none drop-shadow-sm">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB366] via-white to-[#4ADE80]">
                {seasonStatus === 'upcoming' ? 'Independence Day' : 'Happy Independence Day'}
              </span>
              <span className="text-[#FF9933] ml-2 font-serif italic">{celebrationYear}</span>
            </h2>

            {/* Rotating Wish - fixed min height to prevent layout jump */}
            <div className="min-h-[3.5rem] md:min-h-[1.75rem] mt-2 flex items-center justify-center md:justify-start">
              <p key={wishIndex} className="text-orange-50/90 text-sm md:text-base font-medium animate-fade-in leading-snug md:leading-normal max-w-[90%] md:max-w-none mx-auto md:mx-0">
                {wishes[wishIndex]}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Countdown or Celebration Card */}
        <div className="flex-shrink-0">
          {seasonStatus === 'upcoming' ? (
            <div className="grid grid-cols-4 gap-2 md:gap-4 p-3 rounded-xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
              <TimeUnit val={timeLeft.days} label="DAYS" />
              <TimeUnit val={timeLeft.hours} label="HRS" />
              <TimeUnit val={timeLeft.minutes} label="MIN" />
              <TimeUnit val={timeLeft.seconds} label="SEC" />
            </div>
          ) : (
            <div className="flex items-center gap-4 px-6 py-4 rounded-xl bg-gradient-to-br from-[#FF9933]/15 via-white/5 to-[#138808]/15 border border-white/20 backdrop-blur-md shadow-[0_0_15px_rgba(255,153,51,0.15)] group-hover:shadow-[0_0_25px_rgba(255,153,51,0.25)] transition-all">
              <AshokaChakra />
              <div className="text-left">
                <div className="text-xs text-orange-100 font-bold tracking-widest uppercase">
                  {milestone}th Independence Day
                </div>
                <div className="text-lg font-bold text-white flex items-center gap-1.5">
                  Jai Hind, {username}!
                  <Sparkles className="w-4 h-4 text-[#FF9933]" />
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 7. Tricolour Ribbon (bottom edge) */}
      <div className="absolute bottom-0 inset-x-0 h-1 flex z-[2]">
        <div className="flex-1 bg-[#138808]"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-[#FF9933]"></div>
      </div>
    </div>
  );
};

// Spinning Ashoka Chakra (24 spokes, navy blue)
const AshokaChakra = () => (
  <div className="relative w-10 h-10 flex-shrink-0">
    <div className="absolute inset-0 bg-[#FF9933] blur-lg opacity-30 animate-pulse"></div>
    <svg
      viewBox="0 0 100 100"
      className="relative z-10 w-10 h-10 animate-[spin_12s_linear_infinite]"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke={CHAKRA_BLUE} strokeWidth="5" />
      <circle cx="50" cy="50" r="7" fill={CHAKRA_BLUE} />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="50"
          y1="50"
          x2="50"
          y2="6"
          stroke={CHAKRA_BLUE}
          strokeWidth="2.5"
          transform={`rotate(${i * 15} 50 50)`}
        />
      ))}
    </svg>
  </div>
);

// Compact, Elegant Time Unit
const TimeUnit = ({ val, label }: TimeUnitProps) => (
  <div className="flex flex-col items-center">
    <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black/25 rounded-lg border border-white/10 shadow-inner">
      <span className="text-lg md:text-xl font-bold font-mono text-orange-50">
        {String(val).padStart(2, '0')}
      </span>
    </div>
    <span className="text-[9px] md:text-[10px] font-bold text-[#FF9933]/70 mt-1 tracking-widest">{label}</span>
  </div>
);

export default IndependenceDayBanner;
