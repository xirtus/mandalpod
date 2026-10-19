// ============================================================================
// MANDELPOD — OSC / MIDI Department
// The game IS an instrument: every move, hit and molecule of geometry sings
// over OSC (via WebSocket→UDP bridge) and Web MIDI. Hand-rolled OSC 1.1
// codec — zero dependencies, full binary protocol.
//
//   OUT  /mandelpod/note <inst> <midi> <vel> <dur> <x> <y> <z>
//        /mandelpod/event/<name> ...
//        /mandelpod/player/pos|vel|state ...   /mandelpod/mod/<x|y|z|speed> v
//   IN   /mandelpod/in/press <action>   /mandelpod/in/move <x> <z>
//        /mandelpod/in/hold <action> <s> /mandelpod/in/level <id>
//        /mandelpod/in/param/<bpm|volMusic|timescale|psychedelia...> <v>
// ============================================================================

// ------------------------------------------------------------ OSC 1.1 codec
export function encodeOsc(address, args = []) {
  const parts = [];
  const str = (s) => {
    const b = new TextEncoder().encode(s);
    const buf = new Uint8Array(Math.ceil((b.length + 1) / 4) * 4);
    buf.set(b);
    return buf;
  };
  let tags = ',';
  for (const a of args) {
    if (typeof a === 'string') tags += 's';
    else if (typeof a === 'boolean') tags += a ? 'T' : 'F';
    else if (Number.isInteger(a)) tags += 'i';
    else tags += 'f';
  }
  parts.push(str(address), str(tags));
  for (const a of args) {
    if (typeof a === 'string') parts.push(str(a));
    else if (typeof a === 'boolean') { /* no payload */ }
    else {
      const buf = new DataView(new ArrayBuffer(4));
      if (Number.isInteger(a)) buf.setInt32(0, a);
      else buf.setFloat32(0, a);
      parts.push(new Uint8Array(buf.buffer));
    }
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out.buffer;
}

export function encodeBundle(messages) {
  const head = new Uint8Array(16);
  head.set(new TextEncoder().encode('#bundle\0'));
  head[15] = 1;   // timetag: immediately
  const chunks = [head];
  let total = head.length;
  for (const m of messages) {
    const b = m instanceof ArrayBuffer ? m : encodeOsc(m[0], m[1] ?? []);
    const sz = new Uint8Array(4);
    new DataView(sz.buffer).setInt32(0, b.byteLength);
    chunks.push(sz, new Uint8Array(b));
    total += 4 + b.byteLength;
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out.buffer;
}

export function decodeOsc(buf) {
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  let o = 0;
  const readStr = () => {
    let end = o;
    while (end < u8.length && u8[end] !== 0) end++;
    const s = new TextDecoder().decode(u8.subarray(o, end));
    o = Math.ceil((end + 1) / 4) * 4;
    return s;
  };
  const address = readStr();
  if (address === '#bundle') {
    o += 8;   // timetag
    const msgs = [];
    while (o + 4 <= u8.length) {
      const len = dv.getInt32(o); o += 4;
      msgs.push(decodeOsc(buf.slice(o, o + len)));
      o += len;
    }
    return msgs;
  }
  const tags = readStr();
  const args = [];
  for (const t of tags.slice(1)) {
    if (t === 's') args.push(readStr());
    else if (t === 'i') { args.push(dv.getInt32(o)); o += 4; }
    else if (t === 'f') { args.push(dv.getFloat32(o)); o += 4; }
    else if (t === 'T') args.push(true);
    else if (t === 'F') args.push(false);
  }
  return { address, args };
}

// ---------------------------------------------------------------- OscEngine
export class OscEngine {
  constructor(save) {
    this.save = save;
    this.ws = null;
    this.status = 'off';          // off | connecting | open | error
    this.midi = null;             // MIDIAccess
    this.midiOut = null;
    this.midiStatus = 'off';      // off | open | unavailable
    this._queue = [];             // pending OSC messages (bundled at oscRate)
    this._retry = 0;
    this._handlers = [];          // incoming message handlers
    this._lastSent = new Map();   // address → time (for mod throttling)
    this.onStatus = null;         // ui hook
  }

  get opts() { return this.save.data.options; }

  start() {
    this._applyMidi();
    if (this.opts.oscEnabled) this._connect();
    // Mod/CC stream flush
    this._flushTimer = setInterval(() => this._flush(), 1000 / Math.max(1, this.opts.oscRate ?? 30));
  }

  applyOptions() {
    // Called when the OSC/MIDI panel changes
    if (this.opts.oscEnabled) {
      const stale = this.ws && this.ws.url !== this.opts.oscUrl;
      if (stale || this.status === 'error') { try { this.ws?.close(); } catch {} this.ws = null; }
      if (!this.ws) this._connect();
    } else {
      try { this.ws?.close(); } catch {}
      this.ws = null;
      this._setStatus('off');
    }
    this._applyMidi();
  }

  _setStatus(s) { this.status = s; this.onStatus?.(s); }

  _connect() {
    if (this.ws && (this.ws.readyState <= 1)) return;
    this._setStatus('connecting');
    try { this.ws = new WebSocket(this.opts.oscUrl); } catch { this._setStatus('error'); return this._retryLater(); }
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => { this._retry = 0; this._setStatus('open'); this.send('/mandelpod/hello', ['mandelpod', 1]); };
    this.ws.onclose = () => { this._setStatus(this.opts.oscEnabled ? 'error' : 'off'); this._retryLater(); };
    this.ws.onerror = () => { try { this.ws.close(); } catch {} };
    this.ws.onmessage = (e) => this._receive(e.data);
  }

  _retryLater() {
    if (!this.opts.oscEnabled) return;
    this._retry = Math.min(this._retry + 1, 5);
    setTimeout(() => { if (this.opts.oscEnabled && this.status !== 'open') this._connect(); }, this._retry * 900);
  }

  _receive(data) {
    let msg = null;
    try {
      if (typeof data === 'string') {
        // Text fallback: "/addr arg arg" (numbers auto-parsed)
        const parts = data.trim().split(/\s+/);
        const addr = parts[0];
        const args = parts.slice(1).map((p) => (isNaN(+p) || p === '' ? p : +p));
        msg = { address: addr, args };
      } else {
        msg = decodeOsc(data);
      }
    } catch { return; }
    const list = Array.isArray(msg) ? msg : [msg];
    for (const m of list) for (const h of this._handlers) h(m);
  }

  onMessage(fn) { this._handlers.push(fn); }

  // ---- sending ------------------------------------------------------------
  send(address, args = []) {
    if (this.status !== 'open') return;
    this._queue.push([address, args]);
    if (this._queue.length > 240) this._queue.splice(0, this._queue.length - 240);
  }

  // Rate-gated mod sender: continuous geometry streams stay smooth, never flood
  mod(name, v, minInterval = 1 / 24) {
    const now = performance.now() / 1000;
    const last = this._lastSent.get(name) ?? -1;
    if (now - last < minInterval) return;
    this._lastSent.set(name, now);
    this.send(`/mandelpod/mod/${name}`, [+v.toFixed(4)]);
    this.cc(name, v);
  }

  _flush() {
    if (this.status !== 'open' || !this._queue.length) return;
    const msgs = this._queue;
    this._queue = [];
    try { this.ws.send(msgs.length === 1 ? encodeOsc(msgs[0][0], msgs[0][1]) : encodeBundle(msgs)); } catch {}
  }

  // A played note: OSC + MIDI in one call
  note(inst, midi, vel = 0.7, dur = 0.3, pos = null) {
    this.send('/mandelpod/note', [inst, Math.round(midi), +vel.toFixed(3), +dur.toFixed(3),
      +(pos?.x ?? 0).toFixed(2), +(pos?.y ?? 0).toFixed(2), +(pos?.z ?? 0).toFixed(2)]);
    this.midiNote(midi, vel, dur);
  }

  event(name, ...args) { this.send(`/mandelpod/event/${name}`, args); }

  // ---- MIDI ----------------------------------------------------------------
  _applyMidi() {
    if (!this.opts.midiEnabled) { this.midiStatus = 'off'; this.midiOut = null; return; }
    const pick = () => {
      const outs = [...this.midi.outputs.values()];
      const want = (this.opts.midiOut ?? '').toLowerCase();
      this.midiOut = (want && outs.find((o) => o.name.toLowerCase().includes(want))) || outs[0] || null;
      this.midiStatus = this.midiOut ? 'open' : 'unavailable';
      this.onStatus?.(this.status, this.midiStatus);
    };
    if (this.midi) return pick();
    if (!navigator.requestMIDIAccess) { this.midiStatus = 'unavailable'; return; }
    navigator.requestMIDIAccess().then((acc) => {
      this.midi = acc;
      pick();
      acc.onstatechange = () => pick();
    }).catch(() => { this.midiStatus = 'unavailable'; });
  }

  midiOutputs() {
    return this.midi ? [...this.midi.outputs.values()].map((o) => o.name) : [];
  }

  midiNote(midi, vel = 0.7, dur = 0.3) {
    if (!this.midiOut) return;
    const ch = this.opts.midiChannel & 0x0f;
    const n = Math.max(0, Math.min(127, Math.round(midi)));
    const v = Math.max(1, Math.min(127, Math.round(vel * 127)));
    try {
      this.midiOut.send([0x90 | ch, n, v]);
      setTimeout(() => { try { this.midiOut?.send([0x80 | ch, n, 0]); } catch {} }, Math.max(30, dur * 1000));
    } catch {}
  }

  // Geometry → CC mapping (x/y/z/speed/height on ch, CC 16-20)
  cc(name, v) {
    if (!this.midiOut) return;
    const idx = { x: 16, y: 17, z: 18, speed: 19, height: 20 }[name];
    if (idx === undefined) return;
    const ch = this.opts.midiChannel & 0x0f;
    try { this.midiOut.send([0xb0 | ch, idx, Math.max(0, Math.min(127, Math.round(v * 127)))]); } catch {}
  }
}
