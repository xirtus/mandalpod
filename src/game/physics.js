// ============================================================================
// MANDELPOD — Physics Department
// Fixed-step kinematic character physics vs an AABB/box world. Substepped
// swept resolution, moving platforms with velocity carry, one-way platforms,
// phase (timeline-gated) colliders, kill volumes, trigger volumes.
// ============================================================================
import * as THREE from 'three';

export const COL = { SOLID: 1, ONEWAY: 2, TRIGGER: 4, PHASE_A: 8, PHASE_B: 16, HAZARD: 32, BOUNCE: 64 };

let _id = 0;

export class Body {
  constructor(opts = {}) {
    this.id = _id++;
    this.min = new THREE.Vector3().copy(opts.min ?? new THREE.Vector3(-1, -1, -1));
    this.max = new THREE.Vector3().copy(opts.max ?? new THREE.Vector3(1, 1, 1));
    this.position = new THREE.Vector3().copy(opts.position ?? new THREE.Vector3()); // center reference
    this.velocity = new THREE.Vector3();
    this.flags = opts.flags ?? COL.SOLID;
    this.phase = opts.phase ?? null;      // 'A' | 'B' | null — timeline gating
    this.enabled = true;
    this.visible = opts.visible !== false;
    this.userData = opts.userData ?? {};
    this.mesh = opts.mesh ?? null;
    this.isMovingPlatform = !!opts.mover;
    this.mover = opts.mover ?? null;      // fn(t, body) sets position
    this.delta = new THREE.Vector3();     // per-step movement (for carrying)
    this._prevPos = this.position.clone();
  }
  // World-space AABB
  get aabb() {
    return { minX: this.position.x + this.min.x, minY: this.position.y + this.min.y, minZ: this.position.z + this.min.z,
             maxX: this.position.x + this.max.x, maxY: this.position.y + this.max.y, maxZ: this.position.z + this.max.z };
  }
  containsPoint(p) {
    const a = this.aabb;
    return p.x >= a.minX && p.x <= a.maxX && p.y >= a.minY && p.y <= a.maxY && p.z >= a.minZ && p.z <= a.maxZ;
  }
  updateMover(t, dt) {
    this._prevPos.copy(this.position);
    if (this.mover) this.mover(t, this);
    this.delta.subVectors(this.position, this._prevPos);
    if (this.mesh) this.mesh.position.copy(this.position);
  }
}

export class PhysicsWorld {
  constructor() {
    this.bodies = [];
    this.gravity = -30;
    this.timeline = 'A';     // 'A' | 'B'
    // Spatial hash for broadphase
    this.cell = 4;
    this.grid = new Map();
  }

  add(body) { this.bodies.push(body); return body; }
  remove(body) { const i = this.bodies.indexOf(body); if (i >= 0) this.bodies.splice(i, 1); }
  clear() { this.bodies.length = 0; }

  _hash(x, z) { return ((x * 73856093) ^ (z * 19349663)) | 0; }

