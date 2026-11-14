import React from 'react';

interface CountdownOverlayProps {
  count: number;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count }) => {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
      <div className="flex flex-col items-center animate-in zoom-in-50 duration-150">
        <div className="font-mono font-semibold tabular-nums text-7xl sm:text-9xl text-white tracking-[-0.04em] drop-shadow-[0_12px_32px_rgba(0,0,0,0.85)]">
          {count > 0 ? count : 'BAŞLA'}
        </div>
        <div className="mt-3 text-xs font-mono uppercase tracking-widest text-[#888888] bg-[#111111]/95 px-4 py-1.5 rounded-md border border-zinc-800 shadow-lg">
          {count > 0 ? 'Santra İçin Hazır Olun' : 'Maç Başladı'}
        </div>
      </div>
    </div>
  );
};
