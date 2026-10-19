// ============================================================================
// MANDELPOD — Camera Department
// Crash-grade authored camera: spline-railed third-person follow with
// look-ahead, platform-aware framing, collision avoidance, speed FOV,
// screen shake, chase (reverse) mode, side-scroll mode, boss framing.
// The camera must HELP, never fight.
// ============================================================================
import * as THREE from 'three';

export class CameraRig {
  constructor(camera, save) {
    this.camera = camera;
    this.save = save;
    this.mode = 'rail';            // rail | follow | chase | side | boss | orbit
    this.rail = null;              // THREE.CatmullRomCurve3
    this.railOffset = new THREE.Vector3(0, 2.7, 5.6);
    this.lookOffset = new THREE.Vector3(0, 1.1, -4.2);
    this.pos = new THREE.Vector3(0, 4, 8);
    this.look = new THREE.Vector3();
    this.shake = 0;
    this.shakeVec = new THREE.Vector3();
    this.baseFov = save.data.options.fov;
    this.fovBoost = 0;
    this._railT = 0;
    this._smoothPos = new THREE.Vector3(0, 4, 8);
    this._smoothLook = new THREE.Vector3();
    this._init = false;
    this.bossTarget = null;
    this.yawAssist = 0;
    this._collisionSpheres = [];   // {center, radius} camera blockers
    this.sensitivity = save.data.options.camSensitivity;
    this._freeYaw = 0; this._freePitch = 0;
    this._tmp = new THREE.Vector3();
    this._tmp2 = new THREE.Vector3();
  }

  setRail(points, { offset, look } = {}) {
    this.rail = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
    if (offset) this.railOffset.copy(offset);
    if (look) this.lookOffset.copy(look);
    this._defOffset = this.railOffset.clone();
    this._defLook = this.lookOffset.clone();
  }

  setZones(zones = []) { this.zones = zones; }   // {zMax, zMin, offset, look}

  addShake(amount) {
    if (this.save.data.options.reduceShake) amount *= 0.25;
    this.shake = Math.min(this.shake + amount, 1.2);
  }

  snapTo(target, lookTarget) {
    this._smoothPos.copy(target);
    this._smoothLook.copy(lookTarget);
    this._init = true;
  }

  // Project player onto rail to find param t
  _railParam(playerPos) {
    if (!this.rail) return 0;
    // Local search around previous t (player moves mostly forward)
    let bestT = this._railT, bestD = Infinity;
    const N = 80;
    const start = Math.max(0, this._railT - 0.22), end = Math.min(1, this._railT + 0.12);
    for (let i = 0; i <= N; i++) {
      const t = start + (end - start) * (i / N);
      const p = this.rail.getPointAt(Math.min(t, 1));
      const d = p.distanceToSquared(playerPos);
      if (d < bestD) { bestD = d; bestT = t; }
    }
    // Player far off-rail (secrets, ledges)? FULL rescan so we never freeze
    if (bestD > 64) {
      for (let i = 0; i <= 200; i++) {
        const t = i / 200;
        const p = this.rail.getPointAt(t);
        const d = p.distanceToSquared(playerPos);
        if (d < bestD) { bestD = d; bestT = t; }
      }
    }
    this._offRail = Math.sqrt(bestD);
    return Math.min(bestT, 1);
  }

