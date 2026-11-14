export type TeamId = 'red' | 'blue';

export type ClubId =
  | 'liverpool'
  | 'arsenal'
  | 'aston_villa'
  | 'brentford'
  | 'chelsea'
  | 'tottenham'
  | 'ipswich';

export interface ClubInfo {
  id: ClubId;
  name: string;
  shortName: string;
  code: string;
  color: string;
  accentColor: string;
  secondaryColor: string;
  glowColor: string;
  ribbonGradient: string;
  stadium: string;
  logo: string;
  characterImage: string;
}

export const CLUBS: Record<ClubId, ClubInfo> = {
  liverpool: {
    id: 'liverpool',
    name: 'Liverpool',
    shortName: 'Liverpool',
    code: 'LIV',
    color: '#c8102e',
    accentColor: '#990014',
    secondaryColor: '#f6eb61',
    glowColor: 'rgba(200, 16, 46, 0.45)',
    ribbonGradient: 'from-[#990014] via-[#c8102e] to-amber-500',
    stadium: 'Anfield',
    logo: '/assets/aistudio/20241203235700_Liverpool_FC_logo_2024_83e0bef3.png',
    characterImage: '/assets/aistudio/file_00000000c250820ab9350cd2af3eadb8_68744e1f.png',
  },
  arsenal: {
    id: 'arsenal',
    name: 'Arsenal',
    shortName: 'Arsenal',
    code: 'ARS',
    color: '#db0007',
    accentColor: '#023474',
    secondaryColor: '#ffffff',
    glowColor: 'rgba(219, 0, 7, 0.45)',
    ribbonGradient: 'from-[#023474] via-[#db0007] to-amber-400',
    stadium: 'Emirates Stadium',
    logo: '/assets/aistudio/Arsenal-FC-Logo-Premier-League-Football-Club_5a9580df.png',
    characterImage: '/assets/aistudio/file_00000000b0c082438d85b8643cc5ff77_b764aa0a.png',
  },
  aston_villa: {
    id: 'aston_villa',
    name: 'Aston Villa',
    shortName: 'Aston Villa',
    code: 'AVL',
    color: '#670e36',
    accentColor: '#490024',
    secondaryColor: '#95bfe5',
    glowColor: 'rgba(103, 14, 54, 0.45)',
    ribbonGradient: 'from-[#490024] via-[#670e36] to-sky-400',
    stadium: 'Villa Park',
    logo: '/assets/aistudio/Aston_Villa_07933d57.png',
    characterImage: '/assets/aistudio/file_000000002bfc81f4acb55fdc30ca14e8_17f424c0.png',
  },
  brentford: {
    id: 'brentford',
    name: 'Brentford',
    shortName: 'Brentford',
    code: 'BRE',
    color: '#e30613',
    accentColor: '#99000b',
    secondaryColor: '#ffffff',
    glowColor: 'rgba(227, 6, 19, 0.45)',
    ribbonGradient: 'from-[#99000b] via-[#e30613] to-amber-400',
    stadium: 'Gtech Community Stadium',
    logo: '/assets/aistudio/Brentford_FC1_40831016.png',
    characterImage: '/assets/aistudio/20261114_114820_0000_3112428c.png',
  },
  chelsea: {
    id: 'chelsea',
    name: 'Chelsea',
    shortName: 'Chelsea',
    code: 'CHE',
    color: '#034694',
    accentColor: '#022a5c',
    secondaryColor: '#ffffff',
    glowColor: 'rgba(3, 70, 148, 0.45)',
    ribbonGradient: 'from-[#022a5c] via-[#034694] to-amber-300',
    stadium: 'Stamford Bridge',
    logo: '/assets/aistudio/chelsea.a22ea19b_6b6e84d2.png',
    characterImage: '/assets/aistudio/file_00000000f48881f4a27103c3d533e05a_9336cb9e.png',
  },
  tottenham: {
    id: 'tottenham',
    name: 'Tottenham Hotspur',
    shortName: 'Tottenham',
    code: 'TOT',
    color: '#132257',
    accentColor: '#091233',
    secondaryColor: '#ffffff',
    glowColor: 'rgba(19, 34, 87, 0.5)',
    ribbonGradient: 'from-[#091233] via-[#132257] to-sky-400',
    stadium: 'Tottenham Hotspur Stadium',
    logo: '/assets/aistudio/Tottenham_Hotspur_42880a6e.png',
    characterImage: '/assets/aistudio/file_00000000018481f4b1c82f006cfa8948_445c30d3.png',
  },
  ipswich: {
    id: 'ipswich',
    name: 'Ipswich Town',
    shortName: 'Ipswich',
    code: 'IPS',
    color: '#004494',
    accentColor: '#002855',
    secondaryColor: '#ffffff',
    glowColor: 'rgba(0, 68, 148, 0.45)',
    ribbonGradient: 'from-[#002855] via-[#004494] to-cyan-400',
    stadium: 'Portman Road',
    logo: '/assets/aistudio/960px-Ipswich_Town.svg_2c638912.png',
    characterImage: '/assets/aistudio/file_0000000051788210a1db15499d7fe5ea_0bca4f6b.png',
  },
};

