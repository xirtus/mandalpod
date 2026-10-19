// ============================================================================
// MANDELPOD — Breakables Department ("crates" of the SpaceTime ocean)
// Memory Shell (basic), Pearl Pod (fruit), Ink Bladder, Bounce Sponge,
// Puffer Pod (TNT), Countdown Anemone, Reinforced Chrono Coral (slam-only),
// Phase Coral (timeline-gated). Every break is AN EVENT: anim, particles,
// sound, fragments, combo feedback.
// ============================================================================
import * as THREE from 'three';
import { Body, COL } from './physics.js';
import { Mats, injectUnderwater } from '../world/materials.js';
import { makeNautilus, makeGoldenSpiralInlay } from '../world/props.js';

let _bid = 0;

function memoryShellMesh(size = 0.62) {
  // Scallop shell with glowing memory core
  const group = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: '#e8a86a', roughness: 0.5, metalness: 0.1 });
  injectUnderwater(shellMat, { caustics: 0.8 });
  const geo = new THREE.SphereGeometry(size, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const r = 1 + Math.sin(a * 10) * 0.08;
    pos.setX(i, x * r); pos.setZ(i, z * r);
  }
  geo.computeVertexNormals();
  const shell = new THREE.Mesh(geo, shellMat);
  shell.castShadow = true;
  const core = new THREE.Mesh(new THREE.SphereGeometry(size * 0.42, 10, 8), new THREE.MeshStandardMaterial({ color: '#2a1a3a', emissive: '#c05fff', emissiveIntensity: 1.6 }));
  core.position.y = -size * 0.1;
  group.add(shell, core);
  return group;
}

function pearlPodMesh(size = 0.55) {
  const group = new THREE.Group();
  const podMat = new THREE.MeshStandardMaterial({ color: '#3aa86a', roughness: 0.6 });
  injectUnderwater(podMat, { caustics: 0.7 });
  const pod = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), podMat);
  pod.scale.set(1, 1.25, 1);
  pod.castShadow = true;
  // Seam
  const seam = new THREE.Mesh(new THREE.TorusGeometry(size * 0.92, 0.045, 6, 14), new THREE.MeshStandardMaterial({ color: '#1a4a30', roughness: 0.7 }));
  seam.rotation.x = Math.PI / 2;
  group.add(pod, seam);
  return group;
}

function pufferPodMesh(size = 0.6) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#ff5c4d', roughness: 0.55, emissive: '#ff2e1a', emissiveIntensity: 0.25 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 9), bodyMat);
  body.castShadow = true;
  group.add(body);
  // Spikes
  const spikeMat = new THREE.MeshStandardMaterial({ color: '#ffd94d', roughness: 0.4, emissive: '#ff9d2e', emissiveIntensity: 0.6 });
  const spikeGeo = new THREE.ConeGeometry(0.07, 0.3, 5);
  const spikes = new THREE.InstancedMesh(spikeGeo, spikeMat, 14);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 14; i++) {
    const dir = new THREE.Vector3().randomDirection();
    q.setFromUnitVectors(up, dir);
    m.compose(dir.clone().multiplyScalar(size * 0.95), q, new THREE.Vector3(1, 1, 1));
    spikes.setMatrixAt(i, m);
  }
  group.add(spikes);
  return group;
}

