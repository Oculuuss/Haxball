import React from 'react';
import { Gauge } from 'lucide-react';
import { PlayerSpeedMultiplier } from '../types/game';
import { soundManager } from '../audio/soundManager';

export const SPEED_STEPS: { value: PlayerSpeedMultiplier; label: string }[] = [
  { value: 0.5, label: '0.50x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.50x' },
  { value: 2, label: '2x' },
];

interface SpeedSliderNavProps {
  value: PlayerSpeedMultiplier;
  onChange: (speed: PlayerSpeedMultiplier) => void;
  variant?: 'panel' | 'compact' | 'hud';
  theme?: 'dark' | 'sports';
  blurOnInteract?: boolean;
}

export const SpeedSliderNav: React.FC<SpeedSliderNavProps> = ({
  value,
  onChange,
  variant = 'panel',
  theme = 'dark',
  blurOnInteract = false,
}) => {
  const currentIndex = Math.max(
    0,
    SPEED_STEPS.findIndex((step) => step.value === value)
  );
  const activeStep = SPEED_STEPS[currentIndex] || SPEED_STEPS[2];
  const percent = (currentIndex / (SPEED_STEPS.length - 1)) * 100;
  const thumbOffsetPx = 7 - (percent / 100) * 14;

  const selectIndex = (index: number, el?: HTMLElement | null) => {
    const clamped = Math.max(0, Math.min(SPEED_STEPS.length - 1, index));
    const next = SPEED_STEPS[clamped].value;
    if (next !== value) {
      soundManager.playClick();
      onChange(next);
    }
    if (blurOnInteract && el) {
      el.blur();
    }
  };

  if (variant === 'hud') {
    return (
      <div
        className="flex items-center gap-2.5 px-3 h-8 rounded-md bg-[#111111]/90 border border-zinc-800 hover:border-zinc-700 backdrop-blur-sm transition-colors"
        title="Karakter Hızı Ayarı (Slider)"
      >
        <div className="flex items-center gap-1.5 text-[#888888] shrink-0">
          <Gauge size={13} className="text-white" />
          <span className="hidden md:inline text-[11px] font-medium text-[#888888]">Hız</span>
        </div>

        <div className="relative w-24 sm:w-28 h-5 flex items-center select-none">
          {/* Background track */}
          <div className="w-full h-1 rounded-full bg-zinc-800 relative overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `calc(${percent}% + ${thumbOffsetPx}px)` }}
            />
          </div>

          {/* Step dots */}
          {SPEED_STEPS.map((step, idx) => {
            const dotPct = (idx / (SPEED_STEPS.length - 1)) * 100;
            const dotOffset = 7 - (dotPct / 100) * 14;
            return (
              <span
                key={step.value}
                className={`pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                  idx <= currentIndex ? 'bg-white' : 'bg-zinc-600'
                }`}
                style={{ left: `calc(${dotPct}% + ${dotOffset}px)` }}
              />
            );
          })}

          {/* Custom thumb */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_0_2px_#111111] transition-all duration-100"
            style={{ left: `calc(${percent}% + ${thumbOffsetPx}px)` }}
          />

          <input
            type="range"
            min={0}
            max={SPEED_STEPS.length - 1}
            step={1}
            value={currentIndex}
            tabIndex={-1}
            aria-label="Karakter Hızı"
            onKeyDown={(e) => e.preventDefault()}
            onChange={(e) => selectIndex(Number(e.target.value), e.currentTarget)}
            onMouseUp={(e) => e.currentTarget.blur()}
            onTouchEnd={(e) => e.currentTarget.blur()}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0"
          />
        </div>

        <span className="font-mono text-[11px] font-medium text-white tabular-nums min-w-[2.4rem] text-right">
          {activeStep.label}
        </span>
      </div>
    );
  }

  const isCompact = variant === 'compact';
  const isSports = theme === 'sports';

  return (
    <div
      className={`rounded-md border ${
        isSports
          ? isCompact
            ? 'bg-slate-50 border-slate-200 px-3 py-2.5'
            : 'bg-slate-50 border-slate-200 px-3.5 py-3'
          : isCompact
          ? 'bg-[#111111] border-zinc-800 px-3 py-2.5'
          : 'bg-[#0a0a0a] border-zinc-800 px-3.5 py-3'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Gauge size={13} className={isSports ? 'text-[#0b46b5]' : 'text-[#888888]'} />
          <label
            className={`${isCompact ? 'text-[11px]' : 'text-xs'} font-semibold ${
              isSports ? 'text-slate-800' : 'text-white'
            }`}
          >
            Karakter Hızı
          </label>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold tabular-nums border ${
            isSports
              ? 'bg-[#0b46b5] border-[#0b46b5] text-white'
              : 'bg-[#111111] border-zinc-800 text-white'
          }`}
        >
          {activeStep.label}
        </span>
      </div>

      {/* Slider Track */}
      <div className="relative h-5 flex items-center select-none">
        <div
          className={`w-full h-1.5 rounded-full relative overflow-hidden ${
            isSports ? 'bg-slate-200' : 'bg-zinc-800'
          }`}
        >
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              isSports ? 'bg-[#0b46b5]' : 'bg-white'
            }`}
            style={{ width: `calc(${percent}% + ${thumbOffsetPx}px)` }}
          />
        </div>

        {/* Tick marks on track */}
        {SPEED_STEPS.map((step, idx) => {
          const tickPct = (idx / (SPEED_STEPS.length - 1)) * 100;
          const tickOffset = 7 - (tickPct / 100) * 14;
          return (
            <span
              key={step.value}
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-colors ${
                isSports
                  ? idx <= currentIndex
                    ? 'bg-white'
                    : 'bg-slate-400'
                  : idx <= currentIndex
                  ? 'bg-white'
                  : 'bg-zinc-700'
              }`}
              style={{ left: `calc(${tickPct}% + ${tickOffset}px)` }}
            />
          );
        })}

        {/* Draggable Thumb */}
        <div
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full transition-all duration-150 ${
            isSports
              ? 'bg-white border-2 border-[#0b46b5] shadow-sm'
              : 'bg-white border border-zinc-300 shadow-[0_0_0_3px_rgba(17,17,17,0.9)]'
          }`}
          style={{ left: `calc(${percent}% + ${thumbOffsetPx}px)` }}
        />

        <input
          type="range"
          min={0}
          max={SPEED_STEPS.length - 1}
          step={1}
          value={currentIndex}
          aria-label="Karakter Hızı"
          onChange={(e) => selectIndex(Number(e.target.value), e.currentTarget)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0"
        />
      </div>

      {/* Clickable Step Nav Labels */}
      <div className="mt-2 flex items-center justify-between gap-1">
        {SPEED_STEPS.map((step, idx) => {
          const isActive = step.value === value;
          return (
            <button
              key={step.value}
              type="button"
              onClick={() => selectIndex(idx)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums transition-colors ${
                isSports
                  ? isActive
                    ? 'bg-[#0b46b5] text-white font-semibold'
                    : 'text-slate-600 hover:text-[#0b46b5] hover:bg-blue-50'
                  : isActive
                  ? 'bg-white text-[#0a0a0a] font-semibold'
                  : 'text-[#888888] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
