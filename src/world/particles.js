// ============================================================================
// MANDELPOD — Particles & VFX Department
// Pooled GPU-friendly burst particles (instanced quads, velocity+gravity on
// CPU ring buffer), bubble streams, spin slash arc, slam shockwave ring,
// pearl sparkle trails, ink burst cloud, checkpoint activate pillar.
// ============================================================================
import * as THREE from 'three';

const MAX_PARTICLES = 1200;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    // One instanced quad pool for ALL bursts — billboarded in shader
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.attributes.uv = quad.attributes.uv;

    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
    this.aVel = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
    this.aData = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 4), 4); // birth, life, size, spin
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
    this.aMisc = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 2), 2); // gravity, drag
    for (const a of [this.aPos, this.aVel, this.aData, this.aColor, this.aMisc]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.aPos);
    geo.setAttribute('iVel', this.aVel);
    geo.setAttribute('iData', this.aData);
    geo.setAttribute('iColor', this.aColor);
    geo.setAttribute('iMisc', this.aMisc);

    this.uniforms = { uTime: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: this.uniforms,
      vertexShader: /* glsl */`
        uniform float uTime;
        attribute vec3 iPos, iVel, iColor;
        attribute vec4 iData;   // birth, life, size, spin
        attribute vec2 iMisc;   // gravity, drag
        varying vec2 vUv; varying vec3 vColor; varying float vFade; varying float vSpin;
        void main() {
          vUv = uv;
          float age = uTime - iData.x;
          float life = max(iData.y, 1e-4);
          float tt = clamp(age / life, 0.0, 1.0);
          vFade = (1.0 - tt) * step(0.0, age) * step(age, life);
          vColor = iColor;
          vSpin = iData.w * age;
          // Integrate
          float drag = pow(iMisc.y, age * 60.0 / 10.0);
          vec3 p = iPos + iVel * age * drag + vec3(0.0, iMisc.x, 0.0) * age * age * 0.5;
          // Billboard
          vec4 mv = viewMatrix * vec4(p, 1.0);
          float size = iData.z * (0.6 + 0.4 * (1.0 - tt));
          float c = cos(vSpin), s = sin(vSpin);
          vec2 corner = mat2(c, -s, s, c) * position.xy * size;
          mv.xy += corner;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        varying vec2 vUv; varying vec3 vColor; varying float vFade;
        void main() {
          if (vFade <= 0.001) discard;
          vec2 c = vUv - 0.5;
          float d = length(c) * 2.0;
          float disc = smoothstep(1.0, 0.25, d);
          float core = smoothstep(0.5, 0.0, d) * 0.8;
          gl_FragColor = vec4(vColor * (disc + core), disc * vFade);
        }`,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    this.cursor = 0;
    this.time = 0;
    // Initialize all particles as dead
    for (let i = 0; i < MAX_PARTICLES; i++) this.aData.setXYZW(i, -100, 1, 0, 0);
    this.aData.needsUpdate = true;

    // Shockwave rings (pooled meshes)
    this.rings = [];
    const ringGeo = new THREE.TorusGeometry(1, 0.09, 8, 40);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#7fffe8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      scene.add(m);
      this.rings.push({ mesh: m, t: 1, dur: 0.5 });
    }
  }

  spawn({ position, count = 12, color = ['#ffffff'], speed = 5, spread = 1, size = 0.16, life = 0.7, gravity = -4, drag = 0.9, up = 0, spin = 4 }) {
    const colors = Array.isArray(color) ? color : [color];
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      const dir = new THREE.Vector3(Math.cos(theta) * r, Math.random() * 1.2 + up, Math.sin(theta) * r).normalize();
      const sp = speed * (0.4 + Math.random() * 0.9);
      this.aPos.setXYZ(i, position.x, position.y, position.z);
      this.aVel.setXYZ(i, dir.x * sp, dir.y * sp, dir.z * sp);
      const c = new THREE.Color(colors[(Math.random() * colors.length) | 0]);
      this.aColor.setXYZ(i, c.r, c.g, c.b);
      this.aData.setXYZW(i, this.time, life * (0.6 + Math.random() * 0.8), size * (0.6 + Math.random() * 0.9), (Math.random() - 0.5) * spin);
      this.aMisc.setXY(i, gravity, drag);
    }
    this.aPos.needsUpdate = true;
    this.aVel.needsUpdate = true;
    this.aColor.needsUpdate = true;
    this.aData.needsUpdate = true;
    this.aMisc.needsUpdate = true;
  }

  ring(position, color = '#7fffe8', scale = 3, dur = 0.5) {
    const r = this.rings.find((r) => !r.mesh.visible) ?? this.rings[0];
    r.mesh.visible = true;
    r.mesh.position.copy(position);
    r.mesh.material.color.set(color);
    r.t = 0; r.dur = dur; r.scale = scale;
  }

  // --------- Presets (the vocabulary of juice) ---------
  pearlPickup(p) { this.spawn({ position: p, count: 8, color: ['#fff6c8', '#ffe27a', '#ffffff'], speed: 2.2, size: 0.12, life: 0.5, gravity: 1.5, drag: 0.85 }); }
  shellBreak(p) { this.spawn({ position: p, count: 26, color: ['#ffb37a', '#ff8a5c', '#ffd9a0', '#fff'], speed: 6.5, size: 0.2, life: 0.8, gravity: -10, drag: 0.92 }); }
  pufferExplode(p) { this.spawn({ position: p, count: 46, color: ['#ff4d6a', '#ff9d2e', '#ffe27a', '#c04dff'], speed: 9, size: 0.3, life: 0.9, gravity: -2, drag: 0.9 }); this.ring(p, '#ff7a4d', 4.5, 0.45); }
  spinSlash(p) { this.spawn({ position: p, count: 5, color: ['#8fffe8', '#d1b3ff'], speed: 1.2, spread: 2.6, size: 0.14, life: 0.3, gravity: 0, drag: 0.8 }); }
  slamImpact(p) { this.spawn({ position: p, count: 24, color: ['#9fe8ff', '#ffffff'], speed: 7, size: 0.18, life: 0.6, gravity: -8, drag: 0.9 }); this.ring(p, '#9fe8ff', 3.4, 0.5); }
  jumpPuff(p) { this.spawn({ position: p, count: 7, color: ['#bdf3ff'], speed: 2, size: 0.14, life: 0.45, gravity: 1, drag: 0.85, spread: 1.4 }); }
  landPuff(p) { this.spawn({ position: p, count: 10, color: ['#bdf3ff', '#8ad8e8'], speed: 3, size: 0.15, life: 0.5, gravity: -2, drag: 0.88, spread: 1.6 }); }
  enemyPoof(p) { this.spawn({ position: p, count: 30, color: ['#c04dff', '#7a2eff', '#ff6b9d', '#4fd8ff'], speed: 5.5, size: 0.22, life: 0.85, gravity: -3, drag: 0.9 }); }
  checkpoint(p) { this.spawn({ position: p, count: 40, color: ['#39ffd0', '#7fffe8', '#fff'], speed: 3, size: 0.18, life: 1.2, gravity: 4, drag: 0.94, up: 1.6 }); }
  inkBurst(p) { this.spawn({ position: p, count: 34, color: ['#2a0a4a', '#4a1a8a', '#1a0a3a'], speed: 4, size: 0.42, life: 1.3, gravity: 0.5, drag: 0.88 }); }
  gemPickup(p) { this.spawn({ position: p, count: 60, color: ['#39ffd0', '#c04dff', '#ffe27a', '#fff'], speed: 5, size: 0.2, life: 1.4, gravity: 2, drag: 0.93, up: 1.5 }); this.ring(p, '#39ffd0', 5, 0.8); }
  dashTrail(p) { this.spawn({ position: p, count: 3, color: ['#4fd8ff', '#9fe8ff'], speed: 0.4, size: 0.2, life: 0.35, gravity: 0, drag: 0.7 }); }
  timeBubble(p) { this.spawn({ position: p, count: 50, color: ['#c09fff', '#7a5fff', '#e0d0ff'], speed: 2, spread: 3, size: 0.16, life: 1.6, gravity: 0, drag: 0.95 }); }
  bubbles(p, count = 5) { this.spawn({ position: p, count, color: ['#aee8ff'], speed: 1.2, size: 0.12, life: 1.6, gravity: 5, drag: 0.96, spread: 0.7 }); }

  update(dt, t) {
    this.time = t;
    this.uniforms.uTime.value = t;
    for (const r of this.rings) {
      if (!r.mesh.visible) continue;
      r.t += dt / r.dur;
      if (r.t >= 1) { r.mesh.visible = false; r.mesh.material.opacity = 0; continue; }
      const s = 0.2 + r.t * (r.scale ?? 3);
      r.mesh.scale.set(s, s, s);
      r.mesh.material.opacity = (1 - r.t) * 0.9;
    }
  }
}
