import React, { useState } from 'react';
import {
  Play,
  Users,
  Globe,
  Copy,
  Check,
  Bot,
  ArrowRight,
  Loader2,
  Gamepad2,
  Shuffle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  CameraMode,
  CLUBS,
  ClubId,
  MatchFormat,
  MatchSettings,
  PlayerSpeedMultiplier,
  StadiumType,
  TeamId,
} from '../types/game';
import { soundManager } from '../audio/soundManager';
import { onlineManager, OnlineRoomState } from '../online/onlineManager';
import { PremierLeagueLion, ClubLogo } from './Crests';
import { SpeedSliderNav } from './SpeedSliderNav';

interface TitleScreenProps {
  onStartGame: (settings: MatchSettings) => void;
  defaultSettings: MatchSettings;
  onlineRoomState: OnlineRoomState;
}

const ALL_CLUBS: ClubId[] = [
  'liverpool',
  'arsenal',
  'aston_villa',
  'brentford',
  'chelsea',
  'tottenham',
  'ipswich',
];

interface TeamColumnPanelProps {
  sideTitle: string;
  sideSubtitle: string;
  selectedClubId: ClubId;
  onSelectClub: (clubId: ClubId) => void;
  footerSlot?: React.ReactNode;
}

const TeamColumnPanel: React.FC<TeamColumnPanelProps> = ({
  sideTitle,
  sideSubtitle,
  selectedClubId,
  onSelectClub,
  footerSlot,
}) => {
  const [slideDir, setSlideDir] = useState<'up' | 'down' | null>(null);
  const [animTick, setAnimTick] = useState(0);

  const currentIdx = Math.max(0, ALL_CLUBS.indexOf(selectedClubId));
  const prevClubId = ALL_CLUBS[(currentIdx - 1 + ALL_CLUBS.length) % ALL_CLUBS.length];
  const nextClubId = ALL_CLUBS[(currentIdx + 1) % ALL_CLUBS.length];

  const selectedClub = CLUBS[selectedClubId] || CLUBS.liverpool;
  const prevClub = CLUBS[prevClubId];
  const nextClub = CLUBS[nextClubId];

  const handleStepUp = () => {
    soundManager.playClick();
    setSlideDir('up');
    setAnimTick((t) => t + 1);
    onSelectClub(prevClubId);
  };

  const handleStepDown = () => {
    soundManager.playClick();
    setSlideDir('down');
    setAnimTick((t) => t + 1);
    onSelectClub(nextClubId);
  };

  return (
    <div className="bg-white rounded-lg border-2 border-white/90 shadow-[0_14px_34px_rgba(4,24,78,0.45)] overflow-hidden flex flex-col">
      {/* Classic PES Dark Navy Header Strip */}
      <div className="bg-gradient-to-r from-[#04215d] via-[#0a3c9e] to-[#04215d] px-4 py-2.5 text-center border-b-2 border-[#38bdf8]/50">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
          {sideTitle}
        </h2>
        <p className="text-[11px] font-medium text-blue-100/90 mt-0.5">
          {sideSubtitle}
        </p>
      </div>

      {/* Vertical Carousel Switcher (^ / Centered Crest Stage / v) */}
      <div className="mx-auto w-full max-w-[340px] sm:max-w-[380px] my-3.5 px-3">
        <div className="rounded-md overflow-hidden border border-slate-300 shadow-sm">
          {/* TOP UP BUTTON (^) */}
          <button
            type="button"
            onClick={handleStepUp}
            aria-label={`${sideTitle} önceki takım: ${prevClub.name}`}
            className="w-full h-11 bg-[#cbd5e1] hover:bg-[#b8c6d8] active:bg-[#a6b7cd] text-slate-950 flex items-center justify-center relative transition-colors border-b border-slate-400/40 group"
          >
            <ChevronUp
              size={28}
              strokeWidth={3}
              className="text-black group-hover:-translate-y-0.5 transition-transform"
            />
            <span className="absolute right-3 text-[11px] font-medium text-slate-700 hidden sm:inline truncate max-w-[100px]">
              {prevClub.code}
            </span>
          </button>

          {/* CENTER FEATURED CREST STAGE */}
          <div className="bg-[#a6aab0] h-44 sm:h-48 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div
              key={`${selectedClubId}-${animTick}`}
              className={`flex flex-col items-center justify-center ${
                slideDir === 'down'
                  ? 'animate-team-from-bottom'
                  : slideDir === 'up'
                  ? 'animate-team-from-top'
                  : ''
              }`}
            >
              <ClubLogo
                clubId={selectedClubId}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)]"
              />
            </div>

            {/* Subtle index indicator */}
            <div className="absolute top-2.5 right-3 text-[11px] font-mono font-semibold text-slate-900/75 tabular-nums">
              {currentIdx + 1}/{ALL_CLUBS.length}
            </div>
          </div>

          {/* BOTTOM DOWN BUTTON (v) */}
          <button
            type="button"
            onClick={handleStepDown}
            aria-label={`${sideTitle} sonraki takım: ${nextClub.name}`}
            className="w-full h-11 bg-[#cbd5e1] hover:bg-[#b8c6d8] active:bg-[#a6b7cd] text-slate-950 flex items-center justify-center relative transition-colors border-t border-slate-400/40 group"
          >
            <ChevronDown
              size={28}
              strokeWidth={3}
              className="text-black group-hover:translate-y-0.5 transition-transform"
            />
            <span className="absolute right-3 text-[11px] font-medium text-slate-700 hidden sm:inline truncate max-w-[100px]">
              {nextClub.code}
            </span>
          </button>
        </div>
      </div>

      {/* Selected Team Name & Character Preview Strip */}
      <div className="px-4 pb-3.5 pt-2 bg-gradient-to-b from-white to-[#f1f6ff] border-t border-slate-100 flex-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-white border-2 border-[#0b46b5] shadow-sm overflow-hidden shrink-0">
            <img
              src={selectedClub.characterImage}
              alt={`${selectedClub.name} oyuncusu`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight text-[#04215d] uppercase truncate leading-tight">
              {selectedClub.name}
            </h3>
            <p className="text-[11px] font-mono text-slate-500 truncate">
              {selectedClub.stadium}
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-[#0b46b5] shrink-0">
          {selectedClub.code}
        </span>
      </div>

      {footerSlot && (
        <div className="px-3 pb-3 pt-2 bg-white border-t border-slate-100">
          {footerSlot}
        </div>
      )}
    </div>
  );
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  defaultSettings,
  onlineRoomState,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'local' | 'online'>('ai');

  // Club selections
  const [homeClub, setHomeClub] = useState<ClubId>(defaultSettings.homeClub || 'liverpool');
  const [awayClub, setAwayClub] = useState<ClubId>(defaultSettings.awayClub || 'ipswich');

  // Match configurations
  const [duration, setDuration] = useState<number>(defaultSettings.durationSeconds);
  const [userTeam] = useState<TeamId>(defaultSettings.userTeam || 'red');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>(defaultSettings.matchFormat || '1v1');
  const [stadiumType, setStadiumType] = useState<StadiumType>(defaultSettings.stadiumType || 'olympic');
  const [cameraMode] = useState<CameraMode>(defaultSettings.cameraMode || 'dynamic');
  const [enableSetPieces, setEnableSetPieces] = useState<boolean>(defaultSettings.enableSetPieces !== false);
  const [playerSpeedMultiplier, setPlayerSpeedMultiplier] = useState<PlayerSpeedMultiplier>(
    defaultSettings.playerSpeedMultiplier || 1
  );
  const [hostLocalPlayers, setHostLocalPlayers] = useState<1 | 2>(defaultSettings.hostLocalPlayers || 1);
  const [guestLocalPlayers, setGuestLocalPlayers] = useState<1 | 2>(defaultSettings.guestLocalPlayers || 1);

  // Online Room State
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  const handleSelectHomeClub = (clubId: ClubId) => {
    setHomeClub(clubId);
  };

  const handleSelectAwayClub = (clubId: ClubId) => {
    setAwayClub(clubId);
  };

  const handleRandomizeTeams = () => {
    soundManager.playClick();
    const first = ALL_CLUBS[Math.floor(Math.random() * ALL_CLUBS.length)];
    const second = ALL_CLUBS[Math.floor(Math.random() * ALL_CLUBS.length)];
    setHomeClub(first);
    setAwayClub(second);
  };

  const handleStartAiMatch = () => {
    soundManager.playClick();
    onStartGame({
      durationSeconds: duration,
      mode: '1player_vs_ai',
      userTeam,
      homeClub,
      awayClub,
      aiDifficulty,
      theme: 'classic',
      goldenGoalOnTie: true,
      stadiumType,
      cameraMode,
      matchFormat,
      enableSetPieces,
      playerSpeedMultiplier,
      hostLocalPlayers: 1,
      guestLocalPlayers: 1,
    });
  };

  const handleStartLocalMatch = () => {
    soundManager.playClick();
    onStartGame({
      durationSeconds: duration,
      mode: '2player',
      userTeam: 'red',
      homeClub,
      awayClub,
      aiDifficulty: 'normal',
      theme: 'classic',
      goldenGoalOnTie: true,
      stadiumType,
      cameraMode,
      matchFormat,
      enableSetPieces,
      playerSpeedMultiplier,
      hostLocalPlayers,
      guestLocalPlayers: 1,
    });
  };

  const handleCreateOnlineRoom = () => {
    soundManager.playClick();
    onlineManager.createRoom({
      durationSeconds: duration,
      mode: 'online_room',
      userTeam: 'red',
      homeClub,
      awayClub,
      aiDifficulty: 'normal',
      theme: 'classic',
      goldenGoalOnTie: true,
      stadiumType,
      cameraMode,
      matchFormat,
      enableSetPieces,
      playerSpeedMultiplier,
      hostLocalPlayers,
      guestLocalPlayers,
    });
  };

  const handleJoinOnlineRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    soundManager.playClick();
    setJoinLoading(true);
    await onlineManager.joinRoom(joinCodeInput, { awayClub, guestLocalPlayers });
    setJoinLoading(false);
  };

  const handleCopyCode = () => {
    if (onlineRoomState.code) {
      navigator.clipboard.writeText(onlineRoomState.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartOnlineMatch = () => {
    soundManager.playClick();
    onlineManager.startGame();
  };

  const activeHome = CLUBS[homeClub] || CLUBS.liverpool;
  const activeAway = CLUBS[awayClub] || CLUBS.ipswich;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{
        background:
          'linear-gradient(135deg, #041f60 0%, #0b46b5 48%, #062b7d 100%)',
      }}
    >
      {/* Classic PES Diagonal Broadcast Corner Accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-24 -left-24 w-72 h-72 rotate-12 opacity-40"
          style={{
            background:
              'linear-gradient(135deg, #00e5ff 0%, #e11d74 55%, transparent 60%)',
          }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-80 h-80 -rotate-12 opacity-35"
          style={{
            background:
              'linear-gradient(315deg, #e11d74 0%, #00e5ff 50%, transparent 58%)',
          }}
        />
      </div>

      {/* Main PES Sports Arena Container */}
      <div className="relative w-full max-w-5xl my-auto rounded-xl overflow-hidden border border-blue-300/35 shadow-[0_28px_70px_rgba(2,12,44,0.75)] bg-[#083898]/95 backdrop-blur-md">
        {/* TOP BROADCAST NAV BAR */}
        <div className="bg-[#041d56] border-b border-blue-300/20 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <PremierLeagueLion className="w-6 h-6 text-white" />
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-none">
                Takım Seçimi
              </h1>
              <p className="text-[11px] font-medium text-blue-200 mt-0.5">
                Premier League · {activeHome.code} vs {activeAway.code}
              </p>
            </div>
          </div>

          {/* 3-Mode Segmented Control */}
          <div className="flex items-center gap-1 bg-[#03143d] p-1 rounded-md border border-blue-400/20">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setActiveTab('ai');
              }}
              className={`h-8 px-3 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'ai'
                  ? 'bg-white text-[#041d56] shadow-sm'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <Bot size={14} />
              <span>Yapay Zeka</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setActiveTab('local');
              }}
              className={`h-8 px-3 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'local'
                  ? 'bg-white text-[#041d56] shadow-sm'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <Users size={14} />
              <span>Aynı Cihaz</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setActiveTab('online');
              }}
              className={`h-8 px-3 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'online'
                  ? 'bg-white text-[#041d56] shadow-sm'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <Globe size={14} />
              <span>Online Oda</span>
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* ============================================================== */}
          {/* AI & LOCAL MODES: TWO-COLUMN PES TEAM SELECTOR + MATCH SETTINGS */}
          {/* ============================================================== */}
          {(activeTab === 'ai' || activeTab === 'local') && (
            <>
              {/* TWO-COLUMN TEAM SELECTION (İÇ SAHA | DEPLASMAN) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <TeamColumnPanel
                  sideTitle="İç Saha"
                  sideSubtitle={
                    activeTab === 'ai'
                      ? 'Premier League · Senin Takımın'
                      : 'Premier League · 1. Oyuncu (WASD)'
                  }
                  selectedClubId={homeClub}
                  onSelectClub={handleSelectHomeClub}
                />

                <TeamColumnPanel
                  sideTitle="Deplasman"
                  sideSubtitle={
                    activeTab === 'ai'
                      ? 'Premier League · Yapay Zeka'
                      : 'Premier League · 2. Oyuncu (Yön Tuşları)'
                  }
                  selectedClubId={awayClub}
                  onSelectClub={handleSelectAwayClub}
                />
              </div>

              {/* MATCH CONFIGURATION BAR (White/Blue Sports Panel) */}
              <div className="bg-white rounded-lg border-2 border-white/90 shadow-md p-4 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* AI Difficulty or Local Players */}
                  {activeTab === 'ai' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Zorluk Seviyesi
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'easy', label: 'Kolay' },
                          { id: 'normal', label: 'Normal' },
                          { id: 'hard', label: 'Zor' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              setAiDifficulty(item.id as 'easy' | 'normal' | 'hard');
                            }}
                            className={`h-9 px-2 rounded text-xs font-semibold border transition-colors whitespace-nowrap ${
                              aiDifficulty === item.id
                                ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#04215d]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Aynı Klavyeden
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setHostLocalPlayers(1);
                          }}
                          className={`h-9 px-2 rounded text-xs font-semibold border transition-colors whitespace-nowrap ${
                            hostLocalPlayers === 1
                              ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#04215d]'
                          }`}
                        >
                          1 Kişi
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setHostLocalPlayers(2);
                          }}
                          className={`h-9 px-2 rounded text-xs font-semibold border transition-colors whitespace-nowrap ${
                            hostLocalPlayers === 2
                              ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#04215d]'
                          }`}
                        >
                          2 Kişi (P1+P2)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Stadium Size */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Stadyum Boyutu
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'olympic', label: 'Olimpik' },
                        { id: 'grand_stadium', label: 'Grand' },
                        { id: 'classic', label: 'Klasik' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setStadiumType(item.id as StadiumType);
                          }}
                          className={`h-9 px-2 rounded text-xs font-semibold border transition-colors whitespace-nowrap ${
                            stadiumType === item.id
                              ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#04215d]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Match Duration */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Maç Süresi
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: '1dk', sec: 60 },
                        { label: '2dk', sec: 120 },
                        { label: '3dk', sec: 180 },
                        { label: '5dk', sec: 300 },
                      ].map((item) => (
                        <button
                          key={item.sec}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setDuration(item.sec);
                          }}
                          className={`h-9 rounded text-xs font-mono font-semibold tabular-nums border transition-colors ${
                            duration === item.sec
                              ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#04215d]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Match Format */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Kadro Formatı
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['1v1', '2v1', '2v2'] as MatchFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setMatchFormat(fmt);
                          }}
                          className={`h-9 rounded text-xs font-mono font-semibold border transition-colors ${
                            matchFormat === fmt
                              ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#04215d]'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Speed Slider + Set Pieces Toggle */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
                  <SpeedSliderNav
                    value={playerSpeedMultiplier}
                    onChange={setPlayerSpeedMultiplier}
                    variant="panel"
                    theme="sports"
                  />

                  <div className="flex items-center justify-between gap-4 bg-slate-50 px-3.5 py-3 rounded-md border border-slate-200">
                    <div>
                      <span className="block text-xs font-semibold text-slate-800">
                        Taç, Korner ve Aut
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Kapalıyken top saha çizgilerinden duvar gibi seker
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-0.5 rounded-md bg-white border border-slate-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setEnableSetPieces(true);
                        }}
                        className={`h-8 px-3 rounded text-xs font-semibold transition-colors ${
                          enableSetPieces
                            ? 'bg-[#0b46b5] text-white'
                            : 'text-slate-600 hover:text-[#04215d]'
                        }`}
                      >
                        Açık
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setEnableSetPieces(false);
                        }}
                        className={`h-8 px-3 rounded text-xs font-semibold transition-colors ${
                          !enableSetPieces
                            ? 'bg-[#0b46b5] text-white'
                            : 'text-slate-600 hover:text-[#04215d]'
                        }`}
                      >
                        Kapalı
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM PES-STYLE LEGEND & START CTA BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-3 text-xs text-blue-100">
                  <button
                    type="button"
                    onClick={handleRandomizeTeams}
                    className="h-9 px-3 rounded-md bg-[#041d56] hover:bg-[#062b7d] border border-blue-300/30 text-white font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Shuffle size={13} />
                    <span>Rastgele</span>
                  </button>

                  <div className="flex items-center gap-2 text-blue-100/90">
                    <Gamepad2 size={14} className="text-sky-300 shrink-0" />
                    {activeTab === 'ai' ? (
                      <span>
                        Hareket: <strong className="font-mono text-white">WASD / Yönler</strong>
                        <span className="mx-1.5 text-blue-300/60">·</span>
                        Şut: <strong className="font-mono text-white">Boşluk</strong>
                      </span>
                    ) : (
                      <span>
                        1. Oyuncu: <strong className="font-mono text-white">WASD + Boşluk</strong>
                        <span className="mx-1.5 text-blue-300/60">·</span>
                        2. Oyuncu: <strong className="font-mono text-white">Yönler + P</strong>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={activeTab === 'ai' ? handleStartAiMatch : handleStartLocalMatch}
                  className="h-11 px-7 rounded-md bg-white hover:bg-blue-50 text-[#041d56] font-bold text-sm shadow-[0_6px_20px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-2 active:scale-[0.99] whitespace-nowrap ml-auto"
                >
                  <Play size={15} fill="currentColor" />
                  <span>{activeTab === 'ai' ? 'Maçı Başlat' : 'Yerel Maçı Başlat'}</span>
                </button>
              </div>
            </>
          )}

          {/* ============================================================== */}
          {/* TAB 3: ONLINE ODA (CLASSIC BLUE/WHITE TWO-COLUMN SPORTS LAYOUT) */}
          {/* ============================================================== */}
          {activeTab === 'online' && (
            <div>
              {onlineRoomState.isHost && onlineRoomState.code ? (
                <div className="p-6 bg-white rounded-lg border-2 border-white shadow-lg text-center space-y-4 max-w-lg mx-auto">
                  <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#0b46b5]">
                    Oda Hazır · Kodu Paylaş
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono font-bold text-3xl tracking-[0.22em] text-[#041d56] bg-blue-50 px-5 py-2.5 rounded-md border border-blue-200">
                      {onlineRoomState.code}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="h-12 w-12 rounded-md bg-[#0b46b5] hover:bg-[#083898] text-white transition-colors flex items-center justify-center"
                      title="Kodu Kopyala"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Arkadaşın bu kodu Odaya Katıl alanına girerek Deplasman takımına bağlanabilir.
                  </p>

                  {onlineRoomState.status === 'waiting_for_peer' && (
                    <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#04215d] bg-blue-50 py-2.5 rounded-md border border-blue-200">
                      <Loader2 size={14} className="animate-spin text-[#0b46b5]" />
                      <span>Rakip oyuncunun bağlanması bekleniyor</span>
                    </div>
                  )}

                  {onlineRoomState.status === 'ready' && (
                    <div className="space-y-3 pt-1">
                      <div className="text-xs text-emerald-700 font-semibold bg-emerald-50 py-2.5 rounded-md border border-emerald-200">
                        Rakip odaya bağlandı · Başlamaya hazır
                      </div>
                      <button
                        type="button"
                        onClick={handleStartOnlineMatch}
                        className="w-full h-11 rounded-md bg-[#0b46b5] hover:bg-[#083898] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Play size={15} fill="currentColor" />
                        <span>Maçı Başlat</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : onlineRoomState.status === 'ready' && !onlineRoomState.isHost ? (
                <div className="p-6 bg-white rounded-lg border-2 border-white shadow-lg text-center space-y-3 max-w-lg mx-auto">
                  <div className="text-xs text-[#041d56] font-semibold bg-blue-50 py-2.5 rounded-md border border-blue-200 font-mono">
                    Oda {onlineRoomState.code} · Bağlantı kuruldu
                  </div>
                  <p className="text-xs text-slate-600">
                    Ev sahibinin maçı başlatması bekleniyor. Deplasman takımı olarak sahaya çıkacaksın.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[#0b46b5] text-xs font-medium pt-1">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Hazır bekleniyor</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  {/* LEFT COLUMN: İÇ SAHA (HOST CREATE ROOM) */}
                  <TeamColumnPanel
                    sideTitle="İç Saha · Oda Kur"
                    sideSubtitle="Ev Sahibi Takımı Seç"
                    selectedClubId={homeClub}
                    onSelectClub={setHomeClub}
                    footerSlot={
                      <div className="space-y-2.5 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Format
                            </span>
                            <div className="grid grid-cols-3 gap-1">
                              {(['1v1', '2v1', '2v2'] as MatchFormat[]).map((f) => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => {
                                    soundManager.playClick();
                                    setMatchFormat(f);
                                  }}
                                  className={`h-8 rounded text-xs font-mono font-semibold border transition-colors ${
                                    matchFormat === f
                                      ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50'
                                  }`}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Saha
                            </span>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { id: 'olympic', label: 'Olimpik' },
                                { id: 'grand_stadium', label: 'Grand' },
                                { id: 'classic', label: 'Klasik' },
                              ].map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    soundManager.playClick();
                                    setStadiumType(s.id as StadiumType);
                                  }}
                                  className={`h-8 rounded text-[11px] font-semibold border transition-colors ${
                                    stadiumType === s.id
                                      ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50'
                                  }`}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              setHostLocalPlayers(1);
                            }}
                            className={`h-8 rounded text-xs font-semibold border transition-colors ${
                              hostLocalPlayers === 1
                                ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50'
                            }`}
                          >
                            1 Oyuncu (Bu PC)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              setHostLocalPlayers(2);
                            }}
                            className={`h-8 rounded text-xs font-semibold border transition-colors ${
                              hostLocalPlayers === 2
                                ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50'
                            }`}
                          >
                            2 Oyuncu (Aynı PC)
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 bg-slate-50 px-3 py-2 rounded border border-slate-200">
                          <span className="text-[11px] font-semibold text-slate-700">
                            Taç, Korner ve Aut
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playClick();
                                setEnableSetPieces(true);
                              }}
                              className={`h-7 px-2.5 rounded text-[11px] font-semibold transition-colors ${
                                enableSetPieces
                                  ? 'bg-[#0b46b5] text-white'
                                  : 'text-slate-600 hover:text-[#04215d]'
                              }`}
                            >
                              Açık
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playClick();
                                setEnableSetPieces(false);
                              }}
                              className={`h-7 px-2.5 rounded text-[11px] font-semibold transition-colors ${
                                !enableSetPieces
                                  ? 'bg-[#0b46b5] text-white'
                                  : 'text-slate-600 hover:text-[#04215d]'
                              }`}
                            >
                              Kapalı
                            </button>
                          </div>
                        </div>

                        <SpeedSliderNav
                          value={playerSpeedMultiplier}
                          onChange={setPlayerSpeedMultiplier}
                          variant="compact"
                          theme="sports"
                        />

                        <button
                          type="button"
                          onClick={handleCreateOnlineRoom}
                          className="w-full h-10 rounded-md bg-[#0b46b5] hover:bg-[#083898] text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <span>Oda Kur ve Kod Al</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    }
                  />

                  {/* RIGHT COLUMN: DEPLASMAN (JOIN ROOM) */}
                  <TeamColumnPanel
                    sideTitle="Deplasman · Odaya Katıl"
                    sideSubtitle="Misafir Takımı Seç"
                    selectedClubId={awayClub}
                    onSelectClub={setAwayClub}
                    footerSlot={
                      <form onSubmit={handleJoinOnlineRoom} className="space-y-2.5 pt-1">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              setGuestLocalPlayers(1);
                            }}
                            className={`h-8 rounded text-xs font-semibold border transition-colors ${
                              guestLocalPlayers === 1
                                ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50'
                            }`}
                          >
                            1 Oyuncu (Bu PC)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              setGuestLocalPlayers(2);
                            }}
                            className={`h-8 rounded text-xs font-semibold border transition-colors ${
                              guestLocalPlayers === 2
                                ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50'
                            }`}
                          >
                            2 Oyuncu (Aynı PC)
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Oda Kodu (Örn: HAX82)"
                            value={joinCodeInput}
                            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="flex-1 h-10 bg-slate-50 border border-slate-300 rounded-md px-3 text-sm text-slate-900 placeholder-slate-400 font-mono tracking-wider uppercase focus:outline-none focus:border-[#0b46b5]"
                          />
                          <button
                            type="submit"
                            disabled={joinLoading || !joinCodeInput.trim()}
                            className="h-10 px-5 rounded-md bg-[#0b46b5] hover:bg-[#083898] disabled:opacity-40 text-white font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 shrink-0"
                          >
                            {joinLoading ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <span>Katıl</span>
                            )}
                          </button>
                        </div>

                        {onlineRoomState.errorMessage && (
                          <div className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-md border border-red-200">
                            {onlineRoomState.errorMessage}
                          </div>
                        )}
                      </form>
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
