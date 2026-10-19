// ============================================================================
// MANDELPOD — Generative Instruments Department
// EVERY MOVE IS AN INSTRUMENT. Scuttling plays mallets tuned by your X
// position, jumps are harp glissandi, spins are pentatonic runs, landings
// are taiko drums pitched by impact, shells ring at pitches derived from
// where they sit in the world. Simultaneously:
//   • internal WebAudio synths sing (the "sonified" layer)
//   • OSC pours out to SuperCollider/Max/TouchDesigner
//   • MIDI pours out to any synth/DAW
// And the geometry itself conducts the score: X → stereo/melody,
// Y (height) → filter opening & octaves, Z (depth into the timeline) →
// scale density & root motion. The level plays you back.
// ============================================================================
import * as THREE from 'three';

// A-dorian-ish ocean pentatonic (semitones from root) + full dorian for runs
const PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
const DORIAN = [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19, 21, 22, 24];
const ROOTS = [57, 55, 53, 60];   // A3 G3 F3 C4 — mirrors the pad chords

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class GenerativeMusic {
  constructor({ audio, osc, events, player, save, game }) {
    Object.assign(this, { audio, osc, events, player, save, game });
    this.enabled = true;
    this._stepT = 0;
    this._airPhrase = 0;
    this._noteGuard = new Map();   // per-instrument min interval
    this._smooth = { nx: 0.5, ny: 0.3, nz: 0, speed: 0 };
    this._streamT = 0;
    this._hookEvents();
  }

  get opts() { return this.save.data.options; }
  get live() { return this.audio.started && this.opts.sonify !== false && this.game.state === 'playing'; }

  // Quantized pitch from world geometry: x → scale degree, y → octave swim
  pitchFromGeo(x, y, scale = PENTA, baseDeg = 0) {
    const nx = THREE.MathUtils.clamp((x + 11) / 22, 0, 0.999);
    const deg = (Math.floor(nx * 7.99) + baseDeg) % scale.length;
    const oct = THREE.MathUtils.clamp(Math.floor((y - 0.5) / 2.2), 0, 3);
    const root = ROOTS[this.audio._chordIdx ?? 0];
    return root + scale[deg] + oct * 12;
  }

  _guard(inst, ms = 34) {
    const now = performance.now();
    if (now - (this._noteGuard.get(inst) ?? 0) < ms) return false;
    this._noteGuard.set(inst, now);
    return true;
  }

  // Play one note: internal synth + OSC + MIDI. THE single choke point.
  play(inst, midi, { vel = 0.7, dur = 0.3, pan = 0, pos = null, detune = 0 } = {}) {
    if (!this._guard(inst)) return;
    if (this.live) this._synth(inst, midi, { vel, dur, pan, detune });
    this.osc.note(inst, midi, vel, dur, pos ?? this.player.position);
  }

  // ------------------------------------------------------- synth voices
  _synth(inst, midi, { vel, dur, pan, detune }) {
    const ctx = this.audio.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const f = midiToFreq(midi);
    const out = this._sonifyBus ??= (() => {
      const g = ctx.createGain();
      g.gain.value = this.opts.volSonify ?? 0.8;
      g.connect(this.audio.master);
      g.connect(this.audio.verb);
      return g;
    })();
    if (this._sonifyBus) this._sonifyBus.gain.setTargetAtTime(this.opts.volSonify ?? 0.8, t, 0.1);
    const panned = (node) => {
      const p = ctx.createStereoPanner();
      p.pan.value = THREE.MathUtils.clamp(pan, -1, 1);
      node.connect(p).connect(out);
      return p;
    };
    const tone = (type, f0, f1, a, peak, d, dest = null) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (detune) o.detune.value = detune;
      if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + d);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g);
      (dest ? g.connect(dest) : panned(g));
      o.start(t); o.stop(t + d + 0.05);
    };
    const noise = (a, peak, d, filterType, fq, q = 1) => {
      const n = this.audio._noiseBurst(d);
      const flt = ctx.createBiquadFilter();
      flt.type = filterType; flt.frequency.value = fq; flt.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      n.connect(flt).connect(g);
      panned(g);
      n.start(t);
    };
    switch (inst) {
      case 'mallet':   tone('sine', f, f * 0.995, 0.004, vel * 0.30, dur); tone('triangle', f * 3.01, 0, 0.002, vel * 0.07, dur * 0.4); break;
      case 'harp':     tone('triangle', f, 0, 0.003, vel * 0.22, dur * 1.4); tone('sine', f * 2, 0, 0.002, vel * 0.08, dur * 0.7); break;
      case 'pluck':    tone('sawtooth', f, f * 0.98, 0.002, vel * 0.10, dur); tone('sine', f, 0, 0.002, vel * 0.18, dur * 1.2); break;
      case 'taiko':    tone('sine', 110 + vel * 60, 42, 0.003, vel * 0.6, 0.32); noise(0.002, vel * 0.12, 0.1, 'lowpass', 900); break;
      case 'gong':     for (const [r, a, d] of [[1, .3, 1.6], [2.41, .16, 1.1], [3.93, .1, .8], [5.12, .06, .5]]) tone('sine', f * r, 0, 0.01, vel * a, d); break;
      case 'chime':    tone('sine', f, 0, 0.002, vel * 0.24, dur * 1.6); tone('sine', f * 2.99, 0, 0.002, vel * 0.06, dur); break;
      case 'shell':    tone('sine', f, f * 1.02, 0.002, vel * 0.16, dur); noise(0.001, vel * 0.10, 0.09, 'bandpass', f * 2.4, 6); break;
      case 'flute':    tone('sine', f, 0, 0.03, vel * 0.20, dur * 1.5); noise(0.02, vel * 0.03, dur, 'highpass', 3000); break;
      case 'sub':      tone('sine', f, f * 0.5, 0.006, vel * 0.5, dur); break;
      case 'woodblock': tone('square', f, f * 0.9, 0.001, vel * 0.08, 0.09); tone('sine', f * 1.5, 0, 0.001, vel * 0.1, 0.07); break;
      case 'sting':    tone('sawtooth', f, f * 0.94, 0.01, vel * 0.10, dur); tone('sawtooth', f * 1.06, f, 0.01, vel * 0.10, dur); break;
    }
  }

  gliss(inst, midi0, steps, stepMs, opts = {}) {
    steps.forEach((d, i) => setTimeout(() => this.play(inst, midi0 + d, { ...opts, vel: (opts.vel ?? 0.6) * (1 - i * 0.08) }), i * stepMs));
  }

  // ------------------------------------------------------- event → music
  _hookEvents() {
    const ev = this.events;
    const P = this.player;
    const geo = (obj = P) => ({ pos: obj.position ?? P.position, pan: THREE.MathUtils.clamp((P.position.x) / 9, -1, 1) });

    ev.on('player-jump', () => {
      const m = this.pitchFromGeo(P.position.x, P.position.y, DORIAN, 2);
      this.gliss('harp', m, [0, 5, 9], 34, { ...geo(), vel: 0.5, dur: 0.22 });
      this.osc.event('jump', m);
    });
    ev.on('player-double-jump', () => {
      const m = this.pitchFromGeo(P.position.x, P.position.y, DORIAN, 4);
      this.gliss('harp', m, [0, 4, 7, 10, 14], 30, { ...geo(), vel: 0.5, dur: 0.2 });
      this.osc.event('doubleJump', m);
    });
    ev.on('player-landed', ({ impact }) => {
      const v = THREE.MathUtils.clamp(Math.abs(impact) / 18, 0.25, 1);
      this.play('taiko', 36 + Math.round(v * 8), { vel: v, dur: 0.3, ...geo() });
      this.osc.event('land', +Math.abs(impact).toFixed(2));
    });
    // J / X — the spin IS a pentatonic run up from wherever you stand
    ev.on('player-spin', () => {
      const base = this.pitchFromGeo(P.position.x, P.position.y);
      this.gliss('pluck', base, [0, 3, 7, 12], 40, { ...geo(), vel: 0.45, dur: 0.16 });
      this.osc.event('spin', base);
    });
    ev.on('player-slam-land', ({ position }) => {
      this.play('gong', 45, { vel: 0.9, dur: 1.4, pos: position, pan: 0 });
      this.play('sub', 33, { vel: 0.8, dur: 0.5 });
      this.osc.event('slam', position.x, position.y, position.z);
    });
    ev.on('player-bounced', () => {
      const m = this.pitchFromGeo(P.position.x, P.position.y, PENTA, 3);
      this.play('mallet', m, { vel: 0.55, dur: 0.25, ...geo() });
      this.osc.event('bounce', m);
    });
    ev.on('player-dash', () => {
      const m = this.pitchFromGeo(P.position.x, P.position.y, DORIAN);
      this.gliss('flute', m, [0, 3, 7], 26, { vel: 0.4, dur: 0.3, ...geo() });
      this.osc.event('dash');
    });
    ev.on('pearl-collected', ({ pos }) => {
      // Combo climbs the pentatonic ladder — pearls are a melody you write
      const root = ROOTS[this.audio._chordIdx ?? 0] + 24;
      const m = root + PENTA[(this.game.pearlCombo || 1) % PENTA.length];
      this.play('chime', m, { vel: 0.5, dur: 0.35, pos, pan: THREE.MathUtils.clamp(pos.x / 9, -1, 1) });
    });
    // Shells & pods ring at pitches derived from THEIR OWN coordinates —
    // the level is literally a field of tuned percussion
    ev.on('breakable-broken', (b) => {
      const p = b.mesh.position;
      const deg = Math.abs(Math.round(p.x * 3 + p.z * 7)) % PENTA.length;
      const root = ROOTS[this.audio._chordIdx ?? 0] + 12;
      const base = root + PENTA[deg] + (Math.abs(Math.round(p.y)) % 2) * 12;
      this.gliss('shell', base, [0, 7, 12], 26, { vel: 0.5, dur: 0.3, pos: p, pan: THREE.MathUtils.clamp(p.x / 9, -1, 1) });
      this.osc.event('break', b.type, base, +p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1));
    });
    ev.on('enemy-defeated', ({ enemy, method } = {}) => {
      const p = enemy?.group?.position ?? P.position;
      this.gliss('woodblock', 76, [0, -5, -12], 40, { vel: 0.5, pos: p });
      this.osc.event('enemyDown', enemy?.constructor?.name ?? method ?? 'foe');
    });
    ev.on('player-hurt', () => {
      this.play('sting', 42, { vel: 0.7, dur: 0.5 });
      this.play('sting', 44, { vel: 0.5, dur: 0.5 });
      this.osc.event('hurt');
    });
    ev.on('player-died', () => {
      this.gliss('flute', 81, [0, -3, -7, -12, -19, -24], 90, { vel: 0.4, dur: 0.5 });
      this.osc.event('death');
    });
    ev.on('checkpoint-activated', (c) => {
      const root = ROOTS[this.audio._chordIdx ?? 0] + 12;
      this.gliss('chime', root, [0, 7, 12, 16], 70, { vel: 0.5, dur: 0.5, pos: c?.group?.position });
      this.osc.event('checkpoint');
    });
    ev.on('gem-collected', () => {
      const root = ROOTS[this.audio._chordIdx ?? 0] + 24;
      this.gliss('chime', root, [0, 3, 7, 10, 12, 15, 19, 24], 60, { vel: 0.55, dur: 0.6 });
      this.osc.event('gem');
    });
    ev.on('goal-reached', () => {
      const root = ROOTS[this.audio._chordIdx ?? 0] + 12;
      this.gliss('gong', root - 24, [0], 0, { vel: 0.8, dur: 2.2 });
      this.gliss('chime', root, [0, 5, 7, 12, 15, 19, 22, 24], 95, { vel: 0.5, dur: 0.8 });
      this.osc.event('goal');
    });
    ev.on('fractal-collected', () => {
      this.gliss('flute', 69, [0, 6, 13, 18, 25], 80, { vel: 0.45, dur: 0.7 });
      this.osc.event('fractal');
    });
    ev.on('timeline-swapped', ({ timeline }) => {
      // The whole reef transposes: healthy = dorian, dead = darker root
      this.audio.geoRootShift = timeline === 'B' ? -4 : 0;
      this.play('gong', timeline === 'B' ? 38 : 45, { vel: 0.5, dur: 1.2 });
      this.osc.event('timeline', timeline);
    });
  }

  // ------------------------------------------------ continuous geometry → music
  update(dt, t) {
    const P = this.player;
    if (!P?.active) return;
    const playing = this.game.state === 'playing';

    // Normalized geometry
    const speed = Math.hypot(P.velocity.x, P.velocity.z);
    const s = this._smooth;
    s.nx = THREE.MathUtils.damp(s.nx, THREE.MathUtils.clamp((P.position.x + 11) / 22, 0, 1), 6, dt);
    s.ny = THREE.MathUtils.damp(s.ny, THREE.MathUtils.clamp(P.position.y / 12, 0, 1), 6, dt);
    const zProg = THREE.MathUtils.clamp(-P.position.z / 150, 0, 1);   // depth into the timeline
    s.nz = THREE.MathUtils.damp(s.nz, zProg, 3, dt);
    s.speed = THREE.MathUtils.damp(s.speed, THREE.MathUtils.clamp(speed / P.runSpeed, 0, 1.4), 6, dt);

    if (!playing) return;

    // — SCUTTLE STEPS: running plays the mallet path, tuned by X, octaved by Y
    if (P.grounded && speed > 2 && !P.dead && !P.frozen) {
      this._stepT -= dt;
      if (this._stepT <= 0) {
        this._stepT = THREE.MathUtils.clamp(2.35 / speed, 0.13, 0.5);
        const m = this.pitchFromGeo(P.position.x, P.position.y);
        this.play('mallet', m, { vel: 0.22 + s.speed * 0.3, dur: 0.16, pan: (s.nx - 0.5) * 1.6 });
      }
    } else this._stepT = 0;

    // — AIR DIVE WHISTLE: falling bends a soft flute downward (terminal swoop)
    if (!P.grounded && P.velocity.y < -9 && this._airPhrase <= 0) {
      this._airPhrase = 1.2;
      const m = this.pitchFromGeo(P.position.x, P.position.y + 4, DORIAN, 5);
      this.play('flute', m, { vel: 0.25, dur: 0.5, pan: (s.nx - 0.5) * 1.4 });
    }
    this._airPhrase = Math.max(0, this._airPhrase - dt);
    if (P.grounded) this._airPhrase = 0;

    // — GEOMETRY CONDUCTS THE SCORE (internal WebAudio reacts to x/y/z)
    if (this.opts.geoScore !== false) this.audio.geoMod?.(s, dt);

    // — OSC/MIDI state stream: the continuous "oscillate the osc" channel
    this._streamT -= dt;
    if (this._streamT <= 0) {
      this._streamT = 1 / Math.max(1, this.opts.oscRate ?? 30);
      const p = P.position, v = P.velocity;
      this.osc.send('/mandelpod/player/pos', [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)]);
      this.osc.send('/mandelpod/player/vel', [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)]);
      this.osc.mod('x', s.nx); this.osc.mod('y', s.ny); this.osc.mod('z', s.nz);
      this.osc.mod('speed', Math.min(s.speed, 1));
      if ((this._stateEvery = (this._stateEvery ?? 0) + 1) % 15 === 0) {
        this.osc.send('/mandelpod/player/state', [P.state, P.grounded ? 1 : 0, +speed.toFixed(2)]);
      }
    }
  }
}
