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
  LogOut,
  UserPlus,
} from 'lucide-react';
import {
  CameraMode,
  CLUBS,
  ClubId,
  MatchFormat,
  MatchSettings,
  PitchColor,
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
  'man_city',
  'man_united',
  'ipswich',
];

interface TeamColumnPanelProps {
  sideTitle: string;
  sideSubtitle: string;
  selectedClubId: ClubId;
  onSelectClub: (clubId: ClubId) => void;
  canEditClub?: boolean;
  footerSlot?: React.ReactNode;
}

const TeamColumnPanel: React.FC<TeamColumnPanelProps> = ({
  sideTitle,
  sideSubtitle,
  selectedClubId,
  onSelectClub,
  canEditClub = true,
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
    if (!canEditClub) return;
    soundManager.playClick();
    setSlideDir('up');
    setAnimTick((t) => t + 1);
    onSelectClub(prevClubId);
  };

  const handleStepDown = () => {
    if (!canEditClub) return;
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
          {canEditClub && (
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
          )}

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
          {canEditClub && (
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
          )}
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
  const [pitchColor, setPitchColor] = useState<PitchColor>(defaultSettings.pitchColor || 'green');
  const [cameraMode] = useState<CameraMode>(defaultSettings.cameraMode || 'dynamic');
  const [enableSetPieces, setEnableSetPieces] = useState<boolean>(defaultSettings.enableSetPieces !== false);
  const [playerSpeedMultiplier, setPlayerSpeedMultiplier] = useState<PlayerSpeedMultiplier>(
    defaultSettings.playerSpeedMultiplier || 1
  );
  const [hostLocalPlayers, setHostLocalPlayers] = useState<1 | 2>(defaultSettings.hostLocalPlayers || 1);

  // Online Room State
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

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
      pitchColor,
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
      pitchColor,
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

  const handleCreateOnlineRoom = async () => {
    soundManager.playClick();
    setCreateLoading(true);
    await onlineManager.createRoom(
      {
        durationSeconds: duration,
        mode: 'online_room',
        userTeam: 'red',
        homeClub,
        awayClub,
        aiDifficulty: 'normal',
        theme: 'classic',
        pitchColor,
        goldenGoalOnTie: true,
        stadiumType,
        cameraMode,
        matchFormat,
        enableSetPieces,
        playerSpeedMultiplier,
      },
      playerNameInput.trim() || undefined
    );
    setCreateLoading(false);
  };

  const handleJoinOnlineRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    soundManager.playClick();
    setJoinLoading(true);
    await onlineManager.joinRoom(joinCodeInput, playerNameInput.trim() || undefined);
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
  const onlineHome = CLUBS[onlineRoomState.homeClub] || CLUBS.liverpool;
  const onlineAway = CLUBS[onlineRoomState.awayClub] || CLUBS.ipswich;

  const onlinePlayers = onlineRoomState.players || [];
  const onlineRedPlayers = onlinePlayers.filter((p) => p.team === 'red');
  const onlineBluePlayers = onlinePlayers.filter((p) => p.team === 'blue');
  const roomSettings = onlineRoomState.roomSettings || {};
  const roomDuration = roomSettings.durationSeconds ?? duration;
  const roomStadium = (roomSettings.stadiumType as StadiumType) || stadiumType;
  const roomPitchColor = (roomSettings.pitchColor as PitchColor) || pitchColor;
  const roomSetPieces = roomSettings.enableSetPieces !== undefined ? roomSettings.enableSetPieces : enableSetPieces;
  const roomSpeed = (roomSettings.playerSpeedMultiplier as PlayerSpeedMultiplier) || playerSpeedMultiplier;

  const redCaptainId = onlineRedPlayers[0]?.id;
  const blueCaptainId = onlineBluePlayers[0]?.id;
  const canEditOnlineRed = onlineRoomState.isHost || (!!redCaptainId && redCaptainId === onlineRoomState.myId);
  const canEditOnlineBlue = onlineRoomState.isHost || (!!blueCaptainId && blueCaptainId === onlineRoomState.myId);

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
                {activeTab === 'online'
                  ? onlineRoomState.code
                    ? `Online Oda · ${onlineRoomState.code}`
                    : 'Online Oda'
                  : 'Takım Seçimi'}
              </h1>
              <p className="text-[11px] font-medium text-blue-200 mt-0.5">
                {activeTab === 'online'
                  ? onlineRoomState.code
                    ? `Premier League · ${onlineHome.code} vs ${onlineAway.code} (${onlinePlayers.length}/8)`
                    : 'Premier League · Oda Oluştur veya Katıl'
                  : `Premier League · ${activeHome.code} vs ${activeAway.code}`}
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

                {/* Speed Slider + Pitch Color + Set Pieces Toggle */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
                  <SpeedSliderNav
                    value={playerSpeedMultiplier}
                    onChange={setPlayerSpeedMultiplier}
                    variant="panel"
                    theme="sports"
                  />

                  <div className="flex items-center justify-between gap-3 bg-slate-50 px-3.5 py-3 rounded-md border border-slate-200">
                    <div>
                      <span className="block text-xs font-semibold text-slate-800">
                        Saha Çimi
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Zemin rengi seçimi
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-0.5 rounded-md bg-white border border-slate-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setPitchColor('green');
                        }}
                        className={`h-8 px-2.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          pitchColor === 'green'
                            ? 'bg-[#0b46b5] text-white'
                            : 'text-slate-600 hover:text-[#04215d]'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#247d40] border border-white/40 shrink-0" />
                        <span>Yeşil</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setPitchColor('black');
                        }}
                        className={`h-8 px-2.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          pitchColor === 'black'
                            ? 'bg-[#0b46b5] text-white'
                            : 'text-slate-600 hover:text-[#04215d]'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#161920] border border-white/40 shrink-0" />
                        <span>Siyah</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-slate-50 px-3.5 py-3 rounded-md border border-slate-200">
                    <div>
                      <span className="block text-xs font-semibold text-slate-800">
                        Taç, Korner ve Aut
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Kapalıyken çizgilerden seker
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-0.5 rounded-md bg-white border border-slate-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setEnableSetPieces(true);
                        }}
                        className={`h-8 px-2.5 rounded text-xs font-semibold transition-colors ${
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
                        className={`h-8 px-2.5 rounded text-xs font-semibold transition-colors ${
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
          {/* TAB 3: ONLINE ODA                                               */}
          {/* - Before joining/creating: ONLY Oda Oluştur & Odaya Katıl       */}
          {/* - After joining/creating: Pick club & join team up to 4v4      */}
          {/* ============================================================== */}
          {activeTab === 'online' && (
            <div className="space-y-4">
              {!onlineRoomState.code ? (
                <div className="max-w-3xl mx-auto space-y-4 py-2">
                  {/* Optional Player Name */}
                  <div className="bg-white/10 border border-blue-300/25 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <label
                      htmlFor="online-player-name"
                      className="text-xs font-semibold text-white shrink-0"
                    >
                      Oyuncu Adın
                    </label>
                    <input
                      id="online-player-name"
                      type="text"
                      placeholder="İsteğe bağlı (Örn: Kaptan)"
                      value={playerNameInput}
                      onChange={(e) => setPlayerNameInput(e.target.value)}
                      maxLength={16}
                      className="flex-1 h-9 bg-white border border-blue-200 rounded-md px-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#38bdf8]"
                    />
                  </div>

                  {/* ONLY TWO CARDS: ODA OLUŞTUR & ODAYA KATIL */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    {/* ODA OLUŞTUR */}
                    <div className="bg-white rounded-lg border-2 border-white shadow-lg p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="bg-gradient-to-r from-[#04215d] via-[#0a3c9e] to-[#04215d] -mx-5 -mt-5 px-5 py-3 mb-4 border-b-2 border-[#38bdf8]/50">
                          <h2 className="text-base font-bold text-white">Oda Oluştur</h2>
                          <p className="text-[11px] text-blue-100/90 mt-0.5">
                            Odayı kur, takım seçimleri içeride başlasın
                          </p>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Yeni bir çevrimiçi oda oluşturup 5 haneli kodu arkadaşlarınla paylaş. Herkes odaya girdikten sonra takımlar ve kurallar içeride seçilir (4v4&apos;e kadar).
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateOnlineRoom}
                        disabled={createLoading}
                        className="w-full h-11 rounded-md bg-[#0b46b5] hover:bg-[#083898] disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {createLoading ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <>
                            <span>Oda Oluştur</span>
                            <ArrowRight size={15} />
                          </>
                        )}
                      </button>
                    </div>

                    {/* ODAYA KATIL */}
                    <form
                      onSubmit={handleJoinOnlineRoom}
                      className="bg-white rounded-lg border-2 border-white shadow-lg p-5 flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="bg-gradient-to-r from-[#04215d] via-[#0a3c9e] to-[#04215d] -mx-5 -mt-5 px-5 py-3 mb-4 border-b-2 border-[#38bdf8]/50">
                          <h2 className="text-base font-bold text-white">Odaya Katıl</h2>
                          <p className="text-[11px] text-blue-100/90 mt-0.5">
                            Mevcut odaya kod ile bağlan (4v4&apos;e kadar)
                          </p>
                        </div>
                        <label
                          htmlFor="online-join-code"
                          className="block text-xs font-semibold text-slate-700 mb-1.5"
                        >
                          Oda Kodu
                        </label>
                        <input
                          id="online-join-code"
                          type="text"
                          placeholder="Örn: HAX82"
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                          maxLength={6}
                          className="w-full h-11 bg-slate-50 border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder-slate-400 font-mono tracking-[0.2em] uppercase focus:outline-none focus:border-[#0b46b5]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={joinLoading || !joinCodeInput.trim()}
                        className="w-full h-11 rounded-md bg-[#0b46b5] hover:bg-[#083898] disabled:opacity-40 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {joinLoading ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <>
                            <UserPlus size={15} />
                            <span>Odaya Katıl</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {onlineRoomState.errorMessage && (
                    <div className="text-xs text-red-700 bg-red-50 px-4 py-2.5 rounded-md border border-red-200 text-center font-medium">
                      {onlineRoomState.errorMessage}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* IN-ROOM HEADER BAR */}
                  <div className="bg-white rounded-lg border-2 border-white shadow-md px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-semibold text-slate-600">Oda Kodu:</span>
                      <span className="font-mono font-bold text-lg tracking-[0.2em] text-[#041d56] bg-blue-50 px-3 py-1 rounded border border-blue-200">
                        {onlineRoomState.code}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="h-8 px-2.5 rounded bg-[#0b46b5] hover:bg-[#083898] text-white text-xs font-semibold transition-colors flex items-center gap-1"
                        title="Kodu Kopyala"
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
                      </button>
                      <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 tabular-nums">
                        {onlinePlayers.length}/8 Oyuncu (4v4&apos;e kadar)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onlineManager.leaveRoom();
                      }}
                      className="h-8 px-3 rounded bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <LogOut size={13} />
                      <span>Odadan Ayrıl</span>
                    </button>
                  </div>

                  {/* IN-ROOM TEAM & SIDE SELECTION (İÇ SAHA | DEPLASMAN UP TO 4v4) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    {([
                      {
                        side: 'red' as TeamId,
                        title: `İç Saha (${onlineRedPlayers.length}/4)`,
                        subtitle: canEditOnlineRed
                          ? 'Kulübünü Seç veya Bu Takıma Katıl'
                          : 'Bu Tarafa Katıl (4 Oyuncuya Kadar)',
                        clubId: onlineRoomState.homeClub,
                        players: onlineRedPlayers,
                        canEdit: canEditOnlineRed,
                      },
                      {
                        side: 'blue' as TeamId,
                        title: `Deplasman (${onlineBluePlayers.length}/4)`,
                        subtitle: canEditOnlineBlue
                          ? 'Kulübünü Seç veya Bu Takıma Katıl'
                          : 'Bu Tarafa Katıl (4 Oyuncuya Kadar)',
                        clubId: onlineRoomState.awayClub,
                        players: onlineBluePlayers,
                        canEdit: canEditOnlineBlue,
                      },
                    ]).map((col) => {
                      const isMySide = onlineRoomState.myTeam === col.side;
                      const isSideFull = col.players.length >= 4;
                      return (
                        <TeamColumnPanel
                          key={col.side}
                          sideTitle={col.title}
                          sideSubtitle={col.subtitle}
                          selectedClubId={col.clubId}
                          canEditClub={col.canEdit}
                          onSelectClub={(clubId) => onlineManager.selectClub(col.side, clubId)}
                          footerSlot={
                            <div className="space-y-2.5 pt-1">
                              {/* 4 Player Slots */}
                              <div className="space-y-1">
                                {[0, 1, 2, 3].map((slotIdx) => {
                                  const occupant = col.players[slotIdx];
                                  const isMe = occupant?.id === onlineRoomState.myId;
                                  return (
                                    <div
                                      key={slotIdx}
                                      className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-xs ${
                                        occupant
                                          ? isMe
                                            ? 'bg-blue-50 border-[#0b46b5]/50 text-[#041d56] font-semibold'
                                            : 'bg-slate-50 border-slate-200 text-slate-800'
                                          : 'bg-slate-50/50 border-dashed border-slate-200 text-slate-400'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                                          #{slotIdx + 1}
                                        </span>
                                        <span className="truncate">
                                          {occupant ? occupant.name : 'Boş Oyuncu Yeri'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {occupant?.isHost && (
                                          <span className="text-[10px] font-mono bg-[#041d56] text-white px-1.5 py-0.5 rounded">
                                            KURUCU
                                          </span>
                                        )}
                                        {isMe && (
                                          <span className="text-[10px] font-mono bg-[#0b46b5] text-white px-1.5 py-0.5 rounded">
                                            SEN
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Join / Selected Team Button */}
                              <button
                                type="button"
                                disabled={isMySide || isSideFull}
                                onClick={() => {
                                  soundManager.playClick();
                                  onlineManager.switchTeam(col.side);
                                }}
                                className={`w-full h-9 rounded-md font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                                  isMySide
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                                    : isSideFull
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                      : 'bg-[#0b46b5] hover:bg-[#083898] text-white'
                                }`}
                              >
                                {isMySide ? (
                                  <>
                                    <Check size={14} />
                                    <span>Bu Takımdasın ({col.players.length}/4)</span>
                                  </>
                                ) : isSideFull ? (
                                  <span>Takım Dolu (4/4)</span>
                                ) : (
                                  <>
                                    <UserPlus size={14} />
                                    <span>Bu Takıma Katıl ({col.players.length}/4)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          }
                        />
                      );
                    })}
                  </div>

                  {/* IN-ROOM MATCH SETTINGS (Host edits, guests preview) */}
                  <div className="bg-white rounded-lg border-2 border-white/90 shadow-md p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                              disabled={!onlineRoomState.isHost}
                              onClick={() => {
                                soundManager.playClick();
                                setStadiumType(item.id as StadiumType);
                                onlineManager.updateRoomSettings({ stadiumType: item.id as StadiumType });
                              }}
                              className={`h-8 px-2 rounded text-xs font-semibold border transition-colors whitespace-nowrap disabled:cursor-default ${
                                roomStadium === item.id
                                  ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
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
                              disabled={!onlineRoomState.isHost}
                              onClick={() => {
                                soundManager.playClick();
                                setDuration(item.sec);
                                onlineManager.updateRoomSettings({ durationSeconds: item.sec });
                              }}
                              className={`h-8 rounded text-xs font-mono font-semibold tabular-nums border transition-colors disabled:cursor-default ${
                                roomDuration === item.sec
                                  ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pitch Color */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Saha Çimi
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          {([
                            { id: 'green', label: 'Yeşil', dot: 'bg-[#247d40]' },
                            { id: 'black', label: 'Siyah', dot: 'bg-[#161920]' },
                          ] as const).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              disabled={!onlineRoomState.isHost}
                              onClick={() => {
                                soundManager.playClick();
                                setPitchColor(item.id);
                                onlineManager.updateRoomSettings({ pitchColor: item.id });
                              }}
                              className={`h-8 px-2 rounded text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors disabled:cursor-default ${
                                roomPitchColor === item.id
                                  ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-sm border border-white/40 ${item.dot}`} />
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Set Pieces */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Taç, Korner ve Aut
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            { val: true, label: 'Açık' },
                            { val: false, label: 'Kapalı' },
                          ].map((item) => (
                            <button
                              key={String(item.val)}
                              type="button"
                              disabled={!onlineRoomState.isHost}
                              onClick={() => {
                                soundManager.playClick();
                                setEnableSetPieces(item.val);
                                onlineManager.updateRoomSettings({ enableSetPieces: item.val });
                              }}
                              className={`h-8 rounded text-xs font-semibold border transition-colors disabled:cursor-default ${
                                roomSetPieces === item.val
                                  ? 'bg-[#0b46b5] text-white border-[#0b46b5]'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {onlineRoomState.isHost && (
                      <SpeedSliderNav
                        value={roomSpeed}
                        onChange={(spd) => {
                          setPlayerSpeedMultiplier(spd);
                          onlineManager.updateRoomSettings({ playerSpeedMultiplier: spd });
                        }}
                        variant="compact"
                        theme="sports"
                      />
                    )}
                  </div>

                  {onlineRoomState.errorMessage && (
                    <div className="text-xs text-red-700 bg-red-50 px-4 py-2 rounded-md border border-red-200 text-center font-medium">
                      {onlineRoomState.errorMessage}
                    </div>
                  )}

                  {/* START / WAIT FOOTER */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 text-xs text-blue-100">
                      <Gamepad2 size={14} className="text-sky-300 shrink-0" />
                      <span>
                        Kontrol: <strong className="font-mono text-white">WASD / Yönler</strong>
                        <span className="mx-1.5 text-blue-300/60">·</span>
                        Şut: <strong className="font-mono text-white">Boşluk / P</strong>
                      </span>
                    </div>

                    {onlineRoomState.isHost ? (
                      <button
                        type="button"
                        disabled={onlineRedPlayers.length === 0 || onlineBluePlayers.length === 0}
                        onClick={handleStartOnlineMatch}
                        className="h-11 px-7 rounded-md bg-white hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed text-[#041d56] font-bold text-sm shadow-[0_6px_20px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-2 ml-auto"
                      >
                        <Play size={15} fill="currentColor" />
                        <span>
                          {onlineRedPlayers.length > 0 && onlineBluePlayers.length > 0
                            ? `Maçı Başlat (${onlineRedPlayers.length}v${onlineBluePlayers.length})`
                            : 'Her İki Takımda En Az 1 Oyuncu Olmalı'}
                        </span>
                      </button>
                    ) : (
                      <div className="h-10 px-4 rounded-md bg-[#041d56] border border-blue-300/30 text-blue-100 text-xs font-medium flex items-center gap-2 ml-auto">
                        <Loader2 size={14} className="animate-spin text-sky-300" />
                        <span>Kurucunun maçı başlatması bekleniyor</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
