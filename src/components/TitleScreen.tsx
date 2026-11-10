import React, { useState } from 'react';
import { Play, Users, Globe, Copy, Check, Sparkles, ArrowRight, Loader2, Camera, Maximize2, Shield } from 'lucide-react';
import { CameraMode, GameMode, MatchSettings, StadiumTheme, StadiumType, TeamId } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { onlineManager, OnlineRoomState } from '../online/onlineManager';

interface TitleScreenProps {
  onStartGame: (settings: MatchSettings) => void;
  defaultSettings: MatchSettings;
  onlineRoomState: OnlineRoomState;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  defaultSettings,
  onlineRoomState,
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('local');
  const [duration, setDuration] = useState<number>(defaultSettings.durationSeconds);
  const [localMode, setLocalMode] = useState<GameMode>('2player');
  const [userTeam, setUserTeam] = useState<TeamId>(defaultSettings.userTeam);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [stadiumType, setStadiumType] = useState<StadiumType>(defaultSettings.stadiumType || 'grand_stadium');
  const [cameraMode, setCameraMode] = useState<CameraMode>(defaultSettings.cameraMode || 'dynamic');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  const handleStartLocal = () => {
    soundManager.playClick();
    onStartGame({
      durationSeconds: duration,
      mode: localMode,
      userTeam,
      aiDifficulty,
      theme: 'classic',
      goldenGoalOnTie: true,
      stadiumType,
      cameraMode,
    });
  };

  const handleCreateOnlineRoom = () => {
    soundManager.playClick();
    onlineManager.createRoom({
      durationSeconds: duration,
      mode: 'online_room',
      userTeam: 'red',
      aiDifficulty: 'normal',
      theme: 'classic',
      goldenGoalOnTie: true,
      stadiumType,
      cameraMode,
    });
  };

  const handleJoinOnlineRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    soundManager.playClick();
    setJoinLoading(true);
    await onlineManager.joinRoom(joinCodeInput);
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

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl relative my-auto">
        
        {/* Clean Logo Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 font-medium mb-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>2D Futbol Arenası</span>
          </div>

          <h1 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight flex items-center justify-center gap-2">
            <span className="text-red-400">Kırmızı</span>
            <span className="text-slate-500 font-light text-2xl">vs</span>
            <span className="text-blue-400">Mavi</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Minimalist, hızlı ve arkadaşınla online veya aynı cihazda oynanabilir futbol maçı.
          </p>
        </div>

        {/* MODE NAVIGATION TABS */}
        <div className="flex bg-slate-950/60 p-1 rounded-2xl border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('local');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'local'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={15} />
            <span>Aynı Cihazda Oyna</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('online');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'online'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe size={15} className="text-emerald-400" />
            <span>Online Oda (Arkadaşınla)</span>
          </button>
        </div>

