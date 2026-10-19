// ============================================================================
// MANDELPOD — Materials Atelier
// Shared PBR material factory with injected animated caustics, depth tint,
// wet sheen and psychedelic accent options. Every level surface gets the
// "outside normal spacetime" treatment while staying readable.
// ============================================================================
import * as THREE from 'three';

// Global animated uniforms shared by all caustic-lit materials
export const envUniforms = {
  uTime: { value: 0 },
  uCausticStrength: { value: 0.38 },
  uWaterLevel: { value: 60 },
  uDeepColor: { value: new THREE.Color('#061a3a') },
  uShallowColor: { value: new THREE.Color('#0b4d6e') },
  uPsychedelia: { value: 1.0 },     // accessibility dial
};

export function injectUnderwater(material, { caustics = 1.0, depthTint = true } = {}) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, envUniforms);
    shader.uniforms.uCausticLocal = { value: caustics };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWorldPos;
        uniform float uTime, uCausticStrength, uWaterLevel, uPsychedelia, uCausticLocal;
        uniform vec3 uDeepColor, uShallowColor;
        // Procedural caustics: sum of two interfering Voronoi-ish waves
        float caustic(vec2 p, float t) {
          vec2 i = floor(p); vec2 f = fract(p);
          float d = 1.0;
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            vec2 o = vec2(
              fract(sin(dot(i + g, vec2(127.1, 311.7))) * 43758.5453),
              fract(sin(dot(i + g, vec2(269.5, 183.3))) * 28001.8384));
            o = 0.5 + 0.5 * sin(t + 6.2831 * o);
            d = min(d, length(g + o - f));
          }
          return pow(max(1.0 - d, 0.0), 7.0);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${depthTint ? `
        // Depth absorption — reds die first, deep blue wins
        float depthT = clamp((uWaterLevel - vWorldPos.y) / 60.0, 0.0, 1.0);
        vec3 depthCol = mix(uShallowColor, uDeepColor, depthT);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (depthCol * 2.4), depthT * 0.32);` : ''}
        ${caustics > 0 ? `
        // Animated dual-scale caustics on upward faces
        vec3 wN = normalize(normal);
        float upness = clamp(wN.y, 0.0, 1.0);
        float c1 = caustic(vWorldPos.xz * 0.34, uTime * 1.1);
        float c2 = caustic(vWorldPos.xz * 0.13 + 7.3, uTime * 0.7);
        float ca = (c1 + c2 * 0.6) * upness * uCausticStrength * uCausticLocal;
        vec3 causticCol = mix(vec3(0.45, 0.95, 1.0), vec3(0.8, 0.6, 1.0), uPsychedelia * 0.5 * (0.5 + 0.5 * sin(uTime * 0.3)));
        totalEmissiveRadiance += causticCol * ca * 0.42;` : ''}`);
  };
  // Ensure recompilation uniqueness
  material.customProgramCacheKey = () => `uw${caustics}${depthTint}`;
  return material;
}

export const Mats = {
  rock: (color = '#3a4a7a') => injectUnderwater(new THREE.MeshStandardMaterial({ color, roughness: 0.93, metalness: 0.02, flatShading: false }), { caustics: 1.0 }),
  sand: (color = '#b59a64') => injectUnderwater(new THREE.MeshStandardMaterial({ color, roughness: 0.98 }), { caustics: 0.7 }),
  coral: (color = '#ff6b9d', emissive = '#ff2e88', intensity = 0.55) => injectUnderwater(new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive: emissive, emissiveIntensity: intensity }), { caustics: 0.6 }),
  pearl: () => new THREE.MeshPhysicalMaterial({ color: '#f5f0ff', roughness: 0.12, metalness: 0.1, iridescence: 1.0, iridescenceIOR: 1.8, clearcoat: 1, emissive: '#8f7fff', emissiveIntensity: 0.5 }),
  shell: (color = '#ffb37a') => injectUnderwater(new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 }), { caustics: 0.8 }),
  metal: (color = '#7a8fb0') => injectUnderwater(new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.85 }), { caustics: 0.7 }),
  crystal: (color = '#66ffe0') => new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, metalness: 0, transmission: 0.6, thickness: 1.2, ior: 1.4, emissive: color, emissiveIntensity: 0.7 }),
  glow: (color = '#39ffd0', intensity = 2.2) => new THREE.MeshStandardMaterial({ color: '#0a2a24', emissive: color, emissiveIntensity: intensity, roughness: 0.5 }),
  phaseA: (color = '#35d5ff') => injectUnderwater(new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.35, transparent: true, opacity: 0.92 }), { caustics: 0.8 }),
  phaseB: (color = '#ff9d2e') => injectUnderwater(new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.35, transparent: true, opacity: 0.92 }), { caustics: 0.8 }),
};
