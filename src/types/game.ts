export type TeamId = 'red' | 'blue';

export type GameState = 'menu' | 'countdown' | 'playing' | 'goal' | 'paused' | 'gameover' | 'replay';

export type GameMode = '2player' | '1player_vs_ai' | 'online_room';

export type StadiumTheme = 'classic' | 'night' | 'indoor';

export type StadiumType = 'classic' | 'grand_stadium';

export type CameraMode = 'dynamic' | 'overview';

export interface Player {
  id: TeamId;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  accentColor: string;
  glowColor: string;
  number: number;
  score: number;
  isAi: boolean;
  kickCooldown: number; // in seconds
  isKicking: boolean;
  kickCharge: number;
  shots: number;
  shotsOnTarget: number;
  possessionFrames: number;
  tapTimestamps: number[]; // timestamps of recent kick presses for 3-tap detection
  isSuperShot: boolean;
  superShotActiveTimer: number; // timer showing active super shot visual
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  lastTouch: TeamId | null;
  speedTrail: { x: number; y: number; alpha: number; isSuper?: boolean }[];
  isSuperShot: boolean;
}

export interface ReplayFrame {
  ball: { x: number; y: number; vx: number; vy: number; rotation: number; isSuperShot?: boolean };
  playerRed: { x: number; y: number; vx: number; vy: number; isKicking: boolean; isSuperShot?: boolean };
  playerBlue: { x: number; y: number; vx: number; vy: number; isKicking: boolean; isSuperShot?: boolean };
}

export interface GoalReplay {
  id: string;
  scorer: TeamId;
  scoreRed: number;
  scoreBlue: number;
  matchTime: number; // time when goal occurred
  frames: ReplayFrame[];
  goalFrameIndex: number;
}

export interface GoalPost {
  x: number;
  y: number;
  radius: number;
}

export interface GoalNet {
  x: number;
  y: number;
  width: number;
  height: number;
  side: 'left' | 'right';
}

export interface PitchConfig {
  width: number;
  height: number;
  goalWidth: number;
  goalDepth: number;
  lineWidth: number;
  postRadius: number;
  cornerRadius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'spark' | 'smoke' | 'confetti' | 'grass';
}

export interface MatchSettings {
  durationSeconds: number; // 60, 120, 180, 300
  mode: GameMode;
  aiDifficulty: 'easy' | 'normal' | 'hard';
  userTeam: TeamId; // for 1-player mode
  theme: StadiumTheme;
  goldenGoalOnTie: boolean;
  stadiumType?: StadiumType;
  cameraMode?: CameraMode;
}

export interface MatchStats {
  redScore: number;
  blueScore: number;
  redShots: number;
  blueShots: number;
  redPossession: number; // percentage
  bluePossession: number;
  winner: TeamId | 'tie';
  duration: number;
}
