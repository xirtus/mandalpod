// ============================================================================
// MANDELPOD — THE CHRONO-REEF (Hub)
// A serene cosmic reef at the crossroads of all timelines. Portals awaken
// as relics are recovered. Free-orbit camera, gentle wonder pacing.
// ============================================================================
import * as THREE from 'three';
import { Mats } from '../world/materials.js';

export const hub = {
  id: 'hub',
  name: 'THE CHRONO-REEF',
  sub: 'Heart of the Ocean of SpaceTime',
  seed: 777,
  killY: -8,
  spawn: [0, 1.2, 8],
  hasTimeline: false,
  relicTimes: { sapphire: 999, gold: 999, platinum: 999 },
  rail: null,

  build(level, L) {
    const { props, rng } = L;
    // Grand central disc + radial garden rings
    L.ground(0, -0.5, 0, 22, 1, 22, { color: '#8a7a9a', accent: '#c05fff' });
    L.ground(0, -0.7, -16, 14, 1, 10, { color: '#5a5a8a' });
    // The World-Nautilus monument — spiral heart of the Chrono-Reef
    const monument = props.makeNautilus({ size: 4.2, turns: 1.9, color: '#f0e8ff', bandColor: '#8a6ac9' });
    L.deco(monument, 0, 2.2, -17, 1, 0);
    L.deco(props.makeGoldenSpiralInlay({ size: 3.5, color: '#c05fff' }), 0, 0.03, 0, 1);
    level._monument = monument;
    // Portal pedestals (level gates)
    level._portals = [];
    const portalDefs = [
      { x: -7, z: -10, hue: '#ff5f9d', label: 'level1', name: 'CAMBRIAN KALEIDOSCOPE' },
      { x: 7, z: -10, hue: '#35d5ff', label: 'level2', name: 'ATLANTIS AT THE END OF TIME' },
    ];
    for (const pd of portalDefs) {
      L.deco(props.makeRuinPillar({ height: 3 }), pd.x - 1.4, 0, pd.z, 1);
      L.deco(props.makeRuinPillar({ height: 3 }), pd.x + 1.4, 0, pd.z, 1);
      const mat = new THREE.ShaderMaterial({
        transparent: true, side: THREE.DoubleSide, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uHue: { value: new THREE.Color(pd.hue) } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv*2.0-1.0; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          uniform float uTime; uniform vec3 uHue; varying vec2 vUv;
          void main(){
            float r = length(vUv);
            float a = atan(vUv.y, vUv.x);
            float swirl = sin(a*3.0 - r*7.0 + uTime*2.2);
            vec3 col = uHue * (0.7 + 0.5*swirl) + vec3(0.2,0.1,0.3);
            col += vec3(0.9)*smoothstep(0.3,0.0,r)*0.6;
            gl_FragColor = vec4(col*1.3, smoothstep(1.0,0.75,r)*(0.8+0.2*swirl));
          }`,
      });
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), mat);
      disc.position.set(pd.x, 1.6, pd.z);
      level.group.add(disc);
      level._portals.push({ disc, mat, def: pd });
    }
    // Lush dressing — the reef at peace
    L.deco(props.makeCoralTree({ seed: 301, branches: 5, depth: 4, color: '#ff5f9d', glow: 1.1 }), -8, 0, 2, 2.0);
    L.deco(props.makeCoralTree({ seed: 302, branches: 5, depth: 4, color: '#35d5ff', glow: 1 }), 8, 0, 2, 2.0);
    L.deco(props.makeCoralTree({ seed: 303, branches: 4, depth: 3, color: '#ffd94d', glow: 0.7 }), 0, 0, -18, 1.4);
    L.deco(props.makeKelpForest({ count: 20, area: 14, height: [4, 8] }), -12, 0, -6, 1);
    L.deco(props.makeKelpForest({ count: 20, area: 14, height: [4, 8] }), 12, 0, -6, 1);
    L.deco(props.makeAnemone({ color: '#c05fff', tentacles: 34, radius: 0.8 }), -4, 0, 5, 1.6);
    L.deco(props.makeAnemone({ color: '#4fd8ff', tentacles: 30, radius: 0.7 }), 4.5, 0, 4, 1.5);
    L.deco(props.makeGlowShrooms({ count: 10 }), -6, 0, -3, 1.4);
    L.deco(props.makeGlowShrooms({ count: 10, color: '#ff6bd8' }), 6.5, 0, -4, 1.4);
    L.deco(props.makeFossilTrilobite({ size: 1.4 }), 3, 0.15, 0, 1, -0.4);
    for (let i = 0; i < 6; i++) {
      L.deco(props.makeRock({ size: 1 + rng() * 1.4, color: '#6a7a9a', seed: 400 + i, flat: true }), (rng() - 0.5) * 18, -0.1, (rng() - 0.5) * 18, 1, rng() * 3);
    }
    L.pearlTrail(new THREE.Vector3(-5, 1, 2), new THREE.Vector3(-7, 1.6, -8), 5);
    L.pearlTrail(new THREE.Vector3(5, 1, 2), new THREE.Vector3(7, 1.6, -8), 5);
  },

  update(level, dt, t) {
    // Orbit camera for the hub
    const g = level.game;
    g.rig.mode = 'orbit';
    for (const p of level._portals ?? []) {
      p.mat.uniforms.uTime.value = t * (g.save.isLevelUnlocked(p.def.label) ? 1 : 0.25);
      // Portal activation: walk in
      const unlocked = g.save.isLevelUnlocked(p.def.label);
      p.disc.visible = true;
      p.disc.scale.setScalar(unlocked ? 1 : 0.55);
      p.mat.uniforms.uHue.value.set(unlocked ? p.def.hue : '#3a4a6a');
      if (unlocked && g.player.position.distanceTo(p.disc.position) < 1.4) {
        g.startLevel(p.def.label);
      }
    }
    if (level._monument) level._monument.rotation.z = Math.sin(t * 0.3) * 0.06;
  },
};
