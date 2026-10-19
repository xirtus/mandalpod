// ============================================================================
// MANDELPOD — Enemy Ecology Department
// Designed platforming obstacles, not shooter AI. Each has: readable
// anticipation → attack → recovery, vulnerability rules, hit reactions,
// defeat poof, player-bounce interaction.
// Roster: Chrono Crab (charger), Roto Urchin (hazard orbiter), Drift Jelly
// (floater), Puffer Mine (proximity), Armored Trilobite (slam-only).
// ============================================================================
import * as THREE from 'three';
import { Body, COL } from './physics.js';
import { injectUnderwater } from '../world/materials.js';

let _eid = 0;

// ------------------------------------------------------------ mesh builders
function crabMesh() {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: '#ff7a3c', roughness: 0.5, emissive: '#c03a10', emissiveIntensity: 0.2 });
  injectUnderwater(shellMat, { caustics: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), shellMat);
  body.scale.set(1.25, 0.7, 1);
  body.position.y = 0.42;
  body.castShadow = true;
  g.add(body);
  // Eyes on stalks
  const stalkMat = new THREE.MeshStandardMaterial({ color: '#c05a2a', roughness: 0.6 });
  for (const sx of [-0.2, 0.2]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 6), stalkMat);
    stalk.position.set(sx, 0.82, 0.3);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: '#1a0a2a', emissive: '#ff3a5c', emissiveIntensity: 1.2 }));
    eye.position.set(sx, 1.0, 0.3);
    g.add(stalk, eye);
  }
  // Claws
  const clawMat = new THREE.MeshStandardMaterial({ color: '#ff9a5c', roughness: 0.45 });
  const claws = [];
  for (const sx of [-0.62, 0.62]) {
    const claw = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), clawMat);
    arm.scale.set(1.3, 0.8, 1);
    const pincerT = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 6), clawMat);
    pincerT.position.set(0.1, 0.12, 0.22); pincerT.rotation.x = 1.2;
    const pincerB = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 6), clawMat);
    pincerB.position.set(0.1, -0.06, 0.24); pincerB.rotation.x = 1.9;
    claw.add(arm, pincerT, pincerB);
    claw.position.set(sx, 0.42, 0.42);
    g.add(claw);
    claws.push(claw);
  }
  // Legs
  const legMat = new THREE.MeshStandardMaterial({ color: '#c05a2a', roughness: 0.6 });
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.55, 5), legMat);
    leg.position.set(side * 0.62, 0.25, -0.25 + (i % 3) * 0.28);
    leg.rotation.z = side * 0.9;
    g.add(leg);
    legs.push(leg);
  }
  return { group: g, parts: { claws, legs, body } };
}

function urchinMesh() {
  const g = new THREE.Group();
  const coreMat = new THREE.MeshStandardMaterial({ color: '#3a1a5a', roughness: 0.6, emissive: '#8a2eff', emissiveIntensity: 0.7 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 9), coreMat);
  core.castShadow = true;
  g.add(core);
  const spikeMat = new THREE.MeshStandardMaterial({ color: '#2a1a4a', roughness: 0.3, emissive: '#c05fff', emissiveIntensity: 1.3 });
  const spikeGeo = new THREE.ConeGeometry(0.05, 0.5, 5);
  const spikes = new THREE.InstancedMesh(spikeGeo, spikeMat, 22);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 22; i++) {
    const dir = new THREE.Vector3().randomDirection();
    q.setFromUnitVectors(up, dir);
    m.compose(dir.clone().multiplyScalar(0.42), q, new THREE.Vector3(1, 1, 1));
    spikes.setMatrixAt(i, m);
  }
  g.add(spikes);
  // Face — it's ALIVE and grumpy
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#ffd94d', emissive: '#ff9d2e', emissiveIntensity: 1.5 });
  for (const sx of [-0.12, 0.12]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), eyeMat);
    eye.position.set(sx, 0.08, 0.3);
    g.add(eye);
  }
  return { group: g, parts: { core } };
}

function jellyMesh() {
  const g = new THREE.Group();
  const bellMat = new THREE.MeshPhysicalMaterial({
    color: '#7fd8ff', roughness: 0.15, transmission: 0.55, thickness: 0.6,
    emissive: '#3a9aff', emissiveIntensity: 0.55, transparent: true, opacity: 0.92,
  });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), bellMat);
  bell.castShadow = true;
  bell.position.y = 0.3;
  g.add(bell);
  // Inner glow organ
  const organ = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff9df0', emissive: '#ff4dd8', emissiveIntensity: 2 }));
  organ.position.y = 0.32;
  g.add(organ);
  // Oral arms
  const armMat = new THREE.MeshStandardMaterial({ color: '#9fdfff', roughness: 0.4, emissive: '#4fbfff', emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
  const arms = [];
  for (let i = 0; i < 6; i++) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.012, 0.85, 5), armMat);
    const a = (i / 6) * Math.PI * 2;
    arm.position.set(Math.cos(a) * 0.22, -0.12, Math.sin(a) * 0.22);
    g.add(arm);
    arms.push(arm);
  }
  return { group: g, parts: { bell, arms, organ } };
}

