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
// A: grade pass disabled (grain/chroma ruled out)
await page.evaluate(() => { window.__game.engine.gradePass.enabled = false; });
await page.waitForTimeout(150);
await page.screenshot({ path: 'shots/_bisect-nograde.png' });
await page.evaluate(() => { window.__game.engine.gradePass.enabled = true; });
// B: catalog what is near the pad surface plane
const info = await page.evaluate(() => {
  const g = window.__game;
  const hits = [];
  g.engine.scene.traverse((o) => {
    if (!o.isMesh) return;
    const p = new g.THREE.Vector3(); o.getWorldPosition(p);
    if (Math.abs(p.x) < 14 && p.z > -14 && p.z < 14 && Math.abs(p.y) < 1.5) {
      const bb = new g.THREE.Box3().setFromObject(o);
      hits.push({ type: o.geometry?.type, name: o.name || o.parent?.name || '', pos: p.toArray().map(v=>+v.toFixed(2)),
                  size: bb.getSize(new g.THREE.Vector3()).toArray().map(v=>+v.toFixed(2)), mat: o.material?.type });
    }
  });
  return hits;
});
console.log(JSON.stringify(info.slice(0, 60), null, 1));
await browser.close();
