import { Ball, CLUBS, ClubId, GameState, GoalReplay, MatchSettings, Particle, PitchConfig, Player, ReplayFrame, SetPieceState, SetPieceType, StadiumType, TeamId } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { KeyboardManager } from '../input/keyboard';

// Stadium pitch coordinate configurations
export const STADIUM_CONFIGS: Record<StadiumType, { pitch: PitchConfig; margin: { x: number; y: number } }> = {
  // Klasik Haxball Arenası (Hızlı & Çevik Arcade)
  classic: {
    pitch: {
      width: 1100,
      height: 660,
      goalWidth: 160,    // height of goal mouth
      goalDepth: 64,     // depth of goal net box
      lineWidth: 4,
      postRadius: 9,
      cornerRadius: 35,
    },
    margin: {
      x: 80,
      y: 60,
    },
  },
  // Devasa Grand Stadyum (Geniş Profesyonel Stadyum & Tribünler)
  grand_stadium: {
    pitch: {
      width: 1950,
      height: 1150,
      goalWidth: 250,    // scaled goal mouth
      goalDepth: 95,     // deeper professional goal net
      lineWidth: 5.5,
      postRadius: 13,
      cornerRadius: 55,
    },
    margin: {
      x: 140,
      y: 110,
    },
  },
  // Olimpik Stad (Devasa Atletizm Pisti & Uluslararası Olimpik Kompleks)
  olympic: {
    pitch: {
      width: 2550,
      height: 1440,
      goalWidth: 320,    // extra-wide Olympic goal mouth
      goalDepth: 110,    // deep net
      lineWidth: 6.5,
      postRadius: 15,
      cornerRadius: 70,
    },
    margin: {
      x: 180, // spacious surround for 8-lane Tartan track & flame cauldron
      y: 130,
    },
  },
};

// Default backwards compatibility
export const PITCH_CONFIG: PitchConfig = STADIUM_CONFIGS.classic.pitch;
export const PITCH_MARGIN = STADIUM_CONFIGS.classic.margin;

export class GameEngine {
  public playerRed!: Player;
  public playerBlue!: Player;
  public playerRed2?: Player;
  public playerBlue2?: Player;
  public ball!: Ball;
  public particles: Particle[] = [];
  public gameState: GameState = 'menu';
  public timeRemaining: number = 120; // seconds
  public matchDuration: number = 120;
  public settings: MatchSettings;
  public cameraShake: number = 0;
  public lastScorer: TeamId | null = null;
  public countdownNumber: number = 3;
  private countdownTimer: number = 0;
  public isOvertime: boolean = false;
  public totalMatchTime: number = 0;

  // Set-Piece State (Taç, Korner, Aut)
  public setPiece: SetPieceState = {
    active: false,
    type: 'throw_in',
    team: 'red',
    spotX: 0,
    spotY: 0,
    timer: 0,
    barrierRadius: 120,
  };
  private outOfBoundsGraceTimer: number = 0;

  // Match set-piece counters
  public redCorners: number = 0;
  public blueCorners: number = 0;
  public redThrowIns: number = 0;
  public blueThrowIns: number = 0;

  // Independent Set-based keyboard state manager
  public readonly keyboard = new KeyboardManager();

  // Touch virtual inputs
  public touchRed = { x: 0, y: 0, kick: false };
  public touchBlue = { x: 0, y: 0, kick: false };

  // Replay Recording System
  public frameBuffer: ReplayFrame[] = [];
  public goalReplays: GoalReplay[] = [];
  public activeReplayIndex: number = -1;
  public activeReplayFrame: number = 0;
  public isReplayPlaying: boolean = true;
  public replaySpeed: number = 0.6; // slow-mo by default for drama

  // Callbacks
  public onScoreChange?: (redScore: number, blueScore: number) => void;
  public onStateChange?: (state: GameState) => void;
  public onTimeUpdate?: (time: number) => void;
  public onGoalScored?: (team: TeamId) => void;
  public onMatchEnd?: () => void;
  public onSuperShotTriggered?: (team: TeamId) => void;
  public onSetPieceChange?: (setPiece: SetPieceState) => void;

  public get pitchConfig(): PitchConfig {
    const type = this.settings.stadiumType || 'classic';
    return STADIUM_CONFIGS[type]?.pitch || STADIUM_CONFIGS.classic.pitch;
  }

  public get pitchMargin(): { x: number; y: number } {
    const type = this.settings.stadiumType || 'classic';
    return STADIUM_CONFIGS[type]?.margin || STADIUM_CONFIGS.classic.margin;
  }

  public getActivePlayers(): Player[] {
    const players: Player[] = [this.playerRed, this.playerBlue];
    if (this.playerRed2) players.push(this.playerRed2);
    if (this.playerBlue2) players.push(this.playerBlue2);
    return players;
  }

  constructor(settings: MatchSettings) {
    this.settings = settings;
    this.matchDuration = settings.durationSeconds;
    this.timeRemaining = settings.durationSeconds;
    this.initEntities();
  }

  public initEntities() {
    const pitch = this.pitchConfig;
    const margin = this.pitchMargin;
    const centerY = pitch.height / 2;
    const pitchLeft = margin.x;
    const pitchRight = pitch.width - margin.x;

    const isOlympic = this.settings.stadiumType === 'olympic';
    const isGrand = this.settings.stadiumType === 'grand_stadium';
    const playerRadius = isOlympic ? 31 : isGrand ? 28 : 24;
    const ballRadius = isOlympic ? 16 : isGrand ? 14.5 : 12.5;

    const format = this.settings.matchFormat || '1v1';
    const hasRed2 = format === '2v1' || format === '2v2';
    const hasBlue2 = format === '2v2';

    const ySpread = isOlympic ? 175 : isGrand ? 130 : 85;

    const homeClub = CLUBS[this.settings.homeClub || 'liverpool'] || CLUBS.liverpool;
    const awayClub = CLUBS[this.settings.awayClub || 'ipswich'] || CLUBS.ipswich;

    // Home Club 1 (Captain #10 / #7)
    this.playerRed = {
      id: 'red',
      name: hasRed2 ? `${homeClub.name} 1 (WASD)` : `${homeClub.name} (${homeClub.code})`,
      x: pitchLeft + (pitchRight - pitchLeft) * 0.25,
      y: hasRed2 ? centerY - ySpread : centerY,
      vx: 0,
      vy: 0,
      radius: playerRadius,
      color: homeClub.color,
      accentColor: homeClub.accentColor,
      glowColor: homeClub.glowColor,
      number: 10,
      score: 0,
      isAi: this.settings.mode === '1player_vs_ai' && this.settings.userTeam === 'blue',
      kickCooldown: 0,
      isKicking: false,
      kickCharge: 0,
      shots: 0,
      shotsOnTarget: 0,
      possessionFrames: 0,
      tapTimestamps: [],
      isSuperShot: false,
      superShotActiveTimer: 0,
    };

    // Home Club 2 (#9 Striker) if 2v1 or 2v2
    if (hasRed2) {
      const isRed2Human = this.settings.hostLocalPlayers === 2;
      this.playerRed2 = {
        id: 'red',
        name: isRed2Human ? `${homeClub.name} 2 (Yön+P)` : `${homeClub.name} 2 (AI)`,
        x: pitchLeft + (pitchRight - pitchLeft) * 0.22,
        y: centerY + ySpread,
        vx: 0,
        vy: 0,
        radius: playerRadius,
        color: homeClub.color,
        accentColor: homeClub.accentColor,
        glowColor: homeClub.glowColor,
        number: 9,
        score: 0,
        isAi: !isRed2Human,
        kickCooldown: 0,
        isKicking: false,
        kickCharge: 0,
        shots: 0,
        shotsOnTarget: 0,
        possessionFrames: 0,
        tapTimestamps: [],
        isSuperShot: false,
        superShotActiveTimer: 0,
      };
    } else {
      this.playerRed2 = undefined;
    }

    // Away Club 1 (Captain #7)
    this.playerBlue = {
      id: 'blue',
      name: hasBlue2 ? `${awayClub.name} 1` : `${awayClub.name} (${awayClub.code})`,
      x: pitchLeft + (pitchRight - pitchLeft) * 0.75,
      y: hasBlue2 ? centerY - ySpread : centerY,
      vx: 0,
      vy: 0,
      radius: playerRadius,
      color: awayClub.color,
      accentColor: awayClub.accentColor,
      glowColor: awayClub.glowColor,
      number: 7,
      score: 0,
      isAi: this.settings.mode === '1player_vs_ai'
        ? this.settings.userTeam === 'red'
        : (this.settings.hostLocalPlayers === 2 && this.settings.mode === '2player'),
      kickCooldown: 0,
      isKicking: false,
      kickCharge: 0,
      shots: 0,
      shotsOnTarget: 0,
      possessionFrames: 0,
      tapTimestamps: [],
      isSuperShot: false,
      superShotActiveTimer: 0,
    };

    // Away Club 2 (#9 Striker) if 2v2
    if (hasBlue2) {
      const isBlue2Human = this.settings.guestLocalPlayers === 2;
      this.playerBlue2 = {
        id: 'blue',
        name: isBlue2Human ? `${awayClub.name} 2` : `${awayClub.name} 2 (AI)`,
        x: pitchLeft + (pitchRight - pitchLeft) * 0.78,
        y: centerY + ySpread,
        vx: 0,
        vy: 0,
        radius: playerRadius,
        color: awayClub.color,
        accentColor: awayClub.accentColor,
        glowColor: awayClub.glowColor,
        number: 9,
        score: 0,
        isAi: !isBlue2Human,
        kickCooldown: 0,
        isKicking: false,
        kickCharge: 0,
        shots: 0,
        shotsOnTarget: 0,
        possessionFrames: 0,
        tapTimestamps: [],
        isSuperShot: false,
        superShotActiveTimer: 0,
      };
    } else {
      this.playerBlue2 = undefined;
    }

    this.ball = {
      x: pitch.width / 2,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: ballRadius,
      rotation: 0,
      lastTouch: null,
      speedTrail: [],
      isSuperShot: false,
    };
  }

