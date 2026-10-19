// ============================================================================
// MANDELPOD — Environment / Underwater Rendering Department
// Deep-sea gradient dome, animated water surface (seen from below), volumetric
// god-ray shafts, drifting plankton motes, rising bubble streams, giant
// background leviathan silhouettes, exponential depth fog with color
// absorption, and a full cinematic lighting rig.
// ============================================================================
import * as THREE from 'three';
import { envUniforms } from './materials.js';

export class UnderwaterEnv {
  constructor(scene, { waterLevel = 60, fogColor = '#0a2c4e', fogDensity = 0.016, deep = '#04122e', surface = '#1a7a9e', psychedelia = 1 } = {}) {
    this.scene = scene;
    this.waterLevel = waterLevel;
    envUniforms.uWaterLevel.value = waterLevel;
    envUniforms.uPsychedelia.value = psychedelia;

    scene.fog = new THREE.FogExp2(new THREE.Color(fogColor), fogDensity);

    // ---- Abyss dome: vertical gradient + slow aurora bands ----------------
    const domeGeo = new THREE.SphereGeometry(700, 32, 24);
    const domeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: envUniforms.uTime,
        uDeep: { value: new THREE.Color(deep) },
        uSurface: { value: new THREE.Color(surface) },
        uPsychedelia: envUniforms.uPsychedelia,
      },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime, uPsychedelia; uniform vec3 uDeep, uSurface; varying vec3 vP;
        void main(){
          float h = normalize(vP).y * 0.5 + 0.5;
          vec3 col = mix(uDeep, uSurface, pow(h, 1.6));
          // Slow aurora bands — the "sea of spacetime" shimmering far away
          float band = sin(normalize(vP).y * 14.0 + uTime * 0.14 + sin(atan(vP.z, vP.x) * 3.0) * 0.8);
          float band2 = sin(normalize(vP).y * 23.0 - uTime * 0.09 + atan(vP.z, vP.x) * 2.0);
          vec3 aurora = vec3(0.35, 0.1, 0.6) * max(band, 0.0) + vec3(0.05, 0.5, 0.45) * max(band2, 0.0);
          col += aurora * 0.14 * uPsychedelia * smoothstep(0.15, 0.7, h);
          // Twinkling plankton-stars in the far deep
          vec3 dir = normalize(vP);
          float tw = fract(sin(dot(floor(dir * 90.0).xy + floor(dir*90.0).z, vec2(12.9898,78.233))) * 43758.5453);
          float sparkle = step(0.995, tw) * (0.5 + 0.5 * sin(uTime * 2.0 + tw * 40.0));
          col += sparkle * vec3(0.5, 0.9, 1.0) * 0.6;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.dome = new THREE.Mesh(domeGeo, domeMat);
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    // ---- Water surface (viewed from below) --------------------------------
    const surfGeo = new THREE.PlaneGeometry(1400, 1400, 90, 90);
    const surfMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
      uniforms: { uTime: envUniforms.uTime },
      vertexShader: `
        uniform float uTime; varying vec3 vP; varying float vWave;
        void main(){
          vec3 p = position;
          float w = sin(p.x * 0.05 + uTime * 0.9) * cos(p.y * 0.04 + uTime * 0.7) * 2.2
                  + sin(p.x * 0.13 - uTime * 1.3) * 0.8;
          p.z += w; vWave = w;
          vP = (modelMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0);
        }`,
      fragmentShader: `
        uniform float uTime; varying vec3 vP; varying float vWave;
        void main(){
          // Shimmering silver-cyan ceiling with sun disc
          vec3 col = mix(vec3(0.05, 0.35, 0.5), vec3(0.4, 0.85, 0.95), 0.5 + vWave * 0.22);
          float sun = smoothstep(0.985, 1.0, sin(vP.x * 0.008 + uTime*0.05) * cos(vP.z * 0.008));
          col += vec3(1.0, 0.95, 0.8) * sun * 2.0;
          float shimmer = sin(vP.x * 0.35 + uTime * 2.0) * sin(vP.z * 0.3 - uTime * 1.7);
          col += vec3(0.3, 0.7, 0.9) * max(shimmer, 0.0) * 0.35;
          gl_FragColor = vec4(col, 0.55);
        }`,
    });
    this.surface = new THREE.Mesh(surfGeo, surfMat);
    this.surface.rotation.x = Math.PI / 2;
    this.surface.position.y = waterLevel;
    scene.add(this.surface);

    // ---- Lighting rig ------------------------------------------------------
    this.hemi = new THREE.HemisphereLight(new THREE.Color('#4fe0d8'), new THREE.Color('#1a2660'), 1.05);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(new THREE.Color('#bfe8ff'), 2.1);
    this.sun.position.set(18, 60, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 5; this.sun.shadow.camera.far = 140;
    this.sun.shadow.camera.left = -45; this.sun.shadow.camera.right = 45;
    this.sun.shadow.camera.top = 45; this.sun.shadow.camera.bottom = -45;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.sun, this.sun.target);

    this.rim = new THREE.DirectionalLight(new THREE.Color('#a050ff'), 0.7);
    this.rim.position.set(-25, 12, -30);
    scene.add(this.rim);

    // ---- God-ray shafts -----------------------------------------------------
    this.rays = new THREE.Group();
    const rayGeo = new THREE.PlaneGeometry(6, waterLevel * 1.15);
    const rayMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uTime: envUniforms.uTime, uCamPos: { value: new THREE.Vector3() } },
      vertexShader: `varying vec2 vUv; varying vec3 vWp; void main(){ vUv=uv; vWp=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uCamPos; varying vec2 vUv; varying vec3 vWp;
        void main(){
          float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
          float fade = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y) * 0.4);
          float flick = 0.75 + 0.25 * sin(uTime * 0.8 + vUv.x * 9.0);
          // Vanish when the camera gets close — never read as foreground
          float camFade = smoothstep(6.0, 22.0, distance(uCamPos, vWp));
          gl_FragColor = vec4(vec3(0.55, 0.9, 1.0), edge * fade * flick * 0.10 * camFade);
        }`,
    });
    for (let i = 0; i < 14; i++) {
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set((Math.random() - 0.5) * 240, waterLevel * 0.45, (Math.random() - 0.5) * 240);
      ray.rotation.y = Math.random() * Math.PI;
      ray.rotation.z = 0.28 + (Math.random() - 0.5) * 0.2;
      const s = 0.7 + Math.random() * 1.8;
      ray.scale.set(s, 1, 1);
      this.rays.add(ray);
    }
    scene.add(this.rays);

    // ---- Plankton motes (instanced drift) ----------------------------------
    const moteCount = 700;
    const moteGeo = new THREE.PlaneGeometry(0.09, 0.09);
    const moteMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uTime: envUniforms.uTime },
      vertexShader: `
        uniform float uTime;
        attribute vec3 offset; attribute float scale; attribute float phase; attribute vec3 tint;
        varying float vA; varying vec3 vTint;
        void main(){
          vec3 p = offset;
          p.x += sin(uTime * 0.22 + phase) * 1.6;
          p.y += sin(uTime * 0.16 + phase * 2.1) * 1.2;
          p.z += cos(uTime * 0.19 + phase * 1.3) * 1.6;
          vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.4 + phase * 3.0));
          vTint = tint;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          mv.xyz += position * scale;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vA; varying vec3 vTint;
        void main(){ gl_FragColor = vec4(vTint, vA * 0.5); }`,
    });
    const moteMesh = new THREE.InstancedBufferGeometry();
    moteMesh.index = moteGeo.index;
    moteMesh.attributes.position = moteGeo.attributes.position;
    moteMesh.attributes.uv = moteGeo.attributes.uv;
    const offsets = new Float32Array(moteCount * 3), scales = new Float32Array(moteCount), phases = new Float32Array(moteCount), tints = new Float32Array(moteCount * 3);
    const tintPalette = [new THREE.Color('#7fe8ff'), new THREE.Color('#c09fff'), new THREE.Color('#7fffc8'), new THREE.Color('#fff3b0')];
    for (let i = 0; i < moteCount; i++) {
      offsets.set([(Math.random() - 0.5) * 220, Math.random() * waterLevel * 0.9, (Math.random() - 0.5) * 220], i * 3);
      scales[i] = 0.5 + Math.random() * 2.2;
      phases[i] = Math.random() * Math.PI * 2;
      const c = tintPalette[(Math.random() * tintPalette.length) | 0];
      tints.set([c.r, c.g, c.b], i * 3);
    }
    moteMesh.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));
    moteMesh.setAttribute('scale', new THREE.InstancedBufferAttribute(scales, 1));
    moteMesh.setAttribute('phase', new THREE.InstancedBufferAttribute(phases, 1));
    moteMesh.setAttribute('tint', new THREE.InstancedBufferAttribute(tints, 3));
    this.motes = new THREE.Mesh(moteMesh, moteMat);
    this.motes.frustumCulled = false;
    scene.add(this.motes);

    // ---- Leviathan silhouette in the far deep -------------------------------
    this.leviathan = this._makeLeviathan();
    scene.add(this.leviathan);

    this.focus = new THREE.Vector3();   // follows player for shadow cam etc.

    // Ambient fish schools — living currents
    this.schools = [
      new FishSchool(scene, { count: 50, center: [0, 7, 0], radius: 16 }),
      new FishSchool(scene, { count: 36, center: [-14, 10, -40], radius: 12, size: 1.4 }),
      new FishSchool(scene, { count: 26, center: [12, 6, -80], radius: 10 }),
    ];
  }

  _makeLeviathan() {
    // A colossal, graceful something gliding through the distant murk
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: '#04122a', transparent: true, opacity: 0.85, fog: false });
    const body = new THREE.Mesh(new THREE.SphereGeometry(30, 16, 12), mat);
    body.scale.set(1, 0.55, 2.8);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(12, 60, 8), mat);
    tail.rotation.x = Math.PI / 2; tail.position.z = -95; tail.scale.set(1, 0.4, 1);
    const finL = new THREE.Mesh(new THREE.SphereGeometry(18, 8, 6), mat);
    finL.scale.set(1.6, 0.15, 0.6); finL.position.set(-30, 0, 10); finL.rotation.z = 0.3;
    const finR = finL.clone(); finR.position.x = 30; finR.rotation.z = -0.3;
    // Bioluminescent spots along its flank — terrifying AND beautiful
    const spotMat = new THREE.MeshBasicMaterial({ color: '#2affd8', fog: false });
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.9, 6, 4), spotMat);
      s.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 120);
      group.add(s);
    }
    group.add(body, tail, finL, finR);
    group.position.set(-160, 26, -260);
    group.rotation.y = 0.6;
    return group;
  }

  update(dt, t, focusPos, camera) {
    envUniforms.uTime.value = t;
    if (camera) this.rays.traverse((r) => { if (r.material?.uniforms?.uCamPos) r.material.uniforms.uCamPos.value.copy(camera.position); });
    for (const s of this.schools) s.update(dt, t);
    if (focusPos) {
      this.focus.copy(focusPos);
      // Dome, surface & rays follow the player so they never run out
      this.dome.position.set(focusPos.x, 0, focusPos.z);
      this.surface.position.set(focusPos.x, this.waterLevel, focusPos.z);
      this.rays.position.set(focusPos.x * 0.8, 0, focusPos.z * 0.8);
      this.motes.position.set(Math.round(focusPos.x / 20) * 20, 0, Math.round(focusPos.z / 20) * 20);
      // Shadow camera tracks the action
      this.sun.position.set(focusPos.x + 18, focusPos.y + 55, focusPos.z + 12);
      this.sun.target.position.copy(focusPos);
      // Leviathan glides in a slow circle, always in the murk
      const lt = t * 0.018;
      this.leviathan.position.set(focusPos.x + Math.cos(lt) * 230, 20 + Math.sin(t * 0.1) * 8, focusPos.z + Math.sin(lt) * 230);
      this.leviathan.rotation.y = -lt + Math.PI / 2;
    }
  }
}

