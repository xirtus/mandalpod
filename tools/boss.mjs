// ============================================================================
// MANDELPOD — Boss QA Sub-Agent: Trilobite King full-fight verification
// ============================================================================
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[PAGEERROR]', e.message));
await page.goto('http://localhost:5173/?level=boss1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.game?.state === 'playing', { timeout: 15000 });
await page.waitForTimeout(500);
const S = (fn, arg) => page.evaluate(fn, arg);
const results = [];
const test = (n, p, d = '') => { results.push(p); console.log(`${p ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`); };

// Intro completes
await page.waitForTimeout(2600);
const st1 = await S(() => window.__game.game.level._boss.state);
test('Boss intro → stalk', st1 !== 'intro', st1);

// Boss bar visible
test('Boss bar shows', await S(() => document.getElementById('mpd-boss').classList.contains('show')));

// Force a flip cycle: wait for charge, then verify flipped + belly visible
let sawCharge = false, sawFlipped = false;
for (let i = 0; i < 120; i++) {
  await page.waitForTimeout(200);
  const s = await S(() => window.__game.game.level._boss.state);
  if (s === 'charge') sawCharge = true;
  if (s === 'flipped') { sawFlipped = true; break; }
}
test('Charge attack occurs', sawCharge);
test('Wipeout flips (weak point window)', sawFlipped);
test('Belly weakpoint exposed', await S(() => window.__game.game.level._boss.belly.visible));

// Hit the belly via spin while flipped
const hpBefore = await S(() => window.__game.game.level._boss.hp);
await S(async () => {
  const g = window.__game;
  const b = g.game.level._boss;
  b.setState('flipped'); b.stateT = 0;
  g.player.hp = 2; g.player.dead = false;
  g.input.virtualPress('spin');
  await new Promise((r) => setTimeout(r, 50));
  g.player.position.copy(b.group.position); g.player.position.y += 0.5;
  g.player.velocity.set(0, 0, 0);
  await new Promise((r) => setTimeout(r, 250));
});
const hpAfter = await S(() => window.__game.game.level._boss.hp);
test('Belly hit damages boss', hpAfter < hpBefore, `${hpBefore} → ${hpAfter}`);

// Shockwave attack fires in phase 2
await S(() => { const b = window.__game.game.level._boss; b.hp = 4; b.setState('slamTelegraph'); });
let sawShock = false;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(150);
  if (await S(() => window.__game.game.level._boss._shockwaves.length > 0)) { sawShock = true; break; }
}
test('Phase 2 shockwave slam', sawShock);

// Kill the boss → dying → ability unlock ceremony
await S(() => { const b = window.__game.game.level._boss; b.hp = 1; b.invuln = 0; b._takeHit('spin'); });
await page.waitForTimeout(3400);
const unlockShown = await S(() => !!document.querySelector('.mpd-ability'));
test('Ability unlock ceremony', unlockShown);
const granted = await S(() => window.__game.save.data.abilities.doubleJump);
test('Double Current granted + saved', !!granted);

// Continue → hub
await S(() => document.getElementById('mpd-continue')?.click());
await page.waitForTimeout(1200);
const lvl = await S(() => window.__game.game.levelDef?.id);
test('Hub follows boss victory', lvl === 'hub', lvl);
await page.screenshot({ path: 'shots/qa-hub.png' });

// Hub portal to level2 (locked until boss) — check unlocked
await page.waitForTimeout(400);
const unlocked = await S(() => window.__game.save.data.unlockedLevels);
console.log('  unlocked levels:', JSON.stringify(unlocked));

console.log(`\n═══ BOSS QA: ${results.filter(Boolean).length}/${results.length} passed ═══`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