  rebuildBroadphase() {
    this.grid.clear();
    for (const b of this.bodies) {
      if (!b.enabled) continue;
      const a = b.aabb;
      const x0 = Math.floor(a.minX / this.cell), x1 = Math.floor(a.maxX / this.cell);
      const z0 = Math.floor(a.minZ / this.cell), z1 = Math.floor(a.maxZ / this.cell);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
        const h = this._hash(x, z);
        let arr = this.grid.get(h);
        if (!arr) { arr = []; this.grid.set(h, arr); }
        arr.push(b);
      }
    }
  }

  queryAABB(minX, minY, minZ, maxX, maxY, maxZ, out = []) {
    out.length = 0;
    const x0 = Math.floor(minX / this.cell), x1 = Math.floor(maxX / this.cell);
    const z0 = Math.floor(minZ / this.cell), z1 = Math.floor(maxZ / this.cell);
    const seen = new Set();
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const arr = this.grid.get(this._hash(x, z));
      if (!arr) continue;
      for (const b of arr) {
        if (seen.has(b.id)) continue;
        seen.add(b.id);
        const a = b.aabb;
        if (maxX < a.minX || minX > a.maxX || maxY < a.minY || minY > a.maxY || maxZ < a.minZ || minZ > a.maxZ) continue;
        out.push(b);
      }
    }
    return out;
  }

  isPhaseActive(body) {
    if (body.flags & COL.PHASE_A) return this.timeline === 'A';
    if (body.flags & COL.PHASE_B) return this.timeline === 'B';
    return true;
  }

  // Move a capsule-ish player AABB with substeps; returns contact info.
  moveCharacter(pos, vel, half, dt, opts = {}) {
    const result = { grounded: false, groundBody: null, hitHead: false, hitWall: false, wallNormal: new THREE.Vector3(), hazards: [], groundVelocity: new THREE.Vector3() };
    const steps = Math.max(1, Math.ceil((vel.length() * dt) / (Math.min(half.x, half.y, half.z) * 0.5)));
    const sdt = dt / steps;

    for (let s = 0; s < steps; s++) {
      // Y axis
      pos.y += vel.y * sdt;
      const nearby = this._queryAround(pos, half);
      result.grounded = false;
      for (const b of nearby) {
        if (!b.enabled || (b.flags & COL.TRIGGER)) continue;
        const phaseSolid = this.isPhaseActive(b);
        if (!phaseSolid) continue;
        const a = b.aabb;
        const minX = pos.x - half.x, maxX = pos.x + half.x;
        const minY = pos.y - half.y, maxY = pos.y + half.y;
        const minZ = pos.z - half.z, maxZ = pos.z + half.z;
        if (maxX <= a.minX || minX >= a.maxX || maxY <= a.minY || minY >= a.maxY || maxZ <= a.minZ || minZ >= a.maxZ) continue;

        if (b.flags & COL.ONEWAY) {
          // Only collide when falling onto the top
          const prevBottom = pos.y - vel.y * sdt - half.y;
          if (vel.y <= 0.01 && prevBottom >= a.maxY - 0.08) {
            pos.y = a.maxY + half.y;
            result.grounded = true; result.groundBody = b;
            result.groundVelocity.copy(b.delta).divideScalar(Math.max(sdt, 1e-5));
            vel.y = 0;
          }
          continue;
        }

        const overlapTop = a.maxY - minY;
        const overlapBottom = maxY - a.minY;
        if (vel.y <= 0 && overlapTop < overlapBottom && overlapTop < 1.2) {
          pos.y = a.maxY + half.y;
          result.grounded = true; result.groundBody = b;
          result.groundVelocity.copy(b.delta).divideScalar(Math.max(sdt, 1e-5));
          if (vel.y < 0) vel.y = 0;
        } else if (vel.y > 0 && overlapBottom <= overlapTop) {
          pos.y = a.minY - half.y - 0.001;
          result.hitHead = true;
          vel.y = Math.min(vel.y, 0);
        } else if (overlapTop < overlapBottom) {
          pos.y = a.maxY + half.y;
          result.grounded = true; result.groundBody = b;
          if (vel.y < 0) vel.y = 0;
        } else {
          pos.y = a.minY - half.y - 0.001;
          if (vel.y > 0) { result.hitHead = true; vel.y = 0; }
        }
      }

      // X axis
      pos.x += vel.x * sdt;
      this._resolveAxis(pos, vel, half, 'x', result);
      // Z axis
      pos.z += vel.z * sdt;
      this._resolveAxis(pos, vel, half, 'z', result);
    }

    // Hazards & triggers (checked once per frame, not per substep)
    const around = this._queryAround(pos, half, true);
    for (const b of around) {
      if (!b.enabled) continue;
      if (!(b.flags & (COL.HAZARD | COL.TRIGGER))) continue;
      if (b.flags & (COL.PHASE_A | COL.PHASE_B)) { if (!this.isPhaseActive(b)) continue; }
      const a = b.aabb;
      if (pos.x + half.x <= a.minX || pos.x - half.x >= a.maxX || pos.y + half.y <= a.minY || pos.y - half.y >= a.maxY || pos.z + half.z <= a.minZ || pos.z - half.z >= a.maxZ) continue;
      result.hazards.push(b);
    }
    return result;
  }

  _resolveAxis(pos, vel, half, axis, result) {
    const nearby = this._queryAround(pos, half);
    for (const b of nearby) {
      if (!b.enabled || (b.flags & COL.TRIGGER) || (b.flags & COL.ONEWAY)) continue;
      if (!this.isPhaseActive(b)) continue;
      const a = b.aabb;
      const minX = pos.x - half.x, maxX = pos.x + half.x;
      const minY = pos.y - half.y, maxY = pos.y + half.y;
      const minZ = pos.z - half.z, maxZ = pos.z + half.z;
      if (maxX <= a.minX || minX >= a.maxX || maxY <= a.minY || minY >= a.maxY || maxZ <= a.minZ || minZ >= a.maxZ) continue;
      // Skip if standing exactly on top
      if (Math.abs(minY - a.maxY) < 0.02 && result.grounded) continue;

      // Ledge assist: a wall whose top is within 0.38m of the feet is a STEP,
      // not a wall — pop up onto it (Crash-grade forgiveness)
      const feetY = pos.y - half.y;
      if (a.maxY - feetY <= 0.38 && vel.y <= 0.5 && a.maxY > feetY - 0.1) {
        pos.y = a.maxY + half.y;
        if (vel.y < 0) vel.y = 0;
        result.grounded = true; result.groundBody = b;
        continue;
      }
      if (axis === 'x') {
        const pushLeft = a.minX - half.x, pushRight = a.maxX + half.x;
        if (Math.abs(pos.x - pushLeft) < Math.abs(pos.x - pushRight)) { pos.x = pushLeft; result.wallNormal.set(-1, 0, 0); }
        else { pos.x = pushRight; result.wallNormal.set(1, 0, 0); }
        result.hitWall = true; vel.x = 0;
      } else {
        const pushNear = a.minZ - half.z, pushFar = a.maxZ + half.z;
        if (Math.abs(pos.z - pushNear) < Math.abs(pos.z - pushFar)) { pos.z = pushNear; result.wallNormal.set(0, 0, -1); }
        else { pos.z = pushFar; result.wallNormal.set(0, 0, 1); }
        result.hitWall = true; vel.z = 0;
      }
    }
  }

  _queryAround(pos, half, includeTriggers = false) {
    this._scratch = this._scratch || [];
    return this.queryAABB(pos.x - half.x - 0.5, pos.y - half.y - 0.5, pos.z - half.z - 0.5,
                          pos.x + half.x + 0.5, pos.y + half.y + 0.5, pos.z + half.z + 0.5, this._scratch);
  }
}
