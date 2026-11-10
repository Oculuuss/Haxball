import React from 'react';
import { Volume2, VolumeX, Pause, Play, RotateCcw, Copy, Check, Users, Camera, Maximize2 } from 'lucide-react';
import { CameraMode, StadiumType, TeamId } from '../types/game';

interface ScoreboardProps {
  redScore: number;
  blueScore: number;
  timeRemaining: number;
  totalDuration: number;
  isOvertime: boolean;
  redShots: number;
  blueShots: number;
  redPossession: number;
  bluePossession: number;
  isMuted: boolean;
  isPaused: boolean;
  isRedAi: boolean;
  isBlueAi: boolean;
  isOnline?: boolean;
  roomCode?: string;
  myTeam?: TeamId;
  cameraMode?: CameraMode;
  stadiumType?: StadiumType;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onToggleCamera?: () => void;
  onToggleStadium?: () => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  redScore,
  blueScore,
  timeRemaining,
  isOvertime,
  redShots,
  blueShots,
  redPossession,
  bluePossession,
  isMuted,
  isPaused,
  isRedAi,
  isBlueAi,
  isOnline = false,
  roomCode,
  myTeam,
  cameraMode = 'dynamic',
  stadiumType = 'grand_stadium',
  onToggleMute,
  onTogglePause,
  onRestart,
  onToggleCamera,
  onToggleStadium,
}) => {
  const [copied, setCopied] = React.useState(false);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isLowTime = timeRemaining <= 10 && timeRemaining > 0 && !isOvertime;

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="pointer-events-auto w-full max-w-2xl mx-auto px-3 pt-3 select-none z-20 transition-all">
      {/* Sleek Floating Capsule Scoreboard */}
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl px-4 py-2 sm:px-6 sm:py-2.5 flex items-center justify-between gap-3 text-white">
        
        {/* RED TEAM (Left) */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-500 shadow-sm shadow-red-500/40 flex-shrink-0">
            <span className="font-display font-bold text-xs sm:text-sm text-white">10</span>
            {isOnline && myTeam === 'red' && (
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900" title="Sen" />
            )}
          </div>

          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs sm:text-sm text-red-300 tracking-wide truncate">
                Kırmızı
              </span>
              {isRedAi && (
                <span className="text-[9px] uppercase bg-red-950/80 text-red-300 px-1 rounded border border-red-800/60">
                  Bot
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              {isOnline ? (myTeam === 'red' ? 'Sen (WASD/Boşluk)' : 'Rakip') : 'WASD'}
            </span>
          </div>
        </div>

        {/* CENTER MATCH SCORE & TIMER CAPSULE */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          {/* Digital Score numbers */}
          <div className="flex items-center gap-2 font-display text-xl sm:text-2xl font-bold tracking-tight">
            <span className="text-red-400 tabular-nums">{redScore}</span>
            <span className="text-slate-500 text-sm font-normal">:</span>
            <span className="text-blue-400 tabular-nums">{blueScore}</span>
          </div>

          {/* Minimal Time Badge */}
          <div
            className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              isOvertime
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : isLowTime
                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                : 'bg-white/5 text-emerald-400 border-white/5'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{isOvertime ? 'Altın Gol' : formattedTime}</span>
          </div>

          {/* Online Room Code Tag if in online mode */}
          {isOnline && roomCode && (
            <button
              onClick={handleCopyCode}
              className="hidden md:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-white/10 transition-colors"
              title="Oda Kodunu Kopyala"
            >
              <Users size={11} className="text-emerald-400" />
              <span>{roomCode}</span>
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            </button>
          )}
        </div>

        {/* BLUE TEAM (Right) */}
        <div className="flex items-center gap-2 min-w-0 justify-end text-right">
          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center justify-end gap-1.5">
              {isBlueAi && (
                <span className="text-[9px] uppercase bg-blue-950/80 text-blue-300 px-1 rounded border border-blue-800/60">
                  Bot
                </span>
              )}
              <span className="font-semibold text-xs sm:text-sm text-blue-300 tracking-wide truncate">
                Mavi
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              {isOnline ? (myTeam === 'blue' ? 'Sen (Yön/P)' : 'Rakip') : 'Yönler'}
            </span>
          </div>

          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-500 shadow-sm shadow-blue-500/40 flex-shrink-0">
            <span className="font-display font-bold text-xs sm:text-sm text-white">7</span>
            {isOnline && myTeam === 'blue' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900" title="Sen" />
            )}
          </div>
        </div>

        {/* QUICK COMPACT BUTTONS */}
        <div className="flex items-center gap-1 border-l border-white/10 pl-2">
          {/* Live Camera Toggle Button */}
          {onToggleCamera && (
            <button
              onClick={onToggleCamera}
              className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
                cameraMode === 'dynamic' ? 'text-sky-400 hover:text-sky-300' : 'text-slate-400 hover:text-white'
              }`}
              title={cameraMode === 'dynamic' ? 'Kamera: Dinamik Takip (Geniş Açıya Geç)' : 'Kamera: Tam Saha (Dinamik Takibe Geç)'}
            >
              {cameraMode === 'dynamic' ? <Camera size={14} /> : <Maximize2 size={14} />}
            </button>
          )}

          {!isOnline && (
            <button
              onClick={onTogglePause}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title={isPaused ? 'Devam Et' : 'Duraklat'}
            >
              {isPaused ? <Play size={14} className="text-emerald-400" /> : <Pause size={14} />}
            </button>
          )}

          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>
    </header>
  );
};
