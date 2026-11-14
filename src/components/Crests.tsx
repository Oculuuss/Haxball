import React from 'react';
import { ClubId, CLUBS } from '../types/game';

// Premier League Logo PNG
export const PremierLeagueLion: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-full overflow-hidden bg-white shrink-0 select-none pointer-events-none drop-shadow ${className}`}
  >
    <img
      src="/assets/aistudio/images__1__df359870.png"
      alt="Premier League"
      referrerPolicy="no-referrer"
      className="w-[104%] h-[104%] max-w-none object-cover"
      loading="eager"
    />
  </span>
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
