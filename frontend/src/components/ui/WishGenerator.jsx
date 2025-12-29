import { useState } from 'react';
import { Wand2, Gift, Copy, Check, X } from 'lucide-react';
import { generateChristmasWish } from '../../services/geminiService';

const WishGenerator = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'Friend',
    theme: 'heartfelt'
  });
  const [generatedWish, setGeneratedWish] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!formData.name) return;
    setLoading(true);
    setCopied(false);
    const wish = await generateChristmasWish(formData);
    setGeneratedWish(wish);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedWish);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl relative overflow-hidden w-full max-w-lg mx-auto">
      {/* Decorative Ribbon */}
      <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-red-600 rotate-45 transform hidden md:block border-b-2 border-yellow-400 shadow-md"></div>

      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-600 rounded-full shadow-lg border-2 border-yellow-400">
          <Gift className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl md:text-2xl font-christmas font-bold text-yellow-300">
          Wish Generator
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-semibold text-blue-100 mb-1">Who is this for?</label>
          <input
            type="text"
            placeholder="e.g. Grandma"
            className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-slate-400"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-blue-100 mb-1">Relationship</label>
          <select
            className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={formData.relationship}
            onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
          >
            <option value="Friend">Friend</option>
            <option value="Family">Family</option>
            <option value="Colleague">Colleague</option>
            <option value="Partner">Partner</option>
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-blue-100 mb-2">Vibe & Tone</label>
        <div className="flex flex-wrap gap-2">
          {['heartfelt', 'funny', 'religious', 'poetic'].map((t) => (
            <button
              key={t}
              onClick={() => setFormData({ ...formData, theme: t })}
              className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium transition-all ${
                formData.theme === t
                  ? 'bg-yellow-400 text-red-900 shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !formData.name}
        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-green-400"
      >
        {loading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            <span>Generate Holiday Magic</span>
          </>
        )}
      </button>

      {generatedWish && (
        <div className="mt-6 p-4 bg-red-900/40 rounded-xl border border-red-500/30 relative animate-fade-in">
          <p className="text-2xl md:text-3xl font-script text-center leading-relaxed text-yellow-100 drop-shadow-md">
            &ldquo;{generatedWish}&rdquo;
          </p>

          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-2 hover:bg-red-800/50 rounded-lg transition-colors text-red-200 hover:text-white"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default WishGenerator;
