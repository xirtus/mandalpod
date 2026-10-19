// ============================================================================
// MANDELPOD — Collectibles Department
// SpaceTime Pearls (trail collectibles, magnet-attracted), Chrono Gem (level
// completion), Hidden Fractal (secret), Checkpoint Anemones, Goal Vortex.
// Pearls are GPU-instanced with per-instance sparkle phase.
// ============================================================================
import * as THREE from 'three';

export class PearlManager {
  constructor(game) {
    this.game = game;
    this.pearls = [];       // { pos, taken, magnet, phase }
    this.capacity = 400;
    const geo = new THREE.SphereGeometry(0.14, 10, 8);
    // Inner glow + outer shell look via emissive iridescent material
    const mat = new THREE.MeshPhysicalMaterial({
      color: '#fff3d0', roughness: 0.15, metalness: 0.1,
      iridescence: 0.9, iridescenceIOR: 1.6,
      emissive: '#ffca4d', emissiveIntensity: 0.85,
    });
    this.inst = new THREE.InstancedMesh(geo, mat, this.capacity);
    this.inst.count = 0;
    this.inst.frustumCulled = false;
    game.level.group.add(this.inst);
    this._m = new THREE.Matrix4();
    this._dirty = true;
  }

  add(pos) {
    if (this.pearls.length >= this.capacity) return;
    this.pearls.push({ pos: pos.clone(), taken: false, magnet: 0, phase: Math.random() * Math.PI * 2, vel: new THREE.Vector3() });
    this._dirty = true;
  }

  addTrail(from, to, count, arc = 0) {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      const p = from.clone().lerp(to, t);
      p.y += Math.sin(t * Math.PI) * arc;
      this.add(p);
    }
  }

  spawnBurst(pos, count) {
    for (let i = 0; i < count; i++) {
      const p = pos.clone();
      const pearl = { pos: p, taken: false, magnet: 0.25, phase: Math.random() * Math.PI * 2, vel: new THREE.Vector3().randomDirection().multiplyScalar(3 + Math.random() * 3) };
      this.pearls.push(pearl);
    }
    this._dirty = true;
  }

  update(dt, t) {
    const player = this.game.player;
    let count = 0;
    const m = this._m;
    for (const p of this.pearls) {
      if (p.taken) continue;
      // Burst physics then magnet
      if (p.vel.lengthSq() > 0.01) {
        p.pos.addScaledVector(p.vel, dt);
        p.vel.multiplyScalar(Math.pow(0.1, dt));
        p.vel.y -= 6 * dt;
      }
      const d = p.pos.distanceTo(player.position);
      if (d < 3.2 || p.magnet > 0) {
        p.magnet = Math.min(p.magnet + dt * 3, 1.6);
        const pull = 14 * p.magnet;
        p.pos.lerp(player.position.clone().add(new THREE.Vector3(0, 0.2, 0)), Math.min(1, pull * dt / Math.max(d, 0.001) * 0.2));
      }
      if (d < 0.75) {
        p.taken = true;
        this.game.events.emit('pearl-collected', { pos: p.pos.clone() });
        this._dirty = true;
        continue;
      }
      const bob = Math.sin(t * 2.2 + p.phase) * 0.06;
      const s = 1 + Math.sin(t * 3 + p.phase) * 0.12;
      m.makeScale(s, s, s).setPosition(p.pos.x, p.pos.y + bob, p.pos.z);
      this.inst.setMatrixAt(count++, m);
    }
    this.inst.count = count;
    this.inst.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------- Chrono Gem
export class ChronoGem {
  constructor(game, pos) {
    this.game = game;
    this.taken = false;
    this.group = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ color: '#39ffd0', roughness: 0.05, transmission: 0.4, thickness: 1, emissive: '#1ad0a0', emissiveIntensity: 1.2 });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), mat);
    gem.castShadow = true;
    const ringMat = new THREE.MeshStandardMaterial({ color: '#0a3a2a', emissive: '#39ffd0', emissiveIntensity: 2 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 32), ringMat);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.03, 8, 32), ringMat);
    ring2.rotation.x = Math.PI / 3;
    this.group.add(gem, ring, ring2);
    this.group.position.copy(pos);
    game.level.group.add(this.group);
    this.gem = gem; this.ring = ring; this.ring2 = ring2;
  }
  update(dt, t) {
    if (this.taken) return;
    this.gem.rotation.y += dt * 1.4;
    this.gem.position.y = Math.sin(t * 1.8) * 0.12;
    this.ring.rotation.z += dt * 0.8;
    this.ring2.rotation.y += dt * 0.5;
    if (!this.taken && this.game.player.position.distanceTo(this.group.position) < 1.3) {
      this.taken = true;
      this.group.visible = false;
      this.game.events.emit('gem-collected', this);
    }
  }
}