export const TEAMS = {
  red: {
    id: 'red' as TeamId,
    name: 'Liverpool',
    shortName: 'LIV',
    code: 'LIV',
    color: '#c8102e',
    accentColor: '#990014',
    secondaryColor: '#f6eb61',
    glowColor: 'rgba(200, 16, 46, 0.45)',
    stadium: 'Anfield',
  },
  blue: {
    id: 'blue' as TeamId,
    name: 'Ipswich Town',
    shortName: 'IPS',
    code: 'IPS',
    color: '#004494',
    accentColor: '#002855',
    secondaryColor: '#ffffff',
    glowColor: 'rgba(0, 68, 148, 0.45)',
    stadium: 'Portman Road',
  },
} as const;

export type GameState = 'menu' | 'countdown' | 'playing' | 'goal' | 'paused' | 'gameover' | 'replay';

export type GameMode = '2player' | '1player_vs_ai' | 'online_room';

export type StadiumTheme = 'classic' | 'night' | 'indoor';

export type StadiumType = 'classic' | 'grand_stadium' | 'olympic';

export type MatchFormat = '1v1' | '2v1' | '2v2';

export type CameraMode = 'dynamic' | 'overview';

export type PlayerSpeedMultiplier = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

export type SetPieceType = 'throw_in' | 'corner' | 'goal_kick';

export interface SetPieceState {
  active: boolean;
  type: SetPieceType;
  team: TeamId;
  spotX: number;
  spotY: number;
  timer: number;
  barrierRadius: number;
}

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
  playerRed2?: { x: number; y: number; vx: number; vy: number; isKicking: boolean; isSuperShot?: boolean };
  playerBlue2?: { x: number; y: number; vx: number; vy: number; isKicking: boolean; isSuperShot?: boolean };
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
  matchFormat?: MatchFormat; // '1v1' | '2v1' | '2v2'
  aiDifficulty: 'easy' | 'normal' | 'hard';
  userTeam: TeamId; // for 1-player mode
  homeClub?: ClubId; // default 'liverpool'
  awayClub?: ClubId; // default 'ipswich'
  theme: StadiumTheme;
  goldenGoalOnTie: boolean;
  stadiumType?: StadiumType;
  cameraMode?: CameraMode;
  enableSetPieces?: boolean;
  playerSpeedMultiplier?: PlayerSpeedMultiplier;
  hostLocalPlayers?: 1 | 2;
  guestLocalPlayers?: 1 | 2;
}

export interface MatchStats {
  redScore: number;
  blueScore: number;
  redShots: number;
  blueShots: number;
  redCorners: number;
  blueCorners: number;
  redThrowIns: number;
  blueThrowIns: number;
  redPossession: number; // percentage
  bluePossession: number;
  winner: TeamId | 'tie';
  duration: number;
}
