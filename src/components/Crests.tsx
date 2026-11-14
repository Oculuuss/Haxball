import React from 'react';
import { ClubId, CLUBS } from '../types/game';

// Premier League Crowned Lion Logo SVG
export const PremierLeagueLion: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M50 8 C42 8 36 12 32 18 C30 15 26 13 22 15 C18 17 17 22 19 26 C15 28 12 32 12 37 C12 43 16 48 21 50 C20 54 21 59 24 63 C20 67 18 73 20 79 C22 85 28 89 34 89 C38 92 44 94 50 94 C56 94 62 92 66 89 C72 89 78 85 80 79 C82 73 80 67 76 63 C79 59 80 54 79 50 C84 48 88 43 88 37 C88 32 85 28 81 26 C83 22 82 17 78 15 C74 13 70 15 68 18 C64 12 58 8 50 8 Z" opacity="0.2" />
    <path d="M50 14 C44 14 39 17 36 22 L41 26 C43 23 46 21 50 21 C54 21 57 23 59 26 L64 22 C61 17 56 14 50 14 Z" fill="#00ff85" />
    <path d="M50 25 C40 25 32 33 32 43 C32 50 36 56 42 59 L40 68 L48 64 L50 67 L52 64 L60 68 L58 59 C64 56 68 50 68 43 C68 33 60 25 50 25 Z M44 41 C42 41 40 39 40 37 C40 35 42 33 44 33 C46 33 48 35 48 37 C48 39 46 41 44 41 Z M56 41 C54 41 52 39 52 37 C52 35 54 33 56 33 C58 33 60 35 60 37 C60 39 58 41 56 41 Z M50 54 C46 54 44 50 44 48 L56 48 C56 50 54 54 50 54 Z" />
    <polygon points="50,10 46,18 54,18" fill="#00ff85" />
    <polygon points="38,13 36,21 43,19" fill="#00ff85" />
    <polygon points="62,13 57,19 64,21" fill="#00ff85" />
  </svg>
);

// Liverpool FC Liverbird Crest (using user-provided logo)
export const LiverpoolCrest: React.FC<{ className?: string; alt?: string }> = ({
  className = 'w-6 h-6',
  alt = 'Liverpool FC',
}) => (
  <img
    src={CLUBS.liverpool.logo}
    alt={alt}
    referrerPolicy="no-referrer"
    className={`object-contain select-none pointer-events-none drop-shadow ${className}`}
    loading="eager"
  />
);

// Ipswich Town FC Crest (using user-provided logo)
export const IpswichCrest: React.FC<{ className?: string; alt?: string }> = ({
  className = 'w-6 h-6',
  alt = 'Ipswich Town FC',
}) => (
  <img
    src={CLUBS.ipswich.logo}
    alt={alt}
    referrerPolicy="no-referrer"
    className={`object-contain select-none pointer-events-none drop-shadow ${className}`}
    loading="eager"
  />
);

// Arsenal FC Crest (using user-provided logo)
export const ArsenalCrest: React.FC<{ className?: string; alt?: string }> = ({
  className = 'w-6 h-6',
  alt = 'Arsenal FC',
}) => (
  <img
    src={CLUBS.arsenal.logo}
    alt={alt}
    referrerPolicy="no-referrer"
    className={`object-contain select-none pointer-events-none drop-shadow ${className}`}
    loading="eager"
  />
);

// Aston Villa FC Crest (using user-provided logo)
export const AstonVillaCrest: React.FC<{ className?: string; alt?: string }> = ({
  className = 'w-6 h-6',
  alt = 'Aston Villa FC',
}) => (
  <img
    src={CLUBS.aston_villa.logo}
    alt={alt}
    referrerPolicy="no-referrer"
    className={`object-contain select-none pointer-events-none drop-shadow ${className}`}
    loading="eager"
  />
);

// Generic Club Crest Resolver
export const ClubLogo: React.FC<{ clubId: ClubId; className?: string }> = ({ clubId, className = 'w-6 h-6' }) => {
  const club = CLUBS[clubId] || CLUBS.liverpool;
  return (
    <img
      src={club.logo}
      alt={club.name}
      referrerPolicy="no-referrer"
      className={`object-contain select-none pointer-events-none drop-shadow ${className}`}
      loading="eager"
    />
  );
};
