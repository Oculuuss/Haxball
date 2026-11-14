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
import { SpeedSliderNav } from './components/SpeedSliderNav';
import { CameraMode, CLUBS, GameState, GoalReplay, MatchSettings, MatchStats, PitchColor, PlayerSpeedMultiplier, SetPieceState, StadiumType, TeamId } from './types/game';
import { onlineManager, OnlineRoomState } from './online/onlineManager';
import { Smartphone, Monitor, Zap, Camera, Maximize2 } from 'lucide-react';

const DEFAULT_SETTINGS: MatchSettings = {
  durationSeconds: 120, // 2 minutes default
  mode: '2player',
  aiDifficulty: 'normal',
  userTeam: 'red',
  homeClub: 'liverpool',
  awayClub: 'ipswich',
  theme: 'classic',
  pitchColor: 'green',
  goldenGoalOnTie: true,
  stadiumType: 'olympic',
  cameraMode: 'dynamic',
  enableSetPieces: true,
  playerSpeedMultiplier: 1,
  matchFormat: '1v1',
  hostLocalPlayers: 1,
  guestLocalPlayers: 1,
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
  const [stadiumType, setStadiumType] = useState<StadiumType>('olympic');
  const [pitchColor, setPitchColor] = useState<PitchColor>('green');
  const [redScore, setRedScore] = useState<number>(0);
  const [blueScore, setBlueScore] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(120);
  const [isOvertime, setIsOvertime] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [lastScorer, setLastScorer] = useState<TeamId | null>(null);
  const [goalEventId, setGoalEventId] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(false);

  // Premier League Goal Animation trigger function (can be called via triggerGoal(team) or window.triggerGoal)
  const triggerGoal = useCallback((team: TeamId) => {
    setLastScorer(team);
    setGoalEventId((prev) => prev + 1);
    soundManager.playGoal();
  }, []);

  // Expose triggerGoal globally for easy testing or programmatic integration
  useEffect(() => {
    (window as unknown as { triggerGoal: (team: TeamId) => void }).triggerGoal = triggerGoal;
  }, [triggerGoal]);

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

  // Set piece notification banner (Taç, Korner, Aut)
  const [setPieceBanner, setSetPieceBanner] = useState<SetPieceState | null>(null);

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
      } else {
        setSetPieceBanner(null);
      }
    };

    engine.onGoalScored = (team) => {
      triggerGoal(team);
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

    engine.onSetPieceChange = (sp) => {
      setSetPieceBanner(sp.active ? { ...sp } : null);
    };

    engine.onTimeUpdate = (time) => {
      setTimeRemaining(time);
      setIsOvertime(engine.isOvertime);
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
        localOnlinePlayerId: onlineManager.roomState.myId,
      });
    };

    onlineManager.onRemoteInput = (input) => {
      if (engineRef.current && onlineManager.roomState.isHost && input.playerId) {
        const eng = engineRef.current;
        const prev = eng.remoteOnlineInputs.get(input.playerId);
        eng.remoteOnlineInputs.set(input.playerId, {
          dx: input.dx,
          dy: input.dy,
          kick: input.kick,
          isSuper: input.isSuper,
          prevKick: prev?.prevKick ?? false,
        });
      }
    };

    onlineManager.onSyncState = (data) => {
      // If we are Guest, smoothly mirror authoritative state from Host
      if (engineRef.current && !onlineManager.roomState.isHost) {
        const eng = engineRef.current;
        eng.ball.x = data.ball.x;
        eng.ball.y = data.ball.y;
        eng.ball.vx = data.ball.vx;
        eng.ball.vy = data.ball.vy;
        eng.ball.isSuperShot = !!data.ball.isSuperShot;

        if (Array.isArray(data.players)) {
          const active = eng.getActivePlayers();
          data.players.forEach((snap, idx) => {
            const target =
              (snap.onlineId ? active.find((p) => p.onlineId === snap.onlineId) : undefined) ||
              active[idx];
            if (target) {
              target.x = snap.x;
              target.y = snap.y;
              target.vx = snap.vx;
              target.vy = snap.vy;
              target.isKicking = snap.isKicking;
              target.isSuperShot = !!snap.isSuperShot;
            }
          });
        }

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
        triggerGoal(scoringTeam);
        setGameState('goal');
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

    engine.keyboard.attach({
      onEscape: () => {
        if (engineRef.current?.gameState === 'playing' && engineRef.current?.settings.mode !== 'online_room') {
          handleTogglePause();
        } else if (engineRef.current?.gameState === 'paused') {
          handleResume();
        } else if (engineRef.current?.gameState === 'replay') {
          handleExitReplay();
        }
      },
      onMute: () => {
        handleToggleMute();
      },
      onMenuConfirm: () => {
        if (engineRef.current?.gameState === 'menu' && engineRef.current?.settings.mode !== 'online_room') {
          handleStartMatch(engineRef.current.settings);
        }
      },
      onResetInputs: () => {
        engineRef.current?.resetTouchInputs();
      },
      shouldBlockButtons: () => {
        const st = engineRef.current?.gameState;
        return st === 'playing' || st === 'countdown';
      },
    });

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

          // If Host in online match, broadcast authoritative sync state to all peers
          if (isOnline && isHost && engine.gameState === 'playing') {
            syncThrottleCounter++;
            if (syncThrottleCounter % 2 === 0) {
              onlineManager.sendSyncState({
                ball: { x: engine.ball.x, y: engine.ball.y, vx: engine.ball.vx, vy: engine.ball.vy, isSuperShot: engine.ball.isSuperShot },
                players: engine.getActivePlayers().map((p) => ({
                  onlineId: p.onlineId,
                  x: p.x,
                  y: p.y,
                  vx: p.vx,
                  vy: p.vy,
                  isKicking: p.isKicking,
                  isSuperShot: p.isSuperShot,
                })),
                scoreRed: engine.playerRed.score,
                scoreBlue: engine.playerBlue.score,
                timeRemaining: engine.timeRemaining,
                isOvertime: engine.isOvertime,
              });
            }
          }
        } else {
          // Guest in online match: read local input (supports WASD, Arrows, and Touch)
          const kb = engine.keyboard;
          const myOnlinePlayer = engine.getActivePlayers().find(
            (p) => p.onlineId === onlineManager.roomState.myId
          );
          const myTouch = myOnlinePlayer?.id === 'red' ? engine.touchRed : engine.touchBlue;

          let dx = 0;
          let dy = 0;
          if (kb.isDown('ArrowUp') || kb.isDown('KeyW') || kb.isDown('Numpad8')) dy -= 1;
          if (kb.isDown('ArrowDown') || kb.isDown('KeyS') || kb.isDown('Numpad5')) dy += 1;
          if (kb.isDown('ArrowLeft') || kb.isDown('KeyA') || kb.isDown('Numpad4')) dx -= 1;
          if (kb.isDown('ArrowRight') || kb.isDown('KeyD') || kb.isDown('Numpad6')) dx += 1;

          if (myTouch.x !== 0 || myTouch.y !== 0) {
            dx = myTouch.x;
            dy = myTouch.y;
          }

          const kick = kb.isJustPressed('KeyP') || kb.isDown('KeyP') || kb.isJustPressed('Space') || kb.isDown('Space') || myTouch.kick;
          const isSuper = !!myOnlinePlayer?.isSuperShot;

          kb.endFrame();
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
      engine.keyboard.detach();
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []); // Run ONCE on mount to ensure engine and canvas loop are never reset mid-game!

  // Actions
  const handleStartMatch = useCallback((newSettings: MatchSettings) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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
    if (newSettings.pitchColor) {
      setPitchColor(newSettings.pitchColor);
    }
    lastTimeRef.current = 0;
    if (!engineRef.current) return;
    engineRef.current.startMatch(newSettings);
    setTimeRemaining(newSettings.durationSeconds);
    setRedScore(0);
    setBlueScore(0);
    setIsOvertime(false);
    setLastScorer(null);
    setSetPieceBanner(null);
    setReplays([]);
    setGameState('countdown');
  }, []);

  const handleToggleCamera = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (rendererRef.current) {
      const nextMode = rendererRef.current.toggleCameraMode();
      setCameraMode(nextMode);
    }
  }, []);

  const handleToggleStadium = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (engineRef.current) {
      const current = engineRef.current.settings.stadiumType || 'olympic';
      const nextStadium: StadiumType =
        current === 'olympic'
          ? 'grand_stadium'
          : current === 'grand_stadium'
            ? 'classic'
            : 'olympic';
      engineRef.current.settings.stadiumType = nextStadium;
      setStadiumType(nextStadium);
      setSettings((prev) => ({ ...prev, stadiumType: nextStadium }));
      engineRef.current.initEntities();
      engineRef.current.resetToKickoff();
    }
  }, []);

  const handleChangePitchColor = useCallback((color: PitchColor) => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setPitchColor(color);
    setSettings((prev) => ({ ...prev, pitchColor: color }));
    if (engineRef.current) {
      engineRef.current.settings.pitchColor = color;
    }
  }, []);

  const handleTogglePitchColor = useCallback(() => {
    const nextColor: PitchColor = pitchColor === 'green' ? 'black' : 'green';
    handleChangePitchColor(nextColor);
  }, [pitchColor, handleChangePitchColor]);

  const handleTogglePause = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
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
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (!engineRef.current) return;
    lastTimeRef.current = 0;
    engineRef.current.gameState = 'playing';
    setGameState('playing');
  }, []);

  const handleRestart = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (!engineRef.current) return;
    lastTimeRef.current = 0;
    engineRef.current.startMatch();
    setTimeRemaining(engineRef.current.settings.durationSeconds);
    setRedScore(0);
    setBlueScore(0);
    setIsOvertime(false);
    setLastScorer(null);
    setSetPieceBanner(null);
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
    setSetPieceBanner(null);
    setGameState('menu');
  }, [settings.mode]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  const handleChangeSpeed = useCallback((speed: PlayerSpeedMultiplier) => {
    setSettings((prev) => ({ ...prev, playerSpeedMultiplier: speed }));
    if (engineRef.current) {
      engineRef.current.settings.playerSpeedMultiplier = speed;
    }
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
      className="relative w-screen h-screen overflow-hidden bg-[#0a0a0a] flex flex-col items-center justify-between"
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
          isMuted={isMuted}
          isPaused={gameState === 'paused'}
          isRedAi={isRedAi}
          isBlueAi={isBlueAi}
          homeClub={settings.homeClub || 'liverpool'}
          awayClub={settings.awayClub || 'ipswich'}
          isOnline={isOnline}
          roomCode={onlineRoomState.code}
          myTeam={myOnlineTeam}
          cameraMode={cameraMode}
          stadiumType={stadiumType}
          lastScorer={lastScorer}
          goalEventId={goalEventId}
          onTriggerGoalDemo={triggerGoal}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onRestart={handleRestart}
          onToggleCamera={handleToggleCamera}
          onToggleStadium={handleToggleStadium}
        />
      )}

      {/* SUPER SHOT NOTIFICATION POPUP */}
      {superShotNotification && (
        <div className="absolute top-20 z-25 pointer-events-none flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#111111]/95 border border-zinc-700 shadow-xl animate-in zoom-in-75 duration-150">
          <Zap className="text-white" size={14} />
          <span className="font-mono font-medium text-xs tracking-wide text-white">
            {superShotNotification.team === 'red'
              ? (CLUBS[settings.homeClub || 'liverpool'] || CLUBS.liverpool).name.toUpperCase()
              : (CLUBS[settings.awayClub || 'ipswich'] || CLUBS.ipswich).name.toUpperCase()}{' '}
            · SÜPER ŞUT (2X HIZ)
          </span>
        </div>
      )}

      {/* SET-PIECE NOTIFICATION POPUP (TAÇ, KORNER, AUT) */}
      {gameState === 'playing' && setPieceBanner && setPieceBanner.active && !superShotNotification && (
        <div className="absolute top-20 z-25 pointer-events-none flex items-center gap-2.5 px-3.5 py-1.5 rounded-md bg-[#111111]/95 border border-zinc-800 shadow-xl backdrop-blur-md">
          {(() => {
            const takingClub =
              setPieceBanner.team === 'red'
                ? CLUBS[settings.homeClub || 'liverpool'] || CLUBS.liverpool
                : CLUBS[settings.awayClub || 'ipswich'] || CLUBS.ipswich;
            const typeLabel =
              setPieceBanner.type === 'throw_in'
                ? 'TAÇ ATIŞI'
                : setPieceBanner.type === 'corner'
                  ? 'KORNER'
                  : 'AUT ATIŞI';
            return (
              <>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: takingClub.color }}
                />
                <img
                  src={takingClub.logo}
                  alt={takingClub.name}
                  className="w-4 h-4 object-contain"
                />
                <span className="font-mono font-semibold text-xs tracking-wider text-white">
                  {typeLabel} · {takingClub.name.toUpperCase()}
                </span>
                <span className="hidden sm:inline text-[11px] text-[#888888] border-l border-zinc-800 pl-2">
                  Dokunarak veya şut ile başlat
                </span>
              </>
            );
          })()}
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

      {/* BOTTOM HUD CONTROLS (Speed Slider, Camera, Stadium & Touch Controls) */}
      {gameState !== 'replay' && (
        <div className="absolute bottom-3 right-3 z-20 pointer-events-auto flex items-center gap-1.5">
          {/* Live Character Speed Slider Nav */}
          {(gameState === 'playing' || gameState === 'countdown' || gameState === 'paused') &&
            (!isOnline || onlineRoomState.isHost) && (
              <SpeedSliderNav
                value={settings.playerSpeedMultiplier || 1}
                onChange={handleChangeSpeed}
                variant="hud"
                blurOnInteract
              />
            )}

          {/* Quick Pitch Turf Switcher (Yeşil / Siyah) */}
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleTogglePitchColor}
            className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-[#111111]/90 hover:bg-zinc-900 text-[#888888] hover:text-white text-xs font-medium border border-zinc-800 hover:border-zinc-700 backdrop-blur-sm transition-colors whitespace-nowrap"
            title="Saha Çimi Rengini Değiştir (Yeşil / Siyah)"
          >
            <span
              className={`w-2.5 h-2.5 rounded-sm border border-white/40 shrink-0 ${
                pitchColor === 'green' ? 'bg-[#247d40]' : 'bg-[#161920]'
              }`}
            />
            <span className="hidden sm:inline">{pitchColor === 'green' ? 'Çim: Yeşil' : 'Çim: Siyah'}</span>
          </button>

          {/* Quick Stadium Switcher */}
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleToggleStadium}
            className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-md bg-[#111111]/90 hover:bg-zinc-900 text-[#888888] hover:text-white text-xs font-medium border border-zinc-800 hover:border-zinc-700 backdrop-blur-sm transition-colors whitespace-nowrap"
            title="Saha Boyutunu Değiştir (Olimpik / Grand / Klasik)"
          >
            <span>
              {stadiumType === 'olympic'
                ? 'Saha: Olimpik'
                : stadiumType === 'grand_stadium'
                  ? 'Saha: Grand'
                  : 'Saha: Klasik'}
            </span>
          </button>

          {/* Quick Camera Mode Switcher */}
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleToggleCamera}
            className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-[#111111]/90 hover:bg-zinc-900 text-[#888888] hover:text-white text-xs font-medium border border-zinc-800 hover:border-zinc-700 backdrop-blur-sm transition-colors whitespace-nowrap"
            title="Kamera Açısını Değiştir (Dinamik Takip / Tam Saha Görünümü)"
          >
            {cameraMode === 'dynamic' ? <Camera size={13} className="text-white" /> : <Maximize2 size={13} />}
            <span className="hidden sm:inline">{cameraMode === 'dynamic' ? 'Kamera: Dinamik' : 'Kamera: Tam Saha'}</span>
          </button>

          {/* Touch Controls Toggle */}
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowTouchControls((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-[#111111]/90 hover:bg-zinc-900 text-[#888888] hover:text-white text-xs font-medium border border-zinc-800 hover:border-zinc-700 backdrop-blur-sm transition-colors whitespace-nowrap"
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
          homeClub={settings.homeClub || 'liverpool'}
          awayClub={settings.awayClub || 'ipswich'}
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
          onTestGoal={() => triggerGoal(Math.random() > 0.5 ? 'red' : 'blue')}
          playerSpeedMultiplier={settings.playerSpeedMultiplier || 1}
          onChangeSpeed={handleChangeSpeed}
          pitchColor={pitchColor}
          onChangePitchColor={handleChangePitchColor}
        />
      )}

      {/* GAME OVER MODAL */}
      {gameState === 'gameover' && matchStats && (
        <GameOverModal
          stats={matchStats}
          hasReplays={replays.length > 0}
          homeClub={settings.homeClub || 'liverpool'}
          awayClub={settings.awayClub || 'ipswich'}
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
          homeClub={settings.homeClub || 'liverpool'}
          awayClub={settings.awayClub || 'ipswich'}
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
