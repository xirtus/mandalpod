// ============================================================================
// MANDELPOD — Gameplay QA Sub-Agent
// Scripted end-to-end verification of EVERY core mechanic in Level 1.
// Fails loudly with a checklist. Never trust code that wasn't played.
// ============================================================================
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto('http://localhost:5173/?level=level1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.game?.state === 'playing', { timeout: 15000 });
await page.waitForTimeout(600);

const results = [];
const test = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? '  — ' + detail : ''}`);
};
const S = async (fn, arg) => page.evaluate(fn, arg);
const pos = () => S(() => window.__game.player.position.toArray());
const teleport = (x, y, z) => S(([x, y, z]) => { const g = window.__game; g.player.position.set(x, y, z); g.player.velocity.set(0, 0, 0); }, [x, y, z]);
const key = async (k, ms = 60) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };

// ---------------------------------------------------------- 1. movement
{
  const [x0] = await pos();
  await page.keyboard.down('d');
  await page.waitForTimeout(700);
  await page.keyboard.up('d');
  const [x1] = await pos();
  test('A/D not reversed: D moves +X (camera-relative right)', x1 > x0 + 1, `x ${x0.toFixed(1)} → ${x1.toFixed(1)}`);
}
{
  const [, , z0] = await pos();
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  const [, , z1] = await pos();
  test('W moves down-level (-Z)', z1 < z0 - 1, `z ${z0.toFixed(1)} → ${z1.toFixed(1)}`);
}

// ---------------------------------------------------------- 2. jump feel
async function measureApex(holdMs) {
  await teleport(0, 1, 4);
  await page.waitForTimeout(300);
  await page.keyboard.down('Space');
  await page.waitForTimeout(holdMs);
  await page.keyboard.up('Space');
  let apex = 0;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(50);
    const [, y] = await pos();
    apex = Math.max(apex, y);
  }
  return apex;
}
{
  const apex = await measureApex(120);
  await page.waitForTimeout(700);   // headless frame hitch tolerance
  const [, yEnd, , grounded] = await S(() => [...window.__game.player.position.toArray(), window.__game.player.grounded]);
  test('Jump gains height', apex > 1.8, `apex ${apex.toFixed(2)}`);
  test('Lands back on ground', grounded && Math.abs(yEnd - 0.55) < 0.3, `y=${yEnd.toFixed(2)} grounded=${grounded}`);
}

// ---------------------------------------------------------- 3. variable jump
{
  const yFull = await measureApex(340);
  const yShort = await measureApex(60);
  test('Variable jump height (hold > tap)', yFull > yShort + 0.4, `full ${yFull.toFixed(2)} vs tap ${yShort.toFixed(2)}`);
}

// ---------------------------------------------------------- 4. spin breaks shells
{
  await teleport(0, 1.2, -36.5); // near shell corridor stack
  await page.waitForTimeout(300);
  const before = await S(() => window.__game.game.level.stats.shellsBroken);
  await teleport(0, 4.0, -36.8);
  await page.waitForTimeout(400);
  await key('j');
  await page.waitForTimeout(500);
  await key('j');
  await page.waitForTimeout(500);
  const after = await S(() => window.__game.game.level.stats.shellsBroken);
  test('Spin breaks Memory Shells', after > before, `${before} → ${after}`);
}

// ---------------------------------------------------------- 5. bounce sponge
{
  await teleport(0, 6, -57); // above first sponge
  await page.waitForTimeout(200);
  let bounced = false;
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(60);
    const vy = await S(() => window.__game.player.velocity.y);
    if (vy > 5) { bounced = true; break; }
  }
  test('Bounce Sponge launches player', bounced);
}

// ---------------------------------------------------------- 6. enemy hurt + spin kill
{
  await teleport(0, 0.6, -7);
  await page.waitForTimeout(1900);  // crab anticipates (0.8s) + charges across
  const hp = await S(() => window.__game.player.hp);
  test('Crab attack hurts player', hp < 2, `hp=${hp}`);
  // Spin + teleport onto crab atomically inside the spin window (single eval)
  const aliveBefore = await S(() => window.__game.game.level.enemies.filter((e) => e.alive).length);
  await S(async () => {
    const g = window.__game;
    const crab = g.game.level.enemies.find((e) => e.alive && (e.constructor.name === 'DriftJelly' || e.constructor.name === 'ChronoCrab'));
    if (!crab) return;
    g.player.hp = 2; g.player.dead = false; g.player.iframes = 0; g.player.state = 'idle';  // isolate from prior hurt test
    g.input.virtualPress('spin');
    await new Promise((r) => setTimeout(r, 50));
    g.player.position.copy(crab.group.position); g.player.position.y += 0.3;
    g.player.velocity.set(0, 0, 0);
    await new Promise((r) => setTimeout(r, 250));
  });
  const aliveAfter = await S(() => window.__game.game.level.enemies.filter((e) => e.alive).length);
  test('Spin defeats crab', aliveAfter < aliveBefore, `${aliveBefore} → ${aliveAfter}`);
}

// ---------------------------------------------------------- 7. checkpoint + death/respawn
{
  await teleport(0, 3.9, -50.5); // checkpoint 1
  await page.waitForTimeout(500);
  const cp = await S(() => window.__game.player.checkpointPosition?.toArray());
  test('Checkpoint registers', cp && Math.abs(cp[2] - -50.5) < 2, JSON.stringify(cp?.map((v) => +v.toFixed(1))));
  // Die in pit
  await teleport(0, -2, -60);
  await page.waitForTimeout(2500);
  const [rx, ry, rz] = await pos();
  const state = await S(() => window.__game.game.state);
  test('Pit death respawns at checkpoint', state === 'playing' && Math.abs(rz - -50.5) < 3 && ry > 3, `respawned at ${rz.toFixed(1)}, state=${state}`);
}

// ---------------------------------------------------------- 8. timeline swap
{
  const tl0 = await S(() => window.__game.world.timeline);
  await key('t');
  await page.waitForTimeout(300);
  const tl1 = await S(() => window.__game.world.timeline);
  test('Timeline swaps A↔B', tl0 === 'A' && tl1 === 'B', `${tl0}→${tl1}`);
  // Phase A platform should be ghost: check collision off
  const solid = await S(() => {
    const g = window.__game;
    const b = g.world.bodies.find((b) => b.flags & 8); // PHASE_A
    return g.world.isPhaseActive(b);
  });
  test('Phase platforms gate collision', solid === false);
  await key('t');
  await page.waitForTimeout(200);
}

// ---------------------------------------------------------- 9. chase
{
  await teleport(0, 3.5, -97.5);
  await page.waitForTimeout(700);
  const chaseActive = await S(() => window.__game.game.level.chase?.active);
  test('Leviathan chase triggers', !!chaseActive);
  const camMode = await S(() => window.__game.rig.mode);
  test('Camera switches to chase mode', camMode === 'chase', camMode);
  // Outrun: teleport to sanctuary
  await teleport(0, 3.5, -140);
  await page.waitForTimeout(600);
  const done = await S(() => window.__game.game.level.chase?.done);
  const camMode2 = await S(() => window.__game.rig.mode);
  test('Chase escape restores rail camera', !!done && camMode2 === 'rail', `done=${done} mode=${camMode2}`);
}

// ---------------------------------------------------------- 10. gem + goal + results
{
  await teleport(0, 4.2, -145.5);
  await page.waitForTimeout(800);
  const gemTaken = await S(() => window.__game.game._gemTaken);
  test('Chrono Gem collects', !!gemTaken);
  await teleport(0, 4.8, -149.5);
  await page.waitForTimeout(2000);
  const state = await S(() => window.__game.game.state);
  const hasResults = await S(() => !!document.querySelector('.mpd-results-grid'));
  test('Goal triggers results ceremony', state === 'results' && hasResults, `state=${state}`);
  const saved = await S(() => window.__game.save.data.levels['level1']?.gem === true);
  test('Progress persisted to save', !!saved);
}

// ---------------------------------------------------------- 11. boss door
{
  await S(() => { const btn = document.getElementById('mpd-continue'); btn?.click(); });
  await page.waitForTimeout(1500);
  const lvl = await S(() => window.__game.game.levelDef?.id);
  test('Boss 1 follows Level 1 completion', lvl === 'boss1', lvl ?? 'none');
}

// ---------------------------------------------------------- 12. pause
{
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const paused = await S(() => !!document.querySelector('#mpd-resume'));
  test('Pause menu opens', !!paused);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

// ---------------------------------------------------------- summary
const failed = results.filter((r) => !r.pass);
console.log(`\n═══ GAMEPLAY QA: ${results.length - failed.length}/${results.length} passed ═══`);
if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 5));
await page.screenshot({ path: 'shots/qa-final.png' });
await browser.close();
process.exit(failed.length ? 1 : 0);
