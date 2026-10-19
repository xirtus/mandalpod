// ============================================================================
// MANDELPOD — LEVEL 2: ATLANTIS AT THE END OF TIME
// A drowned classical civilization recursively duplicating as its timeline
// collapses. REQUIRES: Double Current (double jump). Teaches: high-gap
// traversal, crumbling aqueducts, intact↔ruined timeline walls.
// Beats: Sunken Plaza → Broken Aqueduct → Collapsing Causeway →
//        The Duplicated City → High Sanctum
// ============================================================================
import * as THREE from 'three';
import { Mats } from '../world/materials.js';

export const level2 = {
  id: 'level2',
  name: 'ATLANTIS AT THE END OF TIME',
  sub: 'The City That Falls Forever',
  seed: 4242,
  killY: -9,
  spawn: [0, 1.2, 6],
  relicTimes: { sapphire: 120, gold: 95, platinum: 78 },
  requires: 'doubleJump',
  rail: [
    [0, 0, 10], [0, 0, -6], [0, 2, -20], [0, 5, -34], [0, 8, -48],
    [0, 6, -62], [0, 3, -76], [0, 0, -90], [0, 0, -104], [0, 2, -118],
  ],

  build(level, L) {
    const { props, rng } = L;
    const gold = '#c9a24d', marble = '#9aa4c0', deepBlue = '#3a4a7a';

    // ===================================================== 1. SUNKEN PLAZA
    L.ground(0, -0.5, 0, 18, 1, 16, { color: marble, accent: gold });
    // Colonnade framing the plaza
    for (let i = 0; i < 3; i++) {
      L.deco(props.makeRuinPillar({ height: 4.5 }), -7.5, 0, 4 - i * 5, 1.1);
      L.deco(props.makeRuinPillar({ height: 4.5 }), 7.5, 0, 4 - i * 5, 1.1);
    }
    // Nautilus statues — the city's gods
    L.deco(props.makeNautilus({ size: 1.8, turns: 1.7, color: '#e8d8a8', bandColor: '#7a5a3a' }), -6, 1.3, -5.5, 1, 0.4);
    L.deco(props.makeNautilus({ size: 1.8, turns: 1.7, color: '#e8d8a8', bandColor: '#7a5a3a' }), 6, 1.3, -5.5, 1, -0.4);
    L.deco(props.makeGoldenSpiralInlay({ size: 3, color: gold }), 0, 0.03, 0, 1);
    L.deco(props.makeCoralTree({ seed: 201, color: '#35d5ff', tipColor: '#d0fff8', glow: 0.9 }), -8, 0, 2, 1.2);
    L.deco(props.makeAnemone({ color: '#ffd94d' }), 5, 0, 3, 1.3);
    L.deco(props.makeGlowShrooms({ count: 7, color: '#4fd8ff' }), -4, 0, -3, 1.2);
    L.pearlTrail(new THREE.Vector3(0, 1, 4), new THREE.Vector3(0, 1.4, -4), 5);
    L.breakable('memoryShell', -2.6, 0.65, -2);
    L.breakable('memoryShell', 2.6, 0.65, -3.4);
    L.enemy('crab', 0, 0.4, -6.5);
    // Double-jump tutorial gate: gap too wide for single jump
    L.hint?.('<kbd>SPACE</kbd> ×2 — DOUBLE CURRENT!', 0);

    // ===================================================== 2. BROKEN AQUEDUCT
    // Wide ascending gaps demanding double jumps (pearl arcs mark the line)
    L.ground(0, 1.2, -12, 4, 0.8, 4, { color: marble, accent: gold });
    L.ground(2.5, 2.6, -19, 3.4, 0.8, 3.4, { color: marble, accent: gold });
    L.ground(-2.2, 4.0, -26, 3.2, 0.8, 3.2, { color: marble, accent: gold });
    L.ground(1.8, 5.4, -33, 3.0, 0.8, 3.0, { color: marble, accent: gold });
    L.ground(0, 6.6, -40, 3.6, 0.8, 3.6, { color: marble, accent: gold });
    L.pearlTrail(new THREE.Vector3(0, 2.6, -12), new THREE.Vector3(0, 8.2, -40), 12, 2.2);
    L.enemy('jelly', 1, 5.2, -23, { range: 2.4 });
    L.enemy('jelly', -1, 7.4, -36, { range: 2.4 });
    L.breakable('pearlPod', 2.5, 3.6, -19);
    L.breakable('memoryShell', 0, 7.6, -40);
    // Aqueduct arches in the murk
    for (let i = 0; i < 5; i++) {
      L.deco(props.makeRuinPillar({ height: 7 + rng() * 3, broken: i % 2 === 0 }), -8 - rng() * 3, 2 + i * 1.2, -14 - i * 7, 1.3);
      L.deco(props.makeRuinPillar({ height: 7 + rng() * 3, broken: i % 2 === 1 }), 8 + rng() * 3, 2 + i * 1.2, -17 - i * 7, 1.3);
    }
    L.checkpoint(0, 7.1, -43);

    // ===================================================== 3. COLLAPSING CAUSEWAY
    // Crumbling discs that sink and fall when stepped on (mover w/ trigger)
    L.ground(0, 6.6, -46, 5, 0.8, 5, { color: marble, accent: gold });
    const crumbleSpots = [[0, 6.6, -52], [-1.4, 6.8, -57.5], [1.4, 7.0, -63], [0, 7.2, -68.5]];
    for (const [x, y, z] of crumbleSpots) {
      const body = L.mover(x, y, z, 2.8, 0.7, 2.8, (t, b) => {
        const st = b.userData.crumble;
        if (!st) return;
        if (st.state === 'shaking') {
          b.position.x = st.x + Math.sin(t * 45) * 0.06;
          if (level.game.engine.time - st.t0 > 0.7) st.state = 'falling';
        } else if (st.state === 'falling') {
          b.position.y -= 9 * (1 / 60);
          b.position.x = st.x;
          if (b.position.y < -12) { b.position.set(st.x, st.y, st.z); st.state = 'idle'; }
        }
      }, { color: '#b8a888', accent: '#ff9d2e' });
      body.userData.crumble = null;
      // Step trigger
      const trig = L.hazard(x, y + 0.8, z, 2.6, 0.6, 2.6, 'crumbleTrigger');
      trig.userData.onTouch = (player, b) => {
        const st = body.userData.crumble;
        if (!st) { body.userData.crumble = { state: 'shaking', t0: level.game.engine.time, x, y, z }; level.game.audio?.play('crabCharge'); }
      };
      trig.userData.type = 'trigger';   // not actually harmful
      trig.flags = 4; // COL.TRIGGER
    }
    L.pearlTrail(new THREE.Vector3(0, 8, -48), new THREE.Vector3(0, 8.6, -68), 9, 0.8);
    L.enemy('urchin', 0, 7.6, -58, { orbitRadius: 2.2, orbitSpeed: 2.0 });
    // ★ SECRET: Fractal on a far side ledge, needs double jump + air spin
    L.ground(7.2, 8.4, -60, 2.4, 0.7, 2.4, { color: '#6a5a8a', accent: '#c05fff' });
    L.fractal(7.2, 9.6, -60);
    L.checkpoint(0, 7.7, -72);

    // ===================================================== 4. THE DUPLICATED CITY
    // Intact-past ↔ ruined-future swaps. Walls exist in one timeline only.
    L.ground(0, 7.0, -78, 8, 0.9, 8, { color: marble, accent: '#35d5ff' });
    // Wall A: intact in past (blocks), rubble in future (pass)
    L.ground(0, 8.6, -80.5, 6, 3.4, 0.9, { phase: 'A', accent: '#35d5ff' });
    // Gap only crossable in B next
    L.ground(0, 7.0, -84.5, 2.6, 0.8, 2.6, { phase: 'B', accent: '#ff9d2e' });
    L.ground(0, 7.4, -88.5, 2.4, 0.8, 2.4, { phase: 'A', accent: '#35d5ff' });
    L.ground(0, 7.0, -92.5, 2.8, 0.8, 2.8, { phase: 'B', accent: '#ff9d2e' });
    L.pearlTrail(new THREE.Vector3(0, 8.4, -79), new THREE.Vector3(0, 8.6, -92), 8, 0.6);
    // The city duplicates: two ghost-cities behind the play space
    const cityA = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const p = props.makeRuinPillar({ height: 3 + rng() * 5, broken: false });
      p.position.set(-16 + rng() * 6, 4 + rng() * 3, -76 - rng() * 22);
      p.scale.setScalar(0.9 + rng() * 0.5);
      cityA.add(p);
    }
    L.deco(cityA, 0, 0, 0, 1);
    const cityB = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const p = props.makeRuinPillar({ height: 2 + rng() * 3, broken: true });
      p.position.set(12 + rng() * 6, 4 + rng() * 3, -76 - rng() * 22);
      p.scale.setScalar(0.9 + rng() * 0.5);
      cityB.add(p);
    }
    L.deco(cityB, 0, 0, 0, 1);
    level._duoCity = { intact: cityA, ruined: cityB };
    L.enemy('trilobite', 0, 7.5, -78, { patrolRange: 2.4 });
    L.breakable('chronoCoral', 0, 8.1, -96);
    L.ground(0, 7.0, -97, 9, 0.9, 7, { color: marble, accent: '#c9a24d' });
    L.breakable('memoryShell', -2.4, 8.0, -97.5);
    L.breakable('memoryShell', 2.4, 8.0, -97.5);
    L.breakable('pearlPod', 0, 8.0, -99);
    L.checkpoint(0, 7.6, -100);

    // ===================================================== 5. HIGH SANCTUM
    // Final double-jump climb to the Gem terrace
    L.ground(0, 8.4, -105.5, 3.2, 0.8, 3.2, { color: marble, accent: '#c9a24d' });
    L.ground(-2.2, 9.8, -110, 3.0, 0.8, 3.0, { color: marble, accent: '#c9a24d' });
    L.ground(0, 11.2, -115, 3.4, 0.8, 3.4, { color: marble, accent: '#c9a24d' });
    L.ground(0, 11.2, -121, 12, 1, 10, { color: '#9aa4c0', accent: '#39ffd0' });
    L.pearlTrail(new THREE.Vector3(0, 9.6, -104), new THREE.Vector3(0, 12.4, -115), 8, 1.4);
    L.enemy('jelly', 0, 11.0, -108, { range: 2 });
    // Sanctum dressing — twin golden nautiloids + grand colonnade
    L.deco(props.makeNautilus({ size: 2.4, turns: 1.8, color: '#f0e0b0', bandColor: '#b08a3a' }), -5, 13.2, -123, 1, 0.4);
    L.deco(props.makeNautilus({ size: 2.4, turns: 1.8, color: '#f0e0b0', bandColor: '#b08a3a' }), 5, 13.2, -123, 1, -0.4);
    for (let i = 0; i < 4; i++) {
      L.deco(props.makeRuinPillar({ height: 5.5 }), -5.5 + i * 3.7, 11.7, -125.5, 1.1);
    }
    L.deco(props.makeCoralTree({ seed: 299, branches: 5, depth: 4, color: '#ffd94d', tipColor: '#fff3c8', glow: 1.1 }), -5.5, 11.7, -119, 1.6);
    L.deco(props.makeCoralTree({ seed: 298, branches: 5, depth: 4, color: '#35d5ff', tipColor: '#d0fff8', glow: 1 }), 5.5, 11.7, -119, 1.6);
    L.deco(props.makeGoldenSpiralInlay({ size: 3.4, color: '#39ffd0' }), 0, 11.74, -121, 1);
    L.gem(0, 12.9, -121);
    L.goal(0, 13.4, -125);
  },

  update(level, dt, t) {
    // The Duplicated City: intact in A, ruined in B (visual echo)
    const tl = level.game.world.timeline;
    if (level._duoCity) {
      level._duoCity.intact.visible = tl === 'A';
      level._duoCity.ruined.visible = tl === 'B';
    }
  },
};
