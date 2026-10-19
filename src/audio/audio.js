// ============================================================================
// MANDELPOD — Sound & Music Department (100% procedural WebAudio)
// Reactive underwater-psychedelic score: dubby sub bass, bubbling arps,
// gamelan-glass percussion, hydrophone pads, filtered noise sweeps.
// Layers crossfade by game state: explore / chase / boss / results.
// Full SFX vocabulary synthesized — no audio files.
// ============================================================================

export class AudioEngine {
  constructor(save) {
    this.save = save;
    this.ctx = null;
    this.started = false;
    this.mode = 'explore';
    this._layerGains = {};
    this._seqTimer = null;
    this._step = 0;
    this.bpm = 96;
  }

  // Must be called from a user gesture
  start() {
    if (this.started) return;
    this.started = true;
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    // Underwater lowpass on the whole mix + gentle space
    this.mixFilter = ctx.createBiquadFilter();
    this.mixFilter.type = 'lowpass';
    this.mixFilter.frequency.value = 5200;
    this.mixFilter.Q.value = 0.4;
    this.master.connect(this.mixFilter).connect(ctx.destination);

    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.save.data.options.volMusic;
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.save.data.options.volSfx;
    this.ambBus = ctx.createGain(); this.ambBus.gain.value = this.save.data.options.volAmbience;
    // Cheap reverb: feedback delay network
    this.verb = ctx.createDelay(1); this.verb.delayTime.value = 0.31;
    this.verbFb = ctx.createGain(); this.verbFb.gain.value = 0.42;
    this.verbLp = ctx.createBiquadFilter(); this.verbLp.type = 'lowpass'; this.verbLp.frequency.value = 1800;
    this.verbOut = ctx.createGain(); this.verbOut.gain.value = 0.35;
    this.verb.connect(this.verbLp).connect(this.verbFb).connect(this.verb);
    this.verbLp.connect(this.verbOut).connect(this.master);
    this.musicBus.connect(this.master); this.musicBus.connect(this.verb);
    this.sfxBus.connect(this.master); this.sfxBus.connect(this.verb);
    this.ambBus.connect(this.master); this.ambBus.connect(this.verb);

    this._startAmbience();
    this._startSequencer();
  }

  setMode(mode) {
    if (!this.ctx) { this.mode = mode; return; }
    if (this.mode === mode) return;
    this.mode = mode;
    const t = this.ctx.currentTime;
    const targets = { explore: { pad: 0.5, bass: 0.5, arp: 0.35, perc: 0.25 }, chase: { pad: 0.35, bass: 0.9, arp: 0.75, perc: 0.85 }, boss: { pad: 0.6, bass: 1.0, arp: 0.5, perc: 1.0 }, results: { pad: 0.7, bass: 0.2, arp: 0.5, perc: 0.0 }, title: { pad: 0.8, bass: 0.15, arp: 0.3, perc: 0.0 } };
    const tt = targets[mode] ?? targets.explore;
    for (const [k, g] of Object.entries(this._layerGains)) {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(tt[k] ?? 0.3, t, 1.2);
    }
    this.bpm = mode === 'chase' ? 132 : mode === 'boss' ? 140 : 96;
  }

  _layer(name, gain = 0) {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.connect(this.musicBus);
    this._layerGains[name] = g;
    return g;
  }

