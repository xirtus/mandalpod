// ============================================================================
// MANDELPOD — OSC BRIDGE (zero dependencies)
// Browsers can't speak UDP — this tiny relay does:
//
//   game ──WebSocket(binary OSC)──▶ bridge ──UDP──▶ SuperCollider/Max/PD/TD
//   game ◀──WebSocket── bridge ◀──UDP── any OSC controller (game is playable!)
//
//   node tools/osc-bridge.mjs [--ws 9130] [--listen 9131] [--to host:port ...]
//
// Defaults: WS :9130 · UDP-IN listen :9131 · forward to 127.0.0.1:57120 (SC)
// Text frames accepted too: "/mandelpod/event/ping 1 hello"
// ============================================================================
import http from 'node:http';
import dgram from 'node:dgram';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const arg = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const WS_PORT = +arg('ws', 9130);
const LISTEN_PORT = +arg('listen', 9131);
const QUIET = args.includes('--quiet');
const TARGETS = args.flatMap((a, i) => (a === '--to' ? [args[i + 1]] : []))
  .map((t) => { const [host, port] = t.split(':'); return { host: host || '127.0.0.1', port: +port }; });
if (!TARGETS.length) TARGETS.push({ host: '127.0.0.1', port: 57120 });

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const clients = new Set();
let rx = 0, tx = 0;

// ---- minimal OSC encoder for the text-line fallback -------------------------
function encodeOsc(address, vals = []) {
  const str = (s) => { const b = Buffer.from(s, 'utf8'); const o = Buffer.alloc(Math.ceil((b.length + 1) / 4) * 4); b.copy(o); return o; };
  let tags = ',';
  for (const v of vals) tags += typeof v === 'string' ? 's' : Number.isInteger(v) ? 'i' : 'f';
  const parts = [str(address), str(tags)];
  for (const v of vals) {
    if (typeof v === 'string') parts.push(str(v));
    else { const b = Buffer.alloc(4); Number.isInteger(v) ? b.writeInt32BE(v) : b.writeFloatBE(v); parts.push(b); }
  }
  return Buffer.concat(parts);
}

// ---- WebSocket framing -------------------------------------------------------
function wsSend(sock, payload, binary = true) {
  const len = payload.length;
  let head;
  if (len < 126) { head = Buffer.from([binary ? 0x82 : 0x81, len]); }
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x82; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x82; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  sock.write(Buffer.concat([head, payload]));
}

function makeFrameParser(sock) {
  let buf = Buffer.alloc(0);
  let frag = null;
  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const fin = (buf[0] & 0x80) !== 0;
      const op = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const maskOff = off;
      if (masked) off += 4;
      if (buf.length < off + len) return;
      let payload = buf.subarray(off, off + len);
      if (masked) { const m = buf.subarray(maskOff, maskOff + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
      buf = buf.subarray(off + len);
      if (op === 0x8) { clients.delete(sock); try { sock.end(); } catch {} return; }
      if (op === 0x9) { wsSend(sock, payload, false); continue; }        // ping→pong-ish
      if (op === 0xA) continue;                                          // pong
      if (op === 0x0 && frag) { frag = Buffer.concat([frag, payload]); if (fin) { handleMessage(sock, frag, fragBinary); frag = null; } continue; }
      if (op === 0x1 || op === 0x2) {
        if (!fin) { frag = payload; var fragBinary = op === 0x2; continue; }
        handleMessage(sock, payload, op === 0x2);
      }
    }
  };
}

const udp = dgram.createSocket('udp4');

function handleMessage(sock, payload, binary) {
  let packet = payload;
  if (!binary) {
    // Text convenience: "/mandelpod/note mallet 60 0.8 0.3"
    const parts = payload.toString('utf8').trim().split(/\s+/);
    if (!parts[0]?.startsWith('/')) return;
    packet = encodeOsc(parts[0], parts.slice(1).map((p) => (p !== '' && !isNaN(+p) ? +p : p)));
  }
  rx++;
  for (const t of TARGETS) udp.send(packet, t.port, t.host, () => {});
  if (!QUIET && rx % 50 === 1) log(`⇄ ${rx} packets relayed → ${TARGETS.map((t) => `${t.host}:${t.port}`).join(', ')}  (clients: ${clients.size})`);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end(`MANDELPOD OSC bridge alive\nws: :${WS_PORT}  udp-in: :${LISTEN_PORT}  targets: ${TARGETS.map((t) => `${t.host}:${t.port}`).join(', ')}\nrelayed: ${rx}  to-game: ${tx}  clients: ${clients.size}\n`);
});

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) return socket.destroy();
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.setNoDelay(true);
  clients.add(socket);
  log(`◉ game connected (${clients.size} client${clients.size > 1 ? 's' : ''})`);
  socket.on('data', makeFrameParser(socket));
  const bye = () => { if (clients.delete(socket)) log(`○ game disconnected (${clients.size} left)`); };
  socket.on('close', bye);
  socket.on('error', bye);
});

// UDP-IN: external OSC controllers → the game (play it from TouchOSC!)
udp.on('message', (msg) => {
  tx++;
  for (const c of clients) { try { wsSend(c, msg, true); } catch {} }
});
udp.on('error', (e) => log(`udp error: ${e.message}`));
udp.bind(LISTEN_PORT, '127.0.0.1', () => log(`◉ listening for controller OSC on udp :${LISTEN_PORT}`));

const log = (s) => console.log(`[mandelpod-osc] ${s}`);
server.listen(WS_PORT, () => {
  log(`MANDELPOD OSC BRIDGE`);
  log(`  game connects  → ws://127.0.0.1:${WS_PORT}`);
  log(`  notes relay to → ${TARGETS.map((t) => `${t.host}:${t.port}`).join('  ')}`);
  log(`  controller IN  → udp 127.0.0.1:${LISTEN_PORT}  (→ game)`);
});