// SPACE-TIME NAUTILUS PAD — a golden ammonite that loves being landed on.
// Sacred spiral top, pearly shell, hovering beacon spiral above (visibility!).
function bounceSpongeMesh(size = 1.0) {
  const group = new THREE.Group();
  // Shell body: nautilus flattened into a springy dome
  const shell = makeNautilus({ size: size * 1.05, turns: 1.5, color: '#ffefc8', bandColor: '#e8a04d' });
  shell.rotation.x = -0.42;             // tilt the spiral face up toward the player
  shell.scale.set(1.15, 0.62, 1.05);
  shell.position.y = size * 0.28;
  shell.traverse((c) => { c.castShadow = true; });
  group.add(shell);
  // Living golden spiral face
  const face = makeGoldenSpiralInlay({ size: size * 0.72, color: '#ffd94d' });
  face.rotation.x = -Math.PI / 2 - 0.42;
  face.position.set(0, size * 0.42, size * 0.18);
  group.add(face);
  // Hovering beacon: a small echo-spiral that bobs above — READABLE from afar
  const beacon = makeGoldenSpiralInlay({ size: size * 0.4, color: '#7fffe8' });
  beacon.rotation.x = -Math.PI / 2;
  beacon.position.y = size * 1.55;
  beacon.name = 'beacon';
  group.add(beacon);
  // Soft rim glow ring at the base
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(size * 0.95, 0.045, 8, 24),
    new THREE.MeshStandardMaterial({ color: '#3a2a10', emissive: '#ffb37a', emissiveIntensity: 1.6 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.06;
  group.add(rim);
  return group;
}

function chronoCoralMesh(size = 0.65) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#8a5fdf', roughness: 0.35, metalness: 0.5, emissive: '#5a2ebf', emissiveIntensity: 0.4 });
  const geo = new THREE.OctahedronGeometry(size, 1);
  const crystal = new THREE.Mesh(geo, mat);
  crystal.castShadow = true;
  // Reinforcement bands
  const band = new THREE.Mesh(new THREE.TorusGeometry(size * 0.85, 0.06, 6, 4), new THREE.MeshStandardMaterial({ color: '#3a2a6a', metalness: 0.8, roughness: 0.3 }));
  band.rotation.x = Math.PI / 2;
  band.scale.z = 0.6;
  const band2 = band.clone(); band2.rotation.set(0, 0, Math.PI / 2); band2.rotation.y = Math.PI / 4;
  group.add(crystal, band, band2);
  return group;
}

const TYPES = {
  memoryShell:  { mesh: memoryShellMesh, pearls: 1, hp: 1, score: 10 },
  pearlPod:     { mesh: pearlPodMesh, pearls: 5, hp: 1, score: 10 },
  pufferPod:    { mesh: pufferPodMesh, pearls: 0, hp: 1, score: 20, explosive: true },
  bounceSponge: { mesh: bounceSpongeMesh, pearls: 0, hp: Infinity, score: 0, bouncy: true },
  chronoCoral:  { mesh: chronoCoralMesh, pearls: 3, hp: 1, score: 30, slamOnly: true },
};

export class Breakable {
  constructor(type, position, game) {
    this.id = _bid++;
    this.type = type;
    this.def = TYPES[type];
    this.game = game;
    this.alive = true;
    this.countsForPerfect = type === 'memoryShell' || type === 'pearlPod' || type === 'chronoCoral';
    this.wobble = 0;
    this.mesh = this.def.mesh();
    this.mesh.position.copy(position);
    game.level.group.add(this.mesh);
    const half = type === 'bounceSponge' ? new THREE.Vector3(1.1, 0.55, 1.1) : new THREE.Vector3(0.55, 0.55, 0.55);
    this.body = new Body({ position: position.clone(), min: half.clone().negate(), max: half, flags: COL.SOLID | COL.BOUNCE });
    this.body.userData.breakable = this;
    game.world.add(this.body);
    this.baseY = position.y;
    this.phase = Math.random() * Math.PI * 2;
  }

  // Player interaction router — called from game when overlapping & attacking
  tryHit(player, method /* 'spin' | 'slam' | 'bump' | 'explosion' */) {
    if (!this.alive) return false;
    if (this.def.bouncy) return false;
    if (this.def.slamOnly && method !== 'slam' && method !== 'explosion') {
      this.wobble = 1;
      this.game.events.emit('breakable-resist', this);
      return false;
    }
    if (method === 'bump' && this.type === 'pufferPod') { this.explode(); return true; }
    if (method === 'bump' && !this.def.explosive) return false; // crates need attacks (headbutt from below handled separately)
    this.break(method);
    return true;
  }

  break(method = 'spin') {
    if (!this.alive) return;
    this.alive = false;
    const g = this.game;
    const p = this.mesh.position;
    if (this.def.explosive) { this.explode(); return; }
    g.particles.shellBreak(p);
    if (this.type === 'chronoCoral') g.particles.timeBubble(p);
    g.audio?.play('break');
    g.events.emit('breakable-broken', this);
    if (this.def.pearls > 0) g.level.spawnPearlBurst(p, this.def.pearls);
    this.destroy();
  }

  explode() {
    if (!this.alive) return;
    this.alive = false;
    const g = this.game;
    g.particles.pufferExplode(this.mesh.position);
    g.rig.addShake(0.55);
    g.engine.flash(0.18, '#ff7a4d');
    g.audio?.play('explosion');
    g.events.emit('breakable-broken', this);
    // Chain reaction + hurt player if close
    const p = this.mesh.position;
    for (const b of g.level.breakables) {
      if (b !== this && b.alive && b.mesh.position.distanceTo(p) < 2.6) {
        setTimeout(() => b.tryHit(g.player, 'explosion'), 90);
      }
    }
    for (const e of g.level.enemies) {
      if (e.alive && e.group.position.distanceTo(p) < 2.8) e.defeat('explosion');
    }
    if (g.player.position.distanceTo(p) < 2.2) g.player.hurt('explosion');
    this.destroy();
  }

  destroy() {
    this.game.world.remove(this.body);
    this.mesh.visible = false;
    this.mesh.parent?.remove(this.mesh);
  }

  update(dt, t) {
    if (!this.alive) return;
    // Gentle idle bob + hit wobble
    this.wobble = Math.max(0, this.wobble - dt * 3);
    const w = this.wobble * Math.sin(t * 30) * 0.12;
    this.mesh.rotation.z = w;
    this.mesh.rotation.x = this.wobble * Math.sin(t * 26 + 1) * 0.1;
    if (this.type === 'bounceSponge') {
      const idle = 1 + Math.sin(t * 2.4 + this.phase) * 0.05;
      const sq = idle * (1 - this.wobble * 0.4);      // deep squash on bounce
      this.mesh.scale.set(sq, (1 / sq) * (1 - this.wobble * 0.25), sq);
      const beacon = this.mesh.getObjectByName('beacon');
      if (beacon) {
        beacon.rotation.z += dt * 1.6;
        beacon.position.y = 1.55 + Math.sin(t * 2 + this.phase) * 0.14;
      }
    } else if (this.type !== 'chronoCoral') {
      this.mesh.position.y = this.baseY + Math.sin(t * 1.5 + this.phase) * 0.05;
      this.body.position.y = this.mesh.position.y;
    }
    if (this.type === 'chronoCoral') this.mesh.rotation.y += dt * 0.6;
  }
}
