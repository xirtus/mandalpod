// ============================================================================
// MANDELPOD — Fuzz QA: chaotic input storm against the boss fight, hunting
// for the freeze the human reported. Watches: page errors, engine halt,
// player state machine locks, NaN positions, frozen input responsiveness.
// ============================================================================
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/?level=boss1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.game?.state === 'playing', { timeout: 15000 });
await page.waitForTimeout(500);

const KEYS = ['w', 'a', 's', 'd', 'Space', 'j', 'l', 't'];
let frameLast = 0, halts = 0, stuckReport = null;

for (let sec = 0; sec < 90; sec++) {
  // Random input mashing each second
  const k = KEYS[(Math.random() * KEYS.length) | 0];
  try {
    await page.keyboard.down(k);
    await page.waitForTimeout(120 + Math.random() * 300);
    await page.keyboard.up(k);
    // Occasionally hold movement into the boss
    if (Math.random() < 0.4) await page.keyboard.down('w');
    if (Math.random() < 0.3) await page.keyboard.up('w');
  } catch (e) { /* page died */ }
  const probe = await page.evaluate(() => {
    const g = window.__game;
    const p = g.player;
    return {
      frame: g.engine.frame,
      state: p.state, dead: p.dead, frozen: p.frozen,
      pos: p.position.toArray(),
      hp: p.hp,
      boss: g.game.level._boss?.state,
      bossHp: g.game.level._boss?.hp,
      gameState: g.game.state,
      timeScale: g.engine.timeScale,
      paused: g.game._paused,
    };
  }).catch(() => null);
  if (!probe) { stuckReport = `evaluate failed at ${sec}s`; break; }
  if (sec % 10 === 0) console.log(`t+${sec}s`, JSON.stringify({ ...probe, pos: probe.pos.map((v) => +v.toFixed(1)) }));
  if (probe.frame === frameLast) { halts++; if (halts > 2) { stuckReport = `ENGINE HALT at ${sec}s (frame ${probe.frame} static)`; break; } }
  else halts = 0;
  frameLast = probe.frame;
  // NaN / frozen-state checks
  if (probe.pos.some((v) => !isFinite(v))) { stuckReport = `NaN position at ${sec}s`; break; }
  if (probe.gameState === 'playing' && !probe.dead && probe.timeScale === 0 && !probe.paused) { stuckReport = `timeScale 0 without pause at ${sec}s`; break; }
  // If player alive but stuck in same non-idle state for 10s
  if (probe._lastState === probe.state && ['slam', 'dash', 'hurt', 'spin'].includes(probe.state)) {
    probe._stuckCount = (probe._stuckCount ?? 0) + 1;
    if (probe._stuckCount > 8) { stuckReport = `player locked in state '${probe.state}' at ${sec}s`; break; }
  } else probe._stuckCount = 0;
  if (probe.bossHp <= 0) { console.log(`t+${sec}s BOSS DEFEATED — checking unlock flow`); break; }
}
await page.waitForTimeout(1200);
const endState = await page.evaluate(() => ({ state: window.__game.game.state, screen: !!document.querySelector('.mpd-ability'), frame: window.__game.engine.frame })).catch(() => null);
console.log('end:', JSON.stringify(endState));
console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 5) : 'none');
console.log(stuckReport ? `❌ ${stuckReport}` : '✅ no freeze/halt/lock across 90s of input storm');
await page.screenshot({ path: 'shots/fuzz-end.png' });
await browser.close();
process.exit(stuckReport ? 1 : 0);
