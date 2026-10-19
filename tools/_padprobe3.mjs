import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:5173/?level=level1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game, { timeout: 15000 });
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const g = window.__game;
  g.rig.mode = 'hero';
  g.engine.camera.position.set(0, 16, 2);
  g.engine.camera.lookAt(0, 0, -1);
});
await page.waitForTimeout(300);
// 1) caustics OFF via shared uniform
await page.evaluate(async () => {
  const { envUniforms } = await import('/src/world/materials.js');
  envUniforms.uCausticStrength.value = 0;
});
await page.waitForTimeout(200);
await page.screenshot({ path: 'shots/_pad-nocaustic.png' });
// 2) caustics back on, psychedelia uniform to 0 (color shift test irrelevant) — instead also test without depth tint later
await browser.close();
console.log('done');
