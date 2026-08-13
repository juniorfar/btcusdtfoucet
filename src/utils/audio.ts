// Web Audio API Retro Arcade Sound Effects

class RetroAudio {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playMatchSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  playLevelUpSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.12);
      });
    } catch {
      // Ignore
    }
  }

  playPayoutSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.2);
      });
    } catch {
      // Ignore
    }
  }

  playComboBreakerSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;

      // 1. Warm ambient low sine swell
      const warmBass = ctx.createOscillator();
      const warmBassGain = ctx.createGain();
      warmBass.type = 'sine';
      warmBass.frequency.setValueAtTime(130.81, t); // C3
      warmBass.frequency.exponentialRampToValueAtTime(196.00, t + 0.8); // G3 gentle rise
      warmBassGain.gain.setValueAtTime(0.001, t);
      warmBassGain.gain.linearRampToValueAtTime(0.07, t + 0.15);
      warmBassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
      warmBass.connect(warmBassGain);
      warmBassGain.connect(ctx.destination);
      warmBass.start(t);
      warmBass.stop(t + 0.95);

      // 2. Soothing celestial chime chord cascade (C Major 9 serene harp/chime sweep)
      // Notes: C4, E4, G4, B4, D5, E5, G5
      const chimeNotes = [261.63, 329.63, 392.00, 493.88, 587.33, 659.25, 783.99];
      chimeNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Soft sine wave for a peaceful crystal/calm chime tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);

        // Soft attack and gentle, peaceful lingering decay
        gain.gain.setValueAtTime(0.001, t + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.06, t + i * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0005, t + i * 0.08 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.8);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

export const soundFx = new RetroAudio();