function trilobiteMesh() {
  const g = new THREE.Group();
  const armorMat = new THREE.MeshStandardMaterial({ color: '#5a6a8a', roughness: 0.35, metalness: 0.7, emissive: '#2a3a5a', emissiveIntensity: 0.3 });
  injectUnderwater(armorMat, { caustics: 0.7 });
  const segs = [];
  for (let i = 0; i < 5; i++) {
    const w = 0.9 - i * 0.1;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), armorMat);
    seg.scale.set(w, 0.42, 0.62);
    seg.position.set(0, 0.3 + Math.sin(i * 0.5) * 0.05, 0.55 - i * 0.42);
    seg.castShadow = true;
    g.add(seg);
    segs.push(seg);
  }
  // Head shield
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), armorMat);
  head.scale.set(1, 0.45, 0.8);
  head.position.set(0, 0.32, 0.95);
  g.add(head);
  // Antennae
  const antMat = new THREE.MeshStandardMaterial({ color: '#3a4a6a', roughness: 0.6 });
  for (const sx of [-0.2, 0.2]) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 0.7, 4), antMat);
    ant.position.set(sx, 0.5, 1.35);
    ant.rotation.x = 1.1;
    g.add(ant);
  }
  // Eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#1a0a2a', emissive: '#35d5ff', emissiveIntensity: 1.4 });
  for (const sx of [-0.25, 0.25]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), eyeMat);
    eye.position.set(sx, 0.5, 1.15);
    g.add(eye);
  }
  return { group: g, parts: { segs } };
}

function pufferMineMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#c9a227', roughness: 0.5, emissive: '#ff9d2e', emissiveIntensity: 0.35 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 9), mat);
  body.castShadow = true;
  g.add(body);
  const spikeMat = new THREE.MeshStandardMaterial({ color: '#8a6a1a', roughness: 0.4 });
  const spikeGeo = new THREE.ConeGeometry(0.06, 0.26, 5);
  const spikes = new THREE.InstancedMesh(spikeGeo, spikeMat, 12);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 12; i++) {
    const dir = new THREE.Vector3().randomDirection();
    q.setFromUnitVectors(up, dir);
    m.compose(dir.clone().multiplyScalar(0.44), q, new THREE.Vector3(1, 1, 1));
    spikes.setMatrixAt(i, m);
  }
  g.add(spikes);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshStandardMaterial({ color: '#2a1a0a', emissive: '#ff3a5c', emissiveIntensity: 1.4 }));
  eye.position.set(0, 0.12, 0.36);
  g.add(eye);
  return { group: g, parts: { body } };
}

// ------------------------------------------------------------------ Enemies
class EnemyBase {
  constructor(game, pos, opts = {}) {
    this.id = _eid++;
    this.game = game;
    this.alive = true;
    this.state = 'idle';
    this.stateT = 0;
    this.home = pos.clone();
    this.phase = Math.random() * Math.PI * 2;
    this.frozen = 0;                  // time-bubble freeze
    const built = this.buildMesh();
    this.group = built.group;
    this.parts = built.parts;
    this.group.position.copy(pos);
    game.level.group.add(this.group);
    // Body created LAZILY on first update: subclasses set this.radius AFTER
    // super() runs, so an eager body would have NaN bounds.
    this.body = null;
    this.hitFlash = 0;
  }

  _createBody() {
    this.radius = this.radius ?? 0.6;
    this.body = new Body({ position: this.group.position.clone(), min: new THREE.Vector3(-this.radius, -this.radius, -this.radius), max: new THREE.Vector3(this.radius, this.radius, this.radius), flags: COL.TRIGGER });
    this.body.userData.enemy = this;
    this.body.userData.onTouch = (player) => this.onPlayerTouch(player);
    this.game.world.add(this.body);
    this.game.world.rebuildBroadphase();
  }
  get dangerous() { return true; }     // touching hurts?
  get bouncy() { return true; }        // can be bounced on?
  get spinVulnerable() { return true; }

  onPlayerTouch(player) {
    if (!this.alive || player.dead) return;
    const p = player;
    // Slam or spin kills
    if (p.slamming && this.slamVulnerable !== false) { this.defeat('slam'); return; }
    if (p.spinActive && this.spinVulnerable) { this.defeat('spin'); return; }
    // Falling onto a bouncy enemy = bounce kill
    if (this.bouncy && p.velocity.y < -2 && p.position.y - p.half.y > this.body.position.y + this.radius * 0.4) {
      this.defeat('bounce');
      p.bounce(p.input.held('jump') ? 15 : 12);
      return;
    }
    if (this.dangerous) p.hurt(this.constructor.name);
  }