  // GEOMETRY CONDUCTS THE SCORE — called every frame by GenerativeMusic with
  // smoothed normalized player geometry: nx (east-west), ny (height),
  // nz (depth into the timeline), speed. The reef plays you back.
  geoMod(s, dt) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Y: the pad filter opens as you climb — altitude = brightness
    this._padFilter?.frequency.setTargetAtTime(460 + s.ny * 2300 + Math.min(s.speed, 1) * 320, t, 0.3);
    // X: arp stereo field widens toward the world's edges
    this._arpSpread = 0.5 + Math.abs(s.nx - 0.5) * 2.2;
    // Z: depth densifies the arp and quickens the pulse
    this._arpDensity = 0.5 + s.nz * 0.45;
    this._bpmMul = 1 + s.nz * 0.14 + Math.min(s.speed, 1) * 0.05;
  }

  _startAmbience() {
    const ctx = this.ctx;
    // Hydrophone bed: filtered brown noise, slow LFO swell + bubble pops
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
    const g = ctx.createGain(); g.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.2;
    lfo.connect(lfoG).connect(g.gain);
    src.connect(lp).connect(g).connect(this.ambBus);
    src.start(); lfo.start();
    // Random bubble gurgles
    const bubble = () => {
      if (!this.ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f0 = 300 + Math.random() * 900;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * (1.5 + Math.random()), t + 0.12);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.05, t + 0.02);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(og).connect(this.ambBus);
      o.start(t); o.stop(t + 0.2);
      setTimeout(bubble, 300 + Math.random() * 2200);
    };
    bubble();
  }

  _startSequencer() {
    this._layer('pad', 0.5); this._layer('bass', 0.5); this._layer('arp', 0.35); this._layer('perc', 0.25);
    // Dreamy pad: two detuned saws through slow filter — plays modal chords
    const ctx = this.ctx;
    this._padOsc = [];
    const padGain = this._layerGains.pad;
    const chordRoots = [110, 98, 87.3, 130.8];   // A2 G2 F2 C3 — dorian drift
    this._chordIdx = 0;
    this._padFilter = ctx.createBiquadFilter();
    this._padFilter.type = 'lowpass'; this._padFilter.frequency.value = 700; this._padFilter.Q.value = 2;
    this._padFilter.connect(padGain);
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'sawtooth' : 'triangle';
      o.frequency.value = chordRoots[0] * [1, 1.5, 2, 2.997][i] * (i % 2 ? 1.003 : 0.998);
      const g = ctx.createGain(); g.gain.value = 0.05;
      o.connect(g).connect(this._padFilter);
      o.start();
      this._padOsc.push(o);
    }
    // Slow chord change
    setInterval(() => {
      if (!this.ctx) return;
      this._chordIdx = (this._chordIdx + 1) % 4;
      const root = chordRoots[this._chordIdx];
      const t = ctx.currentTime;
      this._padOsc.forEach((o, i) => {
        o.frequency.setTargetAtTime(root * [1, 1.5, 2, 2.997][i] * (i % 2 ? 1.003 : 0.998), t, 2.5);
      });
    }, 9000);

    // Step sequencer
    const stepDur = () => 60 / (this.bpm * (this._bpmMul ?? 1)) / 2;   // 8th notes
    const tick = () => {
      if (!this.ctx) return;
      this._seqStep(this._step);
      this._step = (this._step + 1) % 64;
      this._seqTimer = setTimeout(tick, stepDur() * 1000);
    };
    tick();
  }

  _seqStep(step) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const roots = [110, 98, 87.3, 130.8];
    // Timeline swap transposes the reef (dead reef sits a tritone-shadow lower)
    const root = roots[this._chordIdx] * Math.pow(2, (this.geoRootShift ?? 0) / 12);
    // BASS — dubby sub on 1 and the and-of-2, syncopated
    if ([0, 3, 8, 11, 16, 19, 24, 27, 32, 35, 40, 44, 48, 51, 56, 59].includes(step)) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f = root * (step % 16 >= 8 ? 0.75 : 0.5);
      o.frequency.setValueAtTime(f, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g).connect(this._layerGains.bass);
      o.start(t); o.stop(t + 0.55);
      // Wobble
      const lfo = ctx.createOscillator(); lfo.frequency.value = 6;
      const lg = ctx.createGain(); lg.gain.value = 0.15;
      lfo.connect(lg).connect(g.gain);
      lfo.start(t); lfo.stop(t + 0.55);
    }
    // ARP — bubbling pentatonic, random-walk; density/stereo driven by geometry
    const penta = [1, 9/8, 5/4, 3/2, 5/3, 2, 9/4, 5/2];
    if (step % 2 === 0 && Math.random() < (this._arpDensity ?? 0.75)) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      const f = root * 2 * penta[(Math.random() * penta.length) | 0];
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 1.02, t + 0.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      const p = ctx.createStereoPanner();
      p.pan.value = (Math.random() - 0.5) * (this._arpSpread ?? 1.4);
      o.connect(g).connect(p).connect(this._layerGains.arp);
      o.start(t); o.stop(t + 0.3);
    }
    // PERC — glassy gamelan hits + noise ticks
    if (step % 8 === 4) {
      // metallic "temple bell" via inharmonic partials
      const base = root * 4;
      for (const [ratio, amp, dur] of [[1, 0.12, 0.7], [2.76, 0.07, 0.4], [5.4, 0.04, 0.25]]) {
        const o = ctx.createOscillator();
        o.frequency.value = base * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(amp, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g).connect(this._layerGains.perc);
        o.start(t); o.stop(t + dur + 0.05);
      }
    }
    if (step % 4 === 2) {
      // shaker tick
      const n = this._noiseBurst(0.06);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      n.connect(hp).connect(g).connect(this._layerGains.perc);
      n.start(t);
    }
    // Chase heartbeat kick
    if ((this.mode === 'chase' || this.mode === 'boss') && step % 8 === 0) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g).connect(this._layerGains.perc);
      o.start(t); o.stop(t + 0.25);
    }
  }

  _noiseBurst(dur) {
    const ctx = this.ctx;
    const len = Math.max(1, ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // ------------------------------------------------------------------- SFX
  play(name, opts = {}) {
    if (!this.started || !this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const out = this.sfxBus;
    const env = (g, a, peak, dur) => {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    };
    const osc = (type, f0, f1, dur, peak = 0.2, attack = 0.005) => {
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
      const g = ctx.createGain(); env(g, attack, peak, dur);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + dur + 0.05);
      return o;
    };
    switch (name) {
      case 'jump': osc('sine', 300, 640, 0.18, 0.22); osc('triangle', 600, 900, 0.1, 0.08); break;
      case 'doubleJump': osc('sine', 420, 880, 0.2, 0.2); osc('sine', 840, 1320, 0.14, 0.1); break;
      case 'land': osc('sine', 180, 70, 0.12, 0.18); break;
      case 'spin': {
        const n = this._noiseBurst(0.28);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
        bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(2600, t + 0.24);
        const g = ctx.createGain(); env(g, 0.01, 0.24, 0.28);
        n.connect(bp).connect(g).connect(out); n.start(t);
        break;
      }
      case 'slamFall': osc('sawtooth', 800, 120, 0.3, 0.1); break;
      case 'slamLand': {
        osc('sine', 140, 35, 0.3, 0.5);
        const n = this._noiseBurst(0.2);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        const g = ctx.createGain(); env(g, 0.005, 0.3, 0.2);
        n.connect(lp).connect(g).connect(out); n.start(t);
        break;
      }
      case 'pearl': {
        const f = 880 * Math.pow(1.0595, Math.min(opts.combo ?? 0, 24));
        osc('sine', f, f * 1.01, 0.16, 0.14);
        osc('sine', f * 2, f * 2, 0.1, 0.05);
        break;
      }
      case 'break': {
        const n = this._noiseBurst(0.18);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1;
        const g = ctx.createGain(); env(g, 0.004, 0.32, 0.18);
        n.connect(bp).connect(g).connect(out); n.start(t);
        osc('sine', 500, 180, 0.14, 0.16);
        break;
      }
      case 'explosion': {
        osc('sine', 90, 28, 0.55, 0.65);
        const n = this._noiseBurst(0.5);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.5);
        const g = ctx.createGain(); env(g, 0.005, 0.5, 0.5);
        n.connect(lp).connect(g).connect(out); n.start(t);
        break;
      }
      case 'enemyDefeat': osc('square', 700, 140, 0.2, 0.14); osc('sine', 1050, 2100, 0.16, 0.08); break;
      case 'armorClank': osc('square', 220, 180, 0.08, 0.12); osc('square', 331, 290, 0.07, 0.1); break;
      case 'crabCharge': osc('sawtooth', 160, 320, 0.25, 0.1); break;
      case 'pufferInflate': osc('sine', 200, 600, 0.5, 0.1); break;
      case 'hurt': osc('sawtooth', 400, 90, 0.3, 0.25); osc('sine', 200, 60, 0.35, 0.3); break;
      case 'death': {
        osc('sine', 600, 60, 1.1, 0.25);
        // bubbles ascending
        for (let i = 0; i < 7; i++) {
          setTimeout(() => osc('sine', 300 + i * 120, 500 + i * 160, 0.12, 0.07), i * 90);
        }
        break;
      }
      case 'checkpoint': {
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => setTimeout(() => { osc('sine', f, f, 0.3, 0.14); osc('triangle', f * 2, f * 2, 0.2, 0.05); }, i * 85));
        break;
      }
      case 'gem': {
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => osc('sine', f, f, 0.4, 0.12), i * 70));
        break;
      }
      case 'fractal': {
        [440, 554, 659, 880, 1108, 1318, 1760].forEach((f, i) => setTimeout(() => osc('triangle', f, f * 1.01, 0.35, 0.1), i * 60));
        break;
      }
      case 'timeSwap': {
        osc('sine', 1200, 200, 0.35, 0.18);
        osc('sine', 200, 1400, 0.35, 0.14);
        const n = this._noiseBurst(0.3);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 8;
        bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(3200, t + 0.3);
        const g = ctx.createGain(); env(g, 0.02, 0.12, 0.3);
        n.connect(bp).connect(g).connect(out); n.start(t);
        break;
      }
      case 'dash': {
        const n = this._noiseBurst(0.2);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
        bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.18);
        const g = ctx.createGain(); env(g, 0.005, 0.2, 0.2);
        n.connect(bp).connect(g).connect(out); n.start(t);
        break;
      }
      case 'bounce': osc('sine', 250, 700, 0.16, 0.2); break;
      case 'goal': {
        [392, 523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => setTimeout(() => osc('sine', f, f, 0.5, 0.11), i * 90));
        break;
      }
      case 'uiMove': osc('sine', 700, 900, 0.06, 0.06); break;
      case 'uiSelect': osc('sine', 880, 1320, 0.12, 0.1); break;
      case 'bossRoar': {
        osc('sawtooth', 60, 45, 1.4, 0.4);
        osc('sawtooth', 91, 68, 1.4, 0.3);
        const n = this._noiseBurst(1.2);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
        const g = ctx.createGain(); env(g, 0.1, 0.25, 1.2);
        n.connect(lp).connect(g).connect(out); n.start(t);
        break;
      }
      case 'abilityUnlock': {
        [261, 329, 392, 523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => { osc('sine', f, f, 0.45, 0.1); osc('triangle', f / 2, f / 2, 0.5, 0.06); }, i * 110));
        break;
      }
      case 'bubblePop': osc('sine', 500 + Math.random() * 400, 900, 0.1, 0.06); break;
    }
  }
}
