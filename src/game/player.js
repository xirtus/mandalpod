// ============================================================================
// MANDELPOD — Player Movement & Feel Department
// Crash-grade tightness with octopus fluidity: acceleration curves, variable
// jump, coyote time, jump buffering, spin attack (air stall), body slam,
// enemy/crate bounce, unlockable double jump / dash / time bubble.
// ABSOLUTE RULE: gameplay feel outranks realism.
// ============================================================================
import * as THREE from 'three';
import { Octopus } from './octopus.js';
import { COL } from './physics.js';

const V = () => new THREE.Vector3();

export class Player {
  constructor({ world, input, save, events }) {
    this.world = world;
    this.input = input;
    this.save = save;
    this.events = events;   // game event bus (fx, audio, ui hooks)

    this.octopus = new Octopus();
    this.group = this.octopus.group;

    this.position = this.group.position;
    this.velocity = V();
    this.half = new THREE.Vector3(0.42, 0.55, 0.42);   // collision half-extents

    // Tunables — the soul of the game
    this.runSpeed = 8.2;
    this.accelGround = 62;
    this.accelAir = 34;
    this.friction = 46;
    this.gravityUp = -34;
    this.gravityDown = -52;          // heavier fall = snappier arc
    this.jumpVel = 13.2;
    this.doubleJumpVel = 11.5;
    this.maxFall = -22;
    this.coyoteTime = 0.12;
    this.spinDuration = 0.55;
    this.spinAirStall = 0.32;        // hang-time gift while spinning in air
    this.slamVel = -30;
    this.bounceVel = 14.5;
    this.dashSpeed = 20;
    this.dashTime = 0.22;
    this.dashCooldown = 0.6;

    // State
    this.state = 'idle';             // idle|run|air|spin|slam|hurt|dead|dash|bounce
    this.grounded = false;
    this.groundBody = null;
    this.coyote = 0;
    this.jumpsLeft = 1;
    this.spinT = 0;
    this.spinCooldown = 0;
    this.slamT = 0;
    this.dashT = 0;
    this.dashCd = 0;
    this.iframes = 0;
    this.hp = 2;
    this.dead = false;
    this.deadT = 0;
    this.facing = 0;                 // yaw
    this.moveDir = V();
    this.lastSafePosition = V();
    this.checkpointPosition = null;
    this.onGroundBody = null;
    this.pearls = 0;
    this.shells = 0;
    this.died = false;               // died this run (perfect pearl invalidation)
    this.frozen = false;             // cutscene control
    this.bubbleActive = 0;
    this._spinHit = new Set();       // entities hit this spin
    this._airTime = 0;
    this._wasGrounded = true;
    this._landImpact = 0;
  }

  get abilities() { return this.save.data.abilities; }

  spawn(pos) {
    this.active = true;
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.octopus.group.position.copy(pos);
    this.octopus.resetTentacles();
    this.hp = 2; this.dead = false; this.state = 'idle';
    this.checkpointPosition = pos.clone();
    this.lastSafePosition.copy(pos);
    this.jumpsLeft = 1;
    this.facing = Math.PI;               // face down-rail (away from camera)
    this.group.rotation.y = Math.PI;
  }

  respawnAtCheckpoint() {
    const p = this.checkpointPosition ?? this.lastSafePosition;
    this.position.copy(p).add(new THREE.Vector3(0, 0.1, 0));
    this.velocity.set(0, 0, 0);
    this.octopus.group.position.copy(this.position);
    this.octopus.resetTentacles();
    this.hp = 2; this.dead = false; this.deadT = 0;
    this.state = 'idle'; this.iframes = 1.5;
    this.group.visible = true;
    this.octopus.group.visible = true;
    this.events.emit('player-respawned', this);
  }

  // Central damage entry — returns true if damage landed
  hurt(source = 'enemy') {
    if (this.dead || this.iframes > 0 || this.frozen) return false;
    this.hp--;
    this.died = true; // for perfect-run purposes ANY hit breaks it? No — manual: break all shells without DYING. Track deaths only.
    this.died = false;
    this.events.emit('player-hurt', { source, hp: this.hp });
    if (this.hp <= 0) { this.kill(source); return true; }
    this.iframes = 1.6;
    this.state = 'hurt';
    // Knockback away from source direction
    this.velocity.y = 8;
    this.octopus.impulseSquash(-0.8);
    this.octopus.blush = 1;
    return true;
  }

  kill(source = 'hazard') {
    if (this.dead) return;
    this.dead = true;
    this.deadT = 0;
    this.state = 'dead';
    this.events.emit('player-died', { source });
    this.octopus.blush = 0;
  }

