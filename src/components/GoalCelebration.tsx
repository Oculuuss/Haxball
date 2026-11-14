import React from 'react';
import { CLUBS, ClubId, TeamId } from '../types/game';

interface GoalCelebrationProps {
  scoringTeam: TeamId | null;
  redScore: number;
  blueScore: number;
  homeClub?: ClubId;
  awayClub?: ClubId;
}

export const GoalCelebration: React.FC<GoalCelebrationProps> = ({
  scoringTeam,
  homeClub = 'liverpool',
  awayClub = 'ipswich',
}) => {
  if (!scoringTeam) return null;

  const isRed = scoringTeam === 'red';
  const scoringClub = isRed ? CLUBS[homeClub] || CLUBS.liverpool : CLUBS[awayClub] || CLUBS.ipswich;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden select-none animate-in fade-in duration-300">
      {/* Stadium Camera Flash Light Sweep (Full-screen broadcast lighting) */}
      <div
        className={`absolute inset-0 ${
          isRed
            ? 'bg-gradient-to-b from-red-600/25 via-amber-500/10 to-transparent'
            : 'bg-gradient-to-b from-blue-600/25 via-cyan-400/10 to-transparent'
        } backdrop-blur-[1px] animate-pl-flash pointer-events-none`}
      />

      {/* Top Stadium Floodlights Flare on the Pitch */}
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      {/* Ambient Stadium Lighting Rays (Left & Right Pitch Wings) */}
      <div
        className={`absolute top-0 left-0 w-1/3 h-full ${
          isRed ? 'bg-gradient-to-r from-red-600/15 to-transparent' : 'bg-gradient-to-r from-blue-600/15 to-transparent'
        } pointer-events-none transition-opacity duration-500`}
      />
      <div
        className={`absolute top-0 right-0 w-1/3 h-full ${
          isRed ? 'bg-gradient-to-l from-red-600/15 to-transparent' : 'bg-gradient-to-l from-blue-600/15 to-transparent'
        } pointer-events-none transition-opacity duration-500`}
      />

      {/* Subtle celebratory floating gold/team light specks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${
              i % 3 === 0 ? 'bg-yellow-300' : isRed ? 'bg-red-400' : 'bg-sky-400'
            } opacity-60 animate-pulse`}
            style={{
              width: `${4 + (i % 3) * 3}px`,
              height: `${4 + (i % 3) * 3}px`,
              left: `${(i * 7.3 + 4) % 94}%`,
              top: `${(i * 9.1 + 15) % 70}%`,
              filter: 'blur(0.5px)',
            }}
          />
        ))}
      </div>
    </div>
  );
};
