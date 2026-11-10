import React from 'react';
import { Trophy, RotateCcw, Home, Film } from 'lucide-react';
import { MatchStats } from '../types/game';

interface GameOverModalProps {
  stats: MatchStats;
  hasReplays: boolean;
  onWatchReplay: () => void;
  onRematch: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  hasReplays,
  onWatchReplay,
  onRematch,
  onHome,
}) => {
  const isRedWinner = stats.winner === 'red';
  const isBlueWinner = stats.winner === 'blue';
  const isTie = stats.winner === 'tie';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden my-auto">
        
        {/* Glow */}
        <div
          className={`absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isRedWinner ? 'bg-red-600/30' : isBlueWinner ? 'bg-blue-600/30' : 'bg-amber-500/20'
          }`}
        />

        {/* Trophy icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-lg shadow-amber-500/20">
          <Trophy size={36} />
        </div>

        {/* Winner Title */}
        <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wider mb-1">
          {isRedWinner && <span className="text-red-400">KIRMIZI TAKIM KAZANDI!</span>}
          {isBlueWinner && <span className="text-blue-400">MAVİ TAKIM KAZANDI!</span>}
          {isTie && <span className="text-amber-400">MÜCADELE BERABERE BİTTİ!</span>}
        </h2>
        <p className="text-xs text-slate-400 mb-6">Mükemmel bir mücadele sergilendi!</p>

        {/* Final Score Board */}
        <div className="flex items-center justify-center gap-4 bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-inner mb-6">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-red-400 font-display uppercase">KIRMIZI</span>
            <span className="text-4xl font-black font-display text-white mt-1">{stats.redScore}</span>
          </div>

          <span className="text-2xl font-black text-slate-600 font-display">:</span>

          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-blue-400 font-display uppercase">MAVİ</span>
            <span className="text-4xl font-black font-display text-white mt-1">{stats.blueScore}</span>
          </div>
        </div>

        {/* Match Statistics Table */}
        <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800/80 mb-6 text-xs space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1 flex justify-between">
            <span className="text-red-400">Kırmızı</span>
            <span>Maç İstatistikleri</span>
            <span className="text-blue-400">Mavi</span>
          </div>

          {/* Shots */}
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-bold text-red-400">{stats.redShots}</span>
            <span className="text-slate-400">Toplam Şut</span>
            <span className="font-bold text-blue-400">{stats.blueShots}</span>
          </div>

          {/* Possession */}
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-bold text-red-400">%{stats.redPossession}</span>
            <span className="text-slate-400">Topla Oynama</span>
            <span className="font-bold text-blue-400">%{stats.bluePossession}</span>
          </div>

          {/* Duration */}
          <div className="flex justify-between items-center text-slate-300">
            <span />
            <span className="text-slate-400">Maç Süresi: <b className="text-white">{stats.duration} sn</b></span>
            <span />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Watch Replay Button (if goals were scored) */}
          {hasReplays ? (
            <button
              onClick={onWatchReplay}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all"
            >
              <Film size={18} />
              <span>GOL TEKRARLARINI İZLE (REPLAY)</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 italic py-1">
              (Maçta gol atılmadığı için gol tekrarı bulunmuyor)
            </div>
          )}

          <button
            onClick={onRematch}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all"
          >
            <RotateCcw size={18} />
            <span>RÖVANŞ MAÇI YAP (TEKRAR OYNA)</span>
          </button>

          <button
            onClick={onHome}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            <Home size={16} />
            <span>AYARLAR & ANA MENÜ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
