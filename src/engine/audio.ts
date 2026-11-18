import type { SfxName } from '../core/types';
import { TRACKS } from '../data/music';

/** Tiny WebAudio chiptune kit: sound effects + a gentle looping tune. No audio files. */
class Audio8 {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  private current = '';
  private timer = 0;

  private ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.12, slideTo?: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    const t0 = ctx.currentTime + start;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  sfx(name: SfxName) {
    if (this.muted) return;
    switch (name) {
      case 'click':
        this.tone(660, 0, 0.04, 'square', 0.05);
        break;
      case 'pickup':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.06, 0.1, 'square', 0.1));
        break;
      case 'good':
        [659, 880].forEach((f, i) => this.tone(f, i * 0.08, 0.12, 'square', 0.1));
        break;
      case 'bad':
        this.tone(220, 0, 0.18, 'sawtooth', 0.12, 110);
        break;
      case 'unlock':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, i * 0.09, 0.2, 'square', 0.1));
        break;
      case 'beep':
        this.tone(988, 0, 0.07, 'square', 0.09);
        this.tone(1319, 0.08, 0.09, 'square', 0.09);
        break;
      case 'door':
        this.tone(140, 0, 0.35, 'sawtooth', 0.12, 70);
        break;
      case 'sleepy':
        this.tone(196, 0, 0.4, 'sine', 0.12, 130);
        break;
      case 'coffee':
        this.tone(120, 0, 0.5, 'sawtooth', 0.06, 180);
        this.tone(800, 0.5, 0.1, 'square', 0.07);
        break;
    }
  }

  /** Switch to a track (no-op if it is already playing). */
  playTrack(id: string) {
    if (this.current === id) return;
    const track = TRACKS[id];
    const ctx = this.ensure();
    if (!track || !ctx) return;
    this.current = id;
    window.clearInterval(this.timer);
    let step = 0;
    const stepDur = 60 / track.bpm / 2;
    this.timer = window.setInterval(() => {
      if (!this.muted) {
        if (step % 2 === 0) this.tone(track.bass[(step / 2) % track.bass.length], 0, stepDur * 1.8, track.bassWave, 0.1);
        const l = track.lead[step % track.lead.length];
        if (l) this.tone(l, 0, stepDur * 0.9, track.leadWave, track.leadVol);
      }
      step++;
    }, stepDur * 1000);
  }
}

export const audio = new Audio8();
