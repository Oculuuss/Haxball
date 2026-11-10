import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, PITCH_CONFIG } from './game/physics';
import { GameRenderer } from './game/renderer';
import { soundManager } from './audio/soundManager';
import { Scoreboard } from './components/Scoreboard';
import { TitleScreen } from './components/TitleScreen';
import { GoalCelebration } from './components/GoalCelebration';
import { CountdownOverlay } from './components/CountdownOverlay';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { ReplayPlayer } from './components/ReplayPlayer';
import { TouchControls } from './components/TouchControls';
import { CameraMode, GameState, GoalReplay, MatchSettings, MatchStats, StadiumType, TeamId } from './types/game';
import { onlineManager, OnlineRoomState } from './online/onlineManager';
import { Smartphone, Monitor, Zap, Camera, Maximize2 } from 'lucide-react';

const DEFAULT_SETTINGS: MatchSettings = {
  durationSeconds: 120, // 2 minutes default
  mode: '2player',
  aiDifficulty: 'normal',
  userTeam: 'red',
  theme: 'classic',
  goldenGoalOnTie: true,
  stadiumType: 'grand_stadium',
  cameraMode: 'dynamic',
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // React UI state synchronized from engine
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<MatchSettings>(DEFAULT_SETTINGS);
  const [cameraMode, setCameraMode] = useState<CameraMode>('dynamic');
  const [stadiumType, setStadiumType] = useState<StadiumType>('grand_stadium');
  const [redScore, setRedScore] = useState<number>(0);
  const [blueScore, setBlueScore] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(120);
  const [isOvertime, setIsOvertime] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [lastScorer, setLastScorer] = useState<TeamId | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [redPossession, setRedPossession] = useState<number>(50);
  const [bluePossession, setBluePossession] = useState<number>(50);
  const [redShots, setRedShots] = useState<number>(0);
  const [blueShots, setBlueShots] = useState<number>(0);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(false);

  // Online Multiplayer State
  const [onlineRoomState, setOnlineRoomState] = useState<OnlineRoomState>(onlineManager.roomState);

  // Replay UI State
  const [replays, setReplays] = useState<GoalReplay[]>([]);
  const [activeReplayIndex, setActiveReplayIndex] = useState<number>(0);
  const [replayFrame, setReplayFrame] = useState<number>(0);
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(true);
  const [replaySpeed, setReplaySpeed] = useState<number>(0.6);

  // Super shot notification banner
  const [superShotNotification, setSuperShotNotification] = useState<{ team: TeamId; count: number } | null>(null);

  // Initialize engine & renderer once
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setShowTouchControls(isTouch);

    const engine = new GameEngine(DEFAULT_SETTINGS);
    engineRef.current = engine;

    if (canvasRef.current) {
      const renderer = new GameRenderer(canvasRef.current, engine);
      rendererRef.current = renderer;
    }

    // Engine callbacks
    engine.onScoreChange = (rScore, bScore) => {
      setRedScore(rScore);
      setBlueScore(bScore);
    };

    engine.onStateChange = (newState) => {
      setGameState(newState);
      if (newState === 'playing') {
        setLastScorer(null);
      }
    };

    engine.onGoalScored = (team) => {
      setLastScorer(team);
      if (onlineManager.roomState.status === 'playing' && onlineManager.roomState.isHost) {
        onlineManager.sendGoal(team);
      }
    };

    engine.onSuperShotTriggered = (team) => {
      setSuperShotNotification({ team, count: Date.now() });
      setTimeout(() => {
        setSuperShotNotification(null);
      }, 1400);
    };

    engine.onTimeUpdate = (time) => {
      setTimeRemaining(time);
      setIsOvertime(engine.isOvertime);

      const totalPoss = engine.playerRed.possessionFrames + engine.playerBlue.possessionFrames || 1;
      const rPoss = Math.round((engine.playerRed.possessionFrames / totalPoss) * 100);
      setRedPossession(rPoss);
      setBluePossession(100 - rPoss);
      setRedShots(engine.playerRed.shots);
      setBlueShots(engine.playerBlue.shots);
    };

    engine.onMatchEnd = () => {
      setMatchStats(engine.getStats());
      setReplays([...engine.goalReplays]);
      setGameState('gameover');
    };

    // Setup Online Manager Callbacks
    onlineManager.onRoomUpdate = (room) => {
      setOnlineRoomState(room);
    };

    onlineManager.onGameStart = (serverSettings) => {
      handleStartMatch({
        ...DEFAULT_SETTINGS,
        ...(serverSettings || {}),
        mode: 'online_room',
      });
    };

    onlineManager.onRemoteInput = (input) => {
      // If we are Host, guest controls blue player
      if (engineRef.current && onlineManager.roomState.isHost) {
        engineRef.current.touchBlue.x = input.dx;
        engineRef.current.touchBlue.y = input.dy;
        engineRef.current.touchBlue.kick = input.kick;
        if (input.isSuper) {
          engineRef.current.playerBlue.isSuperShot = true;
          engineRef.current.playerBlue.superShotActiveTimer = 0.9;
        }
      }
    };

    onlineManager.onSyncState = (data) => {
      // If we are Guest, smoothly mirror state from Host
      if (engineRef.current && !onlineManager.roomState.isHost) {
        const eng = engineRef.current;
        eng.ball.x = data.ball.x;
        eng.ball.y = data.ball.y;
        eng.ball.vx = data.ball.vx;
        eng.ball.vy = data.ball.vy;
        eng.ball.isSuperShot = !!data.ball.isSuperShot;

        eng.playerRed.x = data.playerRed.x;
        eng.playerRed.y = data.playerRed.y;
        eng.playerRed.vx = data.playerRed.vx;
        eng.playerRed.vy = data.playerRed.vy;
        eng.playerRed.isKicking = data.playerRed.isKicking;
        eng.playerRed.isSuperShot = !!data.playerRed.isSuperShot;

        eng.playerBlue.x = data.playerBlue.x;
        eng.playerBlue.y = data.playerBlue.y;
        eng.playerBlue.vx = data.playerBlue.vx;
        eng.playerBlue.vy = data.playerBlue.vy;
        eng.playerBlue.isKicking = data.playerBlue.isKicking;
        eng.playerBlue.isSuperShot = !!data.playerBlue.isSuperShot;

        eng.playerRed.score = data.scoreRed;
        eng.playerBlue.score = data.scoreBlue;
        setRedScore(data.scoreRed);
        setBlueScore(data.scoreBlue);
        setTimeRemaining(data.timeRemaining);
        setIsOvertime(data.isOvertime);
      }
    };

    onlineManager.onGoalEvent = (scoringTeam) => {
      if (engineRef.current && !onlineManager.roomState.isHost) {
        setLastScorer(scoringTeam);
        setGameState('goal');
        soundManager.playGoal();
        setTimeout(() => {
          if (engineRef.current) {
            engineRef.current.resetToKickoff(scoringTeam);
          }
        }, 2800);
      }
    };

    onlineManager.onRematchRequested = () => {
      handleRestart();
    };

    // Canvas resize handling
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      rendererRef.current.resize(clientWidth, clientHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Optimized Keyboard handlers with complete browser interference prevention
    const GAME_KEYS = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Space', 'KeyP',
      'Numpad8', 'Numpad5', 'Numpad2', 'Numpad4', 'Numpad6',
      'KeyI', 'KeyK', 'KeyJ', 'KeyL'
    ]);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default behavior (scroll, search, navigation) on all game keys
      if (GAME_KEYS.has(e.code) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (engineRef.current) {
        if (!engineRef.current.keys[e.code]) {
          engineRef.current.justPressedKeys[e.code] = true;
        }
        engineRef.current.keys[e.code] = true;
      }

      // Hotkeys
      if (e.code === 'Escape') {
        if (engineRef.current?.gameState === 'playing' && engineRef.current?.settings.mode !== 'online_room') {
          handleTogglePause();
        } else if (engineRef.current?.gameState === 'paused') {
          handleResume();
        } else if (engineRef.current?.gameState === 'replay') {
          handleExitReplay();
        }
      }

      if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      }

      if ((e.code === 'Enter' || e.code === 'Space') && engineRef.current?.gameState === 'menu' && engineRef.current?.settings.mode !== 'online_room') {
        handleStartMatch(settings);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (engineRef.current) {
        engineRef.current.keys[e.code] = false;
        delete engineRef.current.keys[e.code];
      }
    };

    const handleBlur = () => {
      if (engineRef.current) {
        engineRef.current.keys = {};
        engineRef.current.justPressedKeys = {};
        engineRef.current.resetTouchInputs();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && engineRef.current) {
        engineRef.current.keys = {};
        engineRef.current.justPressedKeys = {};
        engineRef.current.resetTouchInputs();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 60FPS Game Loop
    let syncThrottleCounter = 0;
    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
        requestRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      const rawDt = Math.max(0.001, Math.min((timestamp - lastTimeRef.current) / 1000, 0.05));
      lastTimeRef.current = timestamp;

      const engine = engineRef.current;
      const renderer = rendererRef.current;

      if (engine && renderer) {
        const isOnline = engine.settings.mode === 'online_room';
        const isHost = onlineManager.roomState.isHost;

        // Run engine physics update for local mode, or online host, or during countdown on guest
        if (!isOnline || isHost || engine.gameState === 'countdown') {
          engine.update(rawDt);

          // If Host in online match, broadcast authoritative sync state to Guest
          if (isOnline && isHost && engine.gameState === 'playing') {
            syncThrottleCounter++;
            if (syncThrottleCounter % 2 === 0) {
              onlineManager.sendSyncState({
                ball: { x: engine.ball.x, y: engine.ball.y, vx: engine.ball.vx, vy: engine.ball.vy, isSuperShot: engine.ball.isSuperShot },
                playerRed: { x: engine.playerRed.x, y: engine.playerRed.y, vx: engine.playerRed.vx, vy: engine.playerRed.vy, isKicking: engine.playerRed.isKicking, isSuperShot: engine.playerRed.isSuperShot },
                playerBlue: { x: engine.playerBlue.x, y: engine.playerBlue.y, vx: engine.playerBlue.vx, vy: engine.playerBlue.vy, isKicking: engine.playerBlue.isKicking, isSuperShot: engine.playerBlue.isSuperShot },
                scoreRed: engine.playerRed.score,
                scoreBlue: engine.playerBlue.score,
                timeRemaining: engine.timeRemaining,
                isOvertime: engine.isOvertime,
              });
            }
          }
        } else {
          // Guest in online match: read local input (supports both Arrow keys and WASD for comfort)
          let dx = 0;
          let dy = 0;
          if (engine.keys['ArrowUp'] || engine.keys['KeyW'] || engine.keys['w']) dy -= 1;
          if (engine.keys['ArrowDown'] || engine.keys['KeyS'] || engine.keys['s']) dy += 1;
          if (engine.keys['ArrowLeft'] || engine.keys['KeyA'] || engine.keys['a']) dx -= 1;
          if (engine.keys['ArrowRight'] || engine.keys['KeyD'] || engine.keys['d']) dx += 1;

          // Touch input fallback
          if (engine.touchBlue.x !== 0 || engine.touchBlue.y !== 0) {
            dx = engine.touchBlue.x;
            dy = engine.touchBlue.y;
          }

          const kick = !!(engine.justPressedKeys['KeyP'] || engine.keys['KeyP'] || engine.keys['p'] || engine.keys['Space'] || engine.touchBlue.kick);
          const isSuper = !!engine.playerBlue.isSuperShot;

          onlineManager.sendInput({ dx, dy, kick, isSuper });
        }

        renderer.render();

        if (engine.gameState === 'countdown') {
          setCountdown(engine.countdownNumber);
        }

        if (engine.gameState === 'replay') {
          setReplayFrame(engine.activeReplayFrame);
        }
      }

      requestRef.current = requestAnimationFrame(gameLoop);
    };

    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []); // Run ONCE on mount to ensure engine and canvas loop are never reset mid-game!

  // Actions
  const handleStartMatch = useCallback((newSettings: MatchSettings) => {
    setSettings(newSettings);
    if (newSettings.cameraMode) {
      setCameraMode(newSettings.cameraMode);
      if (rendererRef.current) {
        rendererRef.current.setCameraMode(newSettings.cameraMode);
      }
    }
    if (newSettings.stadiumType) {
      setStadiumType(newSettings.stadiumType);
    }
    lastTimeRef.current = 0;
    if (!engineRef.current) return;
    engineRef.current.startMatch(newSettings);
    setTimeRemaining(newSettings.durationSeconds);
    setRedScore(0);
    setBlueScore(0);
    setRedShots(0);
    setBlueShots(0);
    setRedPossession(50);
    setBluePossession(50);
    setIsOvertime(false);
    setLastScorer(null);
    setReplays([]);
    setGameState('countdown');
  }, []);

  const handleToggleCamera = useCallback(() => {
    if (rendererRef.current) {
      const nextMode = rendererRef.current.toggleCameraMode();
      setCameraMode(nextMode);
    }
  }, []);

  const handleToggleStadium = useCallback(() => {
    if (engineRef.current) {
      const nextStadium: StadiumType = engineRef.current.settings.stadiumType === 'grand_stadium' ? 'classic' : 'grand_stadium';
      engineRef.current.settings.stadiumType = nextStadium;
      setStadiumType(nextStadium);
      setSettings((prev) => ({ ...prev, stadiumType: nextStadium }));
      engineRef.current.initEntities();
      engineRef.current.resetToKickoff();
    }
  }, []);

  const handleTogglePause = useCallback(() => {
    if (!engineRef.current || engineRef.current.settings.mode === 'online_room') return;
    if (engineRef.current.gameState === 'playing') {
      engineRef.current.gameState = 'paused';
      setGameState('paused');
    } else if (engineRef.current.gameState === 'paused') {
      lastTimeRef.current = 0;
      engineRef.current.gameState = 'playing';
      setGameState('playing');
    }
  }, []);

  const handleResume = useCallback(() => {
    if (!engineRef.current) return;
    lastTimeRef.current = 0;
    engineRef.current.gameState = 'playing';
    setGameState('playing');
  }, []);

  const handleRestart = useCallback(() => {
    if (!engineRef.current) return;
    lastTimeRef.current = 0;
    engineRef.current.startMatch();
    setTimeRemaining(engineRef.current.settings.durationSeconds);
    setRedScore(0);
    setBlueScore(0);
    setIsOvertime(false);
    setLastScorer(null);
    setReplays([]);
    setGameState('countdown');

    if (engineRef.current.settings.mode === 'online_room' && onlineRoomState.isHost) {
      onlineManager.sendRematch();
    }
  }, [onlineRoomState.isHost]);

  const handleHome = useCallback(() => {
    if (settings.mode === 'online_room') {
      onlineManager.leaveRoom();
    }
    if (engineRef.current) {
      engineRef.current.gameState = 'menu';
    }
    setGameState('menu');
  }, [settings.mode]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  // Replay actions
  const handleWatchReplays = useCallback(() => {
    if (!engineRef.current || engineRef.current.goalReplays.length === 0) return;
    engineRef.current.gameState = 'replay';
    engineRef.current.selectReplay(0);
    setGameState('replay');
    setActiveReplayIndex(0);
    setReplayFrame(0);
    setIsReplayPlaying(true);
  }, []);

  const handleSelectReplay = useCallback((index: number) => {
    if (!engineRef.current) return;
    engineRef.current.selectReplay(index);
    setActiveReplayIndex(index);
    setReplayFrame(0);
    setIsReplayPlaying(true);
  }, []);

  const handleTogglePlayReplay = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.isReplayPlaying = !engineRef.current.isReplayPlaying;
    setIsReplayPlaying(engineRef.current.isReplayPlaying);
  }, []);

  const handleSeekReplay = useCallback((frame: number) => {
    if (!engineRef.current) return;
    engineRef.current.setReplayFrame(frame);
    setReplayFrame(frame);
  }, []);

  const handleChangeReplaySpeed = useCallback((speed: number) => {
    if (!engineRef.current) return;
    engineRef.current.replaySpeed = speed;
    setReplaySpeed(speed);
  }, []);

  const handleRestartReplay = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.setReplayFrame(0);
    setReplayFrame(0);
  }, []);

  const handleExitReplay = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.gameState = 'gameover';
    setGameState('gameover');
  }, []);

  const isOnline = settings.mode === 'online_room';
  const myOnlineTeam = onlineRoomState.myTeam;
  const isRedAi = !isOnline && settings.mode === '1player_vs_ai' && settings.userTeam === 'blue';
  const isBlueAi = !isOnline && settings.mode === '1player_vs_ai' && settings.userTeam === 'red';

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col items-center justify-between"
    >
      {/* 2D Physics Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair z-0"
      />

      {/* TOP LIVE SCOREBOARD (Modern Capsule) */}
      {(gameState === 'playing' ||
        gameState === 'countdown' ||
        gameState === 'goal' ||
        gameState === 'paused') && (
        <Scoreboard
          redScore={redScore}
          blueScore={blueScore}
          timeRemaining={timeRemaining}
          totalDuration={settings.durationSeconds}
          isOvertime={isOvertime}
          redShots={redShots}
          blueShots={blueShots}
          redPossession={redPossession}
          bluePossession={bluePossession}
          isMuted={isMuted}
          isPaused={gameState === 'paused'}
          isRedAi={isRedAi}
          isBlueAi={isBlueAi}
          isOnline={isOnline}
          roomCode={onlineRoomState.code}
          myTeam={myOnlineTeam}
          cameraMode={cameraMode}
          stadiumType={stadiumType}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onRestart={handleRestart}
          onToggleCamera={handleToggleCamera}
          onToggleStadium={handleToggleStadium}
        />
      )}

      {/* SUPER SHOT NOTIFICATION POPUP */}
      {superShotNotification && (
        <div className="absolute top-20 z-25 pointer-events-none flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/90 border border-amber-500/80 shadow-2xl animate-in zoom-in-75 duration-150">
          <Zap className="text-amber-400 animate-bounce" size={16} />
          <span className="font-display font-bold text-xs tracking-wide text-amber-300">
            {superShotNotification.team === 'red' ? '🔴 KIRMIZI' : '🔵 MAVİ'} SÜPER ŞUT! (2X HIZ 🔥)
          </span>
        </div>
      )}

      {/* TOUCH CONTROLS (Toggled or on touch devices) */}
      {showTouchControls &&
        (gameState === 'playing' || gameState === 'countdown' || gameState === 'goal') && (
          <TouchControls
            engine={engineRef.current}
            isRedAi={isOnline ? myOnlineTeam === 'blue' : isRedAi}
            isBlueAi={isOnline ? myOnlineTeam === 'red' : isBlueAi}
          />
        )}

      {/* BOTTOM HUD PILLS (Camera, Stadium & Touch Controls) */}
      {gameState !== 'replay' && (
        <div className="absolute bottom-2 right-2 z-20 pointer-events-auto flex items-center gap-2">
          {/* Quick Stadium Switcher */}
          <button
            onClick={handleToggleStadium}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-white/10 shadow-lg backdrop-blur-sm transition-colors"
            title="Saha Boyutunu Değiştir (Devasa Grand Stadyum / Klasik Haxball)"
          >
            <span>{stadiumType === 'grand_stadium' ? '🌟 Grand Stadyum' : '🏟️ Klasik Saha'}</span>
          </button>

          {/* Quick Camera Mode Switcher */}
          <button
            onClick={handleToggleCamera}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-white/10 shadow-lg backdrop-blur-sm transition-colors"
            title="Kamera Açısını Değiştir (Dinamik Takip / Tam Saha Görünümü)"
          >
            {cameraMode === 'dynamic' ? <Camera size={13} className="text-sky-400" /> : <Maximize2 size={13} className="text-slate-300" />}
            <span className="hidden sm:inline">{cameraMode === 'dynamic' ? 'Kamera: Dinamik' : 'Kamera: Tam Saha'}</span>
          </button>

          {/* Touch Controls Toggle */}
          <button
            onClick={() => setShowTouchControls((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-white/10 shadow-lg backdrop-blur-sm transition-colors"
            title="Dokunmatik Ekran Butonlarını Aç/Kapat"
          >
            {showTouchControls ? <Monitor size={13} /> : <Smartphone size={13} />}
            <span>{showTouchControls ? 'Dokunmatikleri Gizle' : 'Dokunmatik Tuşlar'}</span>
          </button>
        </div>
      )}

      {/* GOAL CELEBRATION OVERLAY */}
      {gameState === 'goal' && (
        <GoalCelebration
          scoringTeam={lastScorer}
          redScore={redScore}
          blueScore={blueScore}
        />
      )}

      {/* COUNTDOWN OVERLAY (3, 2, 1, BAŞLA!) */}
      {gameState === 'countdown' && <CountdownOverlay count={countdown} />}

      {/* TITLE SCREEN / GAME SETUP */}
      {gameState === 'menu' && (
        <TitleScreen
          defaultSettings={settings}
          onStartGame={handleStartMatch}
          onlineRoomState={onlineRoomState}
        />
      )}

      {/* PAUSE MODAL */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onHome={handleHome}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* GAME OVER MODAL */}
      {gameState === 'gameover' && matchStats && (
        <GameOverModal
          stats={matchStats}
          hasReplays={replays.length > 0}
          onWatchReplay={handleWatchReplays}
          onRematch={handleRestart}
          onHome={handleHome}
        />
      )}

      {/* GOAL REPLAY VIEWER */}
      {gameState === 'replay' && replays.length > 0 && (
        <ReplayPlayer
          replays={replays}
          activeReplayIndex={activeReplayIndex}
          currentFrame={replayFrame}
          isPlaying={isReplayPlaying}
          replaySpeed={replaySpeed}
          onSelectReplay={handleSelectReplay}
          onTogglePlay={handleTogglePlayReplay}
          onSeekFrame={handleSeekReplay}
          onChangeSpeed={handleChangeReplaySpeed}
          onRestartReplay={handleRestartReplay}
          onExitReplay={handleExitReplay}
        />
      )}
    </div>
  );
}
