// ============================================================================
// MANDELPOD — Engine Core
// Renderer, post-processing chain, fixed-timestep simulation loop, quality
// scaling. WebGL2 renderer tuned to push AAA-grade visuals: ACES tone mapping,
// soft shadows, HDR bloom, film grade pass.
// ============================================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------- Final grade
// Cinematic finishing pass: filmic vignette, chromatic aberration, animated
// grain, subtle psychedelic color grade, speed-reactive barrel warp.
const FinalGradeShader = {
  uniforms: {
    tDiffuse:        { value: null },
    uTime:           { value: 0 },
    uVignette:       { value: 1.15 },
    uChroma:         { value: 1.0 },
    uGrain:          { value: 0.035 },
    uWarp:           { value: 0.0 },     // speed/chase warp 0..1
    uSaturation:     { value: 1.12 },
    uLift:           { value: new THREE.Vector3(0.012, 0.02, 0.045) },
    uFlash:          { value: 0.0 },     // impact flash
    uFlashColor:     { value: new THREE.Color(1, 1, 1) },
    uReduceFx:       { value: 0.0 },     // accessibility: reduced distortion
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uChroma, uGrain, uWarp, uSaturation, uFlash, uReduceFx;
    uniform vec3 uLift, uFlashColor;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float r2 = dot(centered, centered);

      // Subtle speed warp (barrel) — disabled in reduced-fx mode
      float warpAmt = uWarp * 0.12 * (1.0 - uReduceFx);
      uv = 0.5 + centered * (1.0 + r2 * warpAmt);

      // Chromatic aberration, radial, scaled by warp
      float ca = (0.0016 * uChroma + uWarp * 0.004) * (1.0 - 0.7 * uReduceFx);
      vec2 dir = normalize(centered + 1e-6) * ca * r2 * 8.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir).b;

      // Shadow lift toward abyssal blue
      col += uLift * (1.0 - smoothstep(0.0, 0.45, dot(col, vec3(0.333))));

      // Saturation
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);

      // Vignette
      float vig = smoothstep(0.95, 0.32, r2 * uVignette);
      col *= mix(0.72, 1.0, vig);

      // Animated grain
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 43.7) - 0.5;
      col += g * uGrain * (1.0 - uReduceFx * 0.8);

      // Impact flash
      col = mix(col, uFlashColor, uFlash);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// ------------------------------------------------------------------- Engine
export class Engine {
  constructor(container) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.info.autoReset = false;   // full-frame stats across all composer passes

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 900);
    this.camera.position.set(0, 3, 8);

    // Post chain
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.5, 0.88
    );
    this.composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass(FinalGradeShader);
    this.composer.addPass(this.gradePass);
    this.composer.addPass(new OutputPass());

    // Simulation timing — fixed step, decoupled render
    this.fixedDt = 1 / 120;
    this.accumulator = 0;
    this.lastTime = performance.now() / 1000;
    this.time = 0;              // scaled sim time
    this.timeScale = 1;
    this.frame = 0;

    this.updaters = [];         // { update(dt, t) } sorted by priority
    this.running = false;

    // Perf tracking
    this.perf = { fps: 0, ms: 0, frames: 0, acc: 0, worst: 0 };

    // Impact flash state
    this._flash = 0;
    this._flashDecay = 6;

    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  add(updatable, priority = 0) {
    updatable._priority = priority;
    this.updaters.push(updatable);
    this.updaters.sort((a, b) => a._priority - b._priority);
    return updatable;
  }

  remove(updatable) {
    const i = this.updaters.indexOf(updatable);
    if (i >= 0) this.updaters.splice(i, 1);
  }

  flash(amount = 0.5, color = 0xffffff) {
    this._flash = Math.max(this._flash, amount);
    if (color !== undefined) this.gradePass.uniforms.uFlashColor.value.set(color);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this._tick();
    };
    requestAnimationFrame(loop);
  }

  _tick() {
    const t0 = performance.now();
    const now = t0 / 1000;
    let frameDt = Math.min(now - this.lastTime, 0.1);
    this.lastTime = now;

    // Fixed-step simulation with spiral-of-death guard
    this.accumulator += frameDt * this.timeScale;
    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < 8) {
      this.time += this.fixedDt;
      for (const u of this.updaters) u.fixedUpdate?.(this.fixedDt, this.time);
      this.accumulator -= this.fixedDt;
      steps++;
    }
    if (steps === 8) this.accumulator = 0;

    // Per-render updates (visual smoothing, camera, particles)
    const dt = frameDt * this.timeScale;
    for (const u of this.updaters) u.update?.(dt, this.time, frameDt);

    // Grade pass uniforms
    const gu = this.gradePass.uniforms;
    gu.uTime.value = this.time;
    this._flash = Math.max(0, this._flash - frameDt * this._flashDecay);
    gu.uFlash.value = this._flash * this._flash; // quadratic falloff feels snappier

    this.renderer.info.reset();
    this.composer.render();
    this.frame++;

    // Perf
    const ms = performance.now() - t0;
    const p = this.perf;
    p.acc += frameDt; p.frames++;
    if (p.acc >= 0.5) { p.fps = p.frames / p.acc; p.frames = 0; p.acc = 0; }
    p.ms = p.ms * 0.9 + ms * 0.1;
    p.worst = Math.max(ms, p.worst * 0.98);
  }
}