  public resetToKickoff(scoringTeam?: TeamId) {
    const pitch = this.pitchConfig;
    const margin = this.pitchMargin;
    const centerY = pitch.height / 2;
    const pitchLeft = margin.x;
    const pitchRight = pitch.width - margin.x;

    const isOlympic = this.settings.stadiumType === 'olympic';
    const isGrand = this.settings.stadiumType === 'grand_stadium';
    const ySpread = isOlympic ? 175 : isGrand ? 130 : 85;

    this.ball.x = pitch.width / 2;
    this.ball.y = centerY;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.rotation = 0;
    this.ball.speedTrail = [];
    this.ball.isSuperShot = false;
    this.outOfBoundsGraceTimer = 0;
    if (this.setPiece.active) {
      this.setPiece.active = false;
      this.onSetPieceChange?.({ ...this.setPiece });
    }

    const hasRed2 = !!this.playerRed2;
    const hasBlue2 = !!this.playerBlue2;

    this.playerRed.x = pitchLeft + (pitchRight - pitchLeft) * 0.25;
    this.playerRed.y = hasRed2 ? centerY - ySpread : centerY;
    this.playerRed.vx = 0;
    this.playerRed.vy = 0;
    this.playerRed.isKicking = false;
    this.playerRed.kickCooldown = 0;
    this.playerRed.isSuperShot = false;
    this.playerRed.superShotActiveTimer = 0;
    this.playerRed.tapTimestamps = [];

    if (this.playerRed2) {
      this.playerRed2.x = pitchLeft + (pitchRight - pitchLeft) * 0.22;
      this.playerRed2.y = centerY + ySpread;
      this.playerRed2.vx = 0;
      this.playerRed2.vy = 0;
      this.playerRed2.isKicking = false;
      this.playerRed2.kickCooldown = 0;
      this.playerRed2.isSuperShot = false;
      this.playerRed2.superShotActiveTimer = 0;
      this.playerRed2.tapTimestamps = [];
    }

    this.playerBlue.x = pitchLeft + (pitchRight - pitchLeft) * 0.75;
    this.playerBlue.y = hasBlue2 ? centerY - ySpread : centerY;
    this.playerBlue.vx = 0;
    this.playerBlue.vy = 0;
    this.playerBlue.isKicking = false;
    this.playerBlue.kickCooldown = 0;
    this.playerBlue.isSuperShot = false;
    this.playerBlue.superShotActiveTimer = 0;
    this.playerBlue.tapTimestamps = [];

    if (this.playerBlue2) {
      this.playerBlue2.x = pitchLeft + (pitchRight - pitchLeft) * 0.78;
      this.playerBlue2.y = centerY + ySpread;
      this.playerBlue2.vx = 0;
      this.playerBlue2.vy = 0;
      this.playerBlue2.isKicking = false;
      this.playerBlue2.kickCooldown = 0;
      this.playerBlue2.isSuperShot = false;
      this.playerBlue2.superShotActiveTimer = 0;
      this.playerBlue2.tapTimestamps = [];
    }
    this.playerBlue.kickCooldown = 0;
    this.playerBlue.isSuperShot = false;
    this.playerBlue.superShotActiveTimer = 0;
    this.playerBlue.tapTimestamps = [];

    // Start 3 second kickoff countdown
    this.gameState = 'countdown';
    this.countdownNumber = 3;
    this.countdownTimer = 1.0;
    soundManager.playCountdown(false);
    this.onStateChange?.('countdown');
  }

  public startMatch(settings?: MatchSettings) {
    if (settings) {
      this.settings = settings;
      this.matchDuration = settings.durationSeconds;
      this.timeRemaining = settings.durationSeconds;
    }
    this.initEntities();
    this.playerRed.score = 0;
    this.playerBlue.score = 0;
    this.playerRed.shots = 0;
    this.playerBlue.shots = 0;
    this.playerRed.possessionFrames = 0;
    this.playerBlue.possessionFrames = 0;
    this.redCorners = 0;
    this.blueCorners = 0;
    this.redThrowIns = 0;
    this.blueThrowIns = 0;
    this.isOvertime = false;
    this.totalMatchTime = 0;
    this.particles = [];
    this.frameBuffer = [];
    this.goalReplays = [];

    this.playerRed.isAi = this.settings.mode === '1player_vs_ai' && this.settings.userTeam === 'blue';
    this.playerBlue.isAi = this.settings.mode === '1player_vs_ai' && this.settings.userTeam === 'red';

    this.resetToKickoff();
  }

