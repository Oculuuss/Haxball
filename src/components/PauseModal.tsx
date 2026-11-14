import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { PitchColor, PlayerSpeedMultiplier } from '../types/game';
import { SpeedSliderNav } from './SpeedSliderNav';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onTestGoal?: () => void;
  playerSpeedMultiplier?: PlayerSpeedMultiplier;
  onChangeSpeed?: (speed: PlayerSpeedMultiplier) => void;
  pitchColor?: PitchColor;
  onChangePitchColor?: (color: PitchColor) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onHome,
  isMuted,
  onToggleMute,
  onTestGoal,
  playerSpeedMultiplier = 1,
  onChangeSpeed,
  pitchColor = 'green',
  onChangePitchColor,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#0a0a0a]/85 backdrop-blur-md">
      <div className="w-full max-w-sm bg-[#111111] border border-zinc-800 rounded-xl p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)]">
        <div className="mb-5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#888888] mb-1">
            Maç Kontrolü
          </p>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
            Oyun Duraklatıldı
          </h2>
          <p className="text-xs text-[#888888] mt-1">
            Mola zamanı. Devam edebilir veya maç ayarlarını düzenleyebilirsin.
          </p>
        </div>

        {onChangeSpeed && (
          <div className="mb-3">
            <SpeedSliderNav
              value={playerSpeedMultiplier}
              onChange={onChangeSpeed}
              variant="panel"
            />
          </div>
        )}

        {onChangePitchColor && (
          <div className="mb-4 flex items-center justify-between gap-3 bg-[#0a0a0a] px-3 py-2.5 rounded-lg border border-zinc-800">
            <span className="text-xs font-medium text-zinc-300">Saha Çimi</span>
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded bg-zinc-900 border border-zinc-800">
              <button
                type="button"
                onClick={() => onChangePitchColor('green')}
                className={`h-7 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  pitchColor === 'green'
                    ? 'bg-white text-[#0a0a0a]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-[#247d40] border border-black/20 shrink-0" />
                <span>Yeşil</span>
              </button>
              <button
                type="button"
                onClick={() => onChangePitchColor('black')}
                className={`h-7 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  pitchColor === 'black'
                    ? 'bg-white text-[#0a0a0a]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-[#161920] border border-zinc-600 shrink-0" />
                <span>Siyah</span>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full h-10 px-4 rounded-full bg-white hover:bg-zinc-200 text-[#0a0a0a] font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Play size={15} fill="currentColor" />
            <span>Devam Et</span>
          </button>

          {onTestGoal && (
            <button
              type="button"
              onClick={onTestGoal}
              className="w-full h-10 px-4 rounded-md bg-[#0a0a0a] hover:bg-zinc-900 text-white font-medium text-xs flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 transition-colors"
              title="Premier League gol animasyonunu test et"
            >
              <Sparkles size={14} className="text-[#888888]" />
              <span>Gol Animasyonunu Test Et</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRestart}
            className="w-full h-10 px-4 rounded-md bg-[#0a0a0a] hover:bg-zinc-900 text-white font-medium text-xs flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <RotateCcw size={14} className="text-[#888888]" />
            <span>Maçı Yeniden Başlat</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="w-full h-10 px-4 rounded-md bg-[#0a0a0a] hover:bg-zinc-900 text-white font-medium text-xs flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            {isMuted ? (
              <VolumeX size={14} className="text-[#ee0000]" />
            ) : (
              <Volume2 size={14} className="text-[#888888]" />
            )}
            <span>{isMuted ? 'Sesi Aç' : 'Sesi Kapat'}</span>
          </button>

          <div className="pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onHome}
              className="w-full h-10 px-4 rounded-md bg-transparent hover:bg-zinc-900 text-[#888888] hover:text-white font-medium text-xs flex items-center justify-center gap-2 border border-transparent hover:border-zinc-800 transition-colors"
            >
              <Home size={14} />
              <span>Ana Menüye Dön</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
