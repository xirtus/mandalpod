// ============================================================================
// MANDELPOD — BOSS: THE TRILOBITE KING
// Cambrian armored titan, three phases. Tests spin timing & slam mastery.
// Phase 1: charge attacks (dodge → spin exposed underbelly when flipped)
// Phase 2: summons juvenile trilobites + shockwave rolls
// Phase 3: enrage — faster, arena shrinks, slam-only windows
// Reward: DOUBLE CURRENT (double jump/swim impulse)
// ============================================================================
import * as THREE from 'three';
import { Body, COL } from './physics.js';
import { injectUnderwater } from '../world/materials.js';

export const boss1 = {
  id: 'boss1',
  name: 'THE TRILOBITE KING',
  sub: 'Armored Tyrant of the Cambrian Deep',
  seed: 9001,
  killY: -8,
  spawn: [0, 1.2, 10],
  hasTimeline: false,
  relicTimes: { sapphire: 180, gold: 130, platinum: 95 },
  rail: [[0, 0, 14], [0, 0, 0], [0, 0, -14]],

  build(level, L) {
    const { props, rng } = L;
    // Circular arena: big central disc + ring walls + coral throne backdrop
    L.ground(0, -0.5, 0, 26, 1, 26, { color: '#5a4a6a' });
    // Invisible containment rim — boss knockbacks must never ring you out
    for (const [x, z, w, d] of [[12.8, 0, 1, 27], [-12.8, 0, 1, 27], [0, 12.8, 27, 1], [0, -12.8, 27, 1]]) {
      L.ground(x, 2.5, z, w, 6, d, { mandala: false, color: '#000000' }).mesh.visible = false;
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      L.deco(props.makeRock({ size: 1.2 + rng() * 0.8, color: '#6a5580', seed: 500 + i, flat: true }), Math.cos(a) * 15, -0.3, Math.sin(a) * 15, 1.2, a);
    }
    L.deco(props.makeCoralTree({ seed: 600, branches: 5, depth: 4, color: '#8a2eff', tipColor: '#d0a0ff', glow: 1.2 }), 0, 0, -13, 2.2);
    L.deco(props.makeCoralTree({ seed: 601, branches: 4, depth: 3, color: '#ff5f3c', tipColor: '#ffb3a0', glow: 0.9 }), -10, 0, -8, 1.5);
    L.deco(props.makeCoralTree({ seed: 602, branches: 4, depth: 3, color: '#ff5f3c', tipColor: '#ffb3a0', glow: 0.9 }), 10, 0, -8, 1.5);
    L.deco(props.makeFossilTrilobite({ size: 2.2 }), 0, 0.2, -11, 1.4, 0.3);
    L.deco(props.makeGlowShrooms({ count: 12, color: '#ff6bd8' }), -7, 0, 5, 1.5);
    L.deco(props.makeGlowShrooms({ count: 12, color: '#4fd8ff' }), 7, 0, 5, 1.5);
    // Pearl top-ups around the rim
    L.pearls([[-8, 1, -2], [8, 1, -2], [-6, 1, 6], [6, 1, 6], [0, 1, 8]]);
    level._boss = new TrilobiteKing(level.game, level);
  },

  update(level, dt, t) {
    if (level._boss && !level._boss.dead) {
      level.game.rig.mode = 'boss';
      level.game.rig.bossTarget = level._boss.group.position;
    }
    level._boss?.update(dt, t);
  },
};

