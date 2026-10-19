// ============================================================================
// MANDELPOD — Game Orchestrator
// State machine: title → level intro → playing → dead → results → hub…
// Wires player↔level↔fx↔audio↔ui, manages timeline swap input, death/respawn
// flow, scoring, relics, saves. THE GAME LOOP LIVES HERE.
// ============================================================================
import * as THREE from 'three';
import { Level } from './level.js';
import { LeviathanChase } from './chase.js';
import { COL } from './physics.js';

export class Game {
  constructor({ engine, input, save, events, world, env, particles, player, rig, audio, ui }) {
    Object.assign(this, { engine, input, save, events, world, env, particles, player, rig, audio, ui });
    this.state = 'title';
    this.level = null;
    this.levelDef = null;
    this.levels = {};
    this.time = 0;
    this.pearlCombo = 0;
    this._comboTimer = 0;
    this._swapCooldown = 0;
    this._deathTimer = 0;
    this._paused = false;
    this._debug = false;
    this._hintsShown = new Set();
    this._testMode = new URLSearchParams(location.search).has('test');
    this._wireEvents();
    window.addEventListener('keydown', (e) => { if (e.code === 'F3') this._debug = !this._debug; });
  }

  registerLevel(def) { this.levels[def.id] = def; }

  _wireEvents() {
    const ev = this.events;
    ev.on('pearl-collected', ({ pos }) => {
      this.player.pearls++;
      this.pearlCombo++;
      this._comboTimer = 1.2;
      this.particles.pearlPickup(pos);
      this.audio.play('pearl', { combo: this.pearlCombo });
      this.ui.setPearls(this.player.pearls);
    });
    ev.on('breakable-broken', (b) => {
      if (b.countsForPerfect) {
        this.level.stats.shellsBroken++;
        this.ui.setShells(this.level.stats.shellsBroken, this.level.stats.shellsTotal);
      }
      this.rig.addShake(0.18);
    });
    ev.on('breakable-resist', (b) => {
      this.audio.play('armorClank');
      this.hintOnce('slamOnly', 'Only a <kbd>L</kbd> BODY SLAM can crack Chrono Coral!');
    });
    ev.on('enemy-defeated', () => { this.rig.addShake(0.12); });
    ev.on('player-hurt', () => {
      this.ui.hurtFlash();
      this.audio.play('hurt');
      this.pearlCombo = 0;
    });
    ev.on('player-died', ({ source }) => this._onDeath(source));
    ev.on('player-jump', () => this.audio.play('jump'));
    ev.on('player-double-jump', () => { this.audio.play('doubleJump'); this.particles.jumpPuff(this.player.position); });
    ev.on('player-landed', () => this.audio.play('land'));
    ev.on('player-spin', () => this.audio.play('spin'));
    ev.on('player-slam-start', () => this.audio.play('slamFall'));
    ev.on('player-slam-land', (d) => {
      this.audio.play('slamLand');
      this.rig.addShake(0.5);
      // Slam shockwave breaks/hits in radius
      for (const b of this.level?.breakables ?? []) {
        if (b.alive && b.mesh.position.distanceTo(d.position) < 2.2) b.tryHit(this.player, 'slam');
      }
      for (const e of this.level?.enemies ?? []) {
        if (e.alive && e.group.position.distanceTo(d.position) < 2.4) e.onPlayerTouch(this.player);
      }
    });
    ev.on('player-bounced', () => this.audio.play('bounce'));
    ev.on('player-dash', () => this.audio.play('dash'));
    ev.on('player-bubble', () => { this.audio.play('timeSwap'); });
    ev.on('gem-collected', (gem) => {
      this.particles.gemPickup(gem.group.position);
      this.audio.play('gem');
      this.ui.toast('◆ CHRONO GEM SECURED ◆', 2.6);
      this._gemTaken = true;
    });
    ev.on('fractal-collected', (f) => {
      this.particles.timeBubble(f.group.position);
      this.audio.play('fractal');
      this.ui.toast('✺ HIDDEN FRACTAL DISCOVERED ✺', 3);
      this._fractalTaken = true;
    });
    ev.on('checkpoint-activated', () => this.ui.toast('CHECKPOINT', 1.4));
    ev.on('goal-reached', () => this._onGoal());
    ev.on('timeline-swapped', ({ timeline }) => this.ui.setTimeline(timeline));
    ev.on('chase-began', () => {});
  }

  hintOnce(key, html, dur = 4) {
    if (this._hintsShown.has(key)) return;
    this._hintsShown.add(key);
    this.ui.hint(html, dur);
  }

