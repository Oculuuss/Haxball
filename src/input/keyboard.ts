export const GAME_KEY_CODES = new Set<string>([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'KeyP',
  'Numpad8',
  'Numpad5',
  'Numpad2',
  'Numpad4',
  'Numpad6',
  'KeyI',
  'KeyK',
  'KeyJ',
  'KeyL',
]);

const GAME_KEY_VALUES = new Set<string>([
  ' ',
  'Spacebar',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

function normalizeKeyCode(e: KeyboardEvent): string {
  if (e.code && e.code !== 'Unidentified') return e.code;
  if (e.key === ' ' || e.key === 'Spacebar') return 'Space';
  if (e.key.length === 1) return `Key${e.key.toUpperCase()}`;
  return e.key;
}

function getFallbackKeyCode(e: KeyboardEvent): string | null {
  if (!e.key) return null;
  if (e.key === ' ' || e.key === 'Spacebar') return 'Space';
  const upper = e.key.toUpperCase();
  if (['W', 'A', 'S', 'D', 'P', 'I', 'J', 'K', 'L'].includes(upper)) {
    return `Key${upper}`;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    return e.key;
  }
  return null;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export class KeyboardManager {
  public readonly pressedKeys = new Set<string>();
  public readonly justPressedKeys = new Set<string>();

  private attached = false;
  private onEscape?: () => void;
  private onMute?: () => void;
  private onMenuConfirm?: () => void;
  private onResetInputs?: () => void;
  private shouldBlockButtons?: () => boolean;

  public attach(callbacks?: {
    onEscape?: () => void;
    onMute?: () => void;
    onMenuConfirm?: () => void;
    onResetInputs?: () => void;
    shouldBlockButtons?: () => boolean;
  }) {
    this.onEscape = callbacks?.onEscape;
    this.onMute = callbacks?.onMute;
    this.onMenuConfirm = callbacks?.onMenuConfirm;
    this.onResetInputs = callbacks?.onResetInputs;
    this.shouldBlockButtons = callbacks?.shouldBlockButtons;

    if (this.attached) return;
    this.attached = true;

    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.addEventListener('keyup', this.handleKeyUp, { capture: true });
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public detach() {
    if (!this.attached) return;
    this.attached = false;

    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('keyup', this.handleKeyUp, { capture: true });
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.clearAll();
  }

  public isDown(code: string): boolean {
    return this.pressedKeys.has(code);
  }

  public isAnyDown(codes: readonly string[]): boolean {
    for (let i = 0; i < codes.length; i++) {
      if (this.pressedKeys.has(codes[i])) return true;
    }
    return false;
  }

  public isJustPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  public isAnyJustPressed(codes: readonly string[]): boolean {
    for (let i = 0; i < codes.length; i++) {
      if (this.justPressedKeys.has(codes[i])) return true;
    }
    return false;
  }

  public endFrame() {
    this.justPressedKeys.clear();
  }

  public clearAll() {
    this.pressedKeys.clear();
    this.justPressedKeys.clear();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (isEditableElement(e.target)) return;

    const code = normalizeKeyCode(e);
    const fallback = getFallbackKeyCode(e);
    const isGameKey =
      GAME_KEY_CODES.has(code) ||
      (fallback !== null && GAME_KEY_CODES.has(fallback)) ||
      GAME_KEY_VALUES.has(e.key);

    if (isGameKey) {
      e.preventDefault();

      // Blur any focused button so Space / Enter / Arrows never hijack gameplay inputs
      if (
        this.shouldBlockButtons?.() &&
        document.activeElement instanceof HTMLElement &&
        document.activeElement.tagName === 'BUTTON'
      ) {
        document.activeElement.blur();
      }
    }

    // Track key independently in Set without interfering with any other held keys
    if (!this.pressedKeys.has(code) && !e.repeat) {
      this.justPressedKeys.add(code);
    }
    this.pressedKeys.add(code);

    if (fallback && fallback !== code) {
      if (!this.pressedKeys.has(fallback) && !e.repeat) {
        this.justPressedKeys.add(fallback);
      }
      this.pressedKeys.add(fallback);
    }

    // Non-gameplay hotkeys
    if (!e.repeat) {
      if (code === 'Escape') {
        this.onEscape?.();
      } else if (e.key === 'm' || e.key === 'M') {
        this.onMute?.();
      } else if (code === 'Enter' || code === 'Space') {
        this.onMenuConfirm?.();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const code = normalizeKeyCode(e);
    const fallback = getFallbackKeyCode(e);
    const isGameKey =
      GAME_KEY_CODES.has(code) ||
      (fallback !== null && GAME_KEY_CODES.has(fallback)) ||
      GAME_KEY_VALUES.has(e.key);

    // Crucial: preventDefault on keyup as well so Space keyup never triggers a focused button click
    if (isGameKey && !isEditableElement(e.target)) {
      e.preventDefault();
    }

    // Only delete the released key; all other held movement/action keys remain untouched
    this.pressedKeys.delete(code);
    if (fallback) {
      this.pressedKeys.delete(fallback);
    }
  };

  private handleBlur = () => {
    this.clearAll();
    this.onResetInputs?.();
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.clearAll();
      this.onResetInputs?.();
    }
  };
}
