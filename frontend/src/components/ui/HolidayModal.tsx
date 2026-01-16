import { useState } from 'react';
import { X, Gamepad2, Heart, Sparkles, Gift } from 'lucide-react';
import GiftGame from './GiftGame';
import { generateEmployeeGreeting } from '../../services/geminiService';

type Tab = 'game' | 'greeting';

interface HolidayModalProps {
  onClose: () => void;
  username?: string;
}

const HolidayModal = ({ onClose, username = 'Team Member' }: HolidayModalProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('game');
  const [greeting, setGreeting] = useState('');
  const [loadingGreeting, setLoadingGreeting] = useState(false);

  // Use passed username prop
  const employeeName = username;

  const fetchGreeting = async () => {
    setLoadingGreeting(true);
    const msg = await generateEmployeeGreeting(employeeName);
    setGreeting(msg);
    setLoadingGreeting(false);
  };

  return (
    <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] h-[800px]">

      {/* Header */}
      <div className="relative bg-gradient-to-r from-red-900 to-red-800 p-4 flex items-center justify-between border-b border-white/10 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">Holiday Hub</h2>
            <p className="text-xs text-red-200">Fun & Festivities for You</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-2 bg-slate-800/50 shrink-0 z-20">
        <button
          onClick={() => setActiveTab('game')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'game'
              ? 'bg-slate-700 text-white shadow-md ring-1 ring-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          Block Party
        </button>
        <button
          onClick={() => {
            setActiveTab('greeting');
            if (!greeting) fetchGreeting();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'greeting'
              ? 'bg-slate-700 text-white shadow-md ring-1 ring-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Heart className="w-4 h-4" />
          My Greeting
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-grow overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 relative">

        {/* Game Tab */}
        {activeTab === 'game' && (
          <div className="h-full animate-fade-in p-2 md:p-6 flex justify-center">
            <GiftGame />
          </div>
        )}

        {/* Greeting Tab */}
        {activeTab === 'greeting' && (
          <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in p-6">
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-20 rounded-full"></div>
              <Gift className="w-20 h-20 text-yellow-400 relative z-10" />
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">A Special Message for {employeeName}</h3>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent mb-6"></div>

            {loadingGreeting ? (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
                <span className="text-sm">The elves are writing your card...</span>
              </div>
            ) : (
              <div className="bg-red-950/30 border border-red-500/20 p-8 rounded-xl max-w-md transform rotate-1 transition-transform hover:rotate-0 shadow-xl">
                <p className="text-3xl text-center leading-relaxed text-yellow-100 drop-shadow-sm">
                  &ldquo;{greeting}&rdquo;
                </p>
                <div className="mt-6 flex justify-end">
                  <span className="text-sm font-semibold text-red-300 uppercase tracking-widest">- HRMS Management</span>
                </div>
              </div>
            )}

            {!loadingGreeting && (
              <button
                onClick={fetchGreeting}
                className="mt-8 text-sm text-slate-400 hover:text-white underline decoration-dotted transition-colors"
              >
                Read another one
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default HolidayModal;
