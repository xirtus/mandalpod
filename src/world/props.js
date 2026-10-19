// ============================================================================
// MANDELPOD — Environment Art Department (procedural prop atelier)
// Coral trees, kelp forests, anemones, tube sponges, seashells, fossil
// trilobites, ancient ruins, glowing mushrooms, starfish. Everything sways
// with the current via shader. Heavy instancing for density without draw
// calls. NO PLACEHOLDER-LOOKING PRIMITIVES: every prop is sculpted.
// ============================================================================
import * as THREE from 'three';
import { envUniforms, injectUnderwater } from './materials.js';

// Shared sway injection for vegetation
export function injectSway(material, { strength = 1, freq = 1 } = {}) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader) => {
    prev?.(shader);
    shader.uniforms.uSwayStrength = { value: strength };
    shader.uniforms.uSwayFreq = { value: freq };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uSwayStrength, uSwayFreq;
        uniform float uTime;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 wp = modelMatrix * vec4(transformed, 1.0);
          float swayPhase = wp.x * 0.15 + wp.z * 0.17;
          float h = max(transformed.y, 0.0);
          float sway = sin(uTime * uSwayFreq + swayPhase) * h * h * 0.02 * uSwayStrength;
          transformed.x += sway;
          transformed.z += sway * 0.6;
        }`);
  };
  material.customProgramCacheKey = () => `sway${strength}${freq}${prev ? 'p' : ''}`;
  return material;
}

// ---------------------------------------------------------------- Coral tree
// Recursive branching coral — an L-system-ish fractal grown into geometry.
export function makeCoralTree({ branches = 4, depth = 3, color = '#ff5f9d', tipColor = '#ffb3d9', glow = 0.7, seed = 1 } = {}) {
  const rng = mulberry(seed);
  const geoms = [];
  function branch(mat4, len, rad, d) {
    const segs = 5;
    const geo = new THREE.CylinderGeometry(rad * 0.55, rad, len, segs, 1);
    geo.translate(0, len / 2, 0);
    // Slight organic bend
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setX(i, pos.getX(i) + Math.sin(y * 2 + seed) * 0.06 * y);
    }
    geo.applyMatrix4(mat4);
    geoms.push(geo);
    if (d >= depth) {
      // Glowing polyp tip
      const tip = new THREE.SphereGeometry(rad * 1.15, 6, 5);
      tip.applyMatrix4(new THREE.Matrix4().multiplyMatrices(mat4, new THREE.Matrix4().makeTranslation(0, len, 0)));
      geoms.push(tip);
      return;
    }
    const kids = branches - (d > 1 ? 1 : 0);
    for (let i = 0; i < kids; i++) {
      const angle = (i / kids) * Math.PI * 2 + rng() * 1.2 + d;
      const tilt = 0.45 + rng() * 0.5;
      const m = new THREE.Matrix4().multiplyMatrices(mat4, new THREE.Matrix4().makeTranslation(0, len * (0.75 + rng() * 0.25), 0));
      m.multiply(new THREE.Matrix4().makeRotationY(angle));
      m.multiply(new THREE.Matrix4().makeRotationX(tilt));
      branch(m, len * (0.62 + rng() * 0.18), rad * 0.62, d + 1);
    }
  }
  branch(new THREE.Matrix4(), 0.8 + rng() * 0.5, 0.12, 0);
  const merged = mergeGeoms(geoms);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, emissive: tipColor, emissiveIntensity: glow * 0.55 });
  injectUnderwater(mat, { caustics: 0.5 });
  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = true;
  return mesh;
}

// ------------------------------------------------------------------ Kelp
export function makeKelpForest({ count = 24, area = 20, height = [2.2, 5], color = '#1fae7a', color2 = '#5a3aae' } = {}) {
  const group = new THREE.Group();
  const bladeGeo = new THREE.PlaneGeometry(0.5, 1, 1, 8);
  bladeGeo.translate(0, 0.5, 0);
  // Wavy blade
  const pos = bladeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setX(i, pos.getX(i) * (1 - y * 0.4) + Math.sin(y * 6) * 0.08);
  }
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide, emissive: '#0a3a28', emissiveIntensity: 0.3, transparent: true, opacity: 0.92 });
  injectUnderwater(mat, { caustics: 0.3 });
  injectSway(mat, { strength: 2.6, freq: 0.9 });
  const inst = new THREE.InstancedMesh(bladeGeo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const cA = new THREE.Color(color), cB = new THREE.Color(color2);
  // Grow in wandering clusters like real kelp beds
  const clusters = Math.max(3, Math.floor(count / 6));
  const centers = [];
  for (let c = 0; c < clusters; c++) centers.push([(Math.random() - 0.5) * area, (Math.random() - 0.5) * area]);
  for (let i = 0; i < count; i++) {
    const [cx, cz] = centers[i % clusters];
    const h = height[0] + Math.random() * (height[1] - height[0]);
    q.setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.6, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.6));
    s.set(0.5 + Math.random() * 0.6, h, 1);
    m.compose(new THREE.Vector3(cx + (Math.random() - 0.5) * 2.2, 0, cz + (Math.random() - 0.5) * 2.2), q, s);
    inst.setMatrixAt(i, m);
    inst.setColorAt(i, Math.random() < 0.65 ? cA : cB);
  }
  inst.instanceColor.needsUpdate = true;
  inst.castShadow = false;   // hard kelp shadows read as jagged acne strips
  group.add(inst);
  return group;
}

// ------------------------------------------------------------------ Anemone
export function makeAnemone({ color = '#c05fff', tentacles = 26, radius = 0.5 } = {}) {
  const group = new THREE.Group();
  const tGeo = new THREE.ConeGeometry(0.05, 0.65, 5, 3);
  tGeo.translate(0, 0.32, 0);
  const tMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, emissive: color, emissiveIntensity: 0.5 });
  injectSway(tMat, { strength: 1.4, freq: 1.6 });
  const inst = new THREE.InstancedMesh(tGeo, tMat, tentacles);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < tentacles; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    e.set((Math.random() - 0.5) * 0.9 + r * 0.8, a, (Math.random() - 0.5) * 0.9);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(Math.cos(a) * r * 0.5, 0, Math.sin(a) * r * 0.5), q, new THREE.Vector3(1, 0.7 + Math.random() * 0.7, 1));
    inst.setMatrixAt(i, m);
  }
  const baseMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.45), roughness: 0.8 });
  const base = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.7, 10, 6), baseMat);
  base.scale.y = 0.5;
  group.add(base, inst);
  return group;
}

// -------------------------------------------------------------- Tube sponges
export function makeTubeSponges({ count = 7, color = '#ffb347', seed = 3 } = {}) {
  const rng = mulberry(seed);
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, emissive: color, emissiveIntensity: 0.12 });
  injectUnderwater(mat, { caustics: 0.6 });
  for (let i = 0; i < count; i++) {
    const h = 0.5 + rng() * 1.6;
    const r = 0.12 + rng() * 0.18;
    const geo = new THREE.CylinderGeometry(r * (0.8 + rng() * 0.4), r * 1.2, h, 8, 2, true);
    const tube = new THREE.Mesh(geo, mat);
    const a = rng() * Math.PI * 2;
    const rr = rng() * 0.7;
    tube.position.set(Math.cos(a) * rr, h / 2 - 0.05, Math.sin(a) * rr);
    tube.rotation.set((rng() - 0.5) * 0.4, 0, (rng() - 0.5) * 0.4);
    tube.castShadow = true;
    // Dark inner lip
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, r * 0.22, 6, 10), new THREE.MeshStandardMaterial({ color: '#4a2800', roughness: 0.9 }));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = h / 2;
    tube.add(lip);
    group.add(tube);
  }
  return group;
}

// -------------------------------------------------------------------- Rocks
export function makeRock({ size = 1, color = '#5f70a0', seed = 5, flat = false } = {}) {
  const rng = mulberry(seed);
  const geo = new THREE.IcosahedronGeometry(size, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 1 + (rng() - 0.5) * 0.55;
    v.multiplyScalar(n);
    if (flat) v.y *= 0.45;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });
  injectUnderwater(mat, { caustics: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// ------------------------------------------------------------- Fossil slab
export function makeFossilTrilobite({ size = 1 } = {}) {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: '#8a7a68', roughness: 0.95 });
  injectUnderwater(stone, { caustics: 0.8 });
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(size, size * 1.1, size * 0.25, 9), stone);
  group.add(slab);
  // Raised trilobite relief
  const fossilMat = new THREE.MeshStandardMaterial({ color: '#5a4a3a', roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(size * 0.4, 10, 6), fossilMat);
  body.scale.set(0.7, 0.25, 1.1);
  body.position.y = size * 0.14;
  group.add(body);
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.TorusGeometry(size * 0.26, size * 0.035, 5, 10, Math.PI), fossilMat);
    seg.rotation.x = -Math.PI / 2;
    seg.rotation.z = Math.PI;
    seg.position.set(0, size * 0.19, -size * 0.28 + i * size * 0.13);
    group.add(seg);
  }
  return group;
}

// ------------------------------------------------------------ Ancient ruins
export function makeRuinPillar({ height = 4, color = '#8a9ac0', broken = false, seed = 1 } = {}) {
  const rng = mulberry(seed * 7919 + 13);
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  injectUnderwater(mat, { caustics: 0.7 });
  const h = broken ? height * (0.4 + rng() * 0.35) : height * (0.9 + rng() * 0.2);
  // Fluted shaft: 12-gon with concave groove illusion via scaled rings
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, h, 12), mat);
  // Carve flutes: darken via vertex colors
  shaft.position.y = h / 2;
  shaft.castShadow = shaft.receiveShadow = true;
  // Greek capital: echinus + abacus
  const cap = new THREE.Group();
  const ech = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.34, 0.16, 12), mat);
  const aba = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.95), mat);
  ech.position.y = 0.08; aba.position.y = 0.24;
  cap.add(ech, aba);
  cap.position.y = h;
  cap.traverse((c) => { c.castShadow = true; });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.35, 12), mat);
  base.position.y = 0.17;
  base.castShadow = true;
  group.add(shaft, cap, base);
  if (broken) {
    shaft.rotation.z = (rng() - 0.5) * 0.45;
    cap.visible = false;
  } else {
    // Glowing glyph band at a phi-varied height
    const glyph = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 6, 12), new THREE.MeshStandardMaterial({ color: '#0a2a3a', emissive: '#35d5ff', emissiveIntensity: 2.6 }));
    glyph.rotation.x = Math.PI / 2;
    glyph.position.y = h * (0.38 + rng() * 0.38);
    group.add(glyph);
    if (rng() > 0.5) {
      const glyph2 = glyph.clone();
      glyph2.position.y = h * (0.2 + rng() * 0.2);
      group.add(glyph2);
    }
  }
  group.rotation.y = rng() * Math.PI;
  return group;
}

// ----------------------------------------------------------- Glow mushrooms
export function makeGlowShrooms({ count = 5, color = '#4fd8ff' } = {}) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const h = 0.25 + Math.random() * 0.5;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, h, 6), new THREE.MeshStandardMaterial({ color: '#cfd8e8', roughness: 0.8 }));
    const capMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.05, roughness: 0.4 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11 + Math.random() * 0.08, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.5;
    stem.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    cap.position.set(stem.position.x, h, stem.position.z);
    group.add(stem, cap);
  }
  return group;
}

// ---------------------------------------------------------------- Starfish
export function makeStarfish({ color = '#ff8a5c', size = 0.35 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, emissive: color, emissiveIntensity: 0.15 });
  for (let i = 0; i < 5; i++) {
    const arm = new THREE.Mesh(new THREE.ConeGeometry(size * 0.28, size, 5), mat);
    arm.rotation.z = Math.PI / 2 + 0.25;
    arm.rotation.y = (i / 5) * Math.PI * 2;
    arm.position.set(Math.cos(arm.rotation.y) * size * 0.32, size * 0.06, -Math.sin(arm.rotation.y) * size * 0.32);
    arm.rotation.x = 0;
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 5) * Math.PI * 2;
    arm.position.set(size * 0.32, size * 0.06, 0);
    arm.rotation.z = -Math.PI / 2 - 0.3;
    pivot.add(arm);
    group.add(pivot);
  }
  return group;
}

// ------------------------------------------------------------ Clam (decor)
export function makeClam({ size = 0.6, color = '#c8a8e8' } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 });
  const shellGeo = new THREE.SphereGeometry(size, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  // Ridges
  const pos = shellGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const r = 1 + Math.sin(a * 9) * 0.06;
    pos.setXYZ(i, x * r, y, z * r);
  }
  shellGeo.computeVertexNormals();
  const bottom = new THREE.Mesh(shellGeo, mat);
  bottom.rotation.x = Math.PI;
  bottom.position.y = size * 0.35;
  const top = new THREE.Mesh(shellGeo, mat);
  top.rotation.x = -0.5;
  top.position.set(0, size * 0.38, -size * 0.15);
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(size * 0.22, 12, 10), new THREE.MeshPhysicalMaterial({ color: '#f5f0ff', roughness: 0.1, iridescence: 1, emissive: '#9f8fff', emissiveIntensity: 0.8 }));
  pearl.position.y = size * 0.42;
  group.add(bottom, top, pearl);
  return group;
}

// ------------------------------------------------------- utilities ---------
export function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mergeGeoms(geoms) {
  // Minimal merge (all non-indexed to keep it simple & robust)
  let total = 0;
  const nonIndexed = geoms.map((g) => g.toNonIndexed ? g.toNonIndexed() : g);
  for (const g of nonIndexed) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nrm = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let o3 = 0, o2 = 0;
  for (const g of nonIndexed) {
    pos.set(g.attributes.position.array, o3);
    nrm.set(g.attributes.normal.array, o3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o2);
    o3 += g.attributes.position.count * 3;
    o2 += g.attributes.position.count * 2;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

// ============================================================================
// SACRED GEOMETRY ATELIER
// Platforms are not boxes — they are temple artifacts: octagonal prisms in
// golden-ratio proportions, phi-banded glow rings, phyllotaxis mandala inlays
// with Mandelbrot filaments, inverted taper undersides (floating temples).
// ============================================================================

const PHI = 1.618033988749895;

export function makeMandalaMaterial(colorA = '#35d5ff', colorB = '#c05fff', intensity = 1.0) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    uniforms: {
      uTime: envUniforms.uTime,
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime, uIntensity;
      uniform vec3 uColorA, uColorB;
      varying vec2 vUv;
      #define GOLDEN 2.39996323
      void main() {
        float r = length(vUv);
        if (r > 1.0) discard;
        float a = atan(vUv.y, vUv.x);
        // Phyllotaxis spiral — seeds at golden angle
        float phyl = 0.0;
        for (int i = 1; i < 40; i++) {
          float fi = float(i);
          float rr = sqrt(fi / 40.0);
          float aa = fi * GOLDEN + uTime * 0.05;
          vec2 p = vec2(cos(aa), sin(aa)) * rr;
          phyl += smoothstep(0.035, 0.0, length(vUv - p)) * (1.0 - rr * 0.5);
        }
        // Mandelbrot filaments radiating (escape-time petals)
        vec2 c = vec2(cos(a), sin(a)) * (0.35 + r * 0.9) + vec2(-0.55, 0.0);
        vec2 z = vec2(0.0);
        float esc = 0.0;
        for (int n = 0; n < 24; n++) {
          z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
          if (dot(z, z) > 4.0) break;
          esc += 1.0;
        }
        float mand = esc / 24.0;
        // Sacred rings at golden divisions
        float rings = smoothstep(0.012, 0.0, abs(r - 0.382) * 0.5) + smoothstep(0.012, 0.0, abs(r - 0.618) * 0.5) + smoothstep(0.015, 0.0, abs(r - 0.886) * 0.5);
        // Radial spokes (8-fold octagon symmetry)
        float spokes = smoothstep(0.03, 0.0, abs(sin(a * 4.0)) * r) * smoothstep(0.9, 0.3, r);
        vec3 col = uColorA * phyl * 0.9 + uColorB * mand * (0.4 + 0.2 * sin(uTime * 0.7 + a * 2.0));
        col += uColorA * rings * 0.8 + mix(uColorA, uColorB, 0.5) * spokes * 0.5;
        float pulse = 0.75 + 0.25 * sin(uTime * 1.3);
        float alpha = clamp(phyl * 0.8 + mand * 0.55 + rings + spokes * 0.6, 0.0, 1.0) * pulse * uIntensity;
        gl_FragColor = vec4(col * 1.5, alpha * smoothstep(1.0, 0.92, r));
      }
    `,
  });
}

