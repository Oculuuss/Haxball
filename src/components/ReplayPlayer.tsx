import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Film, ArrowLeft } from 'lucide-react';
import { CLUBS, ClubId, GoalReplay } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface ReplayPlayerProps {
  replays: GoalReplay[];
  activeReplayIndex: number;
  currentFrame: number;
  isPlaying: boolean;
  replaySpeed: number;
  homeClub?: ClubId;
  awayClub?: ClubId;
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
  homeClub = 'liverpool',
  awayClub = 'ipswich',
  onSelectReplay,
  onTogglePlay,
  onSeekFrame,
  onChangeSpeed,
  onRestartReplay,
  onExitReplay,
}) => {
  const home = CLUBS[homeClub] || CLUBS.liverpool;
  const away = CLUBS[awayClub] || CLUBS.ipswich;
  const activeReplay = replays[activeReplayIndex];
  const maxFrames = activeReplay ? activeReplay.frames.length - 1 : 100;
  const isRed = activeReplay?.scorer === 'red';

  return (
    <div className="absolute inset-x-0 bottom-4 px-4 z-30 pointer-events-auto max-w-4xl mx-auto select-none">
      <div className="bg-[#111111]/95 backdrop-blur-md border border-zinc-800 rounded-xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] p-4 text-white">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-white">
              <Film size={14} className="text-[#888888]" />
              <span>Gol Tekrarları</span>
              <span className="text-[#888888] font-mono tabular-nums">({replays.length})</span>
            </span>

            <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs sm:max-w-md py-0.5">
              {replays.map((rep, idx) => {
                const isSelected = idx === activeReplayIndex;
                const m = Math.floor(rep.matchTime / 60);
                const s = Math.floor(rep.matchTime % 60);
                const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

                return (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      onSelectReplay(idx);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-white text-[#0a0a0a] border-white'
                        : 'bg-[#0a0a0a] hover:bg-zinc-900 border-zinc-800 text-[#888888] hover:text-white'
                    }`}
                  >
                    <span>Gol {idx + 1}</span>
                    <span className="text-[10px] font-mono tabular-nums opacity-75">{timeStr}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onExitReplay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0a0a0a] hover:bg-zinc-900 text-[#888888] hover:text-white text-xs font-medium border border-zinc-800 hover:border-zinc-700 transition-colors ml-auto"
          >
            <ArrowLeft size={13} />
            <span>Maç Sonucu</span>
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between items-center text-[11px] text-[#888888] font-mono">
            <span className="flex items-center gap-2">
              <span className="font-medium text-white">
                {isRed ? `${home.name} (${home.code})` : `${away.name} (${away.code})`}
              </span>
              <span className="tabular-nums">
                Skor: {activeReplay?.scoreRed} - {activeReplay?.scoreBlue}
              </span>
            </span>
            <span className="tabular-nums">
              Kare <strong className="text-white">{currentFrame}</strong> / {maxFrames}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={maxFrames}
            value={currentFrame}
            onChange={(e) => onSeekFrame(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-md appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Playback Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onTogglePlay();
              }}
              className="flex items-center gap-1.5 px-4 h-8 rounded-full bg-white hover:bg-zinc-200 text-[#0a0a0a] font-medium text-xs transition-colors"
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
              <span>{isPlaying ? 'Durdur' : 'Oynat'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onRestartReplay();
              }}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-[#0a0a0a] hover:bg-zinc-900 text-[#888888] hover:text-white text-xs font-medium border border-zinc-800 hover:border-zinc-700 transition-colors"
              title="Tekrar Başa Sar"
            >
              <RotateCcw size={13} />
              <span>Başa Al</span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#0a0a0a] p-1 rounded-md border border-zinc-800">
            <span className="text-[11px] text-[#888888] px-1.5 flex items-center gap-1">
              <FastForward size={12} /> Hız
            </span>
            {[
              { label: '0.25x', value: 0.25 },
              { label: '0.5x', value: 0.5 },
              { label: '1.0x', value: 1.0 },
            ].map((spd) => (
              <button
                key={spd.value}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onChangeSpeed(spd.value);
                }}
                className={`px-2 py-1 rounded-[4px] text-[11px] font-mono tabular-nums font-medium transition-colors ${
                  replaySpeed === spd.value
                    ? 'bg-white text-[#0a0a0a]'
                    : 'text-[#888888] hover:text-white'
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
