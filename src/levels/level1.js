// ============================================================================
// MANDELPOD — LEVEL 1: CAMBRIAN KALEIDOSCOPE
// An impossible prehistoric reef. Beats (evolves every ~15 seconds):
//   1. Sunrise Shallows (teach run/jump)   2. Coral Steps (gap jumps)
//   3. Shell Corridor (breakables)         4. Sponge Canyon (bounce)
//   5. Timeline Garden (dimension swap)    6. LEVIATHAN CHASE (set-piece)
//   7. Trilobite Gate + Goal Vortex
// Secret: Hidden Fractal ledge + double-jump-only pearl vault (replay hook).
// ============================================================================
import * as THREE from 'three';
import { Mats } from '../world/materials.js';

export const level1 = {
  id: 'level1',
  name: 'CAMBRIAN KALEIDOSCOPE',
  sub: 'Timeline Reef — 500 Million Years Ago',
  seed: 1337,
  killY: -8,
  unlocks: 'level2',
  spawn: [0, 1.2, 6],
  relicTimes: { sapphire: 95, gold: 75, platinum: 60 },   // seconds
  rail: [
    [0, 0, 10], [0, 0, -8], [0, 1, -22], [0, 2, -34], [0, 0.5, -46],
    [1, 0, -58], [0, 0, -70], [-1, 0, -84], [0, 0, -96], [0, 0, -112],
    [0, 0, -130], [0, 0, -150],
  ],
  // Overhead read for the nautilus-pad canyon: see the gaps from above
  cameraZones: [
    { z: [-51, -76], offset: [0, 6.4, 5.2], look: [0, -0.4, -5.2] },
  ],

  build(level, L) {
    const { props, rng } = L;

    // ============================================== THE ABYSS BELOW (dressing)
    // A vast drowned plain far beneath the course — kills the void feeling.
    {
      const floorMat = Mats.sand('#4a3a6a');
      const abyss = new THREE.Mesh(new THREE.CircleGeometry(320, 40), floorMat);
      abyss.rotation.x = -Math.PI / 2;
      abyss.receiveShadow = true;
      // NOTE: deco() SETS the position — pass it here, never via position.set
      // (a y=0 abyss disc z-fights the spawn pad into flickering blue patches)
      L.deco(abyss, 0, -16, -70, 1);
      // Scattered glow-life on the plain
      for (let i = 0; i < 16; i++) {
        L.deco(props.makeGlowShrooms({ count: 5, color: i % 2 ? '#4fd8ff' : '#ff6bd8' }),
          (rng() - 0.5) * 120, -16, -20 - rng() * 120, 2 + rng() * 2);
      }
      for (let i = 0; i < 8; i++) {
        L.deco(props.makeCoralTree({ seed: 900 + i, branches: 3, depth: 2, color: '#3a5a8a', tipColor: '#6a9aff', glow: 0.5 }),
          (rng() - 0.5) * 100, -16, -30 - rng() * 100, 3 + rng() * 3);
      }
      // Floating mandelbulb fragments drift in the mid-deep — cosmic debris
      for (let i = 0; i < 10; i++) {
        const f = props.makeMandelFragment({ size: 0.8 + rng() * 1.8, color: i % 2 ? '#8a5fdf' : '#3a8adf', seed: 700 + i });
        const fx = (12 + rng() * 30) * (rng() < 0.5 ? -1 : 1), fy = -8 + rng() * 8, fz = -10 - rng() * 130;
        L.deco(f, fx, fy, fz, 1);
        level._fragments = level._fragments ?? [];
        level._fragments.push({ mesh: f, spin: 0.1 + rng() * 0.3, bob: rng() * Math.PI * 2, y: f.position.y });
      }
    }

    // ===================================================== 1. SUNRISE SHALLOWS
    L.ground(0, -0.5, 0, 16, 1, 20, { mat: Mats.sand(), color: '#d9b97e' });
    // Dune skirts — keep the runway clear, dress the edges
    for (let i = 0; i < 5; i++) {
      L.deco(props.makeRock({ size: 0.8 + rng() * 0.9, color: '#c9b07a', seed: i * 7 + 1, flat: true }),
        (i % 2 ? 1 : -1) * (5.5 + rng() * 2), -0.15, 6 - i * 3.5, 1, rng() * Math.PI);
    }
    // Sacred nautilus sentinels mark the entrance to deep time
    L.deco(props.makeNautilus({ size: 1.4, turns: 1.7 }), -4.6, 1.1, -7.5, 1, 0.35);
    L.deco(props.makeNautilus({ size: 1.4, turns: 1.7 }), 4.6, 1.1, -7.5, 1, -0.35);
    // Lifted clear of the slab's own mandala disc (sits at y=0.03) — no shimmer
    L.deco(props.makeGoldenSpiralInlay({ size: 2.6, color: '#ffd94d' }), 0, 0.055, 0, 1);
    // Coral framing the start vista
    L.deco(props.makeCoralTree({ seed: 3, color: '#ff5f9d', tipColor: '#ffd0e8', glow: 1 }), -5.5, 0, 3, 1.6);
    L.deco(props.makeCoralTree({ seed: 8, color: '#ff6a1a', tipColor: '#ffd080', glow: 1.1 }), 5.8, 0, 1.5, 1.3);
    L.deco(props.makeAnemone({ color: '#c05fff' }), -3, 0, -3, 1.4);
    L.deco(props.makeAnemone({ color: '#4fd8ff' }), 3.4, 0, -6, 1.2);
    L.deco(props.makeStarfish({}), -1.8, 0.02, 1, 1.2);
    L.deco(props.makeStarfish({ color: '#ffd94d' }), 2.2, 0.02, -2, 0.9);
    L.deco(props.makeClam({ size: 0.5, color: '#b89ae8' }), 5, 0, -4, 1);
    // Kelp curtains on the sides
    L.deco(props.makeKelpForest({ count: 18, area: 8, height: [4, 8] }), -9, 0, -2, 1);
    L.deco(props.makeKelpForest({ count: 18, area: 8, height: [4, 8] }), 9, 0, -4, 1);
    // Teach: pearls pull you forward; first shells off the main line
    L.pearlTrail(new THREE.Vector3(0, 1, 4), new THREE.Vector3(0, 1, -6), 6);
    L.breakable('memoryShell', -2.5, 0.65, -4);
    L.breakable('memoryShell', 2.5, 0.65, -5.5);
    L.enemy('crab', 1.2, 0.4, -5);

    // ===================================================== 2. CORAL STEPS
    // Ascending sculpted platforms with real gaps
    const steps = [
      [0, 0.4, -14, 4.5], [-2.2, 1.2, -19, 3.6], [2.0, 2.0, -23.5, 3.6],
      [0, 2.8, -28, 4.2], [0, 3.4, -33, 3.8],
    ];
    for (const [x, y, z, w] of steps) {
      L.ground(x, y, z, w, 0.9, w, { color: '#4a5a8a' });
      // Coral crowns on each step
      L.deco(props.makeCoralTree({ seed: (x * 13 + z * 7) | 0, branches: 3, depth: 2, color: '#ff5f9d' }), x + w * 0.32, y + 0.45, z - w * 0.3, 0.7);
    }
    L.pearlTrail(new THREE.Vector3(0, 1.6, -12), new THREE.Vector3(0, 4.6, -33), 10, 1.2);
    L.enemy('jelly', 3.2, 3.2, -21, { range: 2 });
    L.enemy('jelly', -3.0, 4.2, -30.5, { range: 1.8 });
    L.breakable('pearlPod', 2.0, 3.0, -23.5);
    // Glow shrooms light the path edges
    L.deco(props.makeGlowShrooms({ count: 6 }), -3.2, 1.65, -19, 1);
    L.deco(props.makeGlowShrooms({ count: 6, color: '#ff6bd8' }), 3.4, 3.25, -27.5, 1);

    // ===================================================== 3. SHELL CORRIDOR
    L.ground(0, 2.9, -42, 7, 1, 18, { color: '#5a6a7a' });
    // Ancient avenue of ruins — this reef REMEMBERS
    for (let i = 0; i < 4; i++) {
      L.deco(props.makeRuinPillar({ height: 3.4, broken: i % 3 === 2 }), -3.1, 3.4, -36 - i * 4.5, 1);
      L.deco(props.makeRuinPillar({ height: 3.4, broken: i % 3 === 1 }), 3.1, 3.4, -38 - i * 4.5, 1, Math.PI);
    }
    L.deco(props.makeFossilTrilobite({ size: 1.2 }), -2.2, 3.55, -39, 1, 0.6);
    // Crate stacks — the satisfying corridor
    L.breakable('memoryShell', 0, 3.95, -38);
    L.breakable('memoryShell', 0, 3.95, -39.2);
    L.breakable('memoryShell', 0, 5.15, -38.6);
    L.breakable('pearlPod', -1.6, 3.95, -41);
    L.breakable('pufferPod', 1.4, 3.95, -43);
    L.breakable('memoryShell', 1.4, 3.95, -44.4);
    L.breakable('memoryShell', -1.2, 3.95, -46);
    L.breakable('pearlPod', 0.4, 3.95, -47.5);
    L.enemy('urchin', 0, 4.1, -45, { orbitRadius: 2.0, orbitSpeed: 1.6 });
    L.pearlTrail(new THREE.Vector3(-2, 4.2, -36), new THREE.Vector3(-2, 4.2, -48), 6);
    L.checkpoint(0, 3.4, -50.5);

    // ===================================================== 4. SPONGE CANYON
    // Abyss crossing on bounce sponges. Fall = death (fast respawn).
    L.ground(0, 2.9, -52.5, 6, 1, 5, { color: '#4a5a8a' });
    const spongeLine = [[0, 2.2, -57], [0, 2.4, -62.5], [0, 2.6, -68]];
    for (const [x, y, z] of spongeLine) L.breakable('bounceSponge', x, y, z);
    L.pearlTrail(new THREE.Vector3(0, 4.4, -55), new THREE.Vector3(0, 5.2, -69), 7, 1.6);
    L.enemy('puffer', -4.2, 4.5, -60, {});
    L.enemy('puffer', 4.2, 4.8, -66, {});
    // Canyon walls: towering coral cliffs
    for (let i = 0; i < 6; i++) {
      L.deco(props.makeRock({ size: 2.2 + rng() * 2, color: '#55639a', seed: 40 + i }), -7 - rng() * 3, 1 + rng() * 2, -55 - i * 3.5, 1, rng() * 3);
      L.deco(props.makeRock({ size: 2.2 + rng() * 2, color: '#55639a', seed: 60 + i }), 7 + rng() * 3, 1 + rng() * 2, -56 - i * 3.5, 1, rng() * 3);
    }
    L.deco(props.makeTubeSponges({ seed: 9 }), -4.2, 2.4, -52, 1.4);
    // ★ SECRET: Hidden Fractal ledge, off-camera left behind a coral veil
    L.ground(-6.5, 3.2, -63, 2.6, 0.8, 2.6, { color: '#4a3a6a' });
    L.fractal(-6.5, 4.6, -63);
    L.deco(props.makeCoralTree({ seed: 99, branches: 5, depth: 3, color: '#8a2eff', tipColor: '#d0a0ff' }), -5.4, 3.6, -61.8, 1.2);
    // ★ REPLAY HOOK: pearl vault only reachable with Double Current
    L.ground(6.8, 7.6, -58, 3, 0.8, 3, { color: '#4a4268', accent: '#8a6adf' });
    L.pearls([[6.8, 8.6, -58], [6.2, 8.6, -58.6], [7.4, 8.6, -57.4], [6.8, 8.6, -57], [6.8, 9.4, -58]]);
    L.breakable('pearlPod', 6.8, 8.5, -58);
    L.checkpoint(0, 3.3, -73);

    // ===================================================== 5. TIMELINE GARDEN
    // Phase platforms: the reef exists in two states. T to swap.
    L.ground(0, 2.9, -76.5, 6, 1, 9, { color: '#4a5a8a' });
    // Gap 1: only A (healthy, blue) solid
    L.ground(0, 2.9, -82.5, 2.6, 0.8, 2.6, { phase: 'A' });
    L.ground(1.8, 3.4, -85.5, 2.2, 0.8, 2.2, { phase: 'B' });
    L.ground(-1.6, 2.9, -88.5, 2.4, 0.8, 2.4, { phase: 'A' });
    L.ground(0, 2.9, -91.5, 2.6, 0.8, 2.6, { phase: 'B' });
    L.pearlTrail(new THREE.Vector3(0, 4.2, -78), new THREE.Vector3(0, 4.4, -91), 8, 0.8);
    L.enemy('jelly', 0, 4.6, -86, { range: 1.6 });
    // Coral that only exists in one timeline — the garden literally changes
    const healthyCoral = props.makeCoralTree({ seed: 55, branches: 4, depth: 3, color: '#35d5ff', tipColor: '#a0f0ff' });
    L.deco(healthyCoral, -3.4, 3.4, -78, 1.3);
    const deadCoral = props.makeCoralTree({ seed: 56, branches: 3, depth: 3, color: '#6a5a4a', tipColor: '#3a3a3a', glow: 0.05 });
    L.deco(deadCoral, -3.4, 3.4, -78, 1.3);
    level._timelineCoral = { healthy: healthyCoral, dead: deadCoral };
    L.ground(0, 2.9, -94, 8, 1, 6, { color: '#4a5a8a' });
    L.deco(props.makeRuinPillar({ height: 5 }), -3.4, 3.4, -94, 1.2);
    L.deco(props.makeRuinPillar({ height: 5 }), 3.4, 3.4, -94, 1.2);
    L.breakable('chronoCoral', 3.2, 4.1, -92.5);
    L.breakable('memoryShell', -3.2, 4.0, -95.5);
    L.breakable('memoryShell', 3.2, 4.0, -96.5);
    L.checkpoint(0, 3.4, -97);

    // ===================================================== 6. LEVIATHAN CHASE
    // Reverse camera: RUN TOWARD THE SCREEN. Falling debris, gaps, urchins.
    const chasePath = [[0, 2.9, -101, 7, 1, 8], [0, 2.9, -111, 6.5, 1, 6], [0, 3.1, -119, 5.5, 1, 6], [0, 3.1, -127, 5.5, 1, 6], [0, 2.9, -136, 6, 1, 8]];
    for (const [x, y, z, w, h, d] of chasePath) L.ground(x, y, z, w, h, d, { color: '#5a4a6a' });
    L.pearlTrail(new THREE.Vector3(0, 4, -99), new THREE.Vector3(0, 4.2, -138), 16, 0.5);
    L.enemy('urchin', 0, 3.9, -115, { orbitRadius: 1.4, orbitSpeed: 2.2 });
    L.enemy('urchin', 0, 4.1, -123, { orbitRadius: 1.2, orbitSpeed: 2.6 });
    L.breakable('memoryShell', 2.2, 3.9, -105);
    L.breakable('memoryShell', 1.8, 4.1, -124);
    L.breakable('pearlPod', -1.8, 4.1, -130);
    // Chase canyon dressing — blurred panic walls
    for (let i = 0; i < 10; i++) {
      L.deco(props.makeRock({ size: 2 + rng() * 2.4, color: '#6a5580', seed: 100 + i }), (i % 2 ? 1 : -1) * (8.5 + rng() * 3), 0.5 + rng() * 1.5, -100 - i * 4.2, 1, rng() * 3);
    }
    L.deco(props.makeKelpForest({ count: 12, area: 6, height: [5, 9], color: '#6a2a5a' }), -6, 2.4, -110, 1);
    L.deco(props.makeKelpForest({ count: 12, area: 6, height: [5, 9], color: '#6a2a5a' }), 6, 2.4, -125, 1);

    // ===================================================== 7. TRILOBITE GATE + GOAL
    L.ground(0, 2.9, -145, 12, 1, 12, { mat: Mats.sand(), color: '#c9b07a' });
    L.enemy('trilobite', 0, 3.3, -143, { patrolRange: 3 });
    // The goal sanctum — a moment of awe after the chase
    L.deco(props.makeRuinPillar({ height: 6 }), -4.5, 3.4, -148, 1.4);
    L.deco(props.makeRuinPillar({ height: 6 }), 4.5, 3.4, -148, 1.4);
    L.deco(props.makeRuinPillar({ height: 4.2, broken: true }), -5.5, 3.4, -142, 1);
    L.deco(props.makeCoralTree({ seed: 77, branches: 5, depth: 4, color: '#ff5f9d', tipColor: '#ffe0f0', glow: 1.2 }), 5.5, 3.4, -143, 1.8);
    L.deco(props.makeCoralTree({ seed: 78, branches: 4, depth: 3, color: '#35d5ff', tipColor: '#d0fff8', glow: 1 }), -5, 3.4, -150, 1.5);
    L.deco(props.makeAnemone({ color: '#ffd94d', tentacles: 34, radius: 0.7 }), 2.5, 3.4, -146, 1.5);
    L.deco(props.makeGlowShrooms({ count: 9, color: '#4fd8ff' }), -2.5, 3.4, -146, 1.3);
    L.deco(props.makeNautilus({ size: 2.0, turns: 1.8, color: '#e8f0f8', bandColor: '#8a6ac9' }), -4.8, 4.6, -148.5, 1, 0.5);
    L.deco(props.makeGoldenSpiralInlay({ size: 3.2, color: '#39ffd0' }), 0, 3.44, -146, 1);
    L.gem(0, 4.6, -145.5);
    L.goal(0, 5.2, -149.5);
  },

  update(level, dt, t) {
    // Timeline garden coral: healthy in A, dead in B
    const tl = level.game.world.timeline;
    if (level._timelineCoral) {
      const { healthy, dead } = level._timelineCoral;
      healthy.visible = tl === 'A';
      dead.visible = tl === 'B';
    }
    // Drifting mandel fragments
    for (const f of level._fragments ?? []) {
      f.mesh.rotation.y += dt * f.spin;
      f.mesh.rotation.x += dt * f.spin * 0.6;
      f.mesh.position.y = f.y + Math.sin(t * 0.5 + f.bob) * 0.8;
    }
  },
};
