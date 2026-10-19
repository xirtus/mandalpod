import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:5173/?level=level1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game, { timeout: 15000 });
await page.waitForTimeout(800);
await page.evaluate(() => {
  const g = window.__game;
  g.rig.mode = 'hero';
  g.engine.camera.position.set(2, 2.0, 2);
  g.engine.camera.lookAt(0, 0, -3);
});
await page.waitForTimeout(200);
const cases = [
  ['leviathan', (g) => { g.game.env.leviathan.visible = false; }, (g) => { g.game.env.leviathan.visible = true; }],
  ['abyss', (g) => { g.game.level.group.traverse(o => { if (o.geometry?.type === 'CircleGeometry' && o.material.isMeshStandardMaterial) o.visible = false; }); }, null],
  ['rays', (g) => { g.game.env.rays.visible = false; }, (g) => { g.game.env.rays.visible = true; }],
  ['surface', (g) => { g.game.env.surface.visible = false; }, (g) => { g.game.env.surface.visible = true; }],
];
for (const [name, off, on] of cases) {
  await page.evaluate(`(${off.toString()})(window.__game)`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `shots/_bisect-${name}.png` });
  if (on) await page.evaluate(`(${on.toString()})(window.__game)`);
}
await browser.close();
console.log('done');
