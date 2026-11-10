class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // Realistic referee whistle sound (2 oscillating frequencies with vibrato)
  public playWhistle(long = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const duration = long ? 0.9 : 0.35;
      const t = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Vibrato LFO
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 24; // rapid whistle flutter
      lfoGain.gain.value = 80;

      lfo.connect(osc1.frequency);
      lfo.connect(osc2.frequency);

      osc1.type = 'triangle';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(2600, t);
      osc2.frequency.setValueAtTime(2950, t);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, t);
      filter.Q.value = 4;

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.04);
      gain.gain.setValueAtTime(0.25, t + duration - 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(t);
      osc1.start(t);
      osc2.start(t);

      lfo.stop(t + duration);
      osc1.stop(t + duration);
      osc2.stop(t + duration);
    } catch {
      // Audio context error ignore
    }
  }

  // Ball kick sound: punchy low-frequency thump with pitch drop
  public playKick(power = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const baseFreq = 140 + Math.min(power * 40, 80);
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.12);

      const vol = Math.min(0.18 + power * 0.15, 0.45);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);

      // Add kick click/slap texture
      const bufferSize = this.ctx.sampleRate * 0.02;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
    } catch {
      // Ignore
    }
  }

  // Super Shot sound: explosive sonic boom + laser surge
  public playSuperShot() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;

      // Laser charge sweep
      const laser = this.ctx.createOscillator();
      const laserGain = this.ctx.createGain();
      laser.type = 'sawtooth';
      laser.frequency.setValueAtTime(320, t);
      laser.frequency.exponentialRampToValueAtTime(1400, t + 0.08);
      laser.frequency.exponentialRampToValueAtTime(60, t + 0.35);

      laserGain.gain.setValueAtTime(0.28, t);
      laserGain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

      const laserFilter = this.ctx.createBiquadFilter();
      laserFilter.type = 'lowpass';
      laserFilter.frequency.setValueAtTime(2800, t);

      laser.connect(laserFilter);
      laserFilter.connect(laserGain);
      laserGain.connect(this.ctx.destination);

      laser.start(t);
      laser.stop(t + 0.38);

      // Deep sub-bass boom
      const boom = this.ctx.createOscillator();
      const boomGain = this.ctx.createGain();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(190, t);
      boom.frequency.exponentialRampToValueAtTime(25, t + 0.45);

      boomGain.gain.setValueAtTime(0.5, t);
      boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

      boom.connect(boomGain);
      boomGain.connect(this.ctx.destination);

      boom.start(t);
      boom.stop(t + 0.5);
    } catch {
      // Ignore
    }
  }

  // Metallic post ping / clang
  public playPostHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const frequencies = [880, 1320, 2200];
      frequencies.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const duration = 0.4 + idx * 0.1;
        gain.gain.setValueAtTime(0.18 / (idx + 1), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + duration);
      });
    } catch {
      // Ignore
    }
  }

  // Goal celebration horn & crowd roar
  public playGoal() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;

      // Double whistle
      this.playWhistle(false);
      setTimeout(() => this.playWhistle(true), 250);

      // Stadium Horn (dual chord fanfare)
      const notes = [220, 277.18, 329.63, 440]; // A major
      notes.forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + 0.2);

        gain.gain.setValueAtTime(0.001, t + 0.2);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.35);
        gain.gain.setValueAtTime(0.08, t + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, t + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + 0.2);
        osc.stop(t + 1.9);
      });

      // Crowd noise simulation using filtered noise burst
      const bufferSize = this.ctx.sampleRate * 2.0;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastVal = 0;
      for (let i = 0; i < bufferSize; i++) {
        // Brown noise
        const white = Math.random() * 2 - 1;
        lastVal = (lastVal + 0.02 * white) / 1.02;
        data[i] = lastVal * 2.5;
      }

      const crowd = this.ctx.createBufferSource();
      crowd.buffer = buffer;
      const crowdFilter = this.ctx.createBiquadFilter();
      crowdFilter.type = 'bandpass';
      crowdFilter.frequency.setValueAtTime(600, t + 0.1);
      crowdFilter.Q.value = 1.2;

      const crowdGain = this.ctx.createGain();
      crowdGain.gain.setValueAtTime(0.001, t + 0.1);
      crowdGain.gain.linearRampToValueAtTime(0.22, t + 0.5);
      crowdGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

      crowd.connect(crowdFilter);
      crowdFilter.connect(crowdGain);
      crowdGain.connect(this.ctx.destination);

      crowd.start(t + 0.1);
    } catch {
      // Ignore
    }
  }

  // Countdown beep (3, 2, 1, GO)
  public playCountdown(isGo = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isGo ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, t);
      if (isGo) {
        osc.frequency.exponentialRampToValueAtTime(1174, t + 0.15);
      }

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.4 : 0.18));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + (isGo ? 0.45 : 0.2));
    } catch {
      // Ignore
    }
  }

  // Soft wall bounce
  public playBounce() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.06);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // Ignore
    }
  }

  // UI click
  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch {
      // Ignore
    }
  }
}

export const soundManager = new SoundManager();
