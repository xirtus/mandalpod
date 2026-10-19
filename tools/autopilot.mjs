// ============================================================================
// MANDELPOD — Level Design Critic: THE AUTOPILOT
// A bot that plays Level 1 for real: holds forward, probes the ground ahead,
// jumps gaps, spins threats, swaps timelines at phase gates, bounces, runs
// the chase. Reports exactly WHERE it gets stuck. The purest level-design
// signal: can the level be read and beaten?
// ============================================================================
import { chromium } from 'playwright';
const args = process.argv.slice(2);

const browser = await chromium.launch({ args: ['--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[PAGEERROR]', e.message));
await page.goto('http://localhost:5173/?level=level1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.game?.state === 'playing', { timeout: 15000 });
await page.waitForTimeout(500);
if (args.includes('--from-cp2')) {
  await page.evaluate(() => { const g = window.__game; g.player.position.set(0, 4.5, -73); g.player.velocity.set(0, 0, 0); g.player.checkpointPosition.set(0, 4.5, -73); });
  await page.waitForTimeout(300);
}

// Install the autopilot brain inside the page
await page.evaluate(() => {
  const g = window.__game;
  const ap = window.__autopilot = { log: [], stuckSince: null, lastPos: null, jumpCd: 0, spinCd: 0, swapCd: 0 };
  ap.probe = (x, y, z) => {
    // Is there solid ground within an AABB? (respecting active timeline)
    const bodies = g.world.queryAABB(x - 0.4, y - 1.6, z - 0.4, x + 0.4, y + 0.2, z + 0.4, []);
    return bodies.some((b) => !(b.flags & 4) && g.world.isPhaseActive(b));
  };
  ap.tick = () => {
    const p = g.player;
    if (g.game.state !== 'playing' || p.dead) { g.input.virtualAxis(null); return; }
    // During chase: run toward camera (+Z is DOWN-screen... chase yawAssist=0, so +Z input = 's')
    const inChase = g.game.level.chase?.active;
    // Waypoint steering: home toward the center of the next platform ahead
    let worldSteer = 0;   // DESIRED world-space X direction (+1 = +X world)
    let bestScore = Infinity;
    for (const b of g.world.bodies) {
      if (b.flags & 4 || !g.world.isPhaseActive(b) || (b.flags & 32) || b.userData?.breakable) continue;
      const a = b.aabb;
      const cx = (a.minX + a.maxX) / 2, cz = (a.minZ + a.maxZ) / 2, top = a.maxY;
      const dzAhead = p.position.z - cz;   // chase also runs toward -Z (toward camera)
      if (dzAhead < 1 || dzAhead > 26) continue;
      if (top > p.position.y + 2.6 || top < p.position.y - 6) continue;   // unreachable-high targets are later-game bait
      const score = dzAhead + Math.abs(cx - p.position.x) * 2.5;
      if (score < bestScore) { bestScore = score; worldSteer = Math.max(-1, Math.min(1, (cx - p.position.x) * 0.7)); }
    }
    // Dodge chase debris: steer away from warning rings nearby (but never
    // dodge off the platform: clamp to a safe lane envelope)
    if (inChase && g.game.level.chase) {
      for (const d of g.game.level.chase.debris) {
        if (d.landed) continue;
        const dz = p.position.z - d.targetZ;
        if (dz > -1 && dz < 6 && Math.abs(d.lane - p.position.x) < 1.3) worldSteer += (p.position.x > d.lane ? 1 : -1) * 0.8;
      }
      if (p.position.x > 2.2) worldSteer = Math.min(worldSteer, -0.6);   // steer toward -X (center)
      if (p.position.x < -2.2) worldSteer = Math.max(worldSteer, 0.6);   // steer toward +X (center)
      worldSteer = Math.max(-1, Math.min(1, worldSteer));
    }
    // Human touch: ease off forward while sailing through the air on a bounce
    const fwd = (!p.grounded && p.velocity.y > 7) ? 0 : (inChase ? 1 : -1);
    // Convert world-space intent to stick space (chase camera faces +Z: stick x inverts)
    g.input.virtualAxis(inChase ? -worldSteer : worldSteer, fwd);
    const now = performance.now() / 1000;
    ap.jumpCd -= 1 / 60; ap.spinCd -= 1 / 60; ap.swapCd -= 1 / 60;
    const ahead = inChase ? 1.4 : -1.4;
    // Ground probe ahead
    const groundAhead = ap.probe(p.position.x, p.position.y, p.position.z + ahead);
    const groundHere = ap.probe(p.position.x, p.position.y, p.position.z);
    // Jump if: gap ahead while grounded, or wall ahead (blocked), or airborne over void with double jump available
    // Don't jump if a bounce sponge waits below the gap — fall onto it instead
    const spongeAhead = g.game.level.breakables.some((b) => b.alive && b.def.bouncy && b.mesh.position.z < p.position.z - 1 && b.mesh.position.z > p.position.z - 7 && Math.abs(b.mesh.position.x - p.position.x) < 3);
    if (p.grounded && (!groundAhead && groundHere && !spongeAhead || p.state === 'run' && Math.hypot(p.velocity.x, p.velocity.z) < 1.2) && ap.jumpCd <= 0) {
      g.input.virtualHold('jump', 0.28);
      ap.jumpCd = 0.5;
      ap.log.push(`jump @ ${p.position.z.toFixed(1)} (${!groundAhead ? 'gap' : 'blocked'})`);
    }
    // Double jump if falling into void
    if (!p.grounded && p.velocity.y < -3 && !groundHere && g.save.data.abilities.doubleJump && p.jumpsLeft > 0 && ap.jumpCd <= 0) {
      g.input.virtualHold('jump', 0.22);
      ap.jumpCd = 0.5;
      ap.log.push(`double-jump save @ ${p.position.z.toFixed(1)}`);
    }
    // Spin at threats
    const threat = g.game.level.breakables.some((b) => b.alive && b.mesh.position.distanceTo(p.position) < 1.8)
      || g.game.level.enemies.some((e) => e.alive && e.group.position.distanceTo(p.position) < 2.6)
      || g.game.level.enemies.some((e) => e.alive && (e.state === 'anticipate' || e.state === 'charge') && e.group.position.distanceTo(p.position) < 3.4);
    if (threat && ap.spinCd <= 0) { g.input.virtualPress('spin'); ap.spinCd = 0.5; }
    // Timeline: swap when the NEXT phase platform within reach belongs to the
    // other timeline and there is no active-phase continuation within 7m
    if (ap.swapCd <= 0) {
      const inactiveNear = g.world.bodies.some((b) => {
        const isPhase = b.flags & 24;
        if (!isPhase || g.world.isPhaseActive(b)) return false;
        const a = b.aabb;
        const cz = (a.minZ + a.maxZ) / 2, cx = (a.minX + a.maxX) / 2;
        return (inChase ? cz - p.position.z : p.position.z - cz) > 0.5 && Math.abs(cz - p.position.z) < 7 && Math.abs(cx - p.position.x) < 4;
      });
      const activeContinuation = (() => {
        for (const b of g.world.bodies) {
          const isPhase = b.flags & 24;
          if (!isPhase || !g.world.isPhaseActive(b)) continue;
          const a = b.aabb;
          const cz = (a.minZ + a.maxZ) / 2, cx = (a.minX + a.maxX) / 2;
          if ((inChase ? cz - p.position.z : p.position.z - cz) > 0.5 && Math.abs(cz - p.position.z) < 7 && Math.abs(cx - p.position.x) < 4) return true;
        }
        return false;
      })();
      if (inactiveNear && !activeContinuation) { g.input.virtualPress('swap'); ap.swapCd = 1.2; ap.log.push(`swap @ ${p.position.z.toFixed(1)} → ${g.world.timeline}`); }
    }
    // Stuck detection
    if (ap.lastPos && ap.lastPos.distanceTo(p.position) < 0.15) {
      if (!ap.stuckSince) ap.stuckSince = now;
      else if (now - ap.stuckSince > 6) {
        ap.log.push(`STUCK @ ${p.position.x.toFixed(1)},${p.position.y.toFixed(1)},${p.position.z.toFixed(1)} state=${p.state}`);
        ap.stuckSince = null;
        // Unstick: try a jump + random wiggle
        g.input.virtualPress('jump');
        g.input.virtualAxis(Math.random() - 0.5, inChase ? 1 : -1);
      }
    } else ap.stuckSince = null;
    ap.lastPos = p.position.clone();
  };
  ap.interval = setInterval(ap.tick, 1000 / 60);
});

// Watch the run
let gem = false, goal = false, maxZ = 0;
const t0 = Date.now();
let deaths0 = 0;
while (Date.now() - t0 < 240000) {
  await page.waitForTimeout(2000);
  const s = await page.evaluate(() => ({
    z: window.__game.player.position.z,
    x: window.__game.player.position.x,
    y: window.__game.player.position.y,
    state: window.__game.game.state,
    gem: window.__game.game._gemTaken,
    deaths: window.__game.game.level?.stats.deaths ?? 0,
    chase: window.__game.game.level?.chase?.active,
    chaseDone: window.__game.game.level?.chase?.done,
    pearls: window.__game.player.pearls,
    shells: window.__game.game.level?.stats.shellsBroken,
  }));
  if (s.z < maxZ) { maxZ = s.z; console.log(`  ▸ z=${s.z.toFixed(0)} x=${s.x.toFixed(0)} y=${s.y.toFixed(1)} pearls=${s.pearls} shells=${s.shells} deaths=${s.deaths}${s.chase ? ' [CHASE]' : ''}${s.chaseDone ? ' [escaped]' : ''}`); }
  if (s.gem && !gem) { gem = true; console.log('  ◆ GEM COLLECTED'); }
  if (s.state === 'results') { goal = true; break; }
}
const log = await page.evaluate(() => window.__autopilot.log.slice(-30));
console.log('\nAutopilot tail-log:', log.join(' | '));
console.log(`\n═══ AUTOPILOT: ${goal ? '🏆 LEVEL COMPLETE' : 'did not finish (max z=' + maxZ.toFixed(0) + ')'} ═══`);
await page.screenshot({ path: 'shots/autopilot-end.png' });
await browser.close();
process.exit(goal ? 0 : 1);
