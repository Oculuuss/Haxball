import React from 'react';
import { TeamId } from '../types/game';

interface GoalCelebrationProps {
  scoringTeam: TeamId | null;
  redScore: number;
  blueScore: number;
}

export const GoalCelebration: React.FC<GoalCelebrationProps> = ({
  scoringTeam,
  redScore,
  blueScore,
}) => {
  if (!scoringTeam) return null;

  const isRed = scoringTeam === 'red';

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
      {/* Background flash vignette */}
      <div
        className={`absolute inset-0 ${
          isRed ? 'bg-red-900/35' : 'bg-blue-900/35'
        } backdrop-blur-[2px] transition-opacity`}
      />

      {/* Main Goal Card */}
      <div className="relative flex flex-col items-center z-10 scale-100 sm:scale-110">
        {/* Animated Banner */}
        <div
          className={`font-display font-black tracking-widest text-6xl sm:text-8xl drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] ${
            isRed
              ? 'text-red-400 drop-shadow-[0_0_40px_rgba(239,68,68,0.8)]'
              : 'text-blue-400 drop-shadow-[0_0_40px_rgba(59,130,246,0.8)]'
          } animate-bounce`}
        >
          GÖÖÖÖL!
        </div>

        {/* Scorer announcement */}
        <div className="mt-2 px-6 py-2 rounded-full bg-slate-900/95 border border-slate-700/80 shadow-2xl flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full ${
              isRed ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-blue-500 shadow-[0_0_12px_#3b82f6]'
            }`}
          />
          <span className="font-display font-bold text-sm sm:text-lg text-white uppercase tracking-wider">
            {isRed ? 'KIRMIZI TAKIM GOLÜ BULDU!' : 'MAVİ TAKIM AĞLARI SARSTI!'}
          </span>
        </div>

        {/* Current score popup */}
        <div className="mt-4 flex items-center gap-4 bg-black/80 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/20 shadow-xl font-display">
          <span className="text-red-400 font-black text-3xl">{redScore}</span>
          <span className="text-slate-400 font-bold text-xl">-</span>
          <span className="text-blue-400 font-black text-3xl">{blueScore}</span>
        </div>

        <div className="mt-3 text-xs text-slate-300 font-medium tracking-wide bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
          Santra vuruşu hazırlanıyor...
        </div>
      </div>
    </div>
  );
};