export function makeSacredSlab({ w = 2, h = 0.8, d = 2, color = '#4a5a8a', accent = '#35d5ff', mandala = true, seed = 1 } = {}) {
  const group = new THREE.Group();
  const sides = 8;
  // Main octagonal prism — base flares at golden ratio
  const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5 * (1 + 1 / (PHI * 4)), 1, sides, 1);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.08 });
  injectUnderwater(mat, { caustics: 1.0 });
  const body = new THREE.Mesh(bodyGeo, mat);
  body.scale.set(w * 1.02, h, d * 1.02);
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  // Inverted taper — floating temple underside (phi depth)
  const taperGeo = new THREE.CylinderGeometry(0.5 * (1 + 1 / (PHI * 4)), 0.14, 0.5, sides, 1);
  const taper = new THREE.Mesh(taperGeo, mat);
  taper.scale.set(w * 1.02, h * PHI, d * 1.02);
  taper.position.y = -h / 2 - (h * PHI) / 2 + 0.02;
  taper.castShadow = true;
  group.add(taper);
  // Phi-band glow rings (at 1/φ of the height)
  const bandMat = new THREE.MeshStandardMaterial({ color: '#0a2030', emissive: accent, emissiveIntensity: 1.4, roughness: 0.4 });
  const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 5, sides), bandMat);
  band1.rotation.x = Math.PI / 2;
  band1.scale.set(w * 1.04, d * 1.04, 1);
  band1.position.y = h * (0.5 - 1 / (PHI * PHI));
  const band2 = band1.clone();
  band2.position.y = -h * (0.5 - 1 / (PHI * PHI * PHI));
  group.add(band1, band2);
  // Top rim glow
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.014, 5, sides), bandMat);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(w * 1.05, d * 1.05, 1);
  rim.position.y = h / 2;
  group.add(rim);
  // Mandala inlay
  if (mandala) {
    const mScale = Math.min(Math.min(w, d), 7);
    const mIntensity = Math.min(w, d) > 8 ? 0.4 : 0.85;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42, sides), makeMandalaMaterial(accent, '#c05fff', mIntensity));
    disc.rotation.x = -Math.PI / 2;
    disc.scale.set(mScale, mScale, 1);
    disc.position.y = h / 2 + 0.03;
    group.add(disc);
  }
  return group;
}

