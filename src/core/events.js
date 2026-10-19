// ============================================================================
// MANDELPOD — Event Bus (decouples gameplay, fx, audio, ui)
// ============================================================================
export class Events {
  constructor() { this.map = new Map(); this.queue = []; }
  on(name, fn) { (this.map.get(name) ?? this.map.set(name, []).get(name)).push(fn); return fn; }
  off(name, fn) { const a = this.map.get(name); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }
  emit(name, data) { this.queue.push({ name, data }); }
  flush() {
    for (const { name, data } of this.queue) {
      const a = this.map.get(name);
      if (a) for (const fn of a) fn(data);
    }
    this.queue.length = 0;
  }
}
