class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;
  private initialized: boolean = false;

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.15; // Global volume
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 1, slideToFreq?: number) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.connect(gain);
    gain.connect(this.masterGain);

    const now = this.ctx.currentTime;
    
    // Frequency envelope (optional slide)
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, now + duration);
    }

    // Amplitude envelope (ADSR)
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + duration * 0.1); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Decay/Release

    osc.start(now);
    osc.stop(now + duration);
    
    setTimeout(() => gain.disconnect(), duration * 1000 + 100);
  }

  // Futuristic UI Hover (Soft, high pitched, very short tick)
  hover() {
    this.playTone(1200, 'sine', 0.05, 0.05, 1500);
  }

  // UI Click (Crisper tick)
  click() {
    this.playTone(800, 'square', 0.08, 0.1, 400);
  }

  // Success/Unlock (Ascending major chord sweep)
  success() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.resume();
    
    const now = this.ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, i) => { // A4, C#5, E5, A5
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.1, now + i * 0.05 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.4);
      
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.5);
    });
  }

  // Futuristic Error (Low buzz)
  error() {
    this.playTone(150, 'sawtooth', 0.3, 0.2, 100);
  }

  // Persona Switch / Warp sound
  warp() {
    this.playTone(200, 'sine', 0.4, 0.2, 1200);
    setTimeout(() => this.playTone(1200, 'sine', 0.4, 0.2, 200), 100);
  }
}

export const uiaudio = new AudioEngine();