// --------------------------------------------------------- Hidden Fractal
export class HiddenFractal {
  constructor(game, pos) {
    this.game = game;
    this.taken = false;
    // A miniature Mandelbrot artifact, swirling
    const mat = new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime; varying vec2 vUv;
        void main(){
          vec2 c = vUv * 1.4 + vec2(-0.65, 0.0);
          vec2 z = vec2(0.0); float i = 0.0;
          for (int n = 0; n < 40; n++) {
            z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
            if (dot(z,z) > 4.0) break;
            i += 1.0;
          }
          float f = i / 40.0;
          vec3 col = 0.5 + 0.5 * cos(3.0 + f * 9.0 + uTime * 0.6 + vec3(0.0, 0.6, 1.2));
          float r = length(vUv);
          float alpha = smoothstep(1.0, 0.85, r);
          col *= 0.6 + 0.4 * sin(uTime * 2.0);
          gl_FragColor = vec4(col * 1.6, alpha);
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), mat);
    this.mesh.position.copy(pos);
    // Ornate frame
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 6), new THREE.MeshStandardMaterial({ color: '#3a2a1a', metalness: 0.7, roughness: 0.3, emissive: '#c9a227', emissiveIntensity: 0.4 }));
    this.group = new THREE.Group();
    this.group.add(this.mesh, frame);
    this.group.position.copy(pos);
    game.level.group.add(this.group);
    this.mat = mat;
  }
  update(dt, t) {
    if (this.taken) return;
    this.mat.uniforms.uTime.value = t;
    this.group.rotation.y += dt * 0.9;
    this.group.position.y += Math.sin(t * 2.1) * 0.002;
    if (this.game.player.position.distanceTo(this.group.position) < 1.2) {
      this.taken = true;
      this.group.visible = false;
      this.game.events.emit('fractal-collected', this);
    }
  }
}

// -------------------------------------------------------------- Checkpoint
export class Checkpoint {
  constructor(game, pos, index) {
    this.game = game;
    this.index = index;
    this.activated = false;
    this.group = new THREE.Group();
    // Bioluminescent anemone shrine
    const baseMat = new THREE.MeshStandardMaterial({ color: '#3a4a6a', roughness: 0.8 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.4, 8), baseMat);
    base.position.y = 0.2;
    base.castShadow = true;
    this.ringMat = new THREE.MeshStandardMaterial({ color: '#0a2a3a', emissive: '#5a6a8a', emissiveIntensity: 0.6 });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 24), this.ringMat);
    this.ring.position.y = 1.1;
    this.orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: '#1a2a3a', emissive: '#5a6a8a', emissiveIntensity: 0.8 }));
    this.orb.position.y = 1.1;
    this.group.add(base, this.ring, this.orb);
    this.group.position.copy(pos);
    game.level.group.add(this.group);
  }
  activate() {
    if (this.activated) return;
    this.activated = true;
    this.ringMat.emissive.set('#39ffd0');
    this.ringMat.emissiveIntensity = 2.2;
    this.orb.material.emissive.set('#39ffd0');
    this.orb.material.emissiveIntensity = 2.5;
    this.game.particles.checkpoint(this.group.position.clone().add(new THREE.Vector3(0, 1.1, 0)));
    this.game.audio?.play('checkpoint');
    this.game.events.emit('checkpoint-activated', this);
  }
  update(dt, t) {
    this.ring.rotation.y += dt * (this.activated ? 2.2 : 0.5);
    this.orb.position.y = 1.1 + Math.sin(t * 2 + this.index) * 0.08;
    this.orb.scale.setScalar(this.activated ? 1 + Math.sin(t * 4) * 0.1 : 1);
    if (!this.activated && Math.abs(this.game.player.position.z - this.group.position.z) < 1.5 && Math.abs(this.game.player.position.x - this.group.position.x) < 2.5 && Math.abs(this.game.player.position.y - this.group.position.y) < 3) {
      this.activate();
      this.game.player.checkpointPosition = this.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    }
  }
}

// ----------------------------------------------------------- Goal vortex
export class GoalVortex {
  constructor(game, pos) {
    this.game = game;
    this.triggered = false;
    this.group = new THREE.Group();
    const mat = new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime; varying vec2 vUv;
        void main(){
          float r = length(vUv);
          float a = atan(vUv.y, vUv.x);
          float spiral = sin(a * 4.0 - r * 9.0 + uTime * 3.2);
          vec3 col = mix(vec3(0.05, 0.9, 0.75), vec3(0.65, 0.2, 0.95), 0.5 + 0.5 * sin(spiral + uTime));
          col += vec3(0.3) * smoothstep(0.5, 0.0, abs(spiral)) * (1.0 - r);
          float alpha = smoothstep(1.0, 0.7, r) * (0.75 + 0.25 * spiral);
          float core = smoothstep(0.25, 0.0, r);
          col += vec3(0.9, 1.0, 0.95) * core;
          gl_FragColor = vec4(col * 1.4, alpha);
        }`,
    });
    this.disc = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), mat);
    this.group.add(this.disc);
    // Frame of swirling ruins fragments
    this.shards = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.16 + Math.random() * 0.12), new THREE.MeshStandardMaterial({ color: '#6a7a9a', roughness: 0.6, emissive: '#35d5ff', emissiveIntensity: 0.3 }));
      this.shards.add(shard);
    }
    this.group.add(this.shards);
    this.group.position.copy(pos);
    game.level.group.add(this.group);
    this.mat = mat;
  }
  update(dt, t) {
    this.mat.uniforms.uTime.value = t;
    let i = 0;
    for (const s of this.shards.children) {
      const a = t * 0.9 + (i / 9) * Math.PI * 2;
      s.position.set(Math.cos(a) * 2.1, Math.sin(a * 1.3 + i) * 0.5, Math.sin(a) * 2.1);
      s.rotation.x += dt; s.rotation.y += dt * 0.7;
      i++;
    }
    if (!this.triggered && this.game.player.position.distanceTo(this.group.position) < 2.0) {
      this.triggered = true;
      this.game.events.emit('goal-reached', this);
    }
  }
}