  bounce(vel = this.bounceVel, holdBoost = 1) {
    this.velocity.y = vel * holdBoost;
    this.grounded = false;
    this.coyote = 0;
    if (this.abilities.doubleJump) this.jumpsLeft = 1;
    this.octopus.impulseSquash(0.9);
    this.state = 'air';
    this.events.emit('player-bounced', this);
  }

  startSpin() {
    if (this.spinCooldown > 0 || this.spinT > 0 || this.state === 'slam' || this.state === 'dash') return;
    this.spinT = this.spinDuration;
    this.spinCooldown = 0.25;
    this._spinHit.clear();
    this.state = 'spin';
    this.octopus.spinT = 1;
    this.events.emit('player-spin', this);
  }

  startSlam() {
    if (this.grounded || this.state === 'slam') return;
    this.state = 'slam';
    this.slamT = 0;
    this.velocity.x *= 0.2; this.velocity.z *= 0.2;
    this.events.emit('player-slam-start', this);
  }

  startDash() {
    if (!this.abilities.chronoDash || this.dashCd > 0) return;
    this.state = 'dash';
    this.dashT = this.dashTime;
    this.dashCd = this.dashCooldown;
    const dir = this.moveDir.lengthSq() > 0.01 ? this.moveDir.clone().normalize() : new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
    this.velocity.x = dir.x * this.dashSpeed;
    this.velocity.z = dir.z * this.dashSpeed;
    this.velocity.y = 0;
    this.events.emit('player-dash', this);
  }

  activateBubble() {
    if (!this.abilities.timeBubble || this.bubbleActive > 0) return;
    this.bubbleActive = 5;
    this.events.emit('player-bubble', this);
  }

  get spinActive() { return this.spinT > 0.12; }   // generous active frames
  get slamming() { return this.state === 'slam'; }

  // Called by game when a spin/slam connects with a breakable/enemy
  onHitSomething(target) {
    if (this._spinHit.has(target.id)) return false;
    this._spinHit.add(target.id);
    return true;
  }

  fixedUpdate(dt, t) {
    if (!this.active) return;
    if (this.frozen) { this._integrate(dt, t, true); return; }
    if (this.dead) { this.deadT += dt; this._integrate(dt, t, true); return; }

    const inp = this.input;
    this.iframes = Math.max(0, this.iframes - dt);
    this.spinCooldown = Math.max(0, this.spinCooldown - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.bubbleActive = Math.max(0, this.bubbleActive - dt);

    // Camera-relative input -> world move dir.
    // forward = camera look direction; right = 90° clockwise from it.
    const camYaw = this.camYaw ?? 0;
    const ix = inp.axisX, iz = inp.axisZ;
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const rx = -Math.cos(camYaw), rz = Math.sin(camYaw);
    this.moveDir.set(rx * ix + fx * -iz, 0, rz * ix + fz * -iz);
    const wantMove = this.moveDir.lengthSq() > 0.001;
    if (wantMove) this.moveDir.normalize();

    // ---- State machine ----
    switch (this.state) {
      case 'dash': {
        this.dashT -= dt;
        this.velocity.y = 0;
        if (this.dashT <= 0) { this.state = this.grounded ? 'run' : 'air'; this.velocity.multiplyScalar(0.55); }
        break;
      }
      case 'slam': {
        this.slamT += dt;
        this.velocity.y = Math.max(this.velocity.y - 140 * dt, this.slamVel);
        if (this.grounded) {
          this.state = 'idle';
          this.octopus.impulseSquash(-1.0);
          this.events.emit('player-slam-land', { position: this.position.clone() });
          this.spinCooldown = 0.15;
        }
        break;
      }
      case 'hurt': {
        if (this.grounded && Math.abs(this.velocity.y) < 0.1) this.state = 'idle';
        this._steer(dt, wantMove, 0.35);
        break;
      }
      default: {
        this._steer(dt, wantMove, 1);
      }
    }

    // Spinning
    if (this.spinT > 0) {
      this.spinT -= dt;
      this.octopus.spinT = THREE.MathUtils.clamp(this.spinT / this.spinDuration * 2, 0, 1);
      // Spin air stall — gravity forgiven briefly (Crash glide feel)
      if (!this.grounded && this.velocity.y < 0 && this.spinT > this.spinDuration - this.spinAirStall) {
        this.velocity.y *= Math.pow(0.02, dt);
      }
      if (this.spinT <= 0) { this.octopus.spinT = 0; if (this.state === 'spin') this.state = this.grounded ? 'idle' : 'air'; }
    }

    // Jump input (buffered)
    if (inp.buffered('jump')) {
      const canGround = this.grounded || this.coyote > 0;
      const canDouble = !canGround && this.abilities.doubleJump && this.jumpsLeft > 0 && this.state !== 'slam';
      if (canGround && this.state !== 'slam') {
        inp.consumeBuffer('jump');
        this.velocity.y = this.jumpVel;
        this.grounded = false; this.coyote = 0;
        if (this.abilities.doubleJump) this.jumpsLeft = 1;
        this.octopus.impulseSquash(0.7);
        this.state = 'air';
        this.events.emit('player-jump', this);
      } else if (canDouble) {
        inp.consumeBuffer('jump');
        this.jumpsLeft--;
        this.velocity.y = this.doubleJumpVel;
        this.octopus.impulseSquash(0.6);
        this.events.emit('player-double-jump', this);
      }
    }
    // Variable jump height — release early, cut velocity
    if (inp.released('jump') && this.velocity.y > 4 && this.state !== 'slam') {
      this.velocity.y = 4 + (this.velocity.y - 4) * 0.35;
    }

    if (inp.pressed('spin')) this.startSpin();
    if (inp.pressed('slam')) this.startSlam();
    if (inp.pressed('dash')) this.startDash();
    if (inp.pressed('bubble')) this.activateBubble();

    this._integrate(dt, t);
  }

  _steer(dt, wantMove, control) {
    const accel = (this.grounded ? this.accelGround : this.accelAir) * control;
    if (wantMove) {
      const targetX = this.moveDir.x * this.runSpeed;
      const targetZ = this.moveDir.z * this.runSpeed;
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetX, accel / this.runSpeed, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetZ, accel / this.runSpeed, dt);
      this.facing = Math.atan2(this.velocity.x, this.velocity.z);
      if (this.grounded && this.state !== 'spin') this.state = 'run';
    } else if (this.grounded) {
      const f = Math.exp(-this.friction * dt / this.runSpeed * 4);
      this.velocity.x *= f; this.velocity.z *= f;
      if (Math.hypot(this.velocity.x, this.velocity.z) < 0.4 && this.state === 'run') this.state = 'idle';
    }
    if (!this.grounded && this.state !== 'spin' && this.state !== 'slam' && this.state !== 'hurt') this.state = 'air';
  }

