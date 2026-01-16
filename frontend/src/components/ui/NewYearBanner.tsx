import { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, Star } from 'lucide-react';

const NEW_YEAR_WISHES = [
  "New year, new goals! May your success bar be higher and your stress levels lower. 🌟",
  "Wishing you 12 months of success, 52 weeks of laughter, and 365 days of fun! 🎉",
  "May your year be full of big wins, small joys, and zero parking tickets. 🚗💨",
  "Here's to a year of brilliance! Shine bright (and don't forget to stay hydrated). 💧✨",
  "Cheers to health, happiness, and finding money in your old coat pockets! 🧥💰",
  "Wishing you the courage to chase your dreams and the wisdom to enjoy the journey. 🚀",
  "May your days be happy, your heart be light, and your year be bright! ✨"
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
  fadeSpeed: number;
  color: string;
}

interface TimeUnitProps {
  val: number;
  label: string;
}

type SeasonStatus = 'inactive' | 'upcoming' | 'arrived';

/**
 * Premium New Year Banner
 * Design: "Midnight Gala" - Deep Blue/Gold/Cyan aesthetics with elegant particles.
 */
const NewYearBanner = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wishIndex, setWishIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Season & Year Logic
  const { seasonStatus, nextYear } = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const date = now.getDate();
    // Next year logic
    const nextY = month === 11 ? now.getFullYear() + 1 : now.getFullYear();

    let status: SeasonStatus = 'inactive';
    if (month === 11 && date >= 29) status = 'upcoming';
    if (month === 0) status = 'arrived';

    return { seasonStatus: status, nextYear: nextY };
  }, []);

  // Countdown
  useEffect(() => {
    if (seasonStatus !== 'upcoming') return;
    const tick = () => {
      const now = new Date();
      const target = new Date(nextYear, 0, 1);
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
  }, [seasonStatus, nextYear]);

  // Rotate Wishes
  useEffect(() => {
    const interval = setInterval(() => {
      setWishIndex(prev => (prev + 1) % NEW_YEAR_WISHES.length);
    }, 8000); // 8 seconds per wish
    return () => clearInterval(interval);
  }, []);

  // Elegant Particle System
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

    // Particle Configuration
    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() < 0.2 ? Math.random() * 2 + 1 : Math.random() * 1.5, // Occasional larger "stars"
      speedY: Math.random() * 0.3 + 0.1, // Slow glitter fall (Downwards)
      speedX: (Math.random() - 0.5) * 0.2, // Tiny horizontal drift
      opacity: Math.random() * 0.5 + 0.1,
      fadeSpeed: Math.random() * 0.005 + 0.002,
      color: Math.random() > 0.7 ? '#FCD34D' : '#67E8F9' // 30% Gold, 70% Cyan
    });

    // Init particles
    for (let i = 0; i < 40; i++) particles.push(createParticle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        // Update
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity += Math.sin(Date.now() * 0.001 + i) * 0.005; // Twinkle effect

        // Reset if out of bounds or invisible
        if (p.y > canvas.height + 5 || p.opacity <= 0) {
          particles[i] = { ...createParticle(), y: -5 };
        }

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
        ctx.fill();
        ctx.globalAlpha = 1;

        // Subtle glow for larger particles
        if (p.size > 1.8) {
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

      {/* 1. Base Rich Background - Deep Midnight Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900 via-[#0B1121] to-[#050914] z-0"></div>

      {/* 2. Texture Overlay (Subtle Noise) */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-0 mix-blend-overlay"></div>

      {/* 3. Accent Glows */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/20 blur-[80px] rounded-full z-0"></div>
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/20 blur-[80px] rounded-full z-0"></div>

      {/* 4. Canvas Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-1 pointer-events-none" />

      {/* 5. Glass Content Container */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between px-6 py-5 gap-6 backdrop-blur-[1px]">

        {/* Left: Title & Wish */}
        <div className="flex-1 text-center md:text-left space-y-3">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/30 backdrop-blur-md shadow-lg shadow-cyan-900/20">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 animate-pulse" />
              <span className="text-xs font-bold tracking-widest text-cyan-100 uppercase">
                {seasonStatus === 'upcoming' ? 'Countdown' : 'Celebration'}
              </span>
           </div>

           <div>
             <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-blue-200 tracking-tight leading-none drop-shadow-sm">
               {seasonStatus === 'upcoming' ? 'New Year' : 'Happy New Year'}
               <span className="text-cyan-400 ml-2 font-serif italic">{nextYear}</span>
             </h2>

             {/* Rotating Wish - Adaptive height to prevent jumping but allow wrapping */}
             <div className="min-h-[3.5rem] md:min-h-[1.75rem] mt-2 flex items-center justify-center md:justify-start">
                <p key={wishIndex} className="text-cyan-100/90 text-sm md:text-base font-medium animate-fade-in leading-snug md:leading-normal max-w-[90%] md:max-w-none mx-auto md:mx-0">
                  {NEW_YEAR_WISHES[wishIndex]}
                </p>
             </div>
           </div>
        </div>

        {/* Right: Premium Countdown or Action */}
        <div className="flex-shrink-0">
          {seasonStatus === 'upcoming' ? (
             <div className="grid grid-cols-4 gap-2 md:gap-4 p-3 rounded-xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
                <TimeUnit val={timeLeft.days} label="DAYS" />
                <TimeUnit val={timeLeft.hours} label="HRS" />
                <TimeUnit val={timeLeft.minutes} label="MIN" />
                <TimeUnit val={timeLeft.seconds} label="SEC" />
             </div>
          ) : (
            <div className="flex items-center gap-4 px-6 py-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-400/30 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-all">
               <div className="relative">
                 <div className="absolute inset-0 bg-yellow-400 blur-lg opacity-40 animate-pulse"></div>
                 <Sparkles className="w-8 h-8 text-yellow-300 relative z-10" />
               </div>
               <div className="text-left">
                 <div className="text-xs text-cyan-200 font-bold tracking-widest uppercase">Status</div>
                 <div className="text-lg font-bold text-white">Full Speed Ahead</div>
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// Compact, Elegant Time Unit
const TimeUnit = ({ val, label }: TimeUnitProps) => (
  <div className="flex flex-col items-center">
    <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black/20 rounded-lg border border-white/5 shadow-inner">
      <span className="text-lg md:text-xl font-bold font-mono text-cyan-50">
        {String(val).padStart(2, '0')}
      </span>
    </div>
    <span className="text-[9px] md:text-[10px] font-bold text-cyan-400/60 mt-1 tracking-widest">{label}</span>
  </div>
);

export default NewYearBanner;