class TrilobiteKing {
  constructor(game, level) {
    this.game = game;
    this.level = level;
    this.maxHp = 6;
    this.hp = this.maxHp;
    this.state = 'intro';
    this.stateT = 0;
    this.invuln = 0;
    this.frozen = 0;
    this.dead = false;

    // ---- Regal segmented titan ----
    this.group = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color: '#6a4a8a', roughness: 0.3, metalness: 0.75, emissive: '#3a1a5a', emissiveIntensity: 0.4 });
    injectUnderwater(armorMat, { caustics: 0.6 });
    this.segs = [];
    for (let i = 0; i < 6; i++) {
      const w = 2.6 - i * 0.25;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 10), armorMat);
      seg.scale.set(w / 1.4, 0.55, 0.8);
      seg.position.set(0, 1.1 + Math.sin(i * 0.6) * 0.15, 2.2 - i * 1.35);
      seg.castShadow = true;
      this.group.add(seg);
      this.segs.push(seg);
    }
    // Crown head shield
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 10), armorMat);
    head.scale.set(1.15, 0.55, 0.9);
    head.position.set(0, 1.15, 3.3);
    head.castShadow = true;
    this.group.add(head);
    // Crown spikes
    const crownMat = new THREE.MeshStandardMaterial({ color: '#c9a227', metalness: 0.85, roughness: 0.25, emissive: '#8a6a10', emissiveIntensity: 0.4 });
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9 + (i === 2 ? 0.5 : 0), 5), crownMat);
      spike.position.set((i - 2) * 0.55, 1.95, 3.15 - Math.abs(i - 2) * 0.16);
      this.group.add(spike);
    }
    // Regal eyes
    for (const sx of [-0.7, 0.7]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: '#1a0a2a', emissive: '#ff3a5c', emissiveIntensity: 2.2 }));
      eye.position.set(sx, 1.5, 4.35);
      this.group.add(eye);
    }
    // Glowing weak-point underbelly (visible when flipped)
    this.belly = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), new THREE.MeshStandardMaterial({ color: '#ff9df0', emissive: '#ff4dd8', emissiveIntensity: 2.2 }));
    this.belly.scale.set(1.2, 0.5, 1.6);
    this.belly.position.set(0, 0.35, 0.8);
    this.belly.visible = false;
    this.group.add(this.belly);
    this.group.position.set(0, 0, -6);
    game.engine.scene.add(this.group);

    this.body = new Body({ position: this.group.position, min: new THREE.Vector3(-2.2, 0, -2.2), max: new THREE.Vector3(2.2, 2.2, 2.2), flags: COL.TRIGGER });
    this.body.userData.onTouch = (player) => this._touchPlayer(player);
    game.world.add(this.body);

    this.arenaCenter = new THREE.Vector3(0, 0, 0);
    this._chargeDir = new THREE.Vector3();
    this._shockwaves = [];
    this._introT = 0;
    game.audio?.play('bossRoar');
    game.ui.hint('THE TRILOBITE KING — dodge the charge, strike the glow!', 5);
  }

  get phase() { return this.hp > 4 ? 1 : this.hp > 2 ? 2 : 3; }

  _touchPlayer(player) {
    if (this.dead || player.dead) return;
    if (this.state === 'flipped') return;   // helpless
    if (player.spinActive && this.state === 'stunned') { this._takeHit('spin'); return; }
    if (player.slamming && this.state === 'stunned') { this._takeHit('slam'); return; }
    player.hurt('trilobiteKing');
  }

  _takeHit(method) {
    if (this.invuln > 0 || this.dead) return;
    this.hp--;
    this.invuln = 1;
    const g = this.game;
    g.particles.enemyPoof(this.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    g.engine.flash(0.2, '#ff4dd8');
    g.rig.addShake(0.6);
    g.audio.play('enemyDefeat');
    g.ui.bossBar(true, 'THE TRILOBITE KING', this.hp / this.maxHp);
    if (this.hp <= 0) { this._die(); return; }
    this.setState('enraged');
    // Phase announcements
    if (this.hp === 4) g.ui.toast('THE KING CALLS HIS BROOD', 2.5);
    if (this.hp === 2) g.ui.toast('THE KING RAGES — THE SEA ITSELF TREMBLES', 2.5);
  }

  _die() {
    this.dead = true;
    this.setState('dying');
    const g = this.game;
    g.audio.play('bossRoar');
    g.particles.gemPickup(this.group.position);
    g.engine.flash(0.5, '#ffffff');
  }

  setState(s) { this.state = s; this.stateT = 0; }

  _spawnShockwave() {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.3, 8, 40),
      new THREE.MeshBasicMaterial({ color: '#ff6b3c', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(this.group.position).setY(0.35);
    this.game.engine.scene.add(ring);
    this._shockwaves.push({ ring, r: 1, hit: false });
    this.game.audio.play('slamLand');
  }

  update(dt, t) {
    const g = this.game;
    const p = g.player;
    if (g.player.bubbleActive > 0) this.frozen = 0.4;
    if (this.frozen > 0 && !this.dead) { this.frozen -= dt; dt *= 0.15; }
    this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.body.position.copy(this.group.position);

    // Segments undulate
    let i = 0;
    for (const seg of this.segs) {
      seg.position.y = 1.1 + Math.sin(t * 4 - i * 0.8) * 0.1;
      i++;
    }

    const distToPlayer = this.group.position.distanceTo(p.position);

    switch (this.state) {
      case 'intro': {
        // Rise from the sand with a roar
        this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0, dt * 1.2);
        if (this.stateT > 2.2) { g.ui.bossBar(true, 'THE TRILOBITE KING', 1); this.setState('stalk'); }
        break;
      }
      case 'stalk': {
        // Circle the player menacingly
        const a = t * 0.55;
        const target = new THREE.Vector3(p.position.x + Math.cos(a) * 6, 0, p.position.z + Math.sin(a) * 6);
        this.group.position.lerp(target, dt * 1.4);
        this._face(p.position, dt * 3);
        const stalkTime = this.phase === 3 ? 1.4 : 2.4;
        if (this.stateT > stalkTime) this.setState(Math.random() < (this.phase >= 2 ? 0.35 : 0) ? 'slamTelegraph' : 'chargeTelegraph');
        break;
      }
      case 'chargeTelegraph': {
        // Paw the ground, rear back — READABLE
        this._face(p.position, dt * 6);
        this.group.position.y = Math.abs(Math.sin(this.stateT * 18)) * 0.25;
        if (this.stateT > 0.75) {
          this._chargeDir.subVectors(p.position, this.group.position).setY(0).normalize();
          this.setState('charge');
          g.audio.play('crabCharge');
        }
        break;
      }
      case 'charge': {
        const speed = this.phase === 3 ? 16 : 12;
        this.group.position.addScaledVector(this._chargeDir, speed * dt);
        g.rig.addShake(dt * 2);
        if (this.stateT > 1.05) {
          // Wipeout — flips over, exposing glowing belly
          this.setState('flipped');
          this.belly.visible = true;
          g.audio.play('slamLand');
          g.rig.addShake(0.7);
          g.particles.slamImpact(this.group.position);
        }
        break;
      }
      case 'flipped': {
        // Helpless on its back, legs flailing — HIT THE BELLY (spin or slam near it)
        this.group.rotation.x = THREE.MathUtils.damp(this.group.rotation.x, Math.PI * 0.85, 8, dt);
        if (p.spinActive && distToPlayer < 3.4) this._takeHit('spin');
        else if (p.slamming && distToPlayer < 3.6) this._takeHit('slam');
        if (this.stateT > (this.phase === 3 ? 2.2 : 3.2)) {
          this.belly.visible = false;
          this.group.rotation.x = 0;
          this.setState('stalk');
        }
        break;
      }
      case 'slamTelegraph': {
        this.group.position.y = Math.min(this.group.position.y + dt * 6, 4.5);
        if (this.stateT > 0.8) { this.setState('slam'); }
        break;
      }
      case 'slam': {
        this.group.position.y -= 22 * dt;
        if (this.group.position.y <= 0) {
          this.group.position.y = 0;
          this._spawnShockwave();
          g.rig.addShake(0.8);
          this.setState('stalk');
        }
        break;
      }
      case 'enraged': {
        this.group.rotation.y += dt * 10;
        if (this.stateT > 1.1) this.setState('stalk');
        break;
      }
      case 'dying': {
        this.group.rotation.z += dt * 1.4;
        this.group.position.y -= dt * 0.6;
        this.group.traverse((c) => { if (c.material?.emissiveIntensity !== undefined) c.material.emissiveIntensity *= (1 - dt * 0.8); });
        if (this.stateT > 2.6 && !this._rewarded) {
          this._rewarded = true;
          this.group.visible = false;
          g.world.remove(this.body);
          g.ui.bossBar(false);
          g.save.data.defeatedBosses.push('boss1');
          g.save.grantAbility('doubleJump');
          g.audio.play('abilityUnlock');
          g.player.frozen = true;
          g.ui.abilityUnlock(
            'DOUBLE CURRENT',
            'The King\'s chrono-heart beats within you. Press <b>JUMP</b> again in mid-water to surge a second time. New currents — and old secrets — are now within reach. <i>(Enter / Space to continue)</i>',
            '🌀',
            () => { g.audio.play('uiSelect'); g.player.frozen = false; g.startLevel('hub'); }
          );
        }
        break;
      }
    }

    // Shockwaves: expanding jump-over rings
    for (const s of this._shockwaves) {
      s.r += dt * 9;
      s.ring.scale.set(s.r, s.r, 1);
      s.ring.material.opacity = Math.max(0, 0.85 - s.r / 14);
      const pp = p.position;
      if (!s.hit && Math.abs(Math.hypot(pp.x - s.ring.position.x, pp.z - s.ring.position.z) - s.r) < 0.7 && pp.y < 1.6) {
        s.hit = true;
        p.hurt('shockwave');
      }
      if (s.r > 15) { this.game.engine.scene.remove(s.ring); }
    }
    this._shockwaves = this._shockwaves.filter((s) => s.r <= 15);

    // Face movement dir when charging
    if (this.state === 'charge') this._face(this.group.position.clone().add(this._chargeDir), dt * 10);
  }

  _face(target, k) {
    const want = Math.atan2(target.x - this.group.position.x, target.z - this.group.position.z);
    let d = want - this.group.rotation.y;
    d = ((d + Math.PI) % (Math.PI * 2)) - Math.PI;
    this.group.rotation.y += d * Math.min(1, k);
  }
}
