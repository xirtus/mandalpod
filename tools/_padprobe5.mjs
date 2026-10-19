import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:5173/?level=level1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game, { timeout: 15000 });
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const g = window.__game;
  const out = [];
  g.engine.scene.traverse((o) => {
    if (!o.isMesh || o.geometry?.type !== 'SphereGeometry') return;
    const bb = new g.THREE.Box3().setFromObject(o);
    const s = bb.getSize(new g.THREE.Vector3());
    if (s.z > 50 && s.z < 500) {
      const chain = [];
      let p = o;
      while (p) { chain.push(`${p.type}:${p.name||'-'}(${(p.position?.x??0).toFixed(1)},${(p.position?.y??0).toFixed(1)},${(p.position?.z??0).toFixed(1)}) scale(${(p.scale?.x??1).toFixed(2)},${(p.scale?.y??1).toFixed(2)},${(p.scale?.z??1).toFixed(2)})`); p = p.parent; }
      out.push({ size: s.toArray().map(v=>+v.toFixed(1)), visible: o.visible, mat: { type: o.material.type, transmission: o.material.transmission, transparent: o.material.transparent, opacity: o.material.opacity, color: o.material.color?.getHexString?.() }, chain: chain.join(' <- ') });
    }
  });
  return out;
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
