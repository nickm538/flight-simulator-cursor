import type { FlightModel } from "../aircraft/flightModel";

export class SimAudio {
  private ctx: AudioContext | null = null;
  private engines: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private wind: OscillatorNode | null = null;
  private windGain: GainNode | null = null;
  private master: GainNode | null = null;
  started = false;

  async start() {
    if (this.started) return;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(ctx.destination);

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 900;
      osc.connect(f);
      f.connect(g);
      g.connect(this.master);
      osc.start();
      this.engines.push(osc);
      this.gains.push(g);
    }
    this.wind = ctx.createOscillator();
    this.wind.type = "triangle";
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.0001;
    this.wind.connect(this.windGain);
    this.windGain.connect(this.master);
    this.wind.start();
    this.started = true;
  }

  update(fm: FlightModel) {
    if (!this.ctx || !this.started) return;
    for (let i = 0; i < 2; i++) {
      const n1 = fm.n1[i];
      this.engines[i].frequency.setTargetAtTime(55 + n1 * 3.8, this.ctx.currentTime, 0.08);
      this.gains[i].gain.setTargetAtTime(0.02 + (n1 / 100) * 0.12, this.ctx.currentTime, 0.1);
    }
    if (this.wind && this.windGain) {
      this.wind.frequency.setTargetAtTime(80 + fm.iasKt * 0.6, this.ctx.currentTime, 0.1);
      this.windGain.gain.setTargetAtTime(Math.min(0.08, fm.iasKt / 4000), this.ctx.currentTime, 0.1);
    }
  }

  blip() {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.value = 880;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(this.master);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.18);
    o.stop(this.ctx.currentTime + 0.2);
  }

  squeal() {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = 1400;
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.45);
    o.stop(this.ctx.currentTime + 0.5);
  }
}
