// ============================================================================
// MANDELPOD — Level Framework Department
// Data-driven level runtime: sculpted platforms with collision, prop dressing,
// breakables, pearls, enemies, checkpoints, goal, timeline (dimension) swap,
// chase sequences, kill volumes, camera rail. Levels BUILD via helper API.
// ============================================================================
import * as THREE from 'three';
import { Body, COL } from './physics.js';
import { Mats, injectUnderwater } from '../world/materials.js';
import { Breakable } from './breakables.js';
import { ENEMY_TYPES } from './enemies.js';
import { PearlManager, ChronoGem, HiddenFractal, Checkpoint, GoalVortex } from './collectibles.js';
import * as Props from '../world/props.js';

export class Level {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    game.level = this;   // register immediately — builders reference game.level
    this.group = new THREE.Group();
    game.engine.scene.add(this.group);
    this.breakables = [];
    this.enemies = [];
    this.checkpoints = [];
    this.movers = [];
    this.decor = [];
    this.pearls = new PearlManager(game);
    this.gem = null;
    this.fractal = null;
    this.goal = null;
    this.chase = null;
    this.killY = def.killY ?? -10;
    this.stats = { shellsTotal: 0, shellsBroken: 0, deaths: 0, startTime: 0 };
    this._phaseLerp = 0;   // visual blend for timeline swap
    this.rng = Props.mulberry(def.seed ?? 42);

    // Builder API bound to this level
    const api = {
      ground: (x, y, z, w, h, d, opts = {}) => this._platform(x, y, z, w, h, d, opts),
      deco: (prop, x, y, z, s = 1, ry = 0) => { prop.position.set(x, y, z); prop.scale.setScalar(s); prop.rotation.y = ry; this.group.add(prop); return prop; },
      breakable: (type, x, y, z) => { const b = new Breakable(type, new THREE.Vector3(x, y, z), game); this.breakables.push(b); if (b.countsForPerfect) this.stats.shellsTotal++; return b; },
      enemy: (type, x, y, z, opts = {}) => { const E = ENEMY_TYPES[type]; const e = new E(game, new THREE.Vector3(x, y, z), opts); this.enemies.push(e); return e; },
      pearlTrail: (a, b, n, arc = 0) => this.pearls.addTrail(a, b, n, arc),
      pearls: (list) => { for (const p of list) this.pearls.add(new THREE.Vector3(...p)); },
      checkpoint: (x, y, z) => { const c = new Checkpoint(game, new THREE.Vector3(x, y, z), this.checkpoints.length); this.checkpoints.push(c); return c; },
      gem: (x, y, z) => { this.gem = new ChronoGem(game, new THREE.Vector3(x, y, z)); },
      fractal: (x, y, z) => { this.fractal = new HiddenFractal(game, new THREE.Vector3(x, y, z)); },
      goal: (x, y, z) => { this.goal = new GoalVortex(game, new THREE.Vector3(x, y, z)); },
      mover: (x, y, z, w, h, d, moverFn, opts = {}) => this._platform(x, y, z, w, h, d, { ...opts, mover: moverFn }),
      hazard: (x, y, z, w, h, d, type = 'hazard') => {
        const b = new Body({ position: new THREE.Vector3(x, y, z), min: new THREE.Vector3(-w/2, -h/2, -d/2), max: new THREE.Vector3(w/2, h/2, d/2), flags: COL.HAZARD });
        b.userData.type = type;
        game.world.add(b);
        return b;
      },
      rng: this.rng,
      props: Props,
    };

