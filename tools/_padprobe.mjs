import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[PAGEERROR]', e.message));
await page.goto('http://localhost:5173/?level=level1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game, { timeout: 15000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'shots/_pad-t0.png' });
await page.waitForTimeout(900);
await page.screenshot({ path: 'shots/_pad-t1.png' });
await page.evaluate(() => {
  const g = window.__game;
  g.rig.mode = 'hero';
  g.engine.camera.position.set(0, 16, 2);
  g.engine.camera.lookAt(0, 0, -1);
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/_pad-top.png' });
await page.evaluate(() => {
  const g = window.__game;
  g.engine.camera.position.set(4, 1.0, 9);
  g.engine.camera.lookAt(-2, 0.1, -4);
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/_pad-graze.png' });
await browser.close();
console.log('done');
