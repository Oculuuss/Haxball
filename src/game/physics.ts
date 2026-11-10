import { Ball, GameState, GoalReplay, MatchSettings, Particle, PitchConfig, Player, ReplayFrame, StadiumType, TeamId } from '../types/game';
import { soundManager } from '../audio/soundManager';

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
};

// Default backwards compatibility
export const PITCH_CONFIG: PitchConfig = STADIUM_CONFIGS.classic.pitch;
export const PITCH_MARGIN = STADIUM_CONFIGS.classic.margin;

export class GameEngine {
  public playerRed!: Player;
  public playerBlue!: Player;
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

  // Active key states
  public keys: { [key: string]: boolean } = {};
  public justPressedKeys: { [key: string]: boolean } = {};

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

  public get pitchConfig(): PitchConfig {
    const type = this.settings.stadiumType || 'classic';
    return STADIUM_CONFIGS[type]?.pitch || STADIUM_CONFIGS.classic.pitch;
  }

  public get pitchMargin(): { x: number; y: number } {
    const type = this.settings.stadiumType || 'classic';
    return STADIUM_CONFIGS[type]?.margin || STADIUM_CONFIGS.classic.margin;
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

    const isGrand = this.settings.stadiumType === 'grand_stadium';
    const playerRadius = isGrand ? 28 : 24;
    const ballRadius = isGrand ? 14.5 : 12.5;

    this.playerRed = {
      id: 'red',
      name: 'Kırmızı Takım',
      x: pitchLeft + (pitchRight - pitchLeft) * 0.25,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: playerRadius,
      color: '#ef4444',
      accentColor: '#b91c1c',
      glowColor: 'rgba(239, 68, 68, 0.4)',
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

    this.playerBlue = {
      id: 'blue',
      name: 'Mavi Takım',
      x: pitchLeft + (pitchRight - pitchLeft) * 0.75,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: playerRadius,
      color: '#3b82f6',
      accentColor: '#1d4ed8',
      glowColor: 'rgba(59, 130, 246, 0.4)',
      number: 7,
      score: 0,
      isAi: this.settings.mode === '1player_vs_ai' && this.settings.userTeam === 'red',
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

    this.ball.x = pitch.width / 2;
    this.ball.y = centerY;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.rotation = 0;
    this.ball.speedTrail = [];
    this.ball.isSuperShot = false;

    this.playerRed.x = pitchLeft + (pitchRight - pitchLeft) * 0.25;
    this.playerRed.y = centerY;
    this.playerRed.vx = 0;
    this.playerRed.vy = 0;
    this.playerRed.isKicking = false;
    this.playerRed.kickCooldown = 0;
    this.playerRed.isSuperShot = false;
    this.playerRed.superShotActiveTimer = 0;
    this.playerRed.tapTimestamps = [];

    this.playerBlue.x = pitchLeft + (pitchRight - pitchLeft) * 0.75;
    this.playerBlue.y = centerY;
    this.playerBlue.vx = 0;
    this.playerBlue.vy = 0;
    this.playerBlue.isKicking = false;
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

    // Update super shot timers
    if (this.playerRed.superShotActiveTimer > 0) {
      this.playerRed.superShotActiveTimer = Math.max(0, this.playerRed.superShotActiveTimer - dt);
      if (this.playerRed.superShotActiveTimer <= 0) {
        this.playerRed.isSuperShot = false;
      }
    }
    if (this.playerBlue.superShotActiveTimer > 0) {
      this.playerBlue.superShotActiveTimer = Math.max(0, this.playerBlue.superShotActiveTimer - dt);
      if (this.playerBlue.superShotActiveTimer <= 0) {
        this.playerBlue.isSuperShot = false;
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

    // Handle inputs
    this.handleInputs(dt);

    // AI logic if active
    if (this.playerRed.isAi) {
      this.updateAI(this.playerRed, this.playerBlue, dt);
    }
    if (this.playerBlue.isAi) {
      this.updateAI(this.playerBlue, this.playerRed, dt);
    }

    // Physics step
    this.updatePlayerPhysics(this.playerRed, dt);
    this.updatePlayerPhysics(this.playerBlue, dt);

    // Player vs Player collision
    this.resolvePlayerPlayerCollision();

    // Ball physics
    this.updateBallPhysics(dt);

    // Player vs Ball collision & kick checks
    this.resolvePlayerBallCollision(this.playerRed);
    this.resolvePlayerBallCollision(this.playerBlue);

    // Check boundary collisions
    this.resolvePitchBoundaries();

    // Track possession
    this.trackPossession();

    // Check goals
    this.checkGoalCondition();

    // Clear just-pressed keys
    this.justPressedKeys = {};
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
    // Red player: strictly WASD and Space
    if (!this.playerRed.isAi) {
      let dx = 0;
      let dy = 0;
      if (this.keys['KeyW']) dy -= 1;
      if (this.keys['KeyS']) dy += 1;
      if (this.keys['KeyA']) dx -= 1;
      if (this.keys['KeyD']) dx += 1;

      // Touch fallback for Red
      if (this.touchRed.x !== 0 || this.touchRed.y !== 0) {
        dx = this.touchRed.x;
        dy = this.touchRed.y;
      }

      this.applyPlayerMovement(this.playerRed, dx, dy, dt);

      // Red Kick: Space
      const redKickPressed = !!this.justPressedKeys['Space'];
      if (redKickPressed) {
        this.registerKickTap(this.playerRed);
      }
      const redKickHeld = !!this.keys['Space'] || this.touchRed.kick;
      if ((redKickPressed || redKickHeld) && this.playerRed.kickCooldown <= 0) {
        this.attemptKick(this.playerRed);
      }
    }

    // Blue player: strictly Arrow keys (+ Numpad / IJKL) and KeyP
    if (!this.playerBlue.isAi) {
      let dx = 0;
      let dy = 0;

      if (this.keys['ArrowUp'] || this.keys['Numpad8'] || this.keys['KeyI']) dy -= 1;
      if (this.keys['ArrowDown'] || this.keys['Numpad5'] || this.keys['Numpad2'] || this.keys['KeyK']) dy += 1;
      if (this.keys['ArrowLeft'] || this.keys['Numpad4'] || this.keys['KeyJ']) dx -= 1;
      if (this.keys['ArrowRight'] || this.keys['Numpad6'] || this.keys['KeyL']) dx += 1;

      // Touch fallback for Blue
      if (this.touchBlue.x !== 0 || this.touchBlue.y !== 0) {
        dx = this.touchBlue.x;
        dy = this.touchBlue.y;
      }

      this.applyPlayerMovement(this.playerBlue, dx, dy, dt);

      // Blue Kick: KeyP
      const blueKickPressed = !!this.justPressedKeys['KeyP'];
      if (blueKickPressed) {
        this.registerKickTap(this.playerBlue);
      }
      const blueKickHeld = !!this.keys['KeyP'] || this.touchBlue.kick;
      if ((blueKickPressed || blueKickHeld) && this.playerBlue.kickCooldown <= 0) {
        this.attemptKick(this.playerBlue);
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

  private applyPlayerMovement(player: Player, dx: number, dy: number, dt: number) {
    const isGrand = this.settings.stadiumType === 'grand_stadium';
    const ACCEL = isGrand ? 6600 : 5400; // Increased acceleration for snappy control
    const MAX_SPEED = isGrand ? 520 : 440; // Max speed scaled for stadium

    // Rapid counter-braking (Active Braking) for ultra-sharp instant turn response
    if (dx !== 0) {
      if ((dx > 0 && player.vx < -30) || (dx < 0 && player.vx > 30)) {
        player.vx *= 0.55; // instant braking impulse
      }
    }
    if (dy !== 0) {
      if ((dy > 0 && player.vy < -30) || (dy < 0 && player.vy > 30)) {
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
      if (curSpeed > 280 && Math.random() < 0.25) {
        this.spawnGrassParticle(player.x, player.y + player.radius * 0.6);
      }
    }
  }

  private attemptKick(player: Player) {
    player.kickCooldown = 0.22; // Quick, responsive cooldown
    player.isKicking = true;

    // Check distance to ball
    const dist = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
    const kickRange = player.radius + this.ball.radius + 18;

    if (dist <= kickRange) {
      // Calculate unit direction from player to ball
      let dirX = (this.ball.x - player.x) / (dist || 1);
      let dirY = (this.ball.y - player.y) / (dist || 1);

      const pitch = this.pitchConfig;
      const margin = this.pitchMargin;

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
      const isGrand = this.settings.stadiumType === 'grand_stadium';
      const basePower = isGrand ? 1040 : 860;
      const KICK_POWER = isSuper ? basePower * 2.0 : basePower; // 2X SPEED!

      this.ball.vx = dirX * KICK_POWER + player.vx * 0.35;
      this.ball.vy = dirY * KICK_POWER + player.vy * 0.35;
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
      // Whiff kick / mini dash
      soundManager.playKick(0.3);
      const moveSpeed = Math.hypot(player.vx, player.vy);
      if (moveSpeed > 50) {
        player.vx *= 1.25;
        player.vy *= 1.25;
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

    // Keep players inside pitch boundary (cannot go into the net)
    const pitch = this.pitchConfig;
    const margin = this.pitchMargin;
    const pitchLeft = margin.x;
    const pitchRight = pitch.width - margin.x;
    const pitchTop = margin.y;
    const pitchBottom = pitch.height - margin.y;

    if (player.x - player.radius < pitchLeft) {
      player.x = pitchLeft + player.radius;
      player.vx = 0;
    }
    if (player.x + player.radius > pitchRight) {
      player.x = pitchRight - player.radius;
      player.vx = 0;
    }
    if (player.y - player.radius < pitchTop) {
      player.y = pitchTop + player.radius;
      player.vy = 0;
    }
    if (player.y + player.radius > pitchBottom) {
      player.y = pitchBottom - player.radius;
      player.vy = 0;
    }
  }

  private resolvePlayerPlayerCollision() {
    const dx = this.playerBlue.x - this.playerRed.x;
    const dy = this.playerBlue.y - this.playerRed.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.playerRed.radius + this.playerBlue.radius;

    if (dist < minDist && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      // Clean position separation with safety margin to prevent sticking
      const separation = overlap * 0.52;
      this.playerRed.x -= nx * separation;
      this.playerRed.y -= ny * separation;
      this.playerBlue.x += nx * separation;
      this.playerBlue.y += ny * separation;

      // Relative velocity: velocity of Blue relative to Red
      const rvx = this.playerBlue.vx - this.playerRed.vx;
      const rvy = this.playerBlue.vy - this.playerRed.vy;

      // Normal velocity component (negative means moving towards each other)
      const velAlongNormal = rvx * nx + rvy * ny;

      // CRITICAL: ONLY apply impulse if discs are moving TOWARDS each other!
      if (velAlongNormal < 0) {
        const RESTITUTION = 0.55;
        const impulse = -(1 + RESTITUTION) * velAlongNormal * 0.5;

        this.playerRed.vx -= nx * impulse;
        this.playerRed.vy -= ny * impulse;
        this.playerBlue.vx += nx * impulse;
        this.playerBlue.vy += ny * impulse;

        soundManager.playBounce();
        this.spawnSparks((this.playerRed.x + this.playerBlue.x) / 2, (this.playerRed.y + this.playerBlue.y) / 2, 4);
      }
    }
  }

  private updateBallPhysics(dt: number) {
    // Rolling friction
    const BALL_FRICTION = 0.985;
    const frictionFactor = Math.pow(BALL_FRICTION, dt * 60);
    this.ball.vx *= frictionFactor;
    this.ball.vy *= frictionFactor;

    // Position
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // Rotation
    const ballSpeed = Math.hypot(this.ball.vx, this.ball.vy);
    this.ball.rotation += (ballSpeed * dt) / this.ball.radius;

    // Clear super shot flag once ball slows down below threshold
    if (this.ball.isSuperShot && ballSpeed < 320) {
      this.ball.isSuperShot = false;
    }

    // Speed trail for fast shots & super shots
    if (ballSpeed > 340) {
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
    const dx = this.ball.x - player.x;
    const dy = this.ball.y - player.y;
    const dist = Math.hypot(dx, dy);
    const minDist = player.radius + this.ball.radius;

    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      // Push ball out of player
      this.ball.x += nx * overlap * 0.85;
      this.ball.y += ny * overlap * 0.85;
      player.x -= nx * overlap * 0.15;
      player.y -= ny * overlap * 0.15;

      // Calculate relative velocity
      const rvx = this.ball.vx - player.vx;
      const rvy = this.ball.vy - player.vy;
      const velAlongNormal = rvx * nx + rvy * ny;

      if (velAlongNormal < 0) {
        // Elastic impulse
        const RESTITUTION = 0.75;
        const impulse = -(1 + RESTITUTION) * velAlongNormal;
        this.ball.vx += nx * impulse * 1.35;
        this.ball.vy += ny * impulse * 1.35;
        player.vx -= nx * impulse * 0.2;
        player.vy -= ny * impulse * 0.2;

        this.ball.lastTouch = player.id;
        soundManager.playBounce();
      }
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

    // Top and Bottom walls
    if (this.ball.y - r < pitchTop) {
      this.ball.y = pitchTop + r;
      this.ball.vy = -this.ball.vy * 0.85;
      soundManager.playBounce();
    }
    if (this.ball.y + r > pitchBottom) {
      this.ball.y = pitchBottom - r;
      this.ball.vy = -this.ball.vy * 0.85;
      soundManager.playBounce();
    }

    // Goal posts positions
    const leftTopPost = { x: pitchLeft, y: goalTop };
    const leftBottomPost = { x: pitchLeft, y: goalBottom };
    const rightTopPost = { x: pitchRight, y: goalTop };
    const rightBottomPost = { x: pitchRight, y: goalBottom };
    const posts = [leftTopPost, leftBottomPost, rightTopPost, rightBottomPost];

    // Collide ball with round posts
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

        // Reflect ball velocity
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

    // Left Goal boundary logic
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
    } else {
      if (this.ball.x - r < pitchLeft) {
        this.ball.x = pitchLeft + r;
        this.ball.vx = -this.ball.vx * 0.85;
        soundManager.playBounce();
      }
    }

    // Right Goal boundary logic
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
    } else {
      if (this.ball.x + r > pitchRight) {
        this.ball.x = pitchRight - r;
        this.ball.vx = -this.ball.vx * 0.85;
        soundManager.playBounce();
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
    const redDist = Math.hypot(this.ball.x - this.playerRed.x, this.ball.y - this.playerRed.y);
    const blueDist = Math.hypot(this.ball.x - this.playerBlue.x, this.ball.y - this.playerBlue.y);

    if (redDist < 120 && redDist < blueDist) {
      this.playerRed.possessionFrames++;
    } else if (blueDist < 120 && blueDist < redDist) {
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
    const isGrand = this.settings.stadiumType === 'grand_stadium';
    const baseAiSpeed = diff === 'easy' ? 320 : diff === 'normal' ? 380 : 430;
    const maxSpeed = (isGrand ? baseAiSpeed * 1.15 : baseAiSpeed) * reactionDelay;

    const isBallBehind = isRed ? this.ball.x < bot.x : this.ball.x > bot.x;

    let targetX = 0;
    let targetY = 0;

    if (isBallBehind) {
      // Retreat to goal defense line
      targetX = ownGoalX + (isRed ? (isGrand ? 110 : 70) : (isGrand ? -110 : -70));
      targetY = Math.max(
        pitch.height / 2 - pitch.goalWidth / 2 + 10,
        Math.min(pitch.height / 2 + pitch.goalWidth / 2 - 10, this.ball.y)
      );
    } else {
      // Offensive mode
      const angleToGoal = Math.atan2(targetGoalY - this.ball.y, targetGoalX - this.ball.x);
      const standBehindDistance = isGrand ? 38 : 32;

      targetX = this.ball.x - Math.cos(angleToGoal) * standBehindDistance;
      targetY = this.ball.y - Math.sin(angleToGoal) * standBehindDistance;
    }

    const dx = targetX - bot.x;
    const dy = targetY - bot.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      const ndx = dx / dist;
      const ndy = dy / dist;
      bot.vx += ndx * 5000 * dt;
      bot.vy += ndy * 5000 * dt;

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
      redPossession: redPoss,
      bluePossession: bluePoss,
      winner,
      duration: Math.round(this.totalMatchTime),
    };
  }
}