  public update(rawDt: number) {
    // If in replay mode, step through replay frames
    if (this.gameState === 'replay') {
      this.updateReplay(rawDt);
      return;
    }

    // Clamp delta time to avoid physics tunneling
    const dt = Math.min(rawDt, 0.04);

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 25);
    }

    // Update particles
    this.updateParticles(dt);

    const activePlayers = this.getActivePlayers();

    // Update super shot timers
    for (const p of activePlayers) {
      if (p.superShotActiveTimer > 0) {
        p.superShotActiveTimer = Math.max(0, p.superShotActiveTimer - dt);
        if (p.superShotActiveTimer <= 0) {
          p.isSuperShot = false;
        }
      }
    }

    if (this.gameState === 'countdown') {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.countdownNumber--;
        if (this.countdownNumber > 0) {
          this.countdownTimer = 0.85;
          soundManager.playCountdown(false);
        } else {
          // Play whistle and start playing!
          soundManager.playCountdown(true);
          soundManager.playWhistle(false);
          this.gameState = 'playing';
          this.onStateChange?.('playing');
        }
      }
      return;
    }

    if (this.gameState !== 'playing' && this.gameState !== 'goal') {
      return;
    }

    // Record replay frames during playing & goal celebration
    this.recordFrame();

    if (this.gameState !== 'playing') {
      return;
    }

    // Update match timer
    this.totalMatchTime += dt;
    if (this.timeRemaining > 0) {
      this.timeRemaining = Math.max(0, this.timeRemaining - dt);
      this.onTimeUpdate?.(this.timeRemaining);

      if (this.timeRemaining === 0) {
        // Time expired! Check if tied
        if (this.playerRed.score === this.playerBlue.score && this.settings.goldenGoalOnTie) {
          this.isOvertime = true;
        } else {
          this.endMatch();
          return;
        }
      }
    }

    // Update set-piece & out-of-bounds grace timers
    if (this.outOfBoundsGraceTimer > 0) {
      this.outOfBoundsGraceTimer = Math.max(0, this.outOfBoundsGraceTimer - dt);
    }
    if (this.setPiece.active) {
      this.setPiece.timer -= dt;
      // Keep ball anchored cleanly at set-piece spot until played
      this.ball.x = this.setPiece.spotX;
      this.ball.y = this.setPiece.spotY;
      this.ball.vx = 0;
      this.ball.vy = 0;
      if (this.setPiece.timer <= 0) {
        this.clearSetPiece();
      }
    }

    // Handle inputs
    this.handleInputs(dt);

    // AI logic for any active bot player
    for (const p of activePlayers) {
      if (p.isAi) {
        const opponent = p.id === 'red' ? this.playerBlue : this.playerRed;
        this.updateAI(p, opponent, dt);
      }
    }

    // Sub-stepped physics for smooth, jitter-free Haxball contact pushing
    const SUBSTEPS = 3;
    const subDt = dt / SUBSTEPS;

    for (let step = 0; step < SUBSTEPS; step++) {
      // Physics step for all active players
      for (const p of activePlayers) {
        this.updatePlayerPhysics(p, subDt);
      }

      // Player vs Player collision (all active pairs)
      this.resolvePlayerPlayerCollision();

      // Ball physics (damping & rolling friction)
      if (!this.setPiece.active) {
        this.updateBallPhysics(subDt);
      }

      // Player vs Ball collision (0.7x Haxball dribbling, no sticky magnet)
      for (const p of activePlayers) {
        this.resolvePlayerBallCollision(p);
      }

      // Check boundary collisions & Taç / Korner / Aut
      if (!this.setPiece.active) {
        this.resolvePitchBoundaries();
      }
    }

    // Track possession
    this.trackPossession();

    // Check goals
    this.checkGoalCondition();

    // Clear just-pressed keys
    this.keyboard.endFrame();
  }

  // Record rolling buffer of last 220 frames (~3.6 seconds)
  private recordFrame() {
    this.frameBuffer.push({
      ball: {
        x: this.ball.x,
        y: this.ball.y,
        vx: this.ball.vx,
        vy: this.ball.vy,
        rotation: this.ball.rotation,
        isSuperShot: this.ball.isSuperShot,
      },
      playerRed: {
        x: this.playerRed.x,
        y: this.playerRed.y,
        vx: this.playerRed.vx,
        vy: this.playerRed.vy,
        isKicking: this.playerRed.isKicking,
        isSuperShot: this.playerRed.isSuperShot,
      },
      playerBlue: {
        x: this.playerBlue.x,
        y: this.playerBlue.y,
        vx: this.playerBlue.vx,
        vy: this.playerBlue.vy,
        isKicking: this.playerBlue.isKicking,
        isSuperShot: this.playerBlue.isSuperShot,
      },
      playerRed2: this.playerRed2 ? {
        x: this.playerRed2.x,
        y: this.playerRed2.y,
        vx: this.playerRed2.vx,
        vy: this.playerRed2.vy,
        isKicking: this.playerRed2.isKicking,
        isSuperShot: this.playerRed2.isSuperShot,
      } : undefined,
      playerBlue2: this.playerBlue2 ? {
        x: this.playerBlue2.x,
        y: this.playerBlue2.y,
        vx: this.playerBlue2.vx,
        vy: this.playerBlue2.vy,
        isKicking: this.playerBlue2.isKicking,
        isSuperShot: this.playerBlue2.isSuperShot,
      } : undefined,
    });

    if (this.frameBuffer.length > 240) {
      this.frameBuffer.shift();
    }
  }

  // Replay playback loop
  private replayAccumulator = 0;
  private updateReplay(dt: number) {
    if (!this.isReplayPlaying || this.activeReplayIndex < 0 || this.activeReplayIndex >= this.goalReplays.length) {
      return;
    }

    const replay = this.goalReplays[this.activeReplayIndex];
    if (!replay || replay.frames.length === 0) return;

    this.replayAccumulator += dt * this.replaySpeed * 60;
    while (this.replayAccumulator >= 1) {
      this.replayAccumulator -= 1;
      this.activeReplayFrame++;
      if (this.activeReplayFrame >= replay.frames.length) {
        // Loop replay
        this.activeReplayFrame = 0;
      }
    }

    // Apply frame state to entities for renderer
    const frame = replay.frames[this.activeReplayFrame];
    if (frame) {
      this.ball.x = frame.ball.x;
      this.ball.y = frame.ball.y;
      this.ball.vx = frame.ball.vx;
      this.ball.vy = frame.ball.vy;
      this.ball.rotation = frame.ball.rotation;
      this.ball.isSuperShot = !!frame.ball.isSuperShot;

      this.playerRed.x = frame.playerRed.x;
      this.playerRed.y = frame.playerRed.y;
      this.playerRed.vx = frame.playerRed.vx;
      this.playerRed.vy = frame.playerRed.vy;
      this.playerRed.isKicking = frame.playerRed.isKicking;
      this.playerRed.isSuperShot = !!frame.playerRed.isSuperShot;

      this.playerBlue.x = frame.playerBlue.x;
      this.playerBlue.y = frame.playerBlue.y;
      this.playerBlue.vx = frame.playerBlue.vx;
      this.playerBlue.vy = frame.playerBlue.vy;
      this.playerBlue.isKicking = frame.playerBlue.isKicking;
      this.playerBlue.isSuperShot = !!frame.playerBlue.isSuperShot;

      if (this.playerRed2 && frame.playerRed2) {
        this.playerRed2.x = frame.playerRed2.x;
        this.playerRed2.y = frame.playerRed2.y;
        this.playerRed2.vx = frame.playerRed2.vx;
        this.playerRed2.vy = frame.playerRed2.vy;
        this.playerRed2.isKicking = frame.playerRed2.isKicking;
        this.playerRed2.isSuperShot = !!frame.playerRed2.isSuperShot;
      }

      if (this.playerBlue2 && frame.playerBlue2) {
        this.playerBlue2.x = frame.playerBlue2.x;
        this.playerBlue2.y = frame.playerBlue2.y;
        this.playerBlue2.vx = frame.playerBlue2.vx;
        this.playerBlue2.vy = frame.playerBlue2.vy;
        this.playerBlue2.isKicking = frame.playerBlue2.isKicking;
        this.playerBlue2.isSuperShot = !!frame.playerBlue2.isSuperShot;
      }
    }
  }

  public setReplayFrame(index: number) {
    if (this.activeReplayIndex < 0 || this.activeReplayIndex >= this.goalReplays.length) return;
    const replay = this.goalReplays[this.activeReplayIndex];
    if (!replay) return;
    this.activeReplayFrame = Math.max(0, Math.min(replay.frames.length - 1, index));
  }

  public selectReplay(index: number) {
    if (index >= 0 && index < this.goalReplays.length) {
      this.activeReplayIndex = index;
      this.activeReplayFrame = 0;
      this.isReplayPlaying = true;
    }
  }

  private handleInputs(dt: number) {
    const kb = this.keyboard;

    // Red 1 (Player 1 on single PC / Host): strictly WASD and Space
    if (!this.playerRed.isAi) {
      const isSoloUser = this.settings.mode === '1player_vs_ai' && this.settings.userTeam === 'red';

      let dx = 0;
      let dy = 0;
      if (kb.isDown('KeyW')) dy -= 1;
      if (kb.isDown('KeyS')) dy += 1;
      if (kb.isDown('KeyA')) dx -= 1;
      if (kb.isDown('KeyD')) dx += 1;

      // In Solo AI mode, also allow Arrow keys for Red if player prefers them
      if (isSoloUser) {
        if (kb.isDown('ArrowUp') || kb.isDown('Numpad8')) dy -= 1;
        if (kb.isDown('ArrowDown') || kb.isDown('Numpad5')) dy += 1;
        if (kb.isDown('ArrowLeft') || kb.isDown('Numpad4')) dx -= 1;
        if (kb.isDown('ArrowRight') || kb.isDown('Numpad6')) dx += 1;
      }

      // Touch fallback for Red
      if (this.touchRed.x !== 0 || this.touchRed.y !== 0) {
        dx = this.touchRed.x;
        dy = this.touchRed.y;
      }

      this.applyPlayerMovement(this.playerRed, dx, dy, dt);

      // Red Kick: Space (or KeyP in solo mode) — completely independent from movement keys
      const redKickPressed = kb.isJustPressed('Space') || (isSoloUser && kb.isJustPressed('KeyP'));
      if (redKickPressed) {
        this.registerKickTap(this.playerRed);
      }
      const redKickHeld = kb.isDown('Space') || (isSoloUser && kb.isDown('KeyP')) || this.touchRed.kick;
      if ((redKickPressed || redKickHeld) && this.playerRed.kickCooldown <= 0) {
        this.attemptKick(this.playerRed, dx, dy);
      }
    }

    // Red 2 (Player 2 on same PC when playing 2v1 or 2v2 on host/local): strictly Arrow keys + KeyP
    if (this.playerRed2 && !this.playerRed2.isAi) {
      let dx = 0;
      let dy = 0;
      if (kb.isDown('ArrowUp') || kb.isDown('Numpad8') || kb.isDown('KeyI')) dy -= 1;
      if (kb.isDown('ArrowDown') || kb.isDown('Numpad5') || kb.isDown('Numpad2') || kb.isDown('KeyK')) dy += 1;
      if (kb.isDown('ArrowLeft') || kb.isDown('Numpad4') || kb.isDown('KeyJ')) dx -= 1;
      if (kb.isDown('ArrowRight') || kb.isDown('Numpad6') || kb.isDown('KeyL')) dx += 1;

      this.applyPlayerMovement(this.playerRed2, dx, dy, dt);

      const red2KickPressed = kb.isJustPressed('KeyP');
      if (red2KickPressed) {
        this.registerKickTap(this.playerRed2);
      }
      const red2KickHeld = kb.isDown('KeyP');
      if ((red2KickPressed || red2KickHeld) && this.playerRed2.kickCooldown <= 0) {
        this.attemptKick(this.playerRed2, dx, dy);
      }
    }

    // Blue 1 (Away): If human
    if (!this.playerBlue.isAi) {
      const isSoloUser = this.settings.mode === '1player_vs_ai' && this.settings.userTeam === 'blue';
      const isBlueLocalP2 = !this.playerRed2 && this.settings.mode === '2player';

      let dx = 0;
      let dy = 0;

      if (isSoloUser) {
        // Solo player controlling Blue can use either WASD or Arrows!
        if (kb.isDown('KeyW') || kb.isDown('ArrowUp') || kb.isDown('Numpad8')) dy -= 1;
        if (kb.isDown('KeyS') || kb.isDown('ArrowDown') || kb.isDown('Numpad5')) dy += 1;
        if (kb.isDown('KeyA') || kb.isDown('ArrowLeft') || kb.isDown('Numpad4')) dx -= 1;
        if (kb.isDown('KeyD') || kb.isDown('ArrowRight') || kb.isDown('Numpad6')) dx += 1;
      } else if (isBlueLocalP2) {
        if (kb.isDown('ArrowUp') || kb.isDown('Numpad8') || kb.isDown('KeyI')) dy -= 1;
        if (kb.isDown('ArrowDown') || kb.isDown('Numpad5') || kb.isDown('Numpad2') || kb.isDown('KeyK')) dy += 1;
        if (kb.isDown('ArrowLeft') || kb.isDown('Numpad4') || kb.isDown('KeyJ')) dx -= 1;
        if (kb.isDown('ArrowRight') || kb.isDown('Numpad6') || kb.isDown('KeyL')) dx += 1;
      }

      // Touch / Remote fallback for Blue
      if (this.touchBlue.x !== 0 || this.touchBlue.y !== 0) {
        dx = this.touchBlue.x;
        dy = this.touchBlue.y;
      }

      this.applyPlayerMovement(this.playerBlue, dx, dy, dt);

      // Blue Kick — completely independent from movement keys
      const blueKickPressed = isSoloUser
        ? (kb.isJustPressed('Space') || kb.isJustPressed('KeyP'))
        : (isBlueLocalP2 && kb.isJustPressed('KeyP'));

      const blueKickHeld = isSoloUser
        ? (kb.isDown('Space') || kb.isDown('KeyP') || this.touchBlue.kick)
        : ((isBlueLocalP2 && kb.isDown('KeyP')) || this.touchBlue.kick);

      if (blueKickPressed) {
        this.registerKickTap(this.playerBlue);
      }
      if ((blueKickPressed || blueKickHeld) && this.playerBlue.kickCooldown <= 0) {
        this.attemptKick(this.playerBlue, dx, dy);
      }
    }
  }

  // Triple-Tap Super Shot Handler
  public registerKickTap(player: Player) {
    const now = performance.now();
    // Keep taps from the last 700ms
    player.tapTimestamps = player.tapTimestamps.filter((t) => now - t < 700);
    player.tapTimestamps.push(now);

    if (player.tapTimestamps.length >= 3) {
      // 3 Kez üst üste basıldı: SÜPER ŞUT AKTİF!
      player.tapTimestamps = [];
      player.isSuperShot = true;
      player.superShotActiveTimer = 0.9; // remains charged for 0.9s

      soundManager.playSuperShot();
      this.cameraShake = Math.max(this.cameraShake, 10);
      this.spawnSuperChargeSparks(player.x, player.y, player.color);
      this.onSuperShotTriggered?.(player.id);
    }
  }

  public triggerTouchKick(team: TeamId) {
    const player = team === 'red' ? this.playerRed : this.playerBlue;
    this.registerKickTap(player);
    if (team === 'red') {
      this.touchRed.kick = true;
    } else {
      this.touchBlue.kick = true;
    }
    if (player.kickCooldown <= 0) {
      this.attemptKick(player);
    }
  }

  public releaseTouchKick(team: TeamId) {
    if (team === 'red') {
      this.touchRed.kick = false;
    } else {
      this.touchBlue.kick = false;
    }
  }

  public resetTouchInputs() {
    this.touchRed.x = 0;
    this.touchRed.y = 0;
    this.touchRed.kick = false;
    this.touchBlue.x = 0;
    this.touchBlue.y = 0;
    this.touchBlue.kick = false;
  }

  public applyPlayerMovement(player: Player, dx: number, dy: number, dt: number) {
    const isOlympic = this.settings.stadiumType === 'olympic';
    const isGrand = this.settings.stadiumType === 'grand_stadium';
    const speedMult = this.settings.playerSpeedMultiplier || 1;
    const ACCEL = (isOlympic ? 5700 : isGrand ? 4950 : 4050) * speedMult;
    const MAX_SPEED = (isOlympic ? 435 : isGrand ? 390 : 330) * speedMult;

    // Rapid counter-braking (Active Braking) for ultra-sharp instant turn response
    if (dx !== 0) {
      if ((dx > 0 && player.vx < -15) || (dx < 0 && player.vx > 15)) {
        player.vx *= 0.55; // instant braking impulse
      }
    }
    if (dy !== 0) {
      if ((dy > 0 && player.vy < -15) || (dy < 0 && player.vy > 15)) {
        player.vy *= 0.55; // instant braking impulse
      }
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const ndx = dx / len;
      const ndy = dy / len;

      player.vx += ndx * ACCEL * dt;
      player.vy += ndy * ACCEL * dt;

      // Cap speed
      const curSpeed = Math.hypot(player.vx, player.vy);
      if (curSpeed > MAX_SPEED) {
        player.vx = (player.vx / curSpeed) * MAX_SPEED;
        player.vy = (player.vy / curSpeed) * MAX_SPEED;
      }

      // Add gentle grass particles when running fast
      if (curSpeed > 150 && Math.random() < 0.25) {
        this.spawnGrassParticle(player.x, player.y + player.radius * 0.6);
      }
    }
  }

  public attemptKick(player: Player, inputDx = 0, inputDy = 0) {
    player.kickCooldown = 0.22; // Quick, responsive cooldown
    player.isKicking = true;

    // Check distance to ball
    const dist = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
    const kickRange = player.radius + this.ball.radius + 18;

    if (dist <= kickRange) {
      // Opponents cannot kick the ball while a set piece belongs to the other team
      if (this.setPiece.active && player.id !== this.setPiece.team) {
        return;
      }

      // If taking a set piece, put ball back into live play!
      const wasSetPiece = this.setPiece.active;
      if (wasSetPiece) {
        this.clearSetPiece();
      }

      // Calculate unit direction from player to ball
      let dirX = (this.ball.x - player.x) / (dist || 1);
      let dirY = (this.ball.y - player.y) / (dist || 1);

      // Blend directional input so simultaneous WASD/Arrow + Shoot steers the shot responsively
      const inputLen = Math.hypot(inputDx, inputDy);
      if (inputLen > 0.01) {
        const idx = inputDx / inputLen;
        const idy = inputDy / inputLen;
        if (dirX * idx + dirY * idy > -0.2) {
          dirX = dirX * 0.72 + idx * 0.28;
          dirY = dirY * 0.72 + idy * 0.28;
          const n = Math.hypot(dirX, dirY) || 1;
          dirX /= n;
          dirY /= n;
        }
      }

      const pitch = this.pitchConfig;
      const margin = this.pitchMargin;

      // On corner or throw-in, nudge kick cleanly inward toward the pitch/goal area
      if (wasSetPiece) {
        const pitchCenterX = pitch.width / 2;
        const pitchCenterY = pitch.height / 2;
        const intoX = pitchCenterX - this.ball.x;
        const intoY = pitchCenterY - this.ball.y;
        const intoDist = Math.hypot(intoX, intoY) || 1;
        if (dirX * intoX + dirY * intoY < 0.1) {
          dirX = dirX * 0.4 + (intoX / intoDist) * 0.6;
          dirY = dirY * 0.4 + (intoY / intoDist) * 0.6;
          const n = Math.hypot(dirX, dirY) || 1;
          dirX /= n;
          dirY /= n;
        }
      }

      // Add directional bias towards target goal if facing forward
      const targetGoalX = player.id === 'red' ? pitch.width - margin.x : margin.x;
      const targetGoalY = pitch.height / 2;
      const toGoalX = targetGoalX - this.ball.x;
      const toGoalY = targetGoalY - this.ball.y;
      const toGoalDist = Math.hypot(toGoalX, toGoalY);

      // Slight homing curve towards goal if kicked forwards
      if ((player.id === 'red' && dirX > 0) || (player.id === 'blue' && dirX < 0)) {
        dirX = dirX * 0.75 + (toGoalX / toGoalDist) * 0.25;
        dirY = dirY * 0.75 + (toGoalY / toGoalDist) * 0.25;
        const norm = Math.hypot(dirX, dirY);
        dirX /= norm;
        dirY /= norm;
      }

      // 3 KERE BASILDIĞINDA: SÜPER ŞUT 2X HIZ
      const isSuper = player.isSuperShot;
      const isOlympic = this.settings.stadiumType === 'olympic';
      const isGrand = this.settings.stadiumType === 'grand_stadium';
      const basePower = isOlympic ? 1220 : isGrand ? 1040 : 860;
      const KICK_POWER = isSuper ? basePower * 2.0 : basePower; // 2X SPEED!

      this.ball.vx = dirX * KICK_POWER + player.vx * 0.25;
      this.ball.vy = dirY * KICK_POWER + player.vy * 0.25;
      this.ball.lastTouch = player.id;
      this.ball.isSuperShot = isSuper;

      // Stats
      player.shots++;
      if ((player.id === 'red' && dirX > 0.4) || (player.id === 'blue' && dirX < -0.4)) {
        player.shotsOnTarget++;
      }

      // Audio & Juice
      if (isSuper) {
        soundManager.playSuperShot();
        this.cameraShake = Math.max(this.cameraShake, 22);
        this.spawnSuperShotExplosion(this.ball.x, this.ball.y, player.color);
        player.isSuperShot = false; // consume super shot
        player.superShotActiveTimer = 0;
      } else {
        soundManager.playKick(1.2);
        this.cameraShake = Math.max(this.cameraShake, 4);
        this.spawnKickParticles(this.ball.x, this.ball.y, player.color);
      }
    } else {
      // Whiff kick / mini dash along movement direction
      soundManager.playKick(0.3);
      const moveSpeed = Math.hypot(player.vx, player.vy);
      if (moveSpeed > 50) {
        player.vx *= 1.2;
        player.vy *= 1.2;
      } else if (inputDx !== 0 || inputDy !== 0) {
        const len = Math.hypot(inputDx, inputDy) || 1;
        player.vx += (inputDx / len) * 90;
        player.vy += (inputDy / len) * 90;
      }
    }
  }

  private updatePlayerPhysics(player: Player, dt: number) {
    // Damping
    const FRICTION = 0.91;
    const frictionFactor = Math.pow(FRICTION, dt * 60);
    player.vx *= frictionFactor;
    player.vy *= frictionFactor;

    // Position update
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // Cooldown update
    if (player.kickCooldown > 0) {
      player.kickCooldown = Math.max(0, player.kickCooldown - dt);
      if (player.kickCooldown <= 0) {
        player.isKicking = false;
      }
    }

    // Keep players inside pitch boundary & allow entering/exiting both goal nets smoothly
    const pitch = this.pitchConfig;
    const margin = this.pitchMargin;
    const isSetPieceTaker =
      this.setPiece.active &&
      player.id === this.setPiece.team &&
      this.setPiece.type !== 'goal_kick';
    const apron = isSetPieceTaker ? player.radius * 2 + this.ball.radius + 36 : 0;
    const pitchLeft = margin.x - apron;
    const pitchRight = pitch.width - margin.x + apron;
    const pitchTop = margin.y - apron;
    const pitchBottom = pitch.height - margin.y + apron;

    const centerY = pitch.height / 2;
    const goalHalf = pitch.goalWidth / 2;
    const goalTop = centerY - goalHalf;
    const goalBottom = centerY + goalHalf;
    const goalDepth = pitch.goalDepth;
    const postR = pitch.postRadius;

    // Smooth circular collisions with all 4 goalposts
    const posts = [
      { x: margin.x, y: goalTop },
      { x: margin.x, y: goalBottom },
      { x: pitch.width - margin.x, y: goalTop },
      { x: pitch.width - margin.x, y: goalBottom },
    ];
    for (const post of posts) {
      const pdx = player.x - post.x;
      const pdy = player.y - post.y;
      const pDist = Math.hypot(pdx, pdy);
      const minPostDist = player.radius + postR;
      if (pDist < minPostDist && pDist > 0.0001) {
        const pnx = pdx / pDist;
        const pny = pdy / pDist;
        const overlap = minPostDist - pDist;
        player.x += pnx * overlap;
        player.y += pny * overlap;
        const dot = player.vx * pnx + player.vy * pny;
        if (dot < 0) {
          player.vx -= pnx * dot;
          player.vy -= pny * dot;
        }
      }
    }

    // Allow entering & exiting the goal boxes when aligned with the goal mouth
    const inGoalMouthY = player.y > goalTop && player.y < goalBottom;
    const minXLimit = inGoalMouthY ? Math.min(pitchLeft, margin.x - goalDepth) : pitchLeft;
    const maxXLimit = inGoalMouthY ? Math.max(pitchRight, pitch.width - margin.x + goalDepth) : pitchRight;

    const smoothStep = Math.max(10, 420 * dt);
    const applySmoothClamp = !isSetPieceTaker && this.outOfBoundsGraceTimer > 0;

    if (player.x - player.radius < minXLimit) {
      const targetX = minXLimit + player.radius;
      const diff = targetX - player.x;
      player.x = applySmoothClamp && diff > smoothStep ? player.x + smoothStep : targetX;
      if (player.vx < 0) player.vx = 0;
    }
    if (player.x + player.radius > maxXLimit) {
      const targetX = maxXLimit - player.radius;
      const diff = player.x - targetX;
      player.x = applySmoothClamp && diff > smoothStep ? player.x - smoothStep : targetX;
      if (player.vx > 0) player.vx = 0;
    }

    // Inside the goal box, constrain vertically to the goal net top/bottom; otherwise to touchlines
    const insideGoalX = player.x < margin.x || player.x > pitch.width - margin.x;
    const minYLimit = insideGoalX && !isSetPieceTaker ? goalTop : pitchTop;
    const maxYLimit = insideGoalX && !isSetPieceTaker ? goalBottom : pitchBottom;

    if (player.y - player.radius < minYLimit) {
      const targetY = minYLimit + player.radius;
      const diff = targetY - player.y;
      player.y = applySmoothClamp && diff > smoothStep ? player.y + smoothStep : targetY;
      if (player.vy < 0) player.vy = 0;
    }
    if (player.y + player.radius > maxYLimit) {
      const targetY = maxYLimit - player.radius;
      const diff = player.y - targetY;
      player.y = applySmoothClamp && diff > smoothStep ? player.y - smoothStep : targetY;
      if (player.vy > 0) player.vy = 0;
    }

    // Set-piece barrier: keep opposing players outside barrierRadius until ball is played
    if (this.setPiece.active && player.id !== this.setPiece.team) {
      const bdx = player.x - this.setPiece.spotX;
      const bdy = player.y - this.setPiece.spotY;
      const bDist = Math.hypot(bdx, bdy);
      const minBarrier = this.setPiece.barrierRadius;
      if (bDist < minBarrier && bDist > 0.001) {
        const bnx = bdx / bDist;
        const bny = bdy / bDist;
        player.x = this.setPiece.spotX + bnx * minBarrier;
        player.y = this.setPiece.spotY + bny * minBarrier;
        const dot = player.vx * bnx + player.vy * bny;
        if (dot < 0) {
          player.vx -= bnx * dot;
          player.vy -= bny * dot;
        }
      }
    }
  }

  private resolveDiscCollision(p1: Player, p2: Player) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    const minDist = p1.radius + p2.radius;

    if (dist < minDist && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      // Clean position separation with safety margin to prevent sticking
      const separation = overlap * 0.52;
      p1.x -= nx * separation;
      p1.y -= ny * separation;
      p2.x += nx * separation;
      p2.y += ny * separation;

      // Relative velocity: velocity of p2 relative to p1
      const rvx = p2.vx - p1.vx;
      const rvy = p2.vy - p1.vy;

      // Normal velocity component (negative means moving towards each other)
      const velAlongNormal = rvx * nx + rvy * ny;

      // CRITICAL: ONLY apply impulse if discs are moving TOWARDS each other!
      if (velAlongNormal < 0) {
        const RESTITUTION = 0.55;
        const impulse = -(1 + RESTITUTION) * velAlongNormal * 0.5;

        p1.vx -= nx * impulse;
        p1.vy -= ny * impulse;
        p2.vx += nx * impulse;
        p2.vy += ny * impulse;

        soundManager.playBounce();
        this.spawnSparks((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 4);
      }
    }
  }

  private resolvePlayerPlayerCollision() {
    const players = this.getActivePlayers();
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        this.resolveDiscCollision(players[i], players[j]);
      }
    }
  }

  private clearSetPiece() {
    if (!this.setPiece.active) return;
    this.setPiece.active = false;
    this.outOfBoundsGraceTimer = 0.75;
    this.onSetPieceChange?.({ ...this.setPiece });
  }

  private triggerSetPiece(type: SetPieceType, team: TeamId, spotX: number, spotY: number) {
    const pitch = this.pitchConfig;
    const margin = this.pitchMargin;
    const centerY = pitch.height / 2;
    const isOlympic = this.settings.stadiumType === 'olympic';
    const isGrand = this.settings.stadiumType === 'grand_stadium';
    const barrierRadius = isOlympic ? 165 : isGrand ? 140 : 115;

    if (type === 'corner') {
      if (team === 'red') this.redCorners++;
      else this.blueCorners++;
    } else if (type === 'throw_in') {
      if (team === 'red') this.redThrowIns++;
      else this.blueThrowIns++;
    }

    this.ball.x = spotX;
    this.ball.y = spotY;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.isSuperShot = false;
    this.ball.speedTrail = [];

    this.setPiece = {
      active: true,
      type,
      team,
      spotX,
      spotY,
      timer: 5.5,
      barrierRadius,
    };

    soundManager.playWhistle(false);
    this.onSetPieceChange?.({ ...this.setPiece });

    // Position taking player cleanly OUTSIDE the pitch line/corner facing into the field
    const taker = team === 'red' ? this.playerRed : this.playerBlue;
    const offset = taker.radius + this.ball.radius + 6;

    if (type === 'throw_in') {
      const isTop = spotY <= centerY;
      taker.x = spotX;
      taker.y = isTop ? spotY - offset : spotY + offset;
    } else if (type === 'corner') {
      const isLeft = spotX <= pitch.width / 2;
      const isTop = spotY <= centerY;
      taker.x = spotX + (isLeft ? -offset * 0.72 : offset * 0.72);
      taker.y = spotY + (isTop ? -offset * 0.72 : offset * 0.72);
    } else {
      // Goal kick (Aut)
      const isLeft = spotX < pitch.width / 2;
      taker.x = Math.max(margin.x + taker.radius, Math.min(pitch.width - margin.x - taker.radius, spotX + (isLeft ? -offset : offset)));
      taker.y = spotY;
    }
    taker.vx = 0;
    taker.vy = 0;

    // Push opposing players respectfully outside barrierRadius
    for (const p of this.getActivePlayers()) {
      if (p.id !== team) {
        const dx = p.x - spotX;
        const dy = p.y - spotY;
        const dist = Math.hypot(dx, dy);
        if (dist < barrierRadius + 20) {
          const nx = dist > 0.001 ? dx / dist : (team === 'red' ? 1 : -1);
          const ny = dist > 0.001 ? dy / dist : 0;
          p.x = Math.max(margin.x + p.radius, Math.min(pitch.width - margin.x - p.radius, spotX + nx * (barrierRadius + 24)));
          p.y = Math.max(margin.y + p.radius, Math.min(pitch.height - margin.y - p.radius, spotY + ny * (barrierRadius + 24)));
          p.vx = 0;
          p.vy = 0;
        }
      }
    }
  }

  private updateBallPhysics(dt: number) {
    // Smooth Haxball grass friction: fast shots glide cleanly, normal touches roll smoothly ahead without sticking
    const ballSpeed = Math.hypot(this.ball.vx, this.ball.vy);
    const isShotSpeed = ballSpeed > 520;
    const BALL_DAMPING = isShotSpeed ? 0.988 : 0.976;
    const dampingFactor = Math.pow(BALL_DAMPING, dt * 60);
    this.ball.vx *= dampingFactor;
    this.ball.vy *= dampingFactor;

    // Gentle linear grass rolling drag
    if (ballSpeed > 0.01) {
      const LINEAR_DRAG = isShotSpeed ? 12 : 16;
      const speedDrop = Math.min(ballSpeed, LINEAR_DRAG * dt);
      const scale = (ballSpeed - speedDrop) / ballSpeed;
      this.ball.vx *= scale;
      this.ball.vy *= scale;
    }

    const updatedSpeed = Math.hypot(this.ball.vx, this.ball.vy);
    if (updatedSpeed < 4) {
      this.ball.vx = 0;
      this.ball.vy = 0;
    }

    // Position
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // Rotation
    this.ball.rotation += (updatedSpeed * dt) / this.ball.radius;

    // Clear super shot flag once ball slows down below threshold
    if (this.ball.isSuperShot && updatedSpeed < 320) {
      this.ball.isSuperShot = false;
    }

    // Speed trail for fast shots & super shots
    if (updatedSpeed > 340) {
      this.ball.speedTrail.unshift({
        x: this.ball.x,
        y: this.ball.y,
        alpha: this.ball.isSuperShot ? 0.95 : 0.7,
        isSuper: this.ball.isSuperShot,
      });
      const maxTrail = this.ball.isSuperShot ? 14 : 7;
      if (this.ball.speedTrail.length > maxTrail) {
        this.ball.speedTrail.pop();
      }
    } else if (this.ball.speedTrail.length > 0) {
      this.ball.speedTrail.pop();
    }
  }

  private resolvePlayerBallCollision(player: Player) {
    // Allow freshly kicked shots (~100ms) to clear the player cleanly without collision damping
    if (player.kickCooldown > 0.12) return;

    const dx = this.ball.x - player.x;
    const dy = this.ball.y - player.y;
    const dist = Math.hypot(dx, dy);
    const minDist = player.radius + this.ball.radius;

    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      // Separate overlap cleanly along collision normal (no magnetic snapping)
      this.ball.x += nx * overlap * 0.88;
      this.ball.y += ny * overlap * 0.88;
      player.x -= nx * overlap * 0.12;
      player.y -= ny * overlap * 0.12;

      // If taking team touches the ball during a set piece, put it immediately into play
      let releasedSetPieceType: SetPieceType | null = null;
      let releasedSpotX = this.ball.x;
      let releasedSpotY = this.ball.y;
      if (this.setPiece.active) {
        if (player.id === this.setPiece.team) {
          releasedSetPieceType = this.setPiece.type;
          releasedSpotX = this.setPiece.spotX;
          releasedSpotY = this.setPiece.spotY;
          this.clearSetPiece();
        } else {
          return;
        }
      }

      const rvx = this.ball.vx - player.vx;
      const rvy = this.ball.vy - player.vy;
      const velAlongNormal = rvx * nx + rvy * ny;

      // Authentic Haxball circle-circle collision with low restitution (0.1):
      // Keeps only a small bounce so the ball stays close & controllable in every direction (vertical, horizontal, diagonal)
      // without ever sticking to the player's foot.
      if (velAlongNormal < 0) {
        const RESTITUTION = 0.1;
        const invMassBall = 0.88;
        const invMassPlayer = 0.12;
        const impulse = -(1 + RESTITUTION) * velAlongNormal / (invMassBall + invMassPlayer);

        this.ball.vx += nx * impulse * invMassBall;
        this.ball.vy += ny * impulse * invMassBall;
        player.vx -= nx * impulse * invMassPlayer;
        player.vy -= ny * impulse * invMassPlayer;

        if (Math.abs(velAlongNormal) > 260) {
          soundManager.playBounce();
        }
      }

      // Ensure throw-ins & corners released from outside the line enter cleanly into the field
      if (releasedSetPieceType === 'throw_in' || releasedSetPieceType === 'corner') {
        const pitch = this.pitchConfig;
        if (releasedSpotY <= pitch.height / 2 && this.ball.vy < 45) {
          this.ball.vy = 65;
          this.ball.y += 2;
        } else if (releasedSpotY > pitch.height / 2 && this.ball.vy > -45) {
          this.ball.vy = -65;
          this.ball.y -= 2;
        }
        if (releasedSetPieceType === 'corner') {
          if (releasedSpotX <= pitch.width / 2 && this.ball.vx < 45) {
            this.ball.vx = 65;
            this.ball.x += 2;
          } else if (releasedSpotX > pitch.width / 2 && this.ball.vx > -45) {
            this.ball.vx = -65;
            this.ball.x -= 2;
          }
        }
      }

      this.ball.lastTouch = player.id;
    }
  }

  private resolvePitchBoundaries() {
    const pitch = this.pitchConfig;
    const margin = this.pitchMargin;
    const pitchLeft = margin.x;
    const pitchRight = pitch.width - margin.x;
    const pitchTop = margin.y;
    const pitchBottom = pitch.height - margin.y;
    const centerY = pitch.height / 2;
    const goalHalfHeight = pitch.goalWidth / 2;
    const goalTop = centerY - goalHalfHeight;
    const goalBottom = centerY + goalHalfHeight;
    const goalDepth = pitch.goalDepth;
    const r = this.ball.radius;
    const postR = pitch.postRadius;
    const isOlympic = this.settings.stadiumType === 'olympic';
    const isGrand = this.settings.stadiumType === 'grand_stadium';

    // Goal posts positions (check posts first so post hits bounce realistically!)
    const leftTopPost = { x: pitchLeft, y: goalTop };
    const leftBottomPost = { x: pitchLeft, y: goalBottom };
    const rightTopPost = { x: pitchRight, y: goalTop };
    const rightBottomPost = { x: pitchRight, y: goalBottom };
    const posts = [leftTopPost, leftBottomPost, rightTopPost, rightBottomPost];

    for (const post of posts) {
      const dx = this.ball.x - post.x;
      const dy = this.ball.y - post.y;
      const dist = Math.hypot(dx, dy);
      if (dist < r + postR && dist > 0.0001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = r + postR - dist;
        this.ball.x += nx * overlap;
        this.ball.y += ny * overlap;

        const dot = this.ball.vx * nx + this.ball.vy * ny;
        if (dot < 0) {
          this.ball.vx = (this.ball.vx - 2 * dot * nx) * 0.88;
          this.ball.vy = (this.ball.vy - 2 * dot * ny) * 0.88;
          soundManager.playPostHit();
          this.cameraShake = Math.max(this.cameraShake, 6);
          this.spawnSparks(post.x, post.y, 8);
        }
      }
    }

    const setPiecesEnabled = this.settings.enableSetPieces !== false;
    const canTriggerOut = setPiecesEnabled && this.outOfBoundsGraceTimer <= 0;

    // 1. TOP & BOTTOM TOUCHLINES -> TAÇ (THROW-IN) OR WALL BOUNCE
    if (!setPiecesEnabled) {
      if (this.ball.y - r < pitchTop) {
        this.ball.y = pitchTop + r;
        this.ball.vy = Math.abs(this.ball.vy) * 0.78;
        if (Math.abs(this.ball.vy) > 180) soundManager.playBounce();
      }
      if (this.ball.y + r > pitchBottom) {
        this.ball.y = pitchBottom - r;
        this.ball.vy = -Math.abs(this.ball.vy) * 0.78;
        if (Math.abs(this.ball.vy) > 180) soundManager.playBounce();
      }
    } else {
      if (this.ball.y < pitchTop - r * 0.35) {
        if (canTriggerOut) {
          const takingTeam: TeamId = this.ball.lastTouch === 'red' ? 'blue' : 'red';
          const spotX = Math.max(pitchLeft + 36, Math.min(pitchRight - 36, this.ball.x));
          this.triggerSetPiece('throw_in', takingTeam, spotX, pitchTop);
          return;
        } else {
          this.ball.y = pitchTop + r;
          this.ball.vy = Math.abs(this.ball.vy) * 0.4;
        }
      }
      if (this.ball.y > pitchBottom + r * 0.35) {
        if (canTriggerOut) {
          const takingTeam: TeamId = this.ball.lastTouch === 'red' ? 'blue' : 'red';
          const spotX = Math.max(pitchLeft + 36, Math.min(pitchRight - 36, this.ball.x));
          this.triggerSetPiece('throw_in', takingTeam, spotX, pitchBottom);
          return;
        } else {
          this.ball.y = pitchBottom - r;
          this.ball.vy = -Math.abs(this.ball.vy) * 0.4;
        }
      }
    }

    // 2. LEFT ENDLINE (GOAL NET vs KORNER / AUT / WALL BOUNCE)
    if (this.ball.y > goalTop && this.ball.y < goalBottom) {
      if (this.ball.x - r < pitchLeft - goalDepth) {
        this.ball.x = pitchLeft - goalDepth + r;
        this.ball.vx = -this.ball.vx * 0.4;
      }
      if (this.ball.x < pitchLeft) {
        if (this.ball.y - r < goalTop) {
          this.ball.y = goalTop + r;
          this.ball.vy = -this.ball.vy * 0.5;
        }
        if (this.ball.y + r > goalBottom) {
          this.ball.y = goalBottom - r;
          this.ball.vy = -this.ball.vy * 0.5;
        }
      }
    } else if (!setPiecesEnabled) {
      if (this.ball.x - r < pitchLeft) {
        this.ball.x = pitchLeft + r;
        this.ball.vx = Math.abs(this.ball.vx) * 0.78;
        if (Math.abs(this.ball.vx) > 180) soundManager.playBounce();
      }
    } else if (this.ball.x < pitchLeft - r * 0.35) {
      if (canTriggerOut) {
        if (this.ball.lastTouch === 'red') {
          // Red defender put it over own goal line -> KORNER for Blue at exact corner!
          const spotY = this.ball.y < centerY ? pitchTop : pitchBottom;
          this.triggerSetPiece('corner', 'blue', pitchLeft, spotY);
        } else {
          // Blue attacker shot wide -> AUT (Goal Kick) for Red!
          const goalKickX = pitchLeft + (isOlympic ? 105 : isGrand ? 85 : 55);
          const goalKickY = this.ball.y < centerY ? centerY - 35 : centerY + 35;
          this.triggerSetPiece('goal_kick', 'red', goalKickX, goalKickY);
        }
        return;
      } else {
        this.ball.x = pitchLeft + r;
        this.ball.vx = Math.abs(this.ball.vx) * 0.4;
      }
    }

    // 3. RIGHT ENDLINE (GOAL NET vs KORNER / AUT / WALL BOUNCE)
    if (this.ball.y > goalTop && this.ball.y < goalBottom) {
      if (this.ball.x + r > pitchRight + goalDepth) {
        this.ball.x = pitchRight + goalDepth - r;
        this.ball.vx = -this.ball.vx * 0.4;
      }
      if (this.ball.x > pitchRight) {
        if (this.ball.y - r < goalTop) {
          this.ball.y = goalTop + r;
          this.ball.vy = -this.ball.vy * 0.5;
        }
        if (this.ball.y + r > goalBottom) {
          this.ball.y = goalBottom - r;
          this.ball.vy = -this.ball.vy * 0.5;
        }
      }
    } else if (!setPiecesEnabled) {
      if (this.ball.x + r > pitchRight) {
        this.ball.x = pitchRight - r;
        this.ball.vx = -Math.abs(this.ball.vx) * 0.78;
        if (Math.abs(this.ball.vx) > 180) soundManager.playBounce();
      }
    } else if (this.ball.x > pitchRight + r * 0.35) {
      if (canTriggerOut) {
        if (this.ball.lastTouch === 'blue') {
          // Blue defender put it over own goal line -> KORNER for Red at exact corner!
          const spotY = this.ball.y < centerY ? pitchTop : pitchBottom;
          this.triggerSetPiece('corner', 'red', pitchRight, spotY);
        } else {
          // Red attacker shot wide -> AUT (Goal Kick) for Blue!
          const goalKickX = pitchRight - (isOlympic ? 105 : isGrand ? 85 : 55);
          const goalKickY = this.ball.y < centerY ? centerY - 35 : centerY + 35;
          this.triggerSetPiece('goal_kick', 'blue', goalKickX, goalKickY);
        }
        return;
      } else {
        this.ball.x = pitchRight - r;
        this.ball.vx = -Math.abs(this.ball.vx) * 0.4;
      }
    }
  }

  private checkGoalCondition() {
    const pitch = this.pitchConfig;
    const margin = this.pitchMargin;
    const pitchLeft = margin.x;
    const pitchRight = pitch.width - margin.x;
    const centerY = pitch.height / 2;
    const goalHalfHeight = pitch.goalWidth / 2;
    const goalTop = centerY - goalHalfHeight;
    const goalBottom = centerY + goalHalfHeight;

    // Left Goal: Ball fully crossed left goal line into net -> Blue scored!
    if (this.ball.x < pitchLeft - this.ball.radius && this.ball.y > goalTop && this.ball.y < goalBottom) {
      this.triggerGoal('blue');
      return;
    }

    // Right Goal: Ball fully crossed right goal line into net -> Red scored!
    if (this.ball.x > pitchRight + this.ball.radius && this.ball.y > goalTop && this.ball.y < goalBottom) {
      this.triggerGoal('red');
      return;
    }
  }

  private triggerGoal(scoringTeam: TeamId) {
    if (this.gameState === 'goal') return;

    this.gameState = 'goal';
    this.lastScorer = scoringTeam;
    this.cameraShake = 18;

    if (scoringTeam === 'red') {
      this.playerRed.score++;
    } else {
      this.playerBlue.score++;
    }

    // Save Goal Replay snapshot
    const replay: GoalReplay = {
      id: `goal-${Date.now()}-${this.goalReplays.length + 1}`,
      scorer: scoringTeam,
      scoreRed: this.playerRed.score,
      scoreBlue: this.playerBlue.score,
      matchTime: Math.round(this.totalMatchTime),
      frames: [...this.frameBuffer],
      goalFrameIndex: Math.max(0, this.frameBuffer.length - 1),
    };
    this.goalReplays.push(replay);

    this.onScoreChange?.(this.playerRed.score, this.playerBlue.score);
    this.onGoalScored?.(scoringTeam);
    this.onStateChange?.('goal');

    // Spawn massive confetti celebration
    this.spawnGoalConfetti(scoringTeam === 'red' ? '#ef4444' : '#3b82f6');
    soundManager.playGoal();

    // Golden goal check: if overtime, end match immediately!
    if (this.isOvertime) {
      setTimeout(() => {
        this.endMatch();
      }, 2500);
      return;
    }

    // Reset to kickoff after 2.8 seconds
    setTimeout(() => {
      if (this.gameState === 'goal') {
        this.resetToKickoff(scoringTeam);
      }
    }, 2800);
  }

  private endMatch() {
    this.gameState = 'gameover';
    soundManager.playWhistle(true);
    setTimeout(() => soundManager.playWhistle(true), 400);
    this.onStateChange?.('gameover');
    this.onMatchEnd?.();
  }

  private trackPossession() {
    let minRedDist = Math.hypot(this.ball.x - this.playerRed.x, this.ball.y - this.playerRed.y);
    if (this.playerRed2) {
      const d2 = Math.hypot(this.ball.x - this.playerRed2.x, this.ball.y - this.playerRed2.y);
      if (d2 < minRedDist) minRedDist = d2;
    }

    let minBlueDist = Math.hypot(this.ball.x - this.playerBlue.x, this.ball.y - this.playerBlue.y);
    if (this.playerBlue2) {
      const d2 = Math.hypot(this.ball.x - this.playerBlue2.x, this.ball.y - this.playerBlue2.y);
      if (d2 < minBlueDist) minBlueDist = d2;
    }

    if (minRedDist < 140 && minRedDist < minBlueDist) {
      this.playerRed.possessionFrames++;
    } else if (minBlueDist < 140 && minBlueDist < minRedDist) {
      this.playerBlue.possessionFrames++;
    }
  }

  // Smart AI Bot logic
  private updateAI(bot: Player, opponent: Player, dt: number) {
    const isRed = bot.id === 'red';
    const pitch = this.pitchConfig;
    const margin = this.pitchMargin;
    const ownGoalX = isRed ? margin.x : pitch.width - margin.x;
    const targetGoalX = isRed ? pitch.width - margin.x : margin.x;
    const targetGoalY = pitch.height / 2;

    const diff = this.settings.aiDifficulty;
    const reactionDelay = diff === 'easy' ? 0.65 : diff === 'normal' ? 0.85 : 1.0;
    const isOlympic = this.settings.stadiumType === 'olympic';
    const isGrand = this.settings.stadiumType === 'grand_stadium';
    const speedMult = this.settings.playerSpeedMultiplier || 1;
    const baseAiSpeed = diff === 'easy' ? 240 : diff === 'normal' ? 285 : 325;
    const maxSpeed = (isOlympic ? baseAiSpeed * 1.3 : isGrand ? baseAiSpeed * 1.15 : baseAiSpeed) * reactionDelay * speedMult;

    // Handle active set piece (Taç, Korner, Aut) cleanly for AI
    if (this.setPiece.active) {
      if (this.setPiece.team === bot.id) {
        // AI takes the set piece after a brief 0.75s visual pause
        const centerX = pitch.width / 2;
        const centerY = pitch.height / 2;
        const aimX = this.setPiece.type === 'corner' ? targetGoalX : centerX;
        const aimY = this.setPiece.type === 'corner' ? targetGoalY : centerY;
        const angleIntoPitch = Math.atan2(aimY - this.setPiece.spotY, aimX - this.setPiece.spotX);
        const standBack = bot.radius + this.ball.radius + 6;
        const tx = this.setPiece.spotX - Math.cos(angleIntoPitch) * standBack;
        const ty = this.setPiece.spotY - Math.sin(angleIntoPitch) * standBack;

        const dx = tx - bot.x;
        const dy = ty - bot.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 4) {
          bot.vx += (dx / dist) * 3400 * speedMult * dt;
          bot.vy += (dy / dist) * 3400 * speedMult * dt;
        }
        const curSpeed = Math.hypot(bot.vx, bot.vy);
        if (curSpeed > maxSpeed) {
          bot.vx = (bot.vx / curSpeed) * maxSpeed;
          bot.vy = (bot.vy / curSpeed) * maxSpeed;
        }

        const distToBall = Math.hypot(this.ball.x - bot.x, this.ball.y - bot.y);
        if (this.setPiece.timer < 4.75 && distToBall <= bot.radius + this.ball.radius + 18 && bot.kickCooldown <= 0) {
          this.attemptKick(bot);
        }
      } else {
        // Defending AI waits respectfully between ball and own goal outside the barrier
        const dxG = ownGoalX - this.setPiece.spotX;
        const dyG = targetGoalY - this.setPiece.spotY;
        const dG = Math.hypot(dxG, dyG) || 1;
        const waitDist = this.setPiece.barrierRadius + 30;
        const tx = this.setPiece.spotX + (dxG / dG) * waitDist;
        const ty = this.setPiece.spotY + (dyG / dG) * waitDist;
        const dx = tx - bot.x;
        const dy = ty - bot.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 10) {
          bot.vx += (dx / dist) * 3000 * speedMult * dt;
          bot.vy += (dy / dist) * 3000 * speedMult * dt;
        }
        const curSpeed = Math.hypot(bot.vx, bot.vy);
        if (curSpeed > maxSpeed) {
          bot.vx = (bot.vx / curSpeed) * maxSpeed;
          bot.vy = (bot.vy / curSpeed) * maxSpeed;
        }
      }
      return;
    }

    const isBallBehind = isRed ? this.ball.x < bot.x : this.ball.x > bot.x;

    let targetX = 0;
    let targetY = 0;

    if (isBallBehind) {
      // Retreat to goal defense line
      const standBack = isOlympic ? 140 : isGrand ? 110 : 70;
      targetX = ownGoalX + (isRed ? standBack : -standBack);
      targetY = Math.max(
        pitch.height / 2 - pitch.goalWidth / 2 + 10,
        Math.min(pitch.height / 2 + pitch.goalWidth / 2 - 10, this.ball.y)
      );
      if (bot.number === 9 || bot.number === 11) {
        targetY += (this.ball.y > pitch.height / 2 ? 60 : -60);
      }
    } else {
      // Offensive mode
      const angleToGoal = Math.atan2(targetGoalY - this.ball.y, targetGoalX - this.ball.x);
      const standBehindDistance = isOlympic ? 44 : isGrand ? 38 : 32;

      targetX = this.ball.x - Math.cos(angleToGoal) * standBehindDistance;
      targetY = this.ball.y - Math.sin(angleToGoal) * standBehindDistance;

      if (bot.number === 9 || bot.number === 11) {
        // Wing striker positioning
        targetY += (this.ball.y > pitch.height / 2 ? 75 : -75);
      }
    }

    const dx = targetX - bot.x;
    const dy = targetY - bot.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      const ndx = dx / dist;
      const ndy = dy / dist;
      bot.vx += ndx * 3900 * speedMult * dt;
      bot.vy += ndy * 3900 * speedMult * dt;

      const curSpeed = Math.hypot(bot.vx, bot.vy);
      if (curSpeed > maxSpeed) {
        bot.vx = (bot.vx / curSpeed) * maxSpeed;
        bot.vy = (bot.vy / curSpeed) * maxSpeed;
      }
    }

    // AI Kick & Super Shot
    const distToBall = Math.hypot(this.ball.x - bot.x, this.ball.y - bot.y);
    const kickRange = bot.radius + this.ball.radius + 15;

    if (distToBall <= kickRange && bot.kickCooldown <= 0) {
      const ballToGoalDirX = isRed ? 1 : -1;
      const ballDirX = (this.ball.x - bot.x) / (distToBall || 1);

      if (ballDirX * ballToGoalDirX > -0.2) {
        // Chance of bot triggering super shot on Hard mode!
        if (diff === 'hard' && Math.random() < 0.25) {
          bot.isSuperShot = true;
        }
        this.attemptKick(bot);
      }
    }
  }

  // Particle systems
  private spawnGrassParticle(x: number, y: number) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 40,
      vy: -Math.random() * 30,
      color: Math.random() > 0.5 ? '#166534' : '#22c55e',
      size: 2 + Math.random() * 2,
      alpha: 0.6,
      life: 0,
      maxLife: 0.35,
      type: 'grass',
    });
  }

  private spawnSparks(x: number, y: number, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#facc15',
        size: 2.5 + Math.random() * 2,
        alpha: 1.0,
        life: 0,
        maxLife: 0.4,
        type: 'spark',
      });
    }
  }

  private spawnSuperChargeSparks(x: number, y: number, color: string) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.4 ? '#f59e0b' : color,
        size: 4 + Math.random() * 3,
        alpha: 1.0,
        life: 0,
        maxLife: 0.5,
        type: 'spark',
      });
    }
  }

  private spawnSuperShotExplosion(x: number, y: number, color: string) {
    // Blazing fiery explosion
    const colors = ['#f59e0b', '#ef4444', '#fbbf24', '#ffffff', color];
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 140 + Math.random() * 380;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 5,
        alpha: 1.0,
        life: 0,
        maxLife: 0.65,
        type: 'spark',
      });
    }
  }

  private spawnKickParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 220;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.3 ? color : '#ffffff',
        size: 3 + Math.random() * 3,
        alpha: 0.9,
        life: 0,
        maxLife: 0.45,
        type: 'spark',
      });
    }
  }

  private spawnGoalConfetti(primaryColor: string) {
    const colors = [primaryColor, '#ffffff', '#fbbf24', '#38bdf8', '#a855f7'];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 450;
      this.particles.push({
        x: this.ball.x,
        y: this.ball.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        alpha: 1.0,
        life: 0,
        maxLife: 1.8 + Math.random() * 0.8,
        type: 'confetti',
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'confetti') {
        p.vy += 280 * dt;
        p.vx *= 0.97;
      } else {
        p.vx *= 0.92;
        p.vy *= 0.92;
      }

      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    }
  }

  public getStats() {
    const totalPossession = this.playerRed.possessionFrames + this.playerBlue.possessionFrames || 1;
    const redPoss = Math.round((this.playerRed.possessionFrames / totalPossession) * 100);
    const bluePoss = 100 - redPoss;

    let winner: TeamId | 'tie' = 'tie';
    if (this.playerRed.score > this.playerBlue.score) winner = 'red';
    else if (this.playerBlue.score > this.playerRed.score) winner = 'blue';

    return {
      redScore: this.playerRed.score,
      blueScore: this.playerBlue.score,
      redShots: this.playerRed.shots,
      blueShots: this.playerBlue.shots,
      redCorners: this.redCorners,
      blueCorners: this.blueCorners,
      redThrowIns: this.redThrowIns,
      blueThrowIns: this.blueThrowIns,
      redPossession: redPoss,
      bluePossession: bluePoss,
      winner,
      duration: Math.round(this.totalMatchTime),
    };
  }
}
