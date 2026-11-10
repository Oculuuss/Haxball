import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Film, ArrowLeft } from 'lucide-react';
import { GoalReplay } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface ReplayPlayerProps {
  replays: GoalReplay[];
  activeReplayIndex: number;
  currentFrame: number;
  isPlaying: boolean;
  replaySpeed: number;
  onSelectReplay: (index: number) => void;
  onTogglePlay: () => void;
  onSeekFrame: (frame: number) => void;
  onChangeSpeed: (speed: number) => void;
  onRestartReplay: () => void;
  onExitReplay: () => void;
}

export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({
  replays,
  activeReplayIndex,
  currentFrame,
  isPlaying,
  replaySpeed,
  onSelectReplay,
  onTogglePlay,
  onSeekFrame,
  onChangeSpeed,
  onRestartReplay,
  onExitReplay,
}) => {
  const activeReplay = replays[activeReplayIndex];
  const maxFrames = activeReplay ? activeReplay.frames.length - 1 : 100;
  const isRed = activeReplay?.scorer === 'red';

  return (
    <div className="absolute inset-x-0 bottom-4 px-4 z-30 pointer-events-auto max-w-4xl mx-auto select-none">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-3 sm:p-4 text-white">
        
        {/* HEADER: GOAL TABS & EXIT */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 border border-red-500/40 text-xs font-display font-bold">
              <Film size={14} />
              <span>GOL TEKRARI ({replays.length} Gol Kaydedildi)</span>
            </span>

            {/* Goal Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs sm:max-w-md py-0.5">
              {replays.map((rep, idx) => {
                const repIsRed = rep.scorer === 'red';
                const isSelected = idx === activeReplayIndex;
                const m = Math.floor(rep.matchTime / 60);
                const s = Math.floor(rep.matchTime % 60);
                const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

                return (
                  <button
                    key={rep.id}
                    onClick={() => {
                      soundManager.playClick();
                      onSelectReplay(idx);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-display font-bold border transition-all whitespace-nowrap ${
                      isSelected
                        ? repIsRed
                          ? 'bg-red-600 border-red-400 text-white shadow-md shadow-red-600/30'
                          : 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${repIsRed ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <span>Gol {idx + 1}</span>
                    <span className="text-[10px] opacity-75 font-mono">({timeStr})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Return to Match Results */}
          <button
            onClick={onExitReplay}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-display font-bold border border-slate-700 transition-colors ml-auto"
          >
            <ArrowLeft size={14} />
            <span>Maç Sonucuna Dön</span>
          </button>
        </div>

        {/* TIMELINE SCRUBBER */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className={`font-bold ${isRed ? 'text-red-400' : 'text-blue-400'}`}>
                {isRed ? 'Kırmızı Takım Golü' : 'Mavi Takım Golü'}
              </span>
              <span>(Skor: {activeReplay?.scoreRed} - {activeReplay?.scoreBlue})</span>
            </span>
            <span>
              Kare: <b className="text-white">{currentFrame}</b> / {maxFrames}
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={maxFrames}
              value={currentFrame}
              onChange={(e) => onSeekFrame(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
            />
          </div>
        </div>

        {/* PLAYBACK CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Play / Pause / Rewind */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundManager.playClick();
                onTogglePlay();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs shadow-md shadow-emerald-600/30 transition-all"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
              <span>{isPlaying ? 'Durdur' : 'Oynat'}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onRestartReplay();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-display font-bold border border-slate-700 transition-colors"
              title="Tekrar Başa Sar"
            >
              <RotateCcw size={14} />
              <span>Başa Al</span>
            </button>
          </div>

          {/* Speed Selection */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 font-semibold px-1 flex items-center gap-1">
              <FastForward size={12} /> Hız:
            </span>
            {[
              { label: '0.25x', value: 0.25 },
              { label: '0.5x (Ağır Çekim)', value: 0.5 },
              { label: '1.0x (Normal)', value: 1.0 },
            ].map((spd) => (
              <button
                key={spd.value}
                onClick={() => {
                  soundManager.playClick();
                  onChangeSpeed(spd.value);
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                  replaySpeed === spd.value
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
