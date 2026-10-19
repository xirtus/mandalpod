// ============================================================================
// MANDELPOD — Chase Set-Piece: THE CAMBRIAN LEVIATHAN
// Reverse-camera pursuit. A colossal anomalocaris-like horror surges behind
// the player while debris rains ahead. Readability first: hazards telegraph
// with warning shadows. Catch = death. Escape at the sanctuary gate.
// ============================================================================
import * as THREE from 'three';

export class LeviathanChase {
  constructor(game, { startZ = -97, endZ = -140, speed = 8.6 }) {
    this.game = game;
    this.startZ = startZ;
    this.endZ = endZ;
    this.speed = speed;
    this.active = false;
    this.done = false;
    this.z = startZ + 14;         // leviathan position
    this.debris = [];
    this._debrisTimer = 0;

    // ---- The beast: undulating segmented horror with maw and feelers ----
    this.group = new THREE.Group();
    const hideMat = new THREE.MeshStandardMaterial({ color: '#3a2a5a', roughness: 0.5, emissive: '#6a1a8a', emissiveIntensity: 0.35 });
    this.segs = [];
    for (let i = 0; i < 7; i++) {
      const r = 2.6 - i * 0.28;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), hideMat);
      seg.scale.set(1, 0.75, 1.15);
      seg.castShadow = true;
      this.group.add(seg);
      this.segs.push(seg);
    }
    // Maw — circular lamprey rings of teeth
    const maw = new THREE.Group();
    for (let ring = 0; ring < 3; ring++) {
      const teeth = new THREE.Group();
      const n = 10 - ring * 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 5), new THREE.MeshStandardMaterial({ color: '#e8d8b0', roughness: 0.3 }));
        tooth.position.set(Math.cos(a) * (1.5 - ring * 0.45), Math.sin(a) * (1.5 - ring * 0.45), 0);
        tooth.rotation.z = a + Math.PI / 2;
        tooth.rotation.y = 0.5 + ring * 0.4;
        teeth.add(tooth);
      }
      teeth.position.z = -0.3 - ring * 0.5;
      maw.add(teeth);
    }
    maw.position.z = -2.6;
    this.group.add(maw);
    this.maw = maw;
    // Eyes — many, glowing, wrong
    for (let i = 0; i < 5; i++) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: '#1a0a2a', emissive: '#ff3a5c', emissiveIntensity: 2.5 }));
      eye.position.set((i - 2) * 0.8, 1.5 + Math.sin(i) * 0.4, -1.8 + Math.abs(i - 2) * 0.3);
      this.group.add(eye);
    }
    // Feeler whips
    this.feelers = [];
    const feelerMat = new THREE.MeshStandardMaterial({ color: '#5a3a7a', roughness: 0.5, emissive: '#8a2eff', emissiveIntensity: 0.5 });
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 3.4, 6), feelerMat);
      f.position.set((i < 2 ? -1 : 1) * 1.8, (i % 2 ? 0.6 : -0.4), -2.2);
      f.rotation.z = (i < 2 ? 1 : -1) * 0.8;
      this.group.add(f);
      this.feelers.push(f);
    }
    // Dread glow
    this.light = new THREE.PointLight('#8a2eff', 3, 24);
    this.group.add(this.light);
    this.group.position.set(0, 5.6, this.z);
    this.group.visible = false;
    game.engine.scene.add(this.group);

    // Debris warning rings
    this.warnMat = new THREE.MeshBasicMaterial({ color: '#ff3a5c', transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
  }

  begin() {
    if (this.active || this.done) return;
    this.active = true;
    this.group.visible = true;
    this.z = this.game.player.position.z + 22;
    this._grace = 2.5;
    this.game.rig.mode = 'chase';
    this.game.audio?.setMode('chase');
    this.game.audio?.play('bossRoar');
    this.game.rig.addShake(0.8);
    this.game.ui.hint('⚠ RUN. DO NOT LOOK BACK. ⚠', 3);
    this.game.events.emit('chase-began', this);
  }

  _spawnDebris() {
    // Telegraph-then-fall debris on the track ahead of the player
    const g = this.game;
    const pz = g.player.position.z;
    const lane = (Math.random() - 0.5) * 2.4;
    const targetZ = pz - 10 - Math.random() * 6;
    const warn = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.9, 20), this.warnMat);
    warn.rotation.x = -Math.PI / 2;
    warn.position.set(lane, 3.45, targetZ);
    g.engine.scene.add(warn);
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.3, 0), new THREE.MeshStandardMaterial({ color: '#5a4a6a', roughness: 0.9 }));
    rock.position.set(lane, 14, targetZ);
    rock.castShadow = true;
    rock.visible = false;
    g.engine.scene.add(rock);
    this.debris.push({ warn, rock, t: 0, fallAt: 0.7, vy: 0, landed: false, lane, targetZ });
  }

  update(dt, t) {
    const g = this.game;
    // Trigger zone
    if (!this.active && !this.done && g.player.position.z < this.startZ) this.begin();
    if (!this.active) return;

    // Pursuit pacing: relentless but escapable; gains when player dawdles,
    // but always capped so clean runs stay comfortably ahead
    const playerZ = g.player.position.z;
    const gap = this.z - playerZ;      // leviathan is BEHIND (+Z of player)
    this._grace = Math.max(0, (this._grace ?? 0) - dt);
    const desiredGap = 12;
    const pursuit = this._grace > 0
      ? Math.max(0, (gap - 16) * 2)
      : Math.min(this.speed + Math.max(0, gap - desiredGap) * 0.35, 10.5) - (playerZ < this.endZ + 10 ? 3 : 0);
    this.z -= pursuit * dt;
    this.group.position.z = this.z;
    this.group.position.x = THREE.MathUtils.damp(this.group.position.x, g.player.position.x * 0.5, 2, dt);
    this.group.position.y = 5.6 + Math.sin(t * 1.4) * 0.5;   // swims HIGH: looms over the shoulder, never blocks the player

    // Undulation
    let i = 0;
    for (const seg of this.segs) {
      seg.position.z = -i * 1.9;
      seg.position.y = Math.sin(t * 3.2 - i * 0.9) * 0.55;
      seg.position.x = Math.sin(t * 2.1 - i * 0.7) * 0.4;
      i++;
    }
    this.maw.rotation.z += dt * 2.4;
    for (const f of this.feelers) f.rotation.x = Math.sin(t * 4 + f.position.x) * 0.35;
    this.light.intensity = 2.4 + Math.sin(t * 7) * 0.8;

    // Screen dread shake scales with proximity
    if (gap < 12) g.rig.addShake(dt * (12 - gap) * 0.35);

    // Debris
    this._debrisTimer -= dt;
    if (this._debrisTimer <= 0 && playerZ > this.endZ + 6 && playerZ < -104) {
      this._spawnDebris();
      this._debrisTimer = 0.85 + Math.random() * 0.6;
    }
    for (const d of this.debris) {
      d.t += dt;
      if (d.t < d.fallAt) {
        d.warn.material.opacity = 0.25 + 0.35 * Math.sin(d.t * 20);
        d.warn.scale.setScalar(1 + Math.sin(d.t * 16) * 0.1);
      } else {
        d.rock.visible = true;
        d.warn.visible = false;
        d.vy -= 40 * dt;
        d.rock.position.y += d.vy * dt;
        d.rock.rotation.x += dt * 6; d.rock.rotation.z += dt * 4;
        if (!d.landed && d.rock.position.y <= 3.6) {
          d.landed = true;
          g.particles.slamImpact(d.rock.position);
          g.rig.addShake(0.25);
          g.audio?.play('slamLand');
          // Hit player?
          const pp = g.player.position;
          if (Math.abs(pp.x - d.lane) < 1 && Math.abs(pp.z - d.targetZ) < 1 && pp.y < 4.6) g.player.hurt('debris');
        }
      }
    }
    this.debris = this.debris.filter((d) => {
      if (d.rock.position.y < -4 || d.targetZ > playerZ + 12) {
        g.engine.scene.remove(d.warn, d.rock);
        return false;
      }
      return true;
    });

    // Caught
    if (gap < 2.4 && !g.player.dead) {
      g.player.kill('leviathan');
      g.engine.flash(0.6, '#8a2eff');
    }

    // Escaped
    if (playerZ < this.endZ) {
      this.active = false;
      this.done = true;
      g.rig.mode = 'rail';
      g.audio?.setMode('explore');
      g.ui.toast('YOU OUTSWAM EXTINCTION', 3);
      g.events.emit('chase-escaped', this);
      // The beast slams into the sanctuary gate behind you and roars away
      g.audio?.play('bossRoar');
      this._retreat = 0;
    }
    if (this.done && this.group.visible) {
      this._retreat = (this._retreat ?? 0) + dt;
      this.group.position.z += dt * 14;
      this.group.position.y -= dt * 2;
      if (this._retreat > 3) this.group.visible = false;
    }
  }

  dispose() {
    this.game.engine.scene.remove(this.group);
    for (const d of this.debris) this.game.engine.scene.remove(d.warn, d.rock);
  }
}