  defeat(method = 'spin') {
    if (!this.alive) return;
    this.alive = false;
    const g = this.game;
    g.particles.enemyPoof(this.group.position);
    g.audio?.play('enemyDefeat');
    g.events.emit('enemy-defeated', { enemy: this, method });
    if (this.pearls) g.level.spawnPearlBurst(this.group.position, this.pearls);
    this.group.visible = false;
    if (this.body) g.world.remove(this.body);
  }

  flashHit() { this.hitFlash = 1; }

  update(dt, t) {
    if (!this.alive) return;
    if (!this.body) this._createBody();
    if (this.game.player.bubbleActive > 0) { this.frozen = 0.35; }
    if (this.frozen > 0) { this.frozen -= dt; this.applyFrozenVisual(dt); return; }
    this.stateT += dt;
    this.tick(dt, t);
    this.body?.position.copy(this.group.position);
    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
      this.group.traverse((c) => { if (c.material?.emissiveIntensity !== undefined && c.material._baseEI === undefined) c.material._baseEI = c.material.emissiveIntensity; });
      const f = this.hitFlash;
      this.group.traverse((c) => { if (c.material?._baseEI !== undefined) c.material.emissiveIntensity = c.material._baseEI + f * 3; });
    }
  }
  applyFrozenVisual(dt) {
    this.group.rotation.y += dt * 0.1;  // slow-mo drift
  }
  setState(s) { this.state = s; this.stateT = 0; }
}