// ============================================================================
// FISH SCHOOLS — living ambient currents (instanced, GPU-animated)
// ============================================================================
export class FishSchool {
  constructor(scene, { count = 60, center = [0, 8, -20], radius = 14, color = '#8fe8ff', color2 = '#c09fff', size = 1 } = {}) {
    this.center = new THREE.Vector3(...center);
    this.radius = radius;
    // Simple elegant fish: stretched cone + tail disc
    const body = new THREE.ConeGeometry(0.06, 0.3, 6);
    body.rotateX(Math.PI / 2);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = body.index;
    geo.attributes.position = body.attributes.position;
    geo.attributes.normal = body.attributes.normal;
    this.uniforms = { uTime: { value: 0 }, uCenter: { value: this.center }, uRadius: { value: radius } };
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds.set([Math.random() * Math.PI * 2, 0.3 + Math.random() * 0.7, Math.random() * Math.PI * 2, 0.5 + Math.random()], i * 4);
    }
    geo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */`
        uniform float uTime, uRadius; uniform vec3 uCenter;
        attribute vec4 iSeed;
        varying float vShade; varying vec3 vN;
        void main() {
          float phase = iSeed.x, speed = iSeed.y, yOff = iSeed.z, scaleV = iSeed.w;
          float a = uTime * speed * 0.45 + phase;
          // Lissajous school path — organic swarm
          vec3 path = uCenter + vec3(
            cos(a) * uRadius * (0.7 + 0.3 * sin(a * 0.7 + phase)),
            sin(a * 1.3 + yOff) * 2.2 + sin(phase * 3.0) * 0.8,
            sin(a * 0.8) * uRadius
          );
          // Heading = path derivative (approx)
          float a2 = a + 0.05;
          vec3 path2 = uCenter + vec3(
            cos(a2) * uRadius * (0.7 + 0.3 * sin(a2 * 0.7 + phase)),
            sin(a2 * 1.3 + yOff) * 2.2 + sin(phase * 3.0) * 0.8,
            sin(a2 * 0.8) * uRadius
          );
          vec3 fwd = normalize(path2 - path);
          vec3 up = vec3(0.0, 1.0, 0.0);
          vec3 side = normalize(cross(up, fwd + vec3(0.0001)));
          vec3 up2 = cross(fwd, side);
          // Wiggle
          float wig = sin(uTime * 9.0 + phase * 8.0) * 0.06;
          vec3 p = path
            + side * (position.x + wig * (position.z + 0.2)) * scaleV
            + up2 * position.y * scaleV
            + fwd * position.z * scaleV;
          vShade = 0.6 + 0.4 * sin(phase * 10.0 + uTime * 2.0);
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        varying float vShade; varying vec3 vN;
        void main() {
          vec3 base = mix(vec3(0.55, 0.9, 1.0), vec3(0.75, 0.6, 1.0), vShade);
          float rim = pow(1.0 - abs(vN.z), 2.0);
          gl_FragColor = vec4(base * (0.55 + vShade * 0.4) + rim * vec3(0.4, 0.9, 1.0) * 0.35, 0.75);
        }`,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  update(dt, t) { this.uniforms.uTime.value = t; }
}
