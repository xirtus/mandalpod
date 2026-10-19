// ============================================================================
// MANDELPOD — Input Department
// Unified keyboard + gamepad with remapping, buffered actions, analog axes.
// Exposes a deterministic virtual-press API for automated playtests.
// ============================================================================

export const ACTIONS = ['jump', 'spin', 'slam', 'dash', 'ink', 'grapple', 'bubble', 'pause', 'swap', 'confirm', 'back'];

const DEFAULT_KEYS = {
  jump:    ['Space', 'KeyK'],
  spin:    ['KeyJ', 'KeyX'],
  slam:    ['KeyL', 'KeyC'],
  dash:    ['ShiftLeft', 'ShiftRight'],
  ink:     ['KeyI', 'KeyV'],
  grapple: ['KeyG'],
  bubble:  ['KeyB'],
  swap:    ['KeyT', 'Tab'],
  pause:   ['Escape', 'KeyP'],
  confirm: ['Enter'],
  back:    ['Backspace'],
};

const PAD_BUTTONS = { jump: 0, spin: 2, slam: 1, dash: 5, ink: 4, grapple: 7, bubble: 6, swap: 3, pause: 9, confirm: 0, back: 1 };

export class Input {
  constructor() {
    this.keysDown = new Set();
    this.state = {};          // action -> { held, pressed, released, bufferT }
    for (const a of ACTIONS) this.state[a] = { held: false, pressed: false, released: false, bufferT: -1 };
    this.axisX = 0; this.axisZ = 0;
    this._virtual = {};       // test hooks
    this._vAxis = null;
    this._pendingPress = new Set();
    this.bufferTime = 0.12;   // jump buffering window
    this.keyMap = structuredClone(DEFAULT_KEYS);
    this.padIndex = -1;
    this.deadzone = 0.18;
    this.enabled = true;
    this._prevPadButtons = [];

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keysDown.add(e.code);
      // Event-driven edge: mark pending press immediately (fast taps between
      // frames still register)
      for (const a of ACTIONS) if (this.keyMap[a].includes(e.code)) this._pendingPress.add(a);
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.code));
    window.addEventListener('blur', () => this.keysDown.clear());
    window.addEventListener('gamepadconnected', (e) => { this.padIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', (e) => { if (this.padIndex === e.gamepad.index) this.padIndex = -1; });
  }

  // Test / AI hook
  virtualPress(action) { this._virtual[action] = (this._virtual[action] || 0) + 1; }
  virtualHold(action, seconds) { this._virtualHold = this._virtualHold || {}; this._virtualHold[action] = seconds; }
  virtualAxis(x, z) { this._vAxis = (x === null) ? null : { x, z }; }   // latches until cleared/replaced

  fixedUpdate(dt) {
    // Runs inside the fixed-step loop (priority -100 = first), so action
    // edges live exactly one simulation step and are always consumed.
    this.endFrame();
    this.poll(dt);
  }

  poll(dt) {
    // Poll gamepad
    let pad = null;
    if (this.padIndex >= 0) {
      const pads = navigator.getGamepads?.() || [];
      pad = pads[this.padIndex] || null;
    }

    // Axes: WASD / arrows / left stick
    let x = 0, z = 0;
    if (this.enabled) {
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) x -= 1;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) x += 1;
      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) z -= 1;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) z += 1;
    }
    if (pad && this.enabled) {
      const px = pad.axes[0] ?? 0, pz = pad.axes[1] ?? 0;
      if (Math.hypot(px, pz) > this.deadzone) { x = px; z = pz; }
    }
    if (this._vAxis && x === 0 && z === 0) { x = this._vAxis.x; z = this._vAxis.z; }
    const mag = Math.hypot(x, z);
    if (mag > 1) { x /= mag; z /= mag; }
    this.axisX = x; this.axisZ = z;

    for (const a of ACTIONS) {
      const s = this.state[a];
      const wasHeld = s.held;
      let held = this.enabled && this.keyMap[a].some((k) => this.keysDown.has(k));
      if (pad && this.enabled && PAD_BUTTONS[a] !== undefined) {
        const b = pad.buttons[PAD_BUTTONS[a]];
        if (b?.pressed) held = true;
      }
      if (this._virtual[a] > 0) { held = true; this._virtual[a]--; }
      if (this._virtualHold?.[a] > 0) { held = true; this._virtualHold[a] -= dt; }
      s.held = held;
      s.pressed = (held && !wasHeld) || this._pendingPress.has(a);
      this._pendingPress.delete(a);
      s.released = !held && wasHeld;
      if (s.pressed) s.bufferT = this.bufferTime;
      else s.bufferT = Math.max(-1, s.bufferT - dt);
    }
  }

  held(a) { return this.state[a].held; }
  pressed(a) { return this.state[a].pressed; }
  released(a) { return this.state[a].released; }
  buffered(a) { return this.state[a].bufferT > 0; }
  consumeBuffer(a) { this.state[a].bufferT = -1; }
  endFrame() { for (const a of ACTIONS) { this.state[a].pressed = false; this.state[a].released = false; } }
}
