import React from 'react';

interface CountdownOverlayProps {
  count: number;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count }) => {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
      <div className="flex flex-col items-center animate-in zoom-in-50 duration-150">
        <div className="font-display font-black text-7xl sm:text-9xl text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.8)]">
          {count > 0 ? count : 'BAŞLA!'}
        </div>
        <div className="mt-2 text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-400 bg-slate-900/90 px-4 py-1.5 rounded-full border border-slate-700 shadow-xl">
          {count > 0 ? 'Santra İçin Hazır Olun' : 'Maç Başladı!'}
        </div>
      </div>
    </div>
  );
};
