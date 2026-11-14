import React from 'react';
import { Trophy, RotateCcw, Home, Film } from 'lucide-react';
import { CLUBS, ClubId, MatchStats } from '../types/game';
import { ClubLogo } from './Crests';

interface GameOverModalProps {
  stats: MatchStats;
  hasReplays: boolean;
  homeClub?: ClubId;
  awayClub?: ClubId;
  onWatchReplay: () => void;
  onRematch: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  hasReplays,
  homeClub = 'liverpool',
  awayClub = 'ipswich',
  onWatchReplay,
  onRematch,
  onHome,
}) => {
  const home = CLUBS[homeClub] || CLUBS.liverpool;
  const away = CLUBS[awayClub] || CLUBS.ipswich;

  const isRedWinner = stats.winner === 'red';
  const isBlueWinner = stats.winner === 'blue';
  const isTie = stats.winner === 'tie';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#0a0a0a]/88 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md bg-[#111111] border border-zinc-800 rounded-xl p-6 sm:p-7 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)] my-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-md bg-[#0a0a0a] border border-zinc-800 text-white mb-4">
            <Trophy size={20} />
          </div>

          <p className="text-[11px] font-mono uppercase tracking-wider text-[#888888] mb-1">
            Maç Sonucu
          </p>

          <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.03em] text-white flex items-center justify-center gap-2">
            {isRedWinner && (
              <>
                <ClubLogo clubId={home.id} className="w-6 h-6" />
                <span>{home.name} Kazandı</span>
              </>
            )}
            {isBlueWinner && (
              <>
                <ClubLogo clubId={away.id} className="w-6 h-6" />
                <span>{away.name} Kazandı</span>
              </>
            )}
            {isTie && <span>Mücadele Berabere Bitti</span>}
          </h2>
        </div>

        {/* Final Score Card */}
        <div className="grid grid-cols-3 items-center bg-[#0a0a0a] rounded-lg p-4 border border-zinc-800 mb-4">
          <div className="flex flex-col items-center text-center">
            <ClubLogo clubId={home.id} className="w-8 h-8 mb-1.5" />
            <span className="text-xs font-medium text-[#888888]">{home.code}</span>
            <span className="text-3xl font-semibold font-mono tabular-nums text-white mt-1">
              {stats.redScore}
            </span>
          </div>

          <div className="text-center text-lg font-mono text-zinc-600">:</div>

          <div className="flex flex-col items-center text-center">
            <ClubLogo clubId={away.id} className="w-8 h-8 mb-1.5" />
            <span className="text-xs font-medium text-[#888888]">{away.code}</span>
            <span className="text-3xl font-semibold font-mono tabular-nums text-white mt-1">
              {stats.blueScore}
            </span>
          </div>
        </div>

        {/* Match Statistics */}
        <div className="bg-[#0a0a0a] rounded-lg p-4 border border-zinc-800 mb-6 text-xs space-y-2.5">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800 text-[11px] font-mono uppercase text-[#888888]">
            <span className="text-white">{home.code}</span>
            <span>İstatistikler</span>
            <span className="text-white">{away.code}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-mono tabular-nums font-medium text-white">{stats.redShots}</span>
            <span className="text-[#888888]">Toplam Şut</span>
            <span className="font-mono tabular-nums font-medium text-white">{stats.blueShots}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-mono tabular-nums font-medium text-white">{stats.redCorners}</span>
            <span className="text-[#888888]">Korner</span>
            <span className="font-mono tabular-nums font-medium text-white">{stats.blueCorners}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-mono tabular-nums font-medium text-white">{stats.redThrowIns}</span>
            <span className="text-[#888888]">Taç</span>
            <span className="font-mono tabular-nums font-medium text-white">{stats.blueThrowIns}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-mono tabular-nums font-medium text-white">%{stats.redPossession}</span>
            <span className="text-[#888888]">Topla Oynama</span>
            <span className="font-mono tabular-nums font-medium text-white">%{stats.bluePossession}</span>
          </div>

          <div className="flex justify-between items-center pt-1.5 border-t border-zinc-800/80 text-[11px] text-[#888888]">
            <span>Maç Süresi</span>
            <span className="font-mono tabular-nums text-white">{stats.duration} sn</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onRematch}
            className="w-full h-10 px-4 rounded-full bg-white hover:bg-zinc-200 text-[#0a0a0a] font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw size={15} />
            <span>Tekrar Oyna</span>
          </button>

          {hasReplays ? (
            <button
              type="button"
              onClick={onWatchReplay}
              className="w-full h-10 px-4 rounded-md bg-[#0a0a0a] hover:bg-zinc-900 text-white font-medium text-xs flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <Film size={14} className="text-[#888888]" />
              <span>Gol Tekrarlarını İzle</span>
            </button>
          ) : (
            <div className="text-[11px] text-[#888888] text-center py-1">
              Gol kaydedilmediği için tekrar bulunmuyor.
            </div>
          )}

          <button
            type="button"
            onClick={onHome}
            className="w-full h-10 px-4 rounded-md bg-transparent hover:bg-zinc-900 text-[#888888] hover:text-white font-medium text-xs flex items-center justify-center gap-2 border border-zinc-800/70 hover:border-zinc-700 transition-colors"
          >
            <Home size={14} />
            <span>Ana Menü</span>
          </button>
        </div>
      </div>
    </div>
  );
};
