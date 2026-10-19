// ============================================================================
// MANDELPOD — Incoming OSC Control
// The reef is remote-playable: any OSC controller (TouchOSC, Max, PD,
// SuperCollider, TouchDesigner, a phone on the couch) can drive the octopus,
// bend the score and retune the world. Messages arrive via the WS→UDP bridge.
// ============================================================================
import { envUniforms } from '../world/materials.js';

export function wireOscControl(osc, { input, game, audio, engine, save }) {
  osc.onMessage(({ address, args = [] }) => {
    if (typeof address !== 'string' || !address.startsWith('/mandelpod/in/')) return;
    const rest = address.slice('/mandelpod/in/'.length);
    const [a0, a1] = args;

    if (rest === 'move') input.virtualAxis(Math.max(-1, Math.min(1, +a0 || 0)), Math.max(-1, Math.min(1, +a1 || 0)));
    else if (rest === 'stop') input.virtualAxis(null);
    else if (rest === 'press' && a0) input.virtualPress(String(a0));
    else if (rest === 'hold' && a0) input.virtualHold(String(a0), Math.max(0.05, +a1 || 0.3));
    else if (rest === 'level' && a0 && game.levels[a0]) game.startLevel(String(a0));
    else if (rest === 'mode' && a0) audio.setMode(String(a0));
    else if (rest === 'sonify') { save.data.options.sonify = !!+a0; save.commit(); }
    else if (rest.startsWith('param/')) {
      const key = rest.slice(6);
      const v = +a0;
      if (!isFinite(v)) return;
      const o = save.data.options;
      switch (key) {
        case 'bpm': audio.bpm = Math.max(40, Math.min(220, v)); break;
        case 'volMusic': o.volMusic = v; if (audio.musicBus) audio.musicBus.gain.value = v; save.commit(); break;
        case 'volSfx': o.volSfx = v; if (audio.sfxBus) audio.sfxBus.gain.value = v; save.commit(); break;
        case 'volAmbience': o.volAmbience = v; if (audio.ambBus) audio.ambBus.gain.value = v; save.commit(); break;
        case 'volSonify': o.volSonify = v; save.commit(); break;
        case 'timescale': engine.timeScale = Math.max(0.1, Math.min(3, v)); break;
        case 'psychedelia': envUniforms.uPsychedelia.value = Math.max(0, Math.min(2, v)); break;
        case 'caustics': envUniforms.uCausticStrength.value = Math.max(0, Math.min(1.5, v)); break;
        case 'fov': o.fov = Math.max(40, Math.min(100, v)); save.commit(); break;
      }
    }
  });
}