  // ------------------------------------------------------------- flow ----
  showTitle() {
    this.state = 'title';
    this.audio.setMode('title');
    // Living reef behind the menu: load hub in attract mode, slow orbit
    if (this.level) this.level.dispose();
    this.levelDef = this.levels['hub'];
    this.level = new Level(this, this.levelDef);
    this.world.rebuildBroadphase();
    this.player.spawn(new THREE.Vector3(0, 1.2, 8));
    this.player.frozen = true;
    this.player.octopus.group.visible = false;   // pure vista
    this.rig.mode = 'attract';
    this.ui.title(() => {
      this.audio.start();
      this.audio.play('uiSelect');
      this.player.frozen = false;
      this.player.octopus.group.visible = true;
      this.startLevel('level1');
    });
  }

  startLevel(id) {
    const def = this.levels[id];
    if (!def) return console.error('no level', id);
    this.ui.clearScreens();
    if (this.level) { this.level.dispose(); }
    this.levelDef = def;
    this.level = new Level(this, def);
    this.world.timeline = 'A';
    this.world.rebuildBroadphase();
    this.player.spawn(new THREE.Vector3(...def.spawn));
    this.player.pearls = 0;
    this.player.shells = 0;
    this._gemTaken = false;
    this._fractalTaken = false;
    this._levelStartTime = this.engine.time;
    this._deathCount = 0;
    this.pearlCombo = 0;
    if (def.id === 'level1') {
      this.level.chase = new LeviathanChase(this, { startZ: -97, endZ: -138 });
    }
    this.rig.mode = 'rail';
    this.rig.snapTo(new THREE.Vector3(def.spawn[0], def.spawn[1] + 4, def.spawn[2] + 7), new THREE.Vector3(def.spawn[0], def.spawn[1], def.spawn[2] - 4));
    this.state = 'playing';
    this.audio.setMode('explore');
    this.ui.setPearls(0);
    this.ui.setShells(0, this.level.stats.shellsTotal);
    this.ui.setTimeline('A', def.hasTimeline !== false);
    this.ui.toast(def.name, 3);
    setTimeout(() => this.hintOnce('move', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> SCUTTLE &nbsp;·&nbsp; <kbd>SPACE</kbd> JUMP &nbsp;·&nbsp; <kbd>J</kbd> SPIN', 5), 1500);
  }

  _onDeath(source) {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    this._deathCount++;
    this.level.stats.deaths++;
    this.audio.play('death');
    this.engine.flash(0.3, '#4a1a6a');
    this.rig.addShake(0.7);
    // Surreal death: octopus bursts into bubbles
    this.particles.bubbles(this.player.position, 40);
    this.particles.enemyPoof(this.player.position);
    this.player.octopus.group.visible = false;
    this._deathTimer = 0;
  }

  _onGoal() {
    if (this.state !== 'playing') return;
    this.state = 'results';
    this.audio.play('goal');
    this.audio.setMode('results');
    this.player.frozen = true;
    const time = this.engine.time - this._levelStartTime;
    const rt = this.levelDef.relicTimes;
    const relicRank = time <= rt.platinum ? 3 : time <= rt.gold ? 2 : time <= rt.sapphire ? 1 : 0;
    const stats = {
      time, deaths: this._deathCount, pearls: this.player.pearls,
      shells: this.level.stats.shellsBroken, shellsTotal: this.level.stats.shellsTotal,
      fractal: this._fractalTaken, relicRank,
      perfect: !this._fractalTaken ? false : false, // set below
    };
    stats.perfect = stats.shells === stats.shellsTotal && stats.deaths === 0;
    // Persist
    const rec = this.save.level(this.levelDef.id);
    rec.gem = true;
    rec.completions++;
    rec.bestTime = rec.bestTime ? Math.min(rec.bestTime, time) : time;
    rec.relicRank = Math.max(rec.relicRank, relicRank);
    rec.shellsBest = Math.max(rec.shellsBest, stats.shells);
    if (this._fractalTaken) rec.fractal = true;
    if (stats.perfect) rec.perfectPearl = true;
    this.save.data.pearls += this.player.pearls;
    if (this.levelDef.unlocks) this.save.unlockLevel(this.levelDef.unlocks);
    this.save.commit();
    this.player.frozen = true;
    setTimeout(() => {
      this.ui.results(stats, () => {
        this.audio.play('uiSelect');
        this.player.frozen = false;
        this._afterLevel();
      });
    }, 1200);
  }

  _afterLevel() {
    // Boss 1 unlocks after level 1
    if (this.levelDef.id === 'level1' && !this.save.data.defeatedBosses.includes('boss1')) {
      this.startLevel('boss1');
    } else {
      this.startLevel('hub');
    }
  }

  togglePause() {
    if (this.state !== 'playing' && !this._paused) return;
    this._paused = !this._paused;
    this.engine.timeScale = this._paused ? 0 : 1;
    if (this._paused) {
      this.ui.pause(() => this.togglePause(), () => { this._paused = false; this.engine.timeScale = 1; this.startLevel('hub'); });
    } else {
      this.ui.clearScreens();
    }
  }

  // Player attacks vs world — runs every fixed step while playing
  _combat() {
    const p = this.player;
    if (!this.level) return;
    const attacking = p.spinActive || p.slamming;
    // Breakables
    for (const b of this.level.breakables) {
      if (!b.alive) continue;
      const bp = b.mesh.position;
      const dist = bp.distanceTo(p.position);
      if (p.spinActive && dist < 1.7) {
        if (p.onHitSomething(b)) { b.tryHit(p, 'spin'); this.particles.spinSlash(bp); }
      } else if (p.slamming && dist < 1.8) {
        b.tryHit(p, 'slam');
      } else if (dist < 1.55) {
        // Standing/bumping
        if (b.def.bouncy) {
          // Bounce sponge: bounce when falling onto it OR standing on it
          const horiz = Math.hypot(bp.x - p.position.x, bp.z - p.position.z);
          const falling = p.velocity.y < -0.5 && p.position.y > bp.y + 0.2 && horiz < 1.1;
          const standing = p.grounded && p.groundBody === b.body;
          if (falling || standing) {
            p.bounce(p.input.held('jump') ? 16.5 : 13.5);
            b.wobble = 1;
            this.particles.jumpPuff(bp);
          }
        } else if (p.velocity.y > 2 && p.position.y < bp.y) {
          // Headbutt from below
          b.tryHit(p, 'spin');
          p.velocity.y = -2;
        } else if (b.type === 'pufferPod') {
          b.tryHit(p, 'bump');
        }
      }
    }
    // Enemy contact handled via physics triggers (onTouch)
  }

  // ------------------------------------------------------------- loop ----
  fixedUpdate(dt, t) {
    // Input edges live one fixed step — consume them here, not in update()
    if (this.state === 'title' && this.input.pressed('confirm')) {
      const btn = document.getElementById('mpd-start');
      btn?.click();
    }
    if (this.input.pressed('pause')) this.togglePause();
    if (this.state === 'playing') {
      this._combat();
      // Timeline swap input
      this._swapCooldown = Math.max(0, this._swapCooldown - dt);
      if (this.input.pressed('swap') && this._swapCooldown <= 0 && this.levelDef?.hasTimeline !== false) {
        this._swapCooldown = 0.5;
        this.level.swapTimeline();
      }
      // Contextual hints by progress
      const z = this.player.position.z;
      if (z < -48 && z > -70) this.hintOnce('sponges', 'BOUNCE SPONGES love being landed on', 3);
      if (z < -73 && z > -94) this.hintOnce('swap', '<kbd>T</kbd> SWAP TIMELINE — the reef remembers two states', 5);
    }
    if (this.state === 'dead') {
      this._deathTimer += dt;
      if (this._deathTimer > 1.5) {
        // Fast respawn — Crash-grade iteration speed
        this.save.data.lives = Math.max(0, this.save.data.lives - 1);
        this.ui.setLives(this.save.data.lives);
        if (this.save.data.lives === 0) {
          // GAME OVER: the current returns you to the start, lives restored
          this.save.data.lives = 5;
          this.ui.setLives(5);
          this.ui.toast('THE CURRENT RETURNS YOU TO THE BEGINNING', 3);
          const id = this.levelDef.id;
          this.startLevel(id);
          return;
        }
        this.player.respawnAtCheckpoint();
        this.world.timeline = 'A';
        this.ui.setTimeline('A', this.levelDef?.hasTimeline !== false);
        this.state = 'playing';
        // Reset chase if died during it — with restart grace
        if (this.level?.chase?.active || (this.level?.chase && !this.level.chase.done && this.player.position.z < this.level.chase.startZ + 3)) {
          this.level.chase.active = false;
          this.level.chase.group.visible = false;
          this.level.chase.z = this.player.position.z + 24;
          this.level.chase._grace = 3.0;
          this.rig.mode = 'rail';
          this.audio.setMode('explore');
        }
      }
    }
  }

  update(dt, t, rawDt) {
    if (this.state === 'playing' || this.state === 'dead') {
      this.level?.update(dt, t);
    }
    // Pearl combo decay
    this._comboTimer -= dt;
    if (this._comboTimer <= 0) this.pearlCombo = 0;
    // Camera
    this.rig.update(dt, this.player);
    this.player.camYaw = this.rig.yawAssist;
    // Debug panel
    if (this._debug) {
      const p = this.engine.perf;
      const info = this.engine.renderer.info;
      this.ui.debug(
        `MANDELPOD DEV  fps ${p.fps.toFixed(0)}  cpu ${p.ms.toFixed(1)}ms\n` +
        `draws ${info.render.calls}  tris ${(info.render.triangles / 1000).toFixed(0)}k\n` +
        `pos ${this.player.position.toArray().map((v) => v.toFixed(1)).join(', ')}\n` +
        `state ${this.player.state}  vel ${this.player.velocity.length().toFixed(1)}\n` +
        `bodies ${this.world.bodies.length}  tl ${this.world.timeline}`
      );
    } else this.ui.debug(null);
  }
}
