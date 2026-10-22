export interface AmbientPreset {
  id: string;
  name: string;
  description: string;
  frequencies: readonly number[];
}

export const AMBIENT_PRESETS: readonly AmbientPreset[] = [
  { id: 'soft-focus', name: 'Soft Focus', description: 'A warm, steady chord for quiet work.', frequencies: [110, 164.81, 220] },
  { id: 'night-signal', name: 'Night Signal', description: 'A lower, slower-feeling layered tone.', frequencies: [82.41, 123.47, 164.81] },
  { id: 'open-sky', name: 'Open Sky', description: 'A brighter chord with gentle movement.', frequencies: [130.81, 196, 261.63] },
];

/** Generates original ambient tones locally; it does not stream or fetch recordings. */
export class AmbientAudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private activeSources: AudioScheduledSourceNode[] = [];
  private activeBuses: AudioNode[] = [];
  private volume = 0.3;

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.context && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.3, this.context.currentTime, 0.06);
    }
  }

  async play(preset: AmbientPreset): Promise<void> {
    const context = this.getContext();
    if (context.state === 'suspended') await context.resume();
    if (context.state !== 'running') throw new Error('Audio could not be started in this browser.');
    this.stopActiveNodes();

    if (!this.masterGain) {
      this.filter = context.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 850;
      this.filter.Q.value = 0.7;
      this.masterGain = context.createGain();
      this.masterGain.gain.value = this.volume * 0.3;
      this.filter.connect(this.masterGain);
      this.masterGain.connect(context.destination);
    }

    const drift = context.createOscillator();
    const driftAmount = context.createGain();
    drift.type = 'sine';
    drift.frequency.value = 0.07;
    driftAmount.gain.value = 150;
    drift.connect(driftAmount);
    driftAmount.connect(this.filter!.frequency);
    drift.start();
    this.activeSources.push(drift);
    this.activeBuses.push(driftAmount);

    // Each soundscape is made from low-level sine tones and a slow filter drift.
    // Keeping each voice quiet prevents summed harmonics from clipping.
    const voiceBus = context.createGain();
    voiceBus.gain.value = 0.18 / preset.frequencies.length;
    voiceBus.connect(this.filter!);
    this.activeBuses.push(voiceBus);
    for (const frequency of preset.frequencies) {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(voiceBus);
      oscillator.start();
      this.activeSources.push(oscillator);
    }
    // A separate, very slow oscillator subtly moves the master level without
    // introducing a beat or a recorded melody.
    const pulse = context.createOscillator();
    const pulseAmount = context.createGain();
    pulse.type = 'sine';
    pulse.frequency.value = 0.035;
    pulseAmount.gain.value = 0.015;
    pulse.connect(pulseAmount);
    pulseAmount.connect(voiceBus.gain);
    pulse.start();
    this.activeSources.push(pulse);
    this.activeBuses.push(pulseAmount);
  }

  async pause(): Promise<void> {
    this.stopActiveNodes();
    if (this.context?.state === 'running') await this.context.suspend();
  }

  async dispose(): Promise<void> {
    this.stopActiveNodes();
    if (this.context && this.context.state !== 'closed') await this.context.close();
    this.context = null;
    this.masterGain = null;
    this.filter = null;
  }

  private getContext(): AudioContext {
    if (this.context && this.context.state !== 'closed') return this.context;
    const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) throw new Error('This browser does not support generated ambient audio.');
    this.context = new Constructor();
    return this.context;
  }

  private stopActiveNodes(): void {
    for (const node of this.activeSources) {
      try { node.stop(); } catch { /* A node can already have stopped. */ }
      try { node.disconnect(); } catch { /* Disconnection is safe to repeat. */ }
    }
    for (const node of this.activeBuses) {
      try { node.disconnect(); } catch { /* Disconnection is safe to repeat. */ }
    }
    this.activeSources = [];
    this.activeBuses = [];
  }
}