  _integrate(dt, t, skipControl = false) {
    // Gravity with asymmetry
    if (this.state !== 'dash') {
      const g = this.velocity.y > 0 ? this.gravityUp : this.gravityDown;
      this.velocity.y = Math.max(this.velocity.y + g * dt, this.maxFall);
    }

    const res = this.world.moveCharacter(this.position, this.velocity, this.half, dt);
    this._wasGrounded = this.grounded;
    this.grounded = res.grounded;
    this.groundBody = res.groundBody;

    if (this.grounded) {
      this.coyote = this.coyoteTime;
      this._airTime = 0;
      if (this.state === 'air') this.state = 'idle';
      if (this.abilities.doubleJump) this.jumpsLeft = 1;
      this.lastSafePosition.copy(this.position);
      // Land impact
      if (!this._wasGrounded && this._landImpact < -8) {
        this.octopus.impulseSquash(THREE.MathUtils.clamp(this._landImpact / 14, -1, -0.3));
        this.events.emit('player-landed', { impact: this._landImpact, position: this.position.clone() });
      }
      // Moving platform carry
      if (res.groundBody?.isMovingPlatform) this.position.add(res.groundBody.delta);
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
      this._airTime += dt;
    }
    this._landImpact = this.velocity.y;

    // Hazards
    for (const b of res.hazards) {
      if (b.flags & COL.HAZARD) this.hurt(b.userData.type ?? 'hazard');
      b.userData.onTouch?.(this, b);
    }

    // Facing smoothing
    let targetYaw = this.facing;
    let d = targetYaw - this.group.rotation.y;
    d = ((d + Math.PI) % (Math.PI * 2)) - Math.PI;
    this.group.rotation.y += d * Math.min(1, dt * 14);

    // Octopus visual state
    const o = this.octopus;
    o.velocity.copy(this.velocity);
    o.grounded = this.grounded;
    o.slamT = this.slamming ? 1 : Math.max(0, o.slamT - dt * 6);
    o.blush = Math.max(0, o.blush - dt * 1.5);
    const groundY = this.grounded ? this.position.y - this.half.y : (res.groundBody ? this.position.y - this.half.y : undefined);
    o.lookDir.set(this.moveDir.x, THREE.MathUtils.clamp(this.velocity.y / 12, -1, 1), this.moveDir.z);
    o.update(dt, t, { groundY: this.position.y - this.half.y - 0.05, danger: this.iframes > 0 && !this.dead });
    o.group.position.copy(this.position);

    // i-frame flicker
    this.group.visible = this.dead ? this.group.visible : (this.iframes <= 0 || Math.floor(t * 18) % 2 === 0);
  }
}