// ---------------------------------------------------------- Chrono Crab
export class ChronoCrab extends EnemyBase {
  constructor(game, pos, opts = {}) {
    super(game, pos, opts);
    this.radius = 0.62;
    this.pearls = 2;
    this.patrolRange = opts.patrolRange ?? 3;
    this.speed = 2.2;
    this.dir = 1;
  }
  buildMesh() { return crabMesh(); }
  tick(dt, t) {
    const g = this.group;
    const player = this.game.player;
    const dist = g.position.distanceTo(player.position);
    // Legs skitter
    let i = 0;
    for (const leg of this.parts.legs) {
      leg.rotation.x = Math.sin(t * 14 + i * 1.3) * 0.5 * (this.state === 'charge' ? 1.6 : 0.7);
      i++;
    }
    switch (this.state) {
      case 'idle':
        // Patrol sideways (crab walk)
        g.position.z = this.home.z + Math.sin(t * 0.7 + this.phase) * this.patrolRange * 0.3;
        g.position.x = this.home.x + Math.sin(t * 0.5 + this.phase * 2) * this.patrolRange * 0.2;
        if (dist < 5.5 && Math.abs(player.position.z - g.position.z) < 4) this.setState('anticipate');
        break;
      case 'cooldown':
        if (this.stateT > 1.0) this.setState('idle');
        break;
      case 'anticipate': {
        // Rear up, snap claws, lean toward player — READABLE wind-up
        const target = Math.atan2(player.position.x - g.position.x, player.position.z - g.position.z);
        g.rotation.y += (((target - g.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI) * dt * 8;
        this.parts.claws[0].rotation.z = Math.sin(this.stateT * 25) * 0.4;
        this.parts.claws[1].rotation.z = -Math.sin(this.stateT * 25) * 0.4;
        this.parts.body.position.y = 0.42 + Math.sin(this.stateT * 25) * 0.04;
        if (this.stateT > 0.8) { this.setState('charge'); this.chargeDir = new THREE.Vector3().subVectors(player.position, g.position).setY(0).normalize(); this.game.audio?.play('crabCharge'); }
        break;
      }
      case 'charge': {
        g.position.addScaledVector(this.chargeDir, 7.5 * dt);
        if (this.stateT > 0.65) this.setState('recover');
        break;
      }
      case 'recover':
        g.rotation.y += Math.sin(this.stateT * 10) * dt * 2; // dizzy wobble
        if (this.stateT > 0.9) this.setState('cooldown');
        break;
    }
  }
}

// ----------------------------------------------------------- Roto Urchin
export class RotoUrchin extends EnemyBase {
  constructor(game, pos, opts = {}) {
    super(game, pos, opts);
    this.radius = 0.55;
    this.pearls = 0;
    this.orbitRadius = opts.orbitRadius ?? 1.6;
    this.orbitSpeed = opts.orbitSpeed ?? 1.4;
  }
  buildMesh() { return urchinMesh(); }
  get bouncy() { return false; }        // spiky: no bouncing, avoid or spin
  tick(dt, t) {
    const g = this.group;
    const a = t * this.orbitSpeed + this.phase;
    g.position.x = this.home.x + Math.cos(a) * this.orbitRadius;
    g.position.z = this.home.z + Math.sin(a) * this.orbitRadius;
    g.position.y = this.home.y + Math.sin(t * 2 + this.phase) * 0.2;
    g.rotation.y += dt * 3;
    g.rotation.x = Math.sin(t * 1.7) * 0.3;
  }
}

// ------------------------------------------------------------ Drift Jelly
export class DriftJelly extends EnemyBase {
  constructor(game, pos, opts = {}) {
    super(game, pos, opts);
    this.radius = 0.55;
    this.pearls = 2;
    this.range = opts.range ?? 3.5;
  }
  buildMesh() { return jellyMesh(); }
  get dangerous() { return this.state !== 'idle' || true; } // always stings
  tick(dt, t) {
    const g = this.group;
    // Pulse-swim vertically along a lazy path; bell contracts then pushes
    const cycle = (t * 0.9 + this.phase) % (Math.PI * 2);
    const pulse = Math.max(0, Math.sin(cycle * 3));
    this.parts.bell.scale.set(1 + pulse * 0.25, 1 - pulse * 0.18, 1 + pulse * 0.25);
    g.position.y = this.home.y + Math.sin(t * 0.8 + this.phase) * this.range * 0.5;
    g.position.x = this.home.x + Math.sin(t * 0.4 + this.phase * 2) * this.range * 0.3;
    let i = 0;
    for (const arm of this.parts.arms) {
      arm.rotation.x = Math.sin(t * 2.2 + i) * 0.25;
      arm.rotation.z = Math.cos(t * 1.9 + i * 1.3) * 0.25;
      i++;
    }
    this.parts.organ.scale.setScalar(1 + pulse * 0.3);
  }
}

// ------------------------------------------------------- Armored Trilobite
export class ArmoredTrilobite extends EnemyBase {
  constructor(game, pos, opts = {}) {
    super(game, pos, opts);
    this.radius = 0.7;
    this.pearls = 4;
    this.patrolRange = opts.patrolRange ?? 4;
  }
  buildMesh() { return trilobiteMesh(); }
  get spinVulnerable() { return false; }  // armor shrugs off spins — SLAM only
  tick(dt, t) {
    const g = this.group;
    const a = Math.sin(t * 0.55 + this.phase);
    g.position.z = this.home.z + a * this.patrolRange;
    g.rotation.y = Math.cos(t * 0.55 + this.phase) > 0 ? 0 : Math.PI;
    // Segmented body undulation
    let i = 0;
    for (const seg of this.parts.segs) {
      seg.position.y = 0.3 + Math.sin(t * 6 - i * 0.9) * 0.045;
      i++;
    }
  }
  onPlayerTouch(player) {
    if (!this.alive || player.dead) return;
    if (player.slamming) { this.defeat('slam'); return; }
    if (player.spinActive) { this.flashHit(); this.game.audio?.play('armorClank'); this.game.particles.spinSlash(this.group.position); return; }
    super.onPlayerTouch(player);
  }
}

// ------------------------------------------------------------ Puffer Mine
export class PufferMine extends EnemyBase {
  constructor(game, pos, opts = {}) {
    super(game, pos, opts);
    this.radius = 0.55;
    this.pearls = 1;
    this.inflate = 0;
  }
  buildMesh() { return pufferMineMesh(); }
  get bouncy() { return false; }
  tick(dt, t) {
    const g = this.group;
    const dist = g.position.distanceTo(this.game.player.position);
    g.position.y = this.home.y + Math.sin(t * 1.3 + this.phase) * 0.35;
    if (this.state === 'idle' && dist < 3) { this.setState('inflate'); this.game.audio?.play('pufferInflate'); }
    if (this.state === 'inflate') {
      this.inflate = Math.min(this.inflate + dt * 1.6, 1);
      const s = 1 + this.inflate * 0.8;
      this.parts.body.scale.setScalar(s);
      if (this.inflate >= 1) { this.explode(); }
    }
  }
  explode() {
    if (!this.alive) return;
    const g = this.game;
    g.particles.pufferExplode(this.group.position);
    g.rig.addShake(0.4);
    g.audio?.play('explosion');
    if (this.game.player.position.distanceTo(this.group.position) < 2.4) this.game.player.hurt('pufferMine');
    this.defeat('explosion');
  }
  defeat(method) {
    if (method !== 'explosion' && this.alive) { this.alive = true; this.explode(); return; }
    super.defeat(method);
  }
}

export const ENEMY_TYPES = { crab: ChronoCrab, urchin: RotoUrchin, jelly: DriftJelly, trilobite: ArmoredTrilobite, puffer: PufferMine };
