import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[PAGEERROR]', e.message));
await page.goto('http://localhost:5173/?level=level1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game, { timeout: 15000 });
await page.waitForTimeout(1000);
// gameplay view of the pad (the original glitch view)
await page.screenshot({ path: 'shots/_fix-gameplay.png' });
// close-up of pad surface (the z-fight magnification view)
await page.evaluate(() => {
  const g = window.__game;
  g.rig.mode = 'hero';
  g.engine.camera.position.set(2, 2.0, 2);
  g.engine.camera.lookAt(0, 0, -3);
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/_fix-close.png' });
// pause menu instrument panel
await page.evaluate(() => { const g = window.__game; g.rig.mode = 'rail'; g.game.togglePause(); });
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/_fix-panel.png' });
await browser.close();
console.log('done');