    def.build(this, api);
    if (def.rail) game.rig.setRail(def.rail.map((p) => new THREE.Vector3(...p)), def.railOpts);
    game.rig.setZones((def.cameraZones ?? []).map((z) => ({ zMax: z.z[0], zMin: z.z[1], offset: new THREE.Vector3(...z.offset), look: new THREE.Vector3(...z.look) })));
    this.stats.startTime = game.engine.time;
  }

  _platform(x, y, z, w, h, d, opts = {}) {
    // Sacred slab: octagonal phi-banded temple artifact w/ mandala inlay
    const phase = opts.phase ?? null;
    const accent = phase === 'A' ? '#35d5ff' : phase === 'B' ? '#ff9d2e' : (opts.accent ?? '#39c8ff');
    const slab = Props.makeSacredSlab({ w, h, d, color: opts.color ?? '#4a5a8a', accent, mandala: opts.mandala !== false, seed: (x * 13 + z * 7) | 0 });
    slab.position.set(x, y, z);
    this.group.add(slab);
    const mesh = slab;
    if (phase) {
      slab.traverse((c) => { if (c.material && c.material.transparent !== true) { c.material.transparent = true; } });
    }

    let flags = COL.SOLID;
    if (phase === 'A') flags |= COL.PHASE_A;
    if (phase === 'B') flags |= COL.PHASE_B;
    if (opts.oneway) flags |= COL.ONEWAY;

    const body = new Body({ position: new THREE.Vector3(x, y, z), min: new THREE.Vector3(-w/2, -h/2, -d/2), max: new THREE.Vector3(w/2, h/2, d/2), flags, mesh, mover: opts.mover });
    this.game.world.add(body);
    if (opts.mover) this.movers.push(body);
    if (phase) {
      this.decor.push({ phaseMesh: mesh, phase });
    }
    return body;
  }

  spawnPearlBurst(pos, count) { this.pearls.spawnBurst(pos, count); }

  // ------------------------------------------------------------ timeline
  swapTimeline() {
    const w = this.game.world;
    w.timeline = w.timeline === 'A' ? 'B' : 'A';
    this.game.events.emit('timeline-swapped', { timeline: w.timeline });
    this.game.engine.flash(0.3, w.timeline === 'A' ? '#35d5ff' : '#ff9d2e');
    this.game.audio?.play('timeSwap');
    this.game.particles.timeBubble(this.game.player.position);
  }

  _broadphaseTimer = 0;

  update(dt, t) {
    // Movers
    for (const m of this.movers) m.updateMover(t, dt);
    // Moving enemies dirty the static grid — refresh 10×/s
    this._broadphaseTimer -= dt;
    if (this._broadphaseTimer <= 0) { this.game.world.rebuildBroadphase(); this._broadphaseTimer = 0.1; }
    // Phase platform visuals — ghost the inactive timeline
    const targetLerp = this.game.world.timeline === 'A' ? 0 : 1;
    this._phaseLerp = THREE.MathUtils.damp(this._phaseLerp, targetLerp, 8, dt);
    for (const d of this.decor) {
      if (!d.phaseMesh) continue;
      const active = (d.phase === 'A') === (this.game.world.timeline === 'A');
      d.phaseMesh.traverse((c) => {
        const m = c.material;
        if (!m || m.isShaderMaterial) return;
        m.opacity = THREE.MathUtils.damp(m.opacity ?? 1, active ? 1.0 : 0.14, 8, dt);
        if (m.emissiveIntensity !== undefined) m.emissiveIntensity = active ? (m.userData._ei ??= m.emissiveIntensity, m.userData._ei) : 0.1;
      });
    }
    for (const b of this.breakables) b.update(dt, t);
    for (const e of this.enemies) e.update(dt, t);
    for (const c of this.checkpoints) c.update(dt, t);
    this.pearls.update(dt, t);
    this.gem?.update(dt, t);
    this.fractal?.update(dt, t);
    this.goal?.update(dt, t);
    this.chase?.update(dt, t);
    this.def.update?.(this, dt, t);

    // Kill volume
    if (this.game.player.position.y < this.killY && !this.game.player.dead) {
      this.game.player.kill('pit');
    }
  }

  dispose() {
    this.game.engine.scene.remove(this.group);
    this.group.traverse((c) => { c.geometry?.dispose?.(); });
    this.game.world.clear();
  }
}
