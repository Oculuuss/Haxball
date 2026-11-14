import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Pause, Play, Copy, Check, Users, Camera, Maximize2, Flame, Sparkles } from 'lucide-react';
import { CameraMode, CLUBS, ClubId, StadiumType, TeamId } from '../types/game';
import { PremierLeagueLion, ClubLogo } from './Crests';

interface ScoreboardProps {
  redScore: number;
  blueScore: number;
  timeRemaining: number;
  totalDuration: number;
  isOvertime: boolean;
  redShots: number;
  blueShots: number;
  redCorners?: number;
  blueCorners?: number;
  redThrowIns?: number;
  blueThrowIns?: number;
  redPossession: number;
  bluePossession: number;
  isMuted: boolean;
  isPaused: boolean;
  isRedAi: boolean;
  isBlueAi: boolean;
  homeClub?: ClubId;
  awayClub?: ClubId;
  isOnline?: boolean;
  roomCode?: string;
  myTeam?: TeamId;
  cameraMode?: CameraMode;
  stadiumType?: StadiumType;
  lastScorer?: TeamId | null;
  goalEventId?: number;
  onTriggerGoalDemo?: (team: TeamId) => void;
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
  redCorners = 0,
  blueCorners = 0,
  redThrowIns = 0,
  blueThrowIns = 0,
  redPossession,
  bluePossession,
  isMuted,
  isPaused,
  isRedAi,
  isBlueAi,
  homeClub = 'liverpool',
  awayClub = 'ipswich',
  isOnline = false,
  roomCode,
  myTeam,
  cameraMode = 'dynamic',
  stadiumType = 'olympic',
  lastScorer = null,
  goalEventId = 0,
  onTriggerGoalDemo,
  onToggleMute,
  onTogglePause,
  onRestart,
  onToggleCamera,
  onToggleStadium,
}) => {
  const home = CLUBS[homeClub] || CLUBS.liverpool;
  const away = CLUBS[awayClub] || CLUBS.ipswich;

  const [copied, setCopied] = useState(false);

  // Live scoreboard display digits (immediately updated upon goal!)
  const [displayedRed, setDisplayedRed] = useState(redScore);
  const [displayedBlue, setDisplayedBlue] = useState(blueScore);

  // Score pop pulse animation triggers
  const [isPopRed, setIsPopRed] = useState(false);
  const [isPopBlue, setIsPopBlue] = useState(false);

  // Premier League Ribbon Elongation & "GOAL" Banner state
  // When a goal occurs, the corresponding side stretches/elongates horizontally into a large "GOAL" strip!
  const [goalElongatedTeam, setGoalElongatedTeam] = useState<TeamId | null>(null);

  // Full-screen stadium camera flash wash
  const [showStrobeFlash, setShowStrobeFlash] = useState(false);

  const prevGoalEventRef = useRef(goalEventId);
  const prevRedScoreRef = useRef(redScore);
  const prevBlueScoreRef = useRef(blueScore);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearGoalTimeouts = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  };

  // Trigger the authentic Premier League ribbon elongation:
  // The scoring team's ribbon section expands/elongates into the official "GOAL" banner strip,
  // the score updates immediately, and reverts smoothly after ~2.3 seconds!
  const triggerPremierLeagueGoalElongation = (scoringTeam: TeamId, targetRed: number, targetBlue: number) => {
    clearGoalTimeouts();

    // 1. Gol atan takımın skoru hemen güncellensin!
    if (scoringTeam === 'red') {
      setDisplayedRed(targetRed);
      setIsPopRed(true);
      const popTimer = setTimeout(() => setIsPopRed(false), 550);
      timeoutsRef.current.push(popTimer);
    } else {
      setDisplayedBlue(targetBlue);
      setIsPopBlue(true);
      const popTimer = setTimeout(() => setIsPopBlue(false), 550);
      timeoutsRef.current.push(popTimer);
    }

    // 2. Skorbord şeridi anlık olarak uzasın / genişlesin ve o alan tamamen büyük "GOAL" şeridi halini alsın
    setGoalElongatedTeam(scoringTeam);
    setShowStrobeFlash(true);

    const flashTimer = setTimeout(() => {
      setShowStrobeFlash(false);
    }, 450);

    // 3. Kutlama bittikten sonra (~2.3 saniye) şerit eski boyutuna dönerek normal skor ve takım ismini tekrar göstersin
    const revertTimer = setTimeout(() => {
      setGoalElongatedTeam(null);
    }, 2300);

    timeoutsRef.current.push(flashTimer, revertTimer);
  };

  // Watch for goal events or score changes
  useEffect(() => {
    const isNewGoalEvent = goalEventId !== prevGoalEventRef.current && goalEventId > 0;
    const isRedScoreUp = redScore > prevRedScoreRef.current;
    const isBlueScoreUp = blueScore > prevBlueScoreRef.current;

    // Reset condition (e.g. restart game)
    if (redScore === 0 && blueScore === 0 && (displayedRed > 0 || displayedBlue > 0)) {
      clearGoalTimeouts();
      setGoalElongatedTeam(null);
      setDisplayedRed(0);
      setDisplayedBlue(0);
      setIsPopRed(false);
      setIsPopBlue(false);
      prevRedScoreRef.current = 0;
      prevBlueScoreRef.current = 0;
      prevGoalEventRef.current = goalEventId;
      return;
    }

    if (isNewGoalEvent || isRedScoreUp || isBlueScoreUp) {
      const scoringTeam = lastScorer || (isRedScoreUp ? 'red' : 'blue');
      const targetRed = isRedScoreUp
        ? redScore
        : scoringTeam === 'red' && redScore === displayedRed
        ? displayedRed + 1
        : redScore;
      const targetBlue = isBlueScoreUp
        ? blueScore
        : scoringTeam === 'blue' && blueScore === displayedBlue
        ? displayedBlue + 1
        : blueScore;
      triggerPremierLeagueGoalElongation(scoringTeam, targetRed, targetBlue);
    }

    prevGoalEventRef.current = goalEventId;
    prevRedScoreRef.current = redScore;
    prevBlueScoreRef.current = blueScore;
  }, [goalEventId, redScore, blueScore, lastScorer]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      clearGoalTimeouts();
    };
  }, []);

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

  const stadiumLabel =
    stadiumType === 'olympic'
      ? 'OLYMPIC STADIUM'
      : stadiumType === 'grand_stadium'
      ? 'GRAND ARENA'
      : 'ANFIELD';

  return (
    <header className="pointer-events-auto w-full max-w-5xl mx-auto px-2 pt-2 sm:pt-3 select-none z-30 transition-all font-sans">
      {/* SCREEN STROBE FLASH (High-energy stadium bloom on goal) */}
      {showStrobeFlash && (
        <div className="fixed inset-0 pointer-events-none z-40 bg-radial from-amber-100/40 via-orange-500/20 to-transparent animate-pl-flash" />
      )}

      <div className="relative flex flex-col items-center">
        
        {/* ========================================================
            THE PREMIER LEAGUE (OPTUS SPORT) TV SCOREBUG RIBBON (BANT)
            - The team/score strip physically elongates/widens on goal!
            - The entire elongated strip transforms into the bold "GOAL" banner!
            - Reverts smoothly back to normal size and layout after 2.3s!
           ======================================================== */}
        <div
          className={`relative flex items-stretch shadow-2xl rounded-md overflow-hidden border transition-all duration-500 ease-out ${
            goalElongatedTeam === 'red'
              ? 'border-yellow-300/90 shadow-[0_0_35px_rgba(200,16,46,0.85)] scale-[1.02]'
              : goalElongatedTeam === 'blue'
              ? 'border-cyan-300/90 shadow-[0_0_35px_rgba(0,68,148,0.85)] scale-[1.02]'
              : 'border-white/15 bg-[#121620]'
          }`}
        >
          {/* 1. PREMIER LEAGUE LION & PURPLE TAB */}
          <div className="relative flex items-center justify-center px-2.5 sm:px-3 bg-[#38003c] text-white flex-shrink-0 border-r border-black/40">
            <PremierLeagueLion className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
            <div className="absolute bottom-0 inset-x-0 h-1 bg-[#00ff85]" />
          </div>

          {/* 2. MATCH CLOCK */}
          <div className="flex items-center justify-center px-2.5 sm:px-3.5 bg-[#0b0e14] text-white font-mono font-bold text-xs sm:text-sm tracking-tight border-r border-white/10 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOvertime ? 'bg-amber-400 animate-ping' : isLowTime ? 'bg-red-500 animate-pulse' : 'bg-[#00ff85]'
                }`}
              />
              <span className="tabular-nums">
                {isOvertime ? 'A.G.' : formattedTime}
              </span>
            </div>
          </div>

          {/* 3. HOME CLUB SLOT (ELONGATES & BECOMES "GOAL" STRIP) */}
          <div
            className={`relative h-9 sm:h-10 flex items-center overflow-hidden transition-all duration-500 ease-out flex-shrink-0 ${
              goalElongatedTeam === 'red'
                ? `w-[205px] sm:w-[265px] bg-gradient-to-r ${home.ribbonGradient} shadow-inner`
                : 'w-[84px] sm:w-[108px]'
            }`}
            style={{ backgroundColor: goalElongatedTeam !== 'red' ? home.color : undefined }}
          >
            {goalElongatedTeam === 'red' ? (
              // ELONGATED PREMIER LEAGUE "GOAL" STRIP
              <div className="absolute inset-0 flex items-center justify-between px-3 text-white font-display overflow-hidden">
                {/* Diagonal light shimmer ray */}
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-20deg] animate-pl-shimmer pointer-events-none" />

                {/* Team Crest & Name */}
                <div className="flex items-center gap-1.5 z-10">
                  <ClubLogo clubId={home.id} className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow flex-shrink-0" />
                  <span className="font-black text-xs sm:text-sm tracking-wider uppercase drop-shadow">
                    {home.code}
                  </span>
                </div>

                {/* Giant Bold "GOAL" Typography */}
                <div className="flex items-center gap-1 sm:gap-1.5 z-10 animate-pl-goal-flash">
                  <Flame size={18} className="text-yellow-200 fill-yellow-300 animate-bounce" />
                  <span className="font-black text-lg sm:text-2xl tracking-widest text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] italic">
                    GOAL
                  </span>
                  <Sparkles size={15} className="text-yellow-100" />
                </div>
              </div>
            ) : (
              // NORMAL HOME BADGE
              <div className="absolute inset-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 text-white font-display font-extrabold text-sm sm:text-base tracking-wider">
                <ClubLogo clubId={home.id} className="w-5 h-5 drop-shadow flex-shrink-0" />
                <div className="flex flex-col leading-none">
                  <span className="drop-shadow">{home.code}</span>
                  {isOnline && myTeam === 'red' && (
                    <span className="text-[8px] font-mono text-yellow-300 uppercase tracking-tighter">Sen</span>
                  )}
                </div>
                {isRedAi && (
                  <span className="text-[9px] uppercase bg-black/40 text-red-200 px-1 rounded border border-white/20">
                    BOT
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 4. HOME SCORE BOX (Immediately updates!) */}
          <div className="relative w-8 sm:w-9 bg-white text-[#0b0e14] font-display font-black text-lg sm:text-xl flex items-center justify-center overflow-hidden border-r border-slate-300 flex-shrink-0">
            <span
              className={`tabular-nums ${isPopRed ? 'animate-pl-score-pop font-black' : ''}`}
              style={{ color: isPopRed ? home.color : '#0b0e14' }}
            >
              {displayedRed}
            </span>
          </div>

          {/* 5. AWAY SCORE BOX (Immediately updates!) */}
          <div className="relative w-8 sm:w-9 bg-white text-[#0b0e14] font-display font-black text-lg sm:text-xl flex items-center justify-center overflow-hidden border-l border-slate-300 flex-shrink-0">
            <span
              className={`tabular-nums ${isPopBlue ? 'animate-pl-score-pop font-black' : ''}`}
              style={{ color: isPopBlue ? away.color : '#0b0e14' }}
            >
              {displayedBlue}
            </span>
          </div>

          {/* 6. AWAY CLUB SLOT (ELONGATES & BECOMES "GOAL" STRIP) */}
          <div
            className={`relative h-9 sm:h-10 flex items-center overflow-hidden transition-all duration-500 ease-out flex-shrink-0 ${
              goalElongatedTeam === 'blue'
                ? `w-[205px] sm:w-[265px] bg-gradient-to-r ${away.ribbonGradient} shadow-inner`
                : 'w-[84px] sm:w-[108px]'
            }`}
            style={{ backgroundColor: goalElongatedTeam !== 'blue' ? away.color : undefined }}
          >
            {goalElongatedTeam === 'blue' ? (
              // ELONGATED PREMIER LEAGUE "GOAL" STRIP
              <div className="absolute inset-0 flex items-center justify-between px-3 text-white font-display overflow-hidden">
                {/* Diagonal light shimmer ray */}
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-20deg] animate-pl-shimmer pointer-events-none" />

                {/* Giant Bold "GOAL" Typography */}
                <div className="flex items-center gap-1 sm:gap-1.5 z-10 animate-pl-goal-flash">
                  <Sparkles size={15} className="text-cyan-200" />
                  <span className="font-black text-lg sm:text-2xl tracking-widest text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] italic">
                    GOAL
                  </span>
                  <Flame size={18} className="text-cyan-100 fill-cyan-300 animate-bounce" />
                </div>

                {/* Team Crest & Name */}
                <div className="flex items-center gap-1.5 z-10">
                  <span className="font-black text-xs sm:text-sm tracking-wider uppercase drop-shadow">
                    {away.code}
                  </span>
                  <ClubLogo clubId={away.id} className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow flex-shrink-0" />
                </div>
              </div>
            ) : (
              // NORMAL AWAY BADGE
              <div className="absolute inset-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 text-white font-display font-extrabold text-sm sm:text-base tracking-wider justify-end">
                {isBlueAi && (
                  <span className="text-[9px] uppercase bg-black/40 text-blue-200 px-1 rounded border border-white/20">
                    BOT
                  </span>
                )}
                <div className="flex flex-col leading-none text-right">
                  <span className="drop-shadow">{away.code}</span>
                  {isOnline && myTeam === 'blue' && (
                    <span className="text-[8px] font-mono text-cyan-300 uppercase tracking-tighter">Sen</span>
                  )}
                </div>
                <ClubLogo clubId={away.id} className="w-5 h-5 drop-shadow flex-shrink-0" />
              </div>
            )}
          </div>

          {/* 7. QUICK UTILITY BUTTONS */}
          <div className="flex items-center gap-1 bg-[#1a0224] px-1.5 sm:px-2 border-l border-white/10 text-slate-400">
            {onToggleCamera && (
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onToggleCamera}
                className={`p-1 rounded hover:bg-white/10 transition-colors ${
                  cameraMode === 'dynamic' ? 'text-[#00ff85]' : 'text-slate-400 hover:text-white'
                }`}
                title={cameraMode === 'dynamic' ? 'Kamera: Dinamik Takip (Geniş Açıya Geç)' : 'Kamera: Tam Saha (Dinamik Takibe Geç)'}
              >
                {cameraMode === 'dynamic' ? <Camera size={13} /> : <Maximize2 size={13} />}
              </button>
            )}

            {!isOnline && (
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onTogglePause}
                className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title={isPaused ? 'Devam Et' : 'Duraklat'}
              >
                {isPaused ? <Play size={13} className="text-[#00ff85]" /> : <Pause size={13} />}
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onToggleMute}
              className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
            >
              {isMuted ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} />}
            </button>
          </div>
        </div>

        {/* ========================================================
            MINIMALIST BROADCAST SUBTITLE & LIVE MATCH STATS BAR
           ======================================================== */}
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[10px] font-mono tracking-wider text-[#888888] bg-[#111111]/90 px-3 py-1 rounded-md border border-zinc-800 backdrop-blur-sm">
          <span className="text-white font-medium tabular-nums">
            ŞUT <span className="text-zinc-200">{redShots}-{blueShots}</span>
          </span>

          <span className="text-zinc-700">/</span>

          <span className="text-white font-medium tabular-nums">
            KORNER <span className="text-zinc-200">{redCorners}-{blueCorners}</span>
          </span>

          <span className="text-zinc-700">/</span>

          <span className="text-white font-medium tabular-nums">
            TAÇ <span className="text-zinc-200">{redThrowIns}-{blueThrowIns}</span>
          </span>

          <span className="text-zinc-700 hidden sm:inline">/</span>

          <span className="hidden sm:inline text-zinc-300 tabular-nums">
            TOPA SAHİP %{redPossession}-%{bluePossession}
          </span>

          <span className="text-zinc-700 hidden md:inline">/</span>

          <span className="hidden md:inline uppercase">{stadiumLabel}</span>

          {isOnline && roomCode && (
            <>
              <span className="text-zinc-700">/</span>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-white hover:text-zinc-300 transition-colors font-mono"
                title="Oda Kodunu Kopyala"
              >
                <Users size={10} />
                <span>{roomCode}</span>
                {copied ? <Check size={10} /> : <Copy size={10} />}
              </button>
            </>
          )}

          {onTriggerGoalDemo && (
            <>
              <span className="text-zinc-700 hidden lg:inline">/</span>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onTriggerGoalDemo('red')}
                className="hidden lg:inline-flex items-center text-zinc-400 hover:text-white transition-colors"
                title={`${home.name} Gol Animasyonu Önizleme`}
              >
                <span>{home.code} Gol Test</span>
              </button>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onTriggerGoalDemo('blue')}
                className="hidden lg:inline-flex items-center text-zinc-400 hover:text-white transition-colors"
                title={`${away.name} Gol Animasyonu Önizleme`}
              >
                <span>{away.code} Gol Test</span>
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
};
