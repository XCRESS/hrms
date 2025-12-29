import { useState, useEffect } from 'react';

/**
 * Christmas Countdown Component
 *
 * Shows time remaining until Christmas
 * - Compact mode for banner integration
 * - Full mode for standalone display
 * - Auto-calculates next Christmas
 */
const Countdown = ({ compact = false }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      let christmas = new Date(currentYear, 11, 25); // December 25

      // If Christmas has passed, calculate for next year
      if (now.getTime() > christmas.getTime()) {
        christmas = new Date(currentYear + 1, 11, 25);
      }

      const difference = christmas.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-yellow-100 font-mono text-sm md:text-base font-bold bg-black/20 px-3 py-1 rounded-full border border-white/10">
        <span className="text-yellow-400">🎄</span>
        <span>{timeLeft.days}d</span>
        <span>:</span>
        <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span>:</span>
        <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
      </div>
    );
  }

  // Full mode
  return (
    <div className="flex justify-center gap-3 md:gap-4 text-center">
      <TimeUnit value={timeLeft.days} label="Days" />
      <TimeUnit value={timeLeft.hours} label="Hours" />
      <TimeUnit value={timeLeft.minutes} label="Mins" />
      <TimeUnit value={timeLeft.seconds} label="Secs" />
    </div>
  );
};

const TimeUnit = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-red-800/80 to-red-900/80 backdrop-blur-sm border-2 border-amber-400/50 rounded-lg flex items-center justify-center shadow-lg transition-transform hover:scale-105">
      <span className="text-xl md:text-2xl font-bold text-amber-100">{value}</span>
    </div>
    <span className="text-[10px] md:text-xs mt-1 text-amber-200/80 font-semibold tracking-wider uppercase">{label}</span>
  </div>
);

export default Countdown;
