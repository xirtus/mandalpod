// ============================================================================
// MANDELPOD — Octopus Department  ★ THE STAR OF THE SHOW ★
// Fully procedural hero: breathing mantle, 8 verlet-IK tentacles with ground
// contact & motion curl, expressive shader eyes (look-at, blink, pupils that
// dilate with speed), squash & stretch, iridescent skin, bioluminescent spots.
// Gameplay readability first: strong silhouette, face always toward camera.
// ============================================================================
import * as THREE from 'three';

const T_SEGS = 14;        // segments per tentacle
const T_RADIAL = 6;       // radial resolution
const T_COUNT = 8;

// ------------------------------------------------------------ Mantle shader
function makeSkinMaterial() {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ff5fa8'),
    roughness: 0.42,
    metalness: 0.0,
    sheen: 1.0,
    sheenColor: new THREE.Color('#5fffe0'),
    sheenRoughness: 0.5,
    iridescence: 0.55,
    iridescenceIOR: 1.35,
    clearcoat: 0.6,
    clearcoatRoughness: 0.4,
    emissive: new THREE.Color('#30082a'),
    emissiveIntensity: 0.35,
  });
  mat.userData.uniforms = {
    uTime: { value: 0 },
    uSquash: { value: 0 },       // -1 squash .. +1 stretch
    uBlush: { value: 0 },        // emotional blush
    uSpeed: { value: 0 },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, mat.userData.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uSquash, uSpeed;
        varying vec3 vLocalPos;
        varying float vSpot;
        varying float vFace;
        varying float vBand;
        float shash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLocalPos = position;
        // Breathing — mantle pulses gently, faster when moving
        float breathe = sin(uTime * (2.2 + uSpeed * 6.0) + position.y * 2.0) * 0.02;
        transformed.xz *= 1.0 + breathe;
        transformed.y  *= 1.0 - breathe * 0.6;
        // Squash & stretch (gameplay juice)
        float sq = 1.0 + uSquash * 0.28;
        transformed.y *= sq;
        transformed.xz *= 1.0 / sqrt(max(sq, 0.2));
        // Bioluminescent freckle mask
        vSpot = smoothstep(0.86, 0.99, shash(floor(position * 9.0)));
        // Face patch + band masks for fragment
        vFace = smoothstep(0.10, 0.35, position.z) * smoothstep(0.55, 0.30, position.y);
        float bandY = fract(position.y * 2.2 + 0.15);
        vBand = smoothstep(0.06, 0.02, abs(bandY - 0.5)) * smoothstep(0.45, 0.15, position.z);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uBlush;
        varying vec3 vLocalPos;
        varying float vSpot;
        varying float vFace;
        varying float vBand;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // Pulsing glow spots
        float pulse = 0.6 + 0.4 * sin(uTime * 3.0 + vLocalPos.x * 8.0 + vLocalPos.y * 5.0);
        totalEmissiveRadiance += vec3(0.35, 1.0, 0.85) * vSpot * pulse * 0.55;
        // Emotional blush — cheeks glow
        float cheek = smoothstep(0.45, 0.0, abs(vLocalPos.y - 0.28)) * smoothstep(0.5, 0.15, length(vLocalPos.xz - vec2(0.0, 0.42)));
        totalEmissiveRadiance += vec3(1.0, 0.25, 0.45) * cheek * uBlush * 0.8;
        // Slow-cycling psychedelic mantle bands
        vec3 bandCol = 0.5 + 0.5 * cos(uTime * 0.5 + vLocalPos.y * 4.0 + vec3(0.0, 2.1, 4.2));
        totalEmissiveRadiance += bandCol * vBand * 0.22;
        // Creamy face patch (diffuse lightening)
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.85, 0.88), vFace * 0.45);`);
  };
  return mat;
}

// --------------------------------------------------------------- Eye shader
function makeEyeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uPupil: { value: new THREE.Vector2(0, 0) },  // look offset
      uDilate: { value: 0.35 },
      uBlink: { value: 0 },
      uSide: { value: 1 },
    },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vP;
      void main() {
        vN = normalize(normalMatrix * normal);
        vP = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec2 uPupil; uniform float uDilate, uBlink, uSide;
      varying vec3 vN; varying vec3 vP;
      void main() {
        // Eye faces outward in +Z of eye-local space
        vec2 uv = vN.xy - uPupil * 0.35;
        float r = length(uv);
        // Iris: psychedelic teal→violet ring
        float irisMask = smoothstep(0.80, 0.74, r);
        float pupilMask = smoothstep(uDilate + 0.05, uDilate - 0.02, r);
        vec3 col = vec3(0.78, 0.80, 0.88);                   // sclera (soft)
        // Iris: vivid teal core to violet rim, with fibrous radial striations
        vec3 iris = mix(vec3(0.05, 0.75, 0.68), vec3(0.38, 0.10, 0.72), smoothstep(0.18, 0.78, r));
        iris *= 0.75 + 0.25 * sin(atan(uv.y, uv.x) * 14.0 + r * 26.0);
        iris *= 0.85;
        col = mix(col, iris, irisMask);
        col = mix(col, vec3(0.015, 0.0, 0.04), pupilMask);   // pupil
        // Ring highlight around iris edge
        col += vec3(0.12, 0.3, 0.33) * smoothstep(0.03, 0.0, abs(r - 0.76)) * 0.5;
        // Specular sparkles (tamed so bloom doesn't nuke them)
        float spec = smoothstep(0.13, 0.02, length(uv - vec2(-0.24, 0.28)));
        float spec2 = smoothstep(0.06, 0.01, length(uv - vec2(0.18, -0.14)));
        col += spec * 0.4 + spec2 * 0.15;
        col += spec * 0.9;
        // Lid blink — darken top/bottom
        float lid = smoothstep(uBlink, uBlink - 0.15, abs(vN.y) * 1.4);
        col *= 1.0 - lid;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// ------------------------------------------------------ Dynamic tube builder
class TentacleTube {
  constructor(radial = T_RADIAL, segs = T_SEGS) {
    this.radial = radial; this.segs = segs;
    const verts = radial * segs;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(verts * 2), 2));
    const idx = [];
    for (let s = 0; s < segs - 1; s++) for (let r = 0; r < radial; r++) {
      const a = s * radial + r, b = s * radial + ((r + 1) % radial);
      const c = a + radial, d = b + radial;
      idx.push(a, c, b, b, c, d);
    }
    geo.setIndex(idx);
    for (let s = 0; s < segs; s++) for (let r = 0; r < radial; r++) {
      geo.attributes.uv.setXY(s * radial + r, r / radial, s / (segs - 1));
    }
    this.geometry = geo;
    this._tmpT = new THREE.Vector3(); this._tmpN = new THREE.Vector3(); this._tmpB = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
  }
  update(points, baseRadius, tipRadius) {
    const pos = this.geometry.attributes.position.array;
    const nrm = this.geometry.attributes.normal.array;
    const n = points.length;
    // Parallel transport frame: propagate the normal along the chain so the
    // tube never flips/twists when a tentacle hangs near-vertical
    const N = this._tmpN.set(1, 0, 0);
    const T = this._tmpT.set(0, 1, 0);
    const B = this._tmpB;
    // Seed frame perpendicular to the first segment direction
    const d0 = new THREE.Vector3().subVectors(points[1], points[0]).normalize();
    if (Math.abs(d0.y) > 0.9) N.set(1, 0, 0); else N.crossVectors(this._up, d0).normalize();
    for (let s = 0; s < this.segs; s++) {
      const t = s / (this.segs - 1);
      const fi = t * (n - 1);
      const i0 = Math.min(Math.floor(fi), n - 2);
      const p = new THREE.Vector3().lerpVectors(points[i0], points[i0 + 1], fi - i0);
      // Tangent
      T.subVectors(points[Math.min(i0 + 1, n - 1)], points[i0]);
      if (T.lengthSq() < 1e-10) T.copy(d0); else T.normalize();
      // Transport: project previous normal onto plane ⊥ T
      const d = N.dot(T);
      N.sub(T.clone().multiplyScalar(d));
      if (N.lengthSq() < 1e-8) N.crossVectors(this._up, T);
      N.normalize();
      B.crossVectors(T, N);
      const radius = THREE.MathUtils.lerp(baseRadius, tipRadius, Math.pow(t, 0.8));
      for (let r = 0; r < this.radial; r++) {
        const a = (r / this.radial) * Math.PI * 2;
        const nx = Math.cos(a), ny = Math.sin(a);
        const ox = N.x * nx + B.x * ny;
        const oy = N.y * nx + B.y * ny;
        const oz = N.z * nx + B.z * ny;
        const vi = (s * this.radial + r) * 3;
        pos[vi] = p.x + ox * radius; pos[vi + 1] = p.y + oy * radius; pos[vi + 2] = p.z + oz * radius;
        nrm[vi] = ox; nrm[vi + 1] = oy; nrm[vi + 2] = oz;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ Octopus
export class Octopus {
  constructor() {
    this.group = new THREE.Group();          // world transform (position + yaw)
    this.body = new THREE.Group();           // squash/stretch + lean applied here
    this.group.add(this.body);

    this.skinMaterial = makeSkinMaterial();

    // Mantle — one sculpted dome: wide cheek skirt flowing up to a soft peak.
    const profile = [];
    const prof = [
      [0.001, -0.34], [0.30, -0.33], [0.44, -0.26], [0.50, -0.10], [0.50, 0.10],
      [0.46, 0.30], [0.38, 0.50], [0.28, 0.66], [0.17, 0.78], [0.07, 0.85], [0.001, 0.88],
    ];
    for (const [x, y] of prof) profile.push(new THREE.Vector2(x, y));
    const mantleGeo = new THREE.LatheGeometry(profile, 28);
    mantleGeo.computeVertexNormals();
    this.mantle = new THREE.Mesh(mantleGeo, this.skinMaterial);
    this.mantle.castShadow = true;
    this.body.add(this.mantle);

    // Ear fins (dumbo-octopus charm) — flap with movement
    const finGeo = new THREE.SphereGeometry(0.21, 12, 8);
    finGeo.scale(0.38, 1.0, 0.62);
    this.finL = new THREE.Mesh(finGeo, this.skinMaterial);
    this.finR = new THREE.Mesh(finGeo, this.skinMaterial);
    this.finL.position.set(-0.43, 0.48, -0.10);
    this.finR.position.set(0.43, 0.48, -0.10);
    this.finL.rotation.z = 1.05;
    this.finR.rotation.z = -1.05;
    this.body.add(this.finL, this.finR);

    // Eyes — big, embedded, forward
    this.eyeMatL = makeEyeMaterial(); this.eyeMatL.uniforms.uSide.value = -1;
    this.eyeMatR = makeEyeMaterial(); this.eyeMatR.uniforms.uSide.value = 1;
    const eyeGeo = new THREE.SphereGeometry(0.175, 20, 16);
    this.eyeL = new THREE.Mesh(eyeGeo, this.eyeMatL);
    this.eyeR = new THREE.Mesh(eyeGeo, this.eyeMatR);
    this.eyeL.position.set(-0.185, 0.42, 0.435);
    this.eyeR.position.set(0.185, 0.42, 0.435);
    this.eyeL.rotation.y = -0.1;
    this.eyeR.rotation.y = 0.1;
    this.body.add(this.eyeL, this.eyeR);

    // Brow ridge — gives expression (angry/determined when spinning)
    const browGeo = new THREE.TorusGeometry(0.15, 0.032, 8, 16, Math.PI);
    this.browL = new THREE.Mesh(browGeo, this.skinMaterial);
    this.browR = new THREE.Mesh(browGeo, this.skinMaterial);
    this.browL.position.set(-0.19, 0.56, 0.36); this.browL.rotation.x = -0.5; this.browL.rotation.y = -0.2;
    this.browR.position.set(0.19, 0.56, 0.36); this.browR.rotation.x = -0.5; this.browR.rotation.y = 0.2;
    this.body.add(this.browL, this.browR);

    // Mouth — tiny contented smile
    const mouthGeo = new THREE.TorusGeometry(0.07, 0.016, 6, 12, Math.PI * 0.8);
    const mouthMat = new THREE.MeshStandardMaterial({ color: '#5c1040', roughness: 0.6 });
    this.mouth = new THREE.Mesh(mouthGeo, mouthMat);
    this.mouth.position.set(0, 0.15, 0.505);
    this.mouth.rotation.x = Math.PI + 0.3;   // arc opens upward = smile
    this.body.add(this.mouth);

    // ---- Tentacles -------------------------------------------------------
    this.tentacleMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#d84fb8'),
      roughness: 0.38,
      sheen: 0.8, sheenColor: new THREE.Color('#6fffe8'), sheenRoughness: 0.45,
      iridescence: 0.35, iridescenceIOR: 1.3,
      clearcoat: 0.5, clearcoatRoughness: 0.35,
      emissive: new THREE.Color('#3a0f38'), emissiveIntensity: 0.5,
    });
    this.tentacles = [];
    this.tubes = [];
    for (let i = 0; i < T_COUNT; i++) {
      const angle = (i / T_COUNT) * Math.PI * 2 + Math.PI / 8;
      const anchor = new THREE.Vector3(Math.cos(angle) * 0.36, -0.26, Math.sin(angle) * 0.36);
      const pts = [];
      for (let s = 0; s <= T_SEGS; s++) {
        pts.push(new THREE.Vector3(anchor.x + Math.cos(angle) * s * 0.05, anchor.y - s * 0.02, anchor.z + Math.sin(angle) * s * 0.05));
      }
      const prev = pts.map((p) => p.clone());
      this.tentacles.push({ angle, anchor, pts, prev, phase: Math.random() * Math.PI * 2, len: 0.062 });
      const tube = new TentacleTube();
      const mesh = new THREE.Mesh(tube.geometry, this.tentacleMaterial);
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      this.body.add(mesh);
      this.tubes.push(tube);
    }

    // Spin attack: tentacles flare into a disc — rendered via same tubes (pose target)
    // Suckers — instanced glowing discs along each tentacle underside
    const suckerGeo = new THREE.SphereGeometry(0.028, 6, 4);
    const suckerMat = new THREE.MeshStandardMaterial({ color: '#aef', emissive: '#4fd8ff', emissiveIntensity: 1.6, roughness: 0.4 });
    this.suckers = new THREE.InstancedMesh(suckerGeo, suckerMat, T_COUNT * 5);
    this.suckers.frustumCulled = false;
    this.body.add(this.suckers);

    // State
    this.velocity = new THREE.Vector3();
    this.grounded = true;
    this.spinT = 0;          // 0..1 spin attack pose
    this.slamT = 0;
    this.squash = 0;         // -1..1
    this._squashVel = 0;
    this.blink = 0;
    this._blinkTimer = 2 + Math.random() * 2;
    this.lookDir = new THREE.Vector3(0, 0, 1);
    this._look = new THREE.Vector2(0, 0);
    this.blush = 0;
    this.hue = 0;            // mood hue shift
    this.runSpeedRef = 8;
    this._dilate = 0.35;

    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._idealScratch = Array.from({ length: T_SEGS + 1 }, () => new THREE.Vector3());
  }

  impulseSquash(v) { this._squashVel += v; }

  // Snap all tentacle chains to their rest pose (call after teleports/respawns
  // so world-space verlet points don't streak across the level)
  resetTentacles() {
    this.body.updateMatrixWorld();
    for (const tc of this.tentacles) {
      const anchorW = tc.anchor.clone().applyMatrix4(this.body.matrixWorld);
      for (let s = 0; s <= T_SEGS; s++) {
        tc.pts[s].set(
          anchorW.x + Math.cos(tc.angle) * tc.len * s * 0.7,
          anchorW.y - tc.len * s * 0.6,
          anchorW.z + Math.sin(tc.angle) * tc.len * s * 0.7
        );
        tc.prev[s].copy(tc.pts[s]);
      }
    }
  }

  update(dt, t, ctx = {}) {
    const u = this.skinMaterial.userData.uniforms;
    u.uTime.value = t;
    u.uSpeed.value = THREE.MathUtils.lerp(u.uSpeed.value, Math.min(this.velocity.length() / 9, 1), dt * 6);
    u.uBlush.value = THREE.MathUtils.lerp(u.uBlush.value, this.blush, dt * 4);

    // Squash spring (critically damped-ish, snappy)
    const k = 180, d = 14;
    this._squashVel += (-this.squash * k - this._squashVel * d) * dt;
    this.squash += this._squashVel * dt;
    u.uSquash.value = THREE.MathUtils.clamp(this.squash, -1, 1);

    // Scuttle bounce: galloping gait while grounded at speed
    const spd2 = Math.hypot(this.velocity.x, this.velocity.z);
    const gait = this.grounded && spd2 > 1.5 ? Math.abs(Math.sin(t * (6 + spd2 * 0.9))) * 0.085 : 0;
    this._gait = THREE.MathUtils.lerp(this._gait ?? 0, gait, dt * 10);
    this.body.position.y = this._gait;

    // Body lean into motion + airborne tilt
    const speed = this.velocity.length();
    const leanF = THREE.MathUtils.clamp(this.velocity.dot(new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)) / 10, -1, 1);
    const leanS = THREE.MathUtils.clamp(this.velocity.dot(new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion)) / 10, -1, 1);
    const targetRotX = -leanF * 0.28 + (this.grounded ? 0 : THREE.MathUtils.clamp(-this.velocity.y * 0.02, -0.3, 0.35));
    const targetRotZ = leanS * 0.2;
    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, targetRotX, dt * 10);
    this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, targetRotZ, dt * 10);
    // Spin attack whirls the whole body
    if (this.spinT > 0) this.body.rotation.y += dt * 28 * this.spinT;
    else this.body.rotation.y = THREE.MathUtils.lerp(this.body.rotation.y % (Math.PI * 2), 0, dt * 14);

    // ---- Eyes: look toward movement / interest point, blink, dilate ----
    this._blinkTimer -= dt;
    if (this._blinkTimer <= 0) { this._blinkTimer = 1.6 + Math.random() * 3.2; this.blink = 1; }
    this.blink = Math.max(0, this.blink - dt * 7);
    const blinkV = Math.sin(Math.min(this.blink, 1) * Math.PI) * 0.9;
    const lookTarget = new THREE.Vector2(
      THREE.MathUtils.clamp(this.lookDir.x, -1, 1) * 0.8,
      THREE.MathUtils.clamp(-this.lookDir.y, -1, 1) * 0.6
    );
    this._look.lerp(lookTarget, dt * 8);
    this._dilate = THREE.MathUtils.lerp(this._dilate, 0.30 + u.uSpeed.value * 0.16 + (ctx.danger ? 0.14 : 0), dt * 5);
    for (const m of [this.eyeMatL, this.eyeMatR]) {
      m.uniforms.uPupil.value.copy(this._look);
      m.uniforms.uBlink.value = blinkV;
      m.uniforms.uDilate.value = this._dilate;
    }
    // Brows appear only when furrowed (spinning / slamming)
    const furrow = Math.max(this.spinT, this.slamT);
    const browScale = THREE.MathUtils.lerp(this.browL.scale.x, furrow > 0.05 ? 1 : 0.001, dt * 12);
    this.browL.scale.setScalar(browScale);
    this.browR.scale.setScalar(browScale);
    this.browL.rotation.z = furrow * 0.55;
    this.browR.rotation.z = -furrow * 0.55;

    // Ear fins flap — paddling while running, big flap on jump, droop idle
    const flap = Math.sin(t * (4 + u.uSpeed.value * 10)) * (0.12 + u.uSpeed.value * 0.3);
    const jumpFlap = THREE.MathUtils.clamp(this.velocity.y * 0.05, -0.4, 0.55);
    this.finL.rotation.z = 1.05 + flap + jumpFlap;
    this.finR.rotation.z = -1.05 - flap - jumpFlap;
    // Mouth opens slightly when airborne or spinning (whee!)
    const mouthOpen = (this.grounded ? 0 : 0.35) + this.spinT * 0.5;
    this.mouth.scale.setScalar(1 + mouthOpen * 0.5);
    this.mouth.rotation.x = Math.PI + 0.3 - mouthOpen * 0.6;

    // ---- Tentacles: verlet chains attracted to PER-SEGMENT curled poses ---
    // Each segment has an ideal rest direction that curls organically (resting
    // octopus curls tips inward/upward). Motion rotates the whole curl back;
    // spinning flares into a helicopter disc. Physics adds life on top.
    const spin = this.spinT;
    const dt2 = Math.min(dt, 1 / 30);
    // Velocity-based trailing: how much the rest pose rotates backward
    const vel = this.velocity;
    const hSpeed = Math.hypot(vel.x, vel.z);
    const trailAmt = THREE.MathUtils.clamp(hSpeed / this.runSpeedRef, 0, 1);
    // Yaw that points AWAY from horizontal velocity (tentacles trail behind)
    const trailYaw = hSpeed > 0.4 ? Math.atan2(-vel.x, -vel.z) : this.group.rotation.y;
    const bodyYaw = this.group.rotation.y;
    let dyaw = trailYaw - bodyYaw;
    dyaw = ((dyaw + Math.PI) % (Math.PI * 2)) - Math.PI;

    for (let i = 0; i < T_COUNT; i++) {
      const tc = this.tentacles[i];
      this.body.updateMatrixWorld();
      const worldAnchor = this._v.copy(tc.anchor).applyMatrix4(this.body.matrixWorld);
      tc.pts[0].copy(worldAnchor);

      // Per-segment ideal directions, ACCUMULATED into a draped curl pose:
      // out-and-down from the anchor, touching ground, tips curling gently.
      // (Independent rays would collapse the curl inside the mantle.)
      const breatheCurl = 0.22 + Math.sin(t * 1.7 + tc.phase) * 0.08;
      const ideals = this._idealScratch;
      ideals[0].copy(worldAnchor);
      for (let s = 1; s <= T_SEGS; s++) {
        const tt = s / T_SEGS;
        let a = tc.angle + Math.PI - dyaw * trailAmt;
        a += Math.sin(t * 2.0 + tc.phase + tt * 3.0) * 0.1;
        let pitch = this.grounded
          ? THREE.MathUtils.lerp(-0.55, 1.05 + breatheCurl, Math.pow(tt, 1.9))
          : THREE.MathUtils.lerp(-0.45, 0.45, tt);
        if (!this.grounded) {
          const upTrail = THREE.MathUtils.clamp(vel.y * 0.06, -0.6, 0.9);
          pitch += upTrail * (0.4 + tt * 0.6);
        }
        if (spin > 0) {
          pitch = THREE.MathUtils.lerp(pitch, 0.05 - tt * 0.15, spin);
          a += t * 14 * spin;
        }
        const cp = Math.cos(pitch), sp = Math.sin(pitch);
        ideals[s].set(
          ideals[s - 1].x + Math.cos(a) * cp * tc.len,
          ideals[s - 1].y + sp * tc.len,
          ideals[s - 1].z + Math.sin(a) * cp * tc.len
        );
      }
      // Spring each point toward its accumulated ideal
      for (let s = 1; s <= T_SEGS; s++) {
        const tt = s / T_SEGS;
        const p = tc.pts[s], ip = ideals[s];
        const k = (this.grounded ? 9 : 12) * (0.3 + tt * 0.7) * (1 + spin * 2);
        p.x += (ip.x - p.x) * k * dt2;
        p.y += (ip.y - p.y) * k * dt2;
        p.z += (ip.z - p.z) * k * dt2;
      }

      // Verlet momentum pass (adds lag & wobble on top of pose)
      for (let s = 2; s <= T_SEGS; s++) {
        const p = tc.pts[s], pr = tc.prev[s];
        const vx = (p.x - pr.x) * 0.9, vy = (p.y - pr.y) * 0.9, vz = (p.z - pr.z) * 0.9;
        pr.copy(p);
        p.x += vx; p.y += vy; p.z += vz;
      }
      // Distance constraints
      for (let iter = 0; iter < 3; iter++) {
        for (let s = 1; s <= T_SEGS; s++) {
          const p = tc.pts[s], q = tc.pts[s - 1];
          const dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-5;
          const diff = (dist - tc.len) / dist;
          const f = s === 1 ? 1 : 0.5;
          p.x -= dx * diff * f; p.y -= dy * diff * f; p.z -= dz * diff * f;
          if (s > 1) { q.x += dx * diff * 0.5; q.y += dy * diff * 0.5; q.z += dz * diff * 0.5; }
        }
      }
      // Ground contact in world space (approx plane at ctx.groundY)
      if (ctx.groundY !== undefined) {
        for (let s = 2; s <= T_SEGS; s++) {
          const p = tc.pts[s];
          const r = 0.05;
          if (p.y < ctx.groundY + r) { p.y = ctx.groundY + r; tc.prev[s].y = p.y; }
        }
      }
      // Update tube mesh in body-local space
      this.body.updateMatrixWorld();
      const inv = this._m.copy(this.body.matrixWorld).invert();
      const local = tc.pts.map((p) => p.clone().applyMatrix4(inv));
      this.tubes[i].update(local, 0.098, 0.02);
    }

    // Suckers follow tentacle undersides
    let si = 0;
    const mtx = this._m;
    for (let i = 0; i < T_COUNT; i++) {
      const tc = this.tentacles[i];
      const inv = new THREE.Matrix4().copy(this.body.matrixWorld).invert();
      for (let s = 3; s < T_SEGS; s += 2) {
        const p = tc.pts[s].clone().applyMatrix4(inv);
        const scale = 1 - s / T_SEGS * 0.6;
        mtx.makeScale(scale, scale, scale).setPosition(p.x, p.y - 0.05, p.z);
        this.suckers.setMatrixAt(si++, mtx);
      }
    }
    this.suckers.instanceMatrix.needsUpdate = true;
  }
}
