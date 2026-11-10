import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GameEngine } from '../game/physics';
import { TeamId } from '../types/game';
import { Zap, Gamepad2, Disc3, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface TouchControlsProps {
  engine: GameEngine | null;
  isRedAi: boolean;
  isBlueAi: boolean;
}

type ControlType = 'joystick' | 'dpad';

// ----------------------------------------------------
// VIRTUAL JOYSTICK COMPONENT
// ----------------------------------------------------
interface VirtualJoystickProps {
  team: TeamId;
  engine: GameEngine;
  label: string;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ team, engine, label }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  // Store pointer or touch ID to isolate from other fingers
  const activePointerIdRef = useRef<number | null>(null);
  const activeTouchIdRef = useRef<number | null>(null);

  const resetJoystick = useCallback(() => {
    activePointerIdRef.current = null;
    activeTouchIdRef.current = null;
    setIsActive(false);
    setKnobPos({ x: 0, y: 0 });
    if (team === 'red') {
      engine.touchRed.x = 0;
      engine.touchRed.y = 0;
    } else {
      engine.touchBlue.x = 0;
      engine.touchBlue.y = 0;
    }
  }, [team, engine]);

  const updateCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!baseRef.current) return;
      const rect = baseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rawDx = clientX - centerX;
      const rawDy = clientY - centerY;
      const dist = Math.hypot(rawDx, rawDy);
      const maxR = rect.width * 0.44; // Max knob displacement

      if (dist < 4) {
        setKnobPos({ x: 0, y: 0 });
        if (team === 'red') {
          engine.touchRed.x = 0;
          engine.touchRed.y = 0;
        } else {
          engine.touchBlue.x = 0;
          engine.touchBlue.y = 0;
        }
        return;
      }

      // Normalized direction
      const nx = rawDx / dist;
      const ny = rawDy / dist;

      // Clamped visual knob
      const clampedDist = Math.min(dist, maxR);
      const knobX = nx * clampedDist;
      const knobY = ny * clampedDist;
      setKnobPos({ x: knobX, y: knobY });

      // Power factor (0 to 1)
      const power = Math.min(1, dist / maxR);
      const outputX = nx * power;
      const outputY = ny * power;

      if (team === 'red') {
        engine.touchRed.x = Math.max(-1, Math.min(1, outputX));
        engine.touchRed.y = Math.max(-1, Math.min(1, outputY));
      } else {
        engine.touchBlue.x = Math.max(-1, Math.min(1, outputX));
        engine.touchBlue.y = Math.max(-1, Math.min(1, outputY));
      }
    },
    [team, engine]
  );

  // Pointer Events (Modern W3C standard with Pointer Capture)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture not supported
    }
    activePointerIdRef.current = e.pointerId;
    setIsActive(true);
    updateCoordinates(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === null || e.pointerId !== activePointerIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    updateCoordinates(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === null || e.pointerId === activePointerIdRef.current) {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
      resetJoystick();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    resetJoystick();
  };

  // Touch Events Fallback
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      activeTouchIdRef.current = touch.identifier;
      setIsActive(true);
      updateCoordinates(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeTouchIdRef.current === null) return;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === activeTouchIdRef.current) {
        updateCoordinates(e.touches[i].clientX, e.touches[i].clientY);
        return;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeTouchIdRef.current !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
          resetJoystick();
          return;
        }
      }
    }
    if (e.touches.length === 0) {
      resetJoystick();
    }
  };

  const handleTouchCancel = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    resetJoystick();
  };

  // Global window listeners when active: guarantees release if finger lifts outside
  useEffect(() => {
    if (!isActive) return;

    const onGlobalPointerUp = () => resetJoystick();
    const onGlobalTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        resetJoystick();
      }
    };
    const onGlobalTouchCancel = () => resetJoystick();

    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('pointercancel', onGlobalPointerUp);
    window.addEventListener('mouseup', onGlobalPointerUp);
    window.addEventListener('touchend', onGlobalTouchEnd);
    window.addEventListener('touchcancel', onGlobalTouchCancel);

    return () => {
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('pointercancel', onGlobalPointerUp);
      window.removeEventListener('mouseup', onGlobalPointerUp);
      window.removeEventListener('touchend', onGlobalTouchEnd);
      window.removeEventListener('touchcancel', onGlobalTouchCancel);
    };
  }, [isActive, resetJoystick]);

  const isRed = team === 'red';

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full relative touch-none select-none flex items-center justify-center transition-shadow ${
        isRed
          ? 'bg-slate-950/80 border-2 border-red-500/40 shadow-lg shadow-red-950/40'
          : 'bg-slate-950/80 border-2 border-blue-500/40 shadow-lg shadow-blue-950/40'
      } ${isActive ? (isRed ? 'border-red-400 ring-2 ring-red-500/30' : 'border-blue-400 ring-2 ring-blue-500/30') : ''}`}
      style={{ touchAction: 'none' }}
    >
      {/* Directional markers */}
      <div className="absolute top-1.5 w-1.5 h-1.5 rounded-full bg-white/20 pointer-events-none" />
      <div className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-white/20 pointer-events-none" />
      <div className="absolute left-1.5 w-1.5 h-1.5 rounded-full bg-white/20 pointer-events-none" />
      <div className="absolute right-1.5 w-1.5 h-1.5 rounded-full bg-white/20 pointer-events-none" />

      {/* Center resting ring */}
      <div className="w-10 h-10 rounded-full border border-white/10 pointer-events-none flex items-center justify-center">
        <span className="text-[9px] font-bold text-white/30 tracking-widest">{label}</span>
      </div>

      {/* Floating movable joystick knob */}
      <div
        className={`w-12 h-12 rounded-full absolute pointer-events-none shadow-xl flex items-center justify-center border-2 ${
          isRed
            ? 'bg-gradient-to-br from-red-500 to-red-700 border-red-200 text-white shadow-red-600/40'
            : 'bg-gradient-to-br from-blue-500 to-blue-700 border-blue-200 text-white shadow-blue-600/40'
        } ${isActive ? 'scale-105' : 'transition-transform duration-100 ease-out'}`}
        style={{
          transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
        }}
      >
        <div className="w-3.5 h-3.5 rounded-full bg-white/40" />
      </div>
    </div>
  );
};

// ----------------------------------------------------
// D-PAD COMPONENT (ARCADE DIRECTION BUTTONS)
// ----------------------------------------------------
interface DPadProps {
  team: TeamId;
  engine: GameEngine;
}

const DPad: React.FC<DPadProps> = ({ team, engine }) => {
  const activeDirectionsRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const syncDPad = useCallback(() => {
    let dx = 0;
    let dy = 0;
    if (activeDirectionsRef.current.up) dy -= 1;
    if (activeDirectionsRef.current.down) dy += 1;
    if (activeDirectionsRef.current.left) dx -= 1;
    if (activeDirectionsRef.current.right) dx += 1;

    if (team === 'red') {
      engine.touchRed.x = dx;
      engine.touchRed.y = dy;
    } else {
      engine.touchBlue.x = dx;
      engine.touchBlue.y = dy;
    }
  }, [team, engine]);

  const setDir = (dir: 'up' | 'down' | 'left' | 'right', val: boolean) => {
    activeDirectionsRef.current[dir] = val;
    syncDPad();
  };

  const resetAll = useCallback(() => {
    activeDirectionsRef.current = { up: false, down: false, left: false, right: false };
    syncDPad();
  }, [syncDPad]);

  useEffect(() => {
    const onGlobalRelease = () => resetAll();
    window.addEventListener('mouseup', onGlobalRelease);
    window.addEventListener('pointerup', onGlobalRelease);
    window.addEventListener('touchend', onGlobalRelease);
    window.addEventListener('touchcancel', onGlobalRelease);
    return () => {
      window.removeEventListener('mouseup', onGlobalRelease);
      window.removeEventListener('pointerup', onGlobalRelease);
      window.removeEventListener('touchend', onGlobalRelease);
      window.removeEventListener('touchcancel', onGlobalRelease);
    };
  }, [resetAll]);

  const isRed = team === 'red';
  const baseBtnClass = `w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-white select-none touch-none active:scale-90 transition-all border ${
    isRed
      ? 'bg-slate-900 border-red-500/40 text-red-300 active:bg-red-600 active:text-white'
      : 'bg-slate-900 border-blue-500/40 text-blue-300 active:bg-blue-600 active:text-white'
  }`;

  const makeHandlers = (dir: 'up' | 'down' | 'left' | 'right') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      setDir(dir, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      setDir(dir, false);
    },
    onPointerLeave: () => setDir(dir, false),
    onPointerCancel: () => setDir(dir, false),
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      setDir(dir, true);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      setDir(dir, false);
    },
    onTouchCancel: () => setDir(dir, false),
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      setDir(dir, true);
    },
    onMouseUp: () => setDir(dir, false),
    onMouseLeave: () => setDir(dir, false),
  });

  return (
    <div className="w-28 h-28 sm:w-32 sm:h-32 relative flex items-center justify-center bg-slate-950/70 rounded-full border border-white/10 p-1">
      {/* UP */}
      <button {...makeHandlers('up')} className={`absolute top-1 ${baseBtnClass}`}>
        <ChevronUp size={18} />
      </button>
      {/* DOWN */}
      <button {...makeHandlers('down')} className={`absolute bottom-1 ${baseBtnClass}`}>
        <ChevronDown size={18} />
      </button>
      {/* LEFT */}
      <button {...makeHandlers('left')} className={`absolute left-1 ${baseBtnClass}`}>
        <ChevronLeft size={18} />
      </button>
      {/* RIGHT */}
      <button {...makeHandlers('right')} className={`absolute right-1 ${baseBtnClass}`}>
        <ChevronRight size={18} />
      </button>
      {/* Center badge */}
      <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
      </div>
    </div>
  );
};

// ----------------------------------------------------
// KICK BUTTON COMPONENT (WITH 3-TAP SUPER SHOT)
// ----------------------------------------------------
interface KickButtonProps {
  team: TeamId;
  engine: GameEngine;
  keyLabel: string;
}

const KickButton: React.FC<KickButtonProps> = ({ team, engine, keyLabel }) => {
  const [isPressed, setIsPressed] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);

  const startKick = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      setIsPressed(true);
      engine.triggerTouchKick(team);
    },
    [team, engine]
  );

  const endKick = useCallback(
    (e?: React.SyntheticEvent) => {
      if (e) e.preventDefault();
      setIsPressed(false);
      activePointerIdRef.current = null;
      engine.releaseTouchKick(team);
    },
    [team, engine]
  );

  // Global listeners to prevent any stuck kick button
  useEffect(() => {
    if (!isPressed) return;

    const onGlobalUp = () => endKick();
    window.addEventListener('pointerup', onGlobalUp);
    window.addEventListener('pointercancel', onGlobalUp);
    window.addEventListener('mouseup', onGlobalUp);
    window.addEventListener('touchend', onGlobalUp);
    window.addEventListener('touchcancel', onGlobalUp);

    return () => {
      window.removeEventListener('pointerup', onGlobalUp);
      window.removeEventListener('pointercancel', onGlobalUp);
      window.removeEventListener('mouseup', onGlobalUp);
      window.removeEventListener('touchend', onGlobalUp);
      window.removeEventListener('touchcancel', onGlobalUp);
    };
  }, [isPressed, endKick]);

  const isRed = team === 'red';

  return (
    <button
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
          activePointerIdRef.current = e.pointerId;
        } catch {
          // ignore
        }
        startKick(e);
      }}
      onPointerUp={(e) => {
        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {
          // ignore
        }
        endKick(e);
      }}
      onPointerLeave={endKick}
      onPointerCancel={endKick}
      onTouchStart={startKick}
      onTouchEnd={endKick}
      onTouchCancel={endKick}
      onMouseDown={startKick}
      onMouseUp={endKick}
      onMouseLeave={endKick}
      style={{ touchAction: 'none' }}
      className={`w-18 h-18 sm:w-22 sm:h-22 rounded-2xl select-none touch-none flex flex-col items-center justify-center font-display border-2 transition-transform shadow-xl ${
        isPressed ? 'scale-90 brightness-125' : 'active:scale-95'
      } ${
        isRed
          ? 'bg-gradient-to-br from-red-600 to-red-800 text-white border-red-300 shadow-red-600/30'
          : 'bg-gradient-to-br from-blue-600 to-blue-800 text-white border-blue-300 shadow-blue-600/30'
      }`}
    >
      <div className="flex items-center gap-1">
        <Zap size={14} className={isPressed ? 'text-amber-300 fill-amber-300 animate-pulse' : 'text-white/80'} />
        <span className="font-black text-sm sm:text-base tracking-wide">ŞUT</span>
      </div>
      <span className="text-[9px] font-semibold text-white/70 tracking-wider uppercase mt-0.5">{keyLabel}</span>
      <span className="text-[8px] font-bold text-amber-300/90 tracking-tighter mt-0.5">3X SÜPER</span>
    </button>
  );
};

// ----------------------------------------------------
// MAIN TOUCH CONTROLS OVERLAY
// ----------------------------------------------------
export const TouchControls: React.FC<TouchControlsProps> = ({ engine, isRedAi, isBlueAi }) => {
  const [controlType, setControlType] = useState<ControlType>('joystick');

  if (!engine) return null;

  return (
    <div className="absolute inset-x-0 bottom-2 px-3 sm:px-6 z-20 pointer-events-none flex justify-between items-end select-none">
      {/* RED PLAYER CONTROLS (Left side) */}
      {!isRedAi ? (
        <div className="pointer-events-auto flex items-end gap-2.5 sm:gap-4">
          <div className="flex flex-col items-center gap-1.5">
            {controlType === 'joystick' ? (
              <VirtualJoystick team="red" engine={engine} label="WASD" />
            ) : (
              <DPad team="red" engine={engine} />
            )}
            {/* Control mode switcher pill */}
            <button
              onClick={() => setControlType((prev) => (prev === 'joystick' ? 'dpad' : 'joystick'))}
              className="px-2 py-0.5 rounded-full bg-slate-900/80 text-[10px] font-medium text-slate-400 hover:text-slate-200 border border-white/10 flex items-center gap-1"
            >
              {controlType === 'joystick' ? <Disc3 size={11} /> : <Gamepad2 size={11} />}
              <span>{controlType === 'joystick' ? 'Joystick' : 'D-Pad'}</span>
            </button>
          </div>

          <KickButton team="red" engine={engine} keyLabel="Boşluk" />
        </div>
      ) : (
        <div />
      )}

      {/* BLUE PLAYER CONTROLS (Right side) */}
      {!isBlueAi && (
        <div className="pointer-events-auto flex items-end gap-2.5 sm:gap-4">
          <KickButton team="blue" engine={engine} keyLabel="P Tuşu" />

          <div className="flex flex-col items-center gap-1.5">
            {controlType === 'joystick' ? (
              <VirtualJoystick team="blue" engine={engine} label="YÖN" />
            ) : (
              <DPad team="blue" engine={engine} />
            )}
            {/* Control mode switcher pill */}
            <button
              onClick={() => setControlType((prev) => (prev === 'joystick' ? 'dpad' : 'joystick'))}
              className="px-2 py-0.5 rounded-full bg-slate-900/80 text-[10px] font-medium text-slate-400 hover:text-slate-200 border border-white/10 flex items-center gap-1"
            >
              {controlType === 'joystick' ? <Disc3 size={11} /> : <Gamepad2 size={11} />}
              <span>{controlType === 'joystick' ? 'Joystick' : 'D-Pad'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