        {/* TAB 1: LOCAL MODE (SAME DEVICE OR BOT) */}
        {activeTab === 'local' && (
          <div className="space-y-5">
            {/* MATCH DURATION */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-300">Maç Süresi:</span>
                <span className="text-xs text-slate-400 font-mono">{duration / 60} Dakika</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '1 dk', sec: 60 },
                  { label: '2 dk', sec: 120 },
                  { label: '3 dk', sec: 180 },
                  { label: '5 dk', sec: 300 },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setDuration(item.sec);
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      duration === item.sec
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/25'
                        : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PLAYER MODE SELECTOR */}
            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-2">Karşılaşma Türü:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setLocalMode('2player');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                    localMode === '2player'
                      ? 'bg-slate-700/80 border-white/20 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                  }`}
                >
                  <Users size={14} />
                  <span>2 Kişi (1v1 Karşılıklı)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setLocalMode('1player_vs_ai');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                    localMode === '1player_vs_ai'
                      ? 'bg-slate-700/80 border-white/20 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                  }`}
                >
                  <span>🤖 Yapay Zekaya Karşı</span>
                </button>
              </div>
            </div>

            {/* STADIUM / FIELD SELECTION */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-300">Stadyum / Saha Türü:</span>
                <span className="text-[11px] text-amber-400 font-medium">
                  {stadiumType === 'grand_stadium' ? '🌟 Devasa Stadyum (1950x1150)' : '🏟️ Klasik Haxball (1100x660)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setStadiumType('grand_stadium');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                    stadiumType === 'grand_stadium'
                      ? 'bg-gradient-to-br from-amber-600/30 to-amber-900/40 border-amber-500/80 text-white shadow-md shadow-amber-600/20'
                      : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1 text-amber-300">
                    <span>🌟 Grand Stadyum</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Devasa Saha & Tribünler</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setStadiumType('classic');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                    stadiumType === 'classic'
                      ? 'bg-slate-700/80 border-white/30 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                  }`}
                >
                  <span className="font-bold text-slate-200">🏟️ Klasik Haxball</span>
                  <span className="text-[10px] text-slate-400">Hızlı & Kompakt Arena</span>
                </button>
              </div>
            </div>

            {/* CAMERA MODE SELECTOR */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-300">Kamera Açısı:</span>
                <span className="text-[11px] text-sky-400 font-medium">
                  {cameraMode === 'dynamic' ? '🎥 Dinamik Takip (Otomatik Zoom)' : '🌐 Geniş Açı (Tam Saha)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setCameraMode('dynamic');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                    cameraMode === 'dynamic'
                      ? 'bg-sky-600/30 border-sky-400 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                  }`}
                >
                  <Camera size={14} className="text-sky-300" />
                  <span>Dinamik Takip</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setCameraMode('overview');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                    cameraMode === 'overview'
                      ? 'bg-slate-700/80 border-white/30 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                  }`}
                >
                  <Maximize2 size={14} className="text-slate-300" />
                  <span>Tam Saha Görünümü</span>
                </button>
              </div>
            </div>

            {/* Controls Preview */}
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-semibold text-red-400">🔴 Kırmızı:</span>
                <span className="font-mono text-slate-400">WASD + BOŞLUK (Şut)</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-semibold text-blue-400">🔵 Mavi:</span>
                <span className="font-mono text-slate-400">Yön Tuşları + P (Şut)</span>
              </div>
              <div className="pt-1 border-t border-white/5 text-[11px] text-amber-300/90 text-center font-medium">
                ⚡ Şut tuşuna 3 kez seri basarak 2x Süper Şut çek!
              </div>
            </div>

            {/* START BUTTON */}
            <button
              type="button"
              onClick={handleStartLocal}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-base tracking-wide shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Play size={18} fill="currentColor" />
              <span>MAÇI BAŞLAT</span>
            </button>
          </div>
        )}

        {/* TAB 2: ONLINE ROOM MODE (CREATE / JOIN) */}
        {activeTab === 'online' && (
          <div className="space-y-5">
            {/* Case A: Already in a room as Host */}
            {onlineRoomState.isHost && onlineRoomState.code ? (
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-white/10 text-center space-y-3">
                <span className="text-xs text-slate-400 font-medium">Oda Başarıyla Kuruldu!</span>
                
                {/* Room Code Display */}
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono font-black text-3xl tracking-widest text-emerald-400 bg-slate-900 px-4 py-1.5 rounded-xl border border-emerald-500/30 shadow-inner">
                    {onlineRoomState.code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors"
                    title="Kodu Kopyala"
                  >
                    {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Bu kodu arkadaşına gönder. Arama yerine yazarak odana katılsın.
                </p>

                {/* Connection Status */}
                {onlineRoomState.status === 'waiting_for_peer' && (
                  <div className="flex items-center justify-center gap-2 text-xs text-amber-400 bg-amber-500/10 py-2 rounded-xl border border-amber-500/20">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Arkadaşının katılması bekleniyor...</span>
                  </div>
                )}

                {onlineRoomState.status === 'ready' && (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 py-2 rounded-xl border border-emerald-500/20">
                      ✅ Arkadaşın odaya bağlandı!
                    </div>
                    <button
                      type="button"
                      onClick={handleStartOnlineMatch}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Play size={16} fill="currentColor" />
                      <span>MAÇI BAŞLAT</span>
                    </button>
                  </div>
                )}
              </div>
            ) : onlineRoomState.status === 'ready' && !onlineRoomState.isHost ? (
              // Case B: Joined room as Guest
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-white/10 text-center space-y-3">
                <div className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 py-2 rounded-xl border border-emerald-500/20">
                  ✅ Odaya Katıldın! (Oda Kodu: {onlineRoomState.code})
                </div>
                <p className="text-xs text-slate-400">
                  Ev sahibinin maçı başlatması bekleniyor... Hazır ol!
                </p>
                <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 size={14} className="animate-spin text-blue-400" />
                  <span>Mavi Takım olarak oynayacaksın</span>
                </div>
              </div>
            ) : (
              // Case C: Not in a room yet (Options to Create or Join)
              <div className="space-y-4">
                {/* 1. ODA KUR BUTONU */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-white">Yeni Oda Kur</span>
                    <span className="text-[11px] text-slate-400">Sen Kırmızı Takım olursun</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateOnlineRoom}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-xs sm:text-sm border border-white/10 shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>Oda Kur ve Kod Al</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div className="relative flex items-center justify-center">
                  <span className="h-px bg-white/10 w-full" />
                  <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase font-semibold">
                    veya
                  </span>
                  <span className="h-px bg-white/10 w-full" />
                </div>

                {/* 2. ODAYA KATIL FORMU */}
                <form onSubmit={handleJoinOnlineRoom} className="p-3.5 bg-slate-950/60 rounded-2xl border border-white/5 space-y-2.5">
                  <span className="block text-xs font-semibold text-white">Var Olan Odaya Katıl</span>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Oda Kodunu Gir (Örn: HAX82)"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 font-mono tracking-wider uppercase focus:outline-none focus:border-emerald-500/70"
                    />
                    <button
                      type="submit"
                      disabled={joinLoading || !joinCodeInput.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-display font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 flex-shrink-0"
                    >
                      {joinLoading ? <Loader2 size={14} className="animate-spin" /> : <span>Katıl</span>}
                    </button>
                  </div>

                  {onlineRoomState.errorMessage && (
                    <div className="text-[11px] text-red-400 bg-red-950/50 p-2 rounded-lg border border-red-900/50">
                      {onlineRoomState.errorMessage}
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
