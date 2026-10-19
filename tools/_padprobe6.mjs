import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:5173/?level=level1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game, { timeout: 15000 });
await page.waitForTimeout(800);
await page.evaluate(() => {
  const g = window.__game;
  g.rig.mode = 'hero';
  // close-up: hover 2m above pad, look at surface 4m ahead
  g.engine.camera.position.set(2, 2.0, 2);
  g.engine.camera.lookAt(0, 0, -3);
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/_close-base.png' });
// bloom off
await page.evaluate(() => { window.__game.engine.bloomPass.enabled = false; });
await page.waitForTimeout(150);
await page.screenshot({ path: 'shots/_close-nobloom.png' });
await page.evaluate(() => { window.__game.engine.bloomPass.enabled = true; });
await browser.close();
console.log('done');
