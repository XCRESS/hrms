import { useState } from 'react';
import { Sparkles, Gamepad2 } from 'lucide-react';
import Snowfall from './Snowfall';
import Countdown from './Countdown';
import HolidayModal from './HolidayModal';

/**
 * Christmas Banner Component - EXACT Reference Design
 *
 * Features:
 * - Canvas-based snowfall effect
 * - Live countdown to Christmas
 * - Holiday Hub modal with Tetris game & personalized greeting
 * - Proper festive fonts (Great Vibes, Mountains of Christmas)
 * - Employee name personalization
 * - Fully responsive design
 */
const ChristmasBanner = ({ username = 'Team' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="relative w-full bg-gradient-to-r from-red-900 via-red-700 to-red-900 border-b-4 border-yellow-500/50 text-white overflow-hidden shadow-lg z-50">
        {/* Confined Snowfall */}
        <Snowfall className="absolute inset-0 z-0 pointer-events-none opacity-50" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-2 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6">

          {/* Greeting Section */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="font-script text-3xl sm:text-4xl leading-none text-yellow-100 drop-shadow-md">
                Merry Christmas!
              </h2>
              <p className="font-christmas text-sm text-red-100 hidden sm:block">
                Wishing you joy, {username}!
              </p>
            </div>
          </div>

          {/* Center: Countdown Section */}
          <div className="flex-shrink-0">
            <Countdown compact />
          </div>

          {/* Action Section */}
          <div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-green-700 hover:bg-green-600 text-white text-sm sm:text-base font-bold py-1.5 px-4 rounded-full border border-green-400 shadow-[0_0_15px_rgba(22,163,74,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap animate-pulse"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Holiday Surprise</span>
            </button>
          </div>

        </div>
      </div>

      {/* Modal for Holiday Hub */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative z-10 w-full max-w-2xl animate-fade-in">
            <HolidayModal onClose={() => setIsModalOpen(false)} username={username} />
          </div>
        </div>
      )}
    </>
  );
};

export default ChristmasBanner;