  update(dt, player, extras = {}) {
    if (this.mode === 'hero') return;   // frozen debug framing (shot harness)
    const opts = this.save.data.options;
    this.baseFov = opts.fov;
    const p = player.position;
    // Track last solid footing: the camera NEVER dives into the abyss with
    // the player (Crash rule: fall out of frame, camera holds the ledge)
    if (player.grounded) this._lastGroundY = p.y;
    const floorY = (this._lastGroundY ?? p.y) + 1.6;

    let desiredPos = this._tmp, desiredLook = this._tmp2;
    let posDamp = 6, lookDamp = 10;

    switch (this.mode) {
      case 'rail': {
        // Camera zones: authored framing overrides (e.g. overhead for the canyon)
        let zOff = this._defOffset, zLook = this._defLook;
        for (const z of this.zones ?? []) {
          if (p.z <= z.zMax && p.z >= z.zMin) { zOff = z.offset; zLook = z.look; break; }
        }
        if (zOff) {
          this.railOffset.lerp(zOff, Math.min(1, dt * 2.2));
          this.lookOffset.lerp(zLook, Math.min(1, dt * 2.2));
        }
        this._railT = this._railParam(p);
        const railP = this.rail ? this.rail.getPointAt(this._railT) : p;
        // Camera sits at rail point + offset rotated by rail tangent yaw
        const tan = this.rail ? this.rail.getTangentAt(this._railT) : new THREE.Vector3(0, 0, -1);
        const yaw = Math.atan2(tan.x, tan.z);
        this.yawAssist = yaw;
        const off = this.railOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw + Math.PI);
        desiredPos.copy(railP).add(off);
        // Off-rail excursions (secrets): blend toward a plain follow cam so the
        // player never leaves the frame
        const offRailT = THREE.MathUtils.clamp(((this._offRail ?? 0) - 5.5) / 5, 0, 1);
        if (offRailT > 0) {
          const follow = new THREE.Vector3(p.x, p.y + 3.2, p.z + 6.4);
          desiredPos.lerp(follow, offRailT);
        }
        // Keep the player framed on the course, but hold the ledge on falls
        desiredPos.y = Math.max(desiredPos.y, Math.min(p.y + 1.4, floorY + 1.2));
        if (p.y < floorY - 4) desiredPos.y = Math.max(desiredPos.y, floorY + 1.2);
        const lookOff = this.lookOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw + Math.PI);
        desiredLook.copy(p).add(lookOff);
        desiredLook.addScaledVector(player.velocity, 0.12);
        posDamp = 5.5; lookDamp = 8;
        break;
      }
      case 'chase': {
        // Reverse camera: player runs TOWARD viewer. Framed DOWNWARD so the
        // pursuer looms over the player's shoulder without occluding them.
        desiredPos.set(p.x * 0.5, Math.max(p.y + 4.6, floorY + 3), p.z - 7.4);
        desiredLook.set(p.x, p.y + 0.7, p.z + 7);
        posDamp = 8; lookDamp = 11;
        this.yawAssist = 0;   // camera faces +Z: player runs toward viewer
        break;
      }
      case 'side': {
        desiredPos.set(p.x + 0.5, p.y + 2.6, p.z + 11);
        desiredLook.set(p.x + 0.5, p.y + 1.4, p.z);
        posDamp = 6; lookDamp = 9;
        break;
      }
      case 'boss': {
        const bp = this.bossTarget ?? p;
        const mid = p.clone().lerp(bp, 0.32);
        const away = p.clone().sub(bp).setY(0).normalize();
        desiredPos.copy(mid).addScaledVector(away, 8.5).add(new THREE.Vector3(0, 4.2, 0));
        desiredLook.copy(mid).add(new THREE.Vector3(0, 1.2, 0));
        posDamp = 3.5; lookDamp = 5;
        break;
      }
      case 'orbit': { // hub / free explore
        this._freeYaw -= (extras.orbitDX ?? 0) * 0.003 * this.sensitivity;
        this._freePitch = THREE.MathUtils.clamp((this._freePitch ?? 0.16) + (extras.orbitDY ?? 0) * 0.003 * this.sensitivity, -0.2, 1.1);
        const r = 6.2;
        desiredPos.set(
          p.x + Math.sin(this._freeYaw) * Math.cos(this._freePitch) * r,
          p.y + 1.5 + Math.sin(this._freePitch) * r,
          p.z + Math.cos(this._freeYaw) * Math.cos(this._freePitch) * r
        );
        desiredLook.set(p.x, p.y + 1.2, p.z);
        this.yawAssist = this._freeYaw + Math.PI;
        posDamp = 8; lookDamp = 12;
        break;
      }
      case 'attract': {
        const a = performance.now() / 1000 * 0.07;
        desiredPos.set(Math.sin(a) * 13, 5.5 + Math.sin(a * 0.6) * 1.5, Math.cos(a) * 13 - 4);
        desiredLook.set(0, 1.6, -6);
        posDamp = 1.2; lookDamp = 1.6;
        break;
      }
      default: { // follow
        desiredPos.set(p.x, p.y + 4.4, p.z + 8);
        desiredLook.set(p.x, p.y + 1.4, p.z - 4);
      }
    }

    // Frame-rate independent smoothing
    if (!this._init) { this.snapTo(desiredPos, desiredLook); }
    const kp = 1 - Math.exp(-posDamp * dt);
    const kl = 1 - Math.exp(-lookDamp * dt);
    this._smoothPos.lerp(desiredPos, kp);
    this._smoothLook.lerp(desiredLook, kl);

    // Camera collision: pull in if a blocker sphere intersects the boom
    // (levels register big blockers; keeps cam out of walls)
    let camPos = this._smoothPos.clone();
    for (const s of this._collisionSpheres) {
      const toCam = camPos.clone().sub(s.center);
      const d = toCam.length();
      if (d < s.radius) camPos.copy(s.center).addScaledVector(toCam.normalize(), s.radius);
    }

    // Shake
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const sh = this.shake * this.shake;
    this.shakeVec.set(
      (Math.sin(performance.now() * 0.051) + Math.sin(performance.now() * 0.113)) * 0.5,
      (Math.sin(performance.now() * 0.047 + 2) + Math.sin(performance.now() * 0.097)) * 0.5,
      0
    ).multiplyScalar(sh * 0.35);

    this.camera.position.copy(camPos).add(this.shakeVec);
    this.camera.lookAt(this._smoothLook.clone().add(this.shakeVec.clone().multiplyScalar(0.6)));

    // Speed-reactive FOV
    const speed = player.velocity.length();
    const targetBoost = THREE.MathUtils.clamp((speed - 9) * 0.55, 0, 7) + (player.state === 'dash' ? 6 : 0);
    this.fovBoost = THREE.MathUtils.lerp(this.fovBoost, targetBoost, dt * 4);
    const fov = this.baseFov + this.fovBoost;
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  }
}
