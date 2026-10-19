// ============================================================================
// MANDELPOD — Screenshot Harness ("Visual Critic's Camera")
// Boots the game headless, waits for stable frames, executes an optional
// scenario (key presses, teleports, camera poses), captures PNGs.
// Usage: node tools/shot.mjs out.png [--scenario name] [--wait ms]
// ============================================================================
import { chromium } from 'playwright';
import path from 'path';

const args = process.argv.slice(2);
const out = args[0] ?? 'shots/shot.png';
const scenario = args.includes('--scenario') ? args[args.indexOf('--scenario') + 1] : 'spawn';
const extraWait = args.includes('--wait') ? parseInt(args[args.indexOf('--wait') + 1]) : 0;

const SCENARIOS = {
  // Just spawn, idle 1s
  spawn: async (page) => { await page.waitForTimeout(1000); },
  // Title screen
  title: async (page) => { await page.waitForTimeout(1200); },
  // Run forward for a bit then screenshot
  run: async (page) => {
    await page.waitForTimeout(600);
    await page.keyboard.down('w');
    await page.waitForTimeout(1200);
  },
  // Jump mid-air pose
  jump: async (page) => {
    await page.waitForTimeout(600);
    await page.keyboard.down('w');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    await page.waitForTimeout(280);
  },
  // Spin attack pose
  spin: async (page) => {
    await page.waitForTimeout(600);
    await page.keyboard.press('j');
    await page.waitForTimeout(200);
  },
  // Slam pose
  slam: async (page) => {
    await page.waitForTimeout(600);
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.keyboard.press('l');
    await page.waitForTimeout(220);
  },
  // Hero close-up: orbit camera near the octopus for character art review
  hero: async (page) => {
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const g = window.__game;
      g.rig.mode = 'hero'; // frozen debug cam
      g.engine.camera.position.set(1.4, 1.35, 1.2);
      g.engine.camera.lookAt(0, 0.55, 4);
      g.engine.camera.fov = 40; g.engine.camera.updateProjectionMatrix();
    });
    await page.waitForTimeout(500);
  },
  // Hero from the back three-quarter (gameplay angle)
  heroBack: async (page) => {
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const g = window.__game;
      g.rig.mode = 'hero';
      g.engine.camera.position.set(-1.6, 1.9, 1.4);
      g.engine.camera.lookAt(0, 0.6, 4.2);
      g.engine.camera.fov = 40; g.engine.camera.updateProjectionMatrix();
    });
    await page.waitForTimeout(500);
  },
  // High vantage — teleport up for composition review
  vista: async (page) => {
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const g = window.__game;
      g.player.position.set(6, 10, -18);
      g.player.velocity.set(0, 0, 0);
    });
    await page.waitForTimeout(400);
  },
};

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()); });
page.on('pageerror', (e) => console.log('[PAGEERROR]', e.message));

const level = args.includes('--level') ? args[args.indexOf('--level') + 1] : null;
await page.goto('http://localhost:5173/' + (level ? `?level=${level}` : ''), { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game, { timeout: 15000 });
if (!level && scenario !== 'title') {
  await page.click('#mpd-start').catch(() => {});
  await page.waitForFunction(() => window.__game.game.state === 'playing', { timeout: 10000 });
}

await (SCENARIOS[scenario] ?? SCENARIOS.spawn)(page);
if (extraWait) await page.waitForTimeout(extraWait);

// Freeze a couple frames for particle settle, then capture
await page.screenshot({ path: out });
const state = await page.evaluate(() => {
  const g = window.__game;
  return {
    fps: Math.round(g.engine.perf.fps),
    playerPos: g.player.position.toArray().map((v) => +v.toFixed(2)),
    state: g.player.state,
    grounded: g.player.grounded,
    drawCalls: g.engine.renderer.info.render.calls,
    tris: g.engine.renderer.info.render.triangles,
  };
});
console.log(JSON.stringify(state));
await browser.close();
