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
await page.screenshot({ path: 'shots/_pad-shadowON.png' });
// kill the sun shadow → is the striping shadow acne?
await page.evaluate(() => { window.__game.game.env.sun.castShadow = false; });
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/_pad-shadowOFF.png' });
await browser.close();
console.log('done');