// Floating Mandelbulb fragment — recursive cosmic debris for set dressing
export function makeMandelFragment({ size = 1, color = '#8a5fdf', seed = 11 } = {}) {
  const rng = mulberry(seed);
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.3, emissive: color, emissiveIntensity: 0.35, flatShading: true });
  injectUnderwater(mat, { caustics: 0.5 });
  // Recursive bulb cluster: spheres budding spheres at golden angles (mandelbulb skeleton)
  function bud(parent, r, depth) {
    const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
    parent.add(bulb);
    if (depth <= 0) return;
    const kids = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < kids; i++) {
      const a = i * 2.39996323 + rng() * 0.5;
      const tilt = 0.6 + rng() * 0.7;
      const child = new THREE.Group();
      child.position.set(Math.cos(a) * Math.sin(tilt) * r * 1.1, Math.cos(tilt) * r * 1.1, Math.sin(a) * Math.sin(tilt) * r * 1.1);
      bulb.add(child);
      bud(child, r / PHI, depth - 1);
    }
  }
  bud(group, size, 2);
  group.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return group;
}

// ---------------------------------------------------------------- NAUTILUS
// The sacred ammonite: logarithmic golden spiral shell. r grows by φ per
// quarter-turn; chambered bands alternate pearl/rose. Iridescent nacre.
export function makeNautilus({ size = 1, turns = 1.6, bands = true, color = '#f0e6f5', bandColor = '#b08ac9', seed = 2 } = {}) {
  const group = new THREE.Group();
  const N = Math.floor(turns * 16);
  const pearlMat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0.05, iridescence: 0.85, iridescenceIOR: 1.5, clearcoat: 0.8, emissive: '#7a5a8a', emissiveIntensity: 0.18 });
  const bandMat = new THREE.MeshPhysicalMaterial({ color: bandColor, roughness: 0.35, iridescence: 0.4, clearcoat: 0.5 });
  const geomsPearl = [], geomsBand = [];
  const growth = Math.pow(PHI, 4 / (turns * 16));   // φ per quarter turn
  let r = size * 0.045;
  for (let i = 0; i < N; i++) {
    const theta = (i / N) * turns * Math.PI * 2;
    const rad = size * 0.045 * Math.pow(PHI, theta / (Math.PI / 2));
    const x = Math.cos(theta) * rad;
    const y = Math.sin(theta) * rad;
    const tubeR = Math.max(rad * 0.30, size * 0.03);
    const g = new THREE.SphereGeometry(tubeR, 10, 8);
    g.scale(1, 1, 0.72);
    g.translate(x, y, 0);
    (bands && Math.floor(i / 3) % 2 === 0 ? geomsBand : geomsPearl).push(g);
  }
  if (geomsPearl.length) { const m = new THREE.Mesh(mergeGeoms(geomsPearl), pearlMat); m.castShadow = true; group.add(m); }
  if (geomsBand.length) { const m = new THREE.Mesh(mergeGeoms(geomsBand), bandMat); m.castShadow = true; group.add(m); }
  // Glowing siphon core — the shell remembers starlight
  const core = new THREE.Mesh(new THREE.SphereGeometry(size * 0.07, 10, 8), new THREE.MeshStandardMaterial({ color: '#2a1a3a', emissive: '#c05fff', emissiveIntensity: 1.6 }));
  const lastRad = size * 0.045 * Math.pow(PHI, (turns * Math.PI * 2) / (Math.PI / 2));
  core.position.set(Math.cos(turns * Math.PI * 2) * lastRad * 1.05, Math.sin(turns * Math.PI * 2) * lastRad * 1.05, 0);
  group.add(core);
  return group;
}

// Golden spiral inlay disc (floor medallion)
export function makeGoldenSpiralInlay({ size = 2, color = '#ffd94d' } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    uniforms: { uTime: envUniforms.uTime, uColor: { value: new THREE.Color(color) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv*2.0-1.0; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float r = length(vUv);
        if (r > 1.0) discard;
        float a = atan(vUv.y, vUv.x);
        // Log spiral: r = e^(b·θ) bands; b = ln(φ)/(π/2)
        float b = 0.30635;
        float s = fract((log(max(r, 1e-4)) / b - a / 6.28318) + uTime * 0.02);
        float band = smoothstep(0.08, 0.02, abs(s - 0.5) - 0.42);
        // Fibonacci squares quarter arcs
        float rings = smoothstep(0.02, 0.0, abs(fract(log(max(r,1e-4)) / b) - 0.5) - 0.46);
        float glow = band + rings * 0.7;
        gl_FragColor = vec4(uColor * 1.2, glow * 0.16 * smoothstep(1.0, 0.9, r));
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(size, 40), mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
