// E2E: game → WS → bridge → UDP decode; and UDP → bridge → game (control)
import { chromium } from 'playwright';
import dgram from 'node:dgram';
import { spawn } from 'node:child_process';
import { decodeOsc } from '../src/audio/osc.js';

const bridge = spawn('node', ['tools/osc-bridge.mjs', '--quiet'], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

const received = [];
const udp = dgram.createSocket('udp4');
udp.on('message', (buf) => {
  try {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const m = decodeOsc(ab);
    if (Array.isArray(m)) received.push(...m); else received.push(m);
  } catch (e) { received.push({ address: 'DECODE_ERR', args: [String(e)] }); }
});
await new Promise((r) => udp.bind(57120, '127.0.0.1', r));

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[PAGEERROR]', e.message));
await page.goto('http://localhost:5173/?level=level1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game, { timeout: 15000 });

// Enable OSC + start audio (headless: no gesture needed w/ flag)
await page.evaluate(() => {
  const g = window.__game;
  g.save.data.options.oscEnabled = true;
  g.osc.applyOptions();
  g.audio.start();
});
await page.waitForTimeout(800);
const status = await page.evaluate(() => window.__game.osc.status);
console.log('OSC status:', status);

// Play: run forward, jump, spin (J), slam
await page.evaluate(() => window.__game.input.virtualAxis(0, -1));
await page.waitForTimeout(1500);
await page.evaluate(() => { window.__game.input.virtualPress('jump'); });
await page.waitForTimeout(400);
await page.evaluate(() => { window.__game.input.virtualPress('spin'); });
await page.waitForTimeout(900);
await page.evaluate(() => { window.__game.input.virtualPress('spin'); });
await page.waitForTimeout(1200);

// Incoming control: jump via UDP OSC → bridge → game
const { encodeOsc } = await import('../src/audio/osc.js');
const before = await page.evaluate(() => window.__game.player.position.y);
udp.send(Buffer.from(encodeOsc('/mandelpod/in/press', ['jump'])), 9131, '127.0.0.1');
await page.waitForTimeout(350);
const mid = await page.evaluate(() => ({ y: window.__game.player.position.y, state: window.__game.player.state }));
console.log('IN-control jump: y', before.toFixed(2), '→', mid.y.toFixed(2), 'state', mid.state);

await page.evaluate(() => window.__game.input.virtualAxis(null));
await page.waitForTimeout(300);

const addrs = new Map();
for (const m of received) addrs.set(m.address, (addrs.get(m.address) ?? 0) + 1);
console.log('\n--- OSC addresses received (game→udp) ---');
for (const [a, n] of [...addrs.entries()].sort()) console.log(String(n).padStart(4), a);
const sample = received.find((m) => m.address === '/mandelpod/note');
console.log('\nsample note:', JSON.stringify(sample));
const must = ['/mandelpod/note', '/mandelpod/player/pos', '/mandelpod/mod/x', '/mandelpod/event/jump', '/mandelpod/event/spin'];
const missing = must.filter((a) => !addrs.has(a));
console.log(missing.length ? `FAIL missing: ${missing.join(', ')}` : 'PASS: all expected message kinds present');
console.log(mid.y > before + 0.3 || mid.state === 'air' ? 'PASS: incoming OSC controls the game' : 'FAIL: incoming control');

udp.close(); bridge.kill(); await browser.close();
process.exit(0);
