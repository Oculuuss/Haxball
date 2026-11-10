import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onHome,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-center">
        <h2 className="font-display font-black text-2xl text-white tracking-wider mb-1">
          OYUN DURAKLATILDI
        </h2>
        <p className="text-xs text-slate-400 mb-6">Mola zamanı! Taktiklerini gözden geçir.</p>

        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
          >
            <Play size={18} fill="currentColor" />
            <span>DEVAM ET</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            <RotateCcw size={16} />
            <span>MAÇI YENİDEN BAŞLAT</span>
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-emerald-400" />}
            <span>{isMuted ? 'SESİ AÇ' : 'SESİ KAPAT'}</span>
          </button>

          <button
            onClick={onHome}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white font-display font-bold text-sm flex items-center justify-center gap-2 border border-slate-800 transition-all"
          >
            <Home size={16} />
            <span>ANA MENÜYE DÖN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
