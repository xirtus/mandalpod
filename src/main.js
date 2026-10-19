// ============================================================================
// MANDELPOD — Boot
// Assembles the studio: engine, input, save, physics, env, particles, player,
// camera, audio, ui, game orchestrator. Registers all timelines (levels).
// Exposes window.__game for the automated QA sub-agents.
// ============================================================================
import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { Save } from './core/save.js';
import { Events } from './core/events.js';
import { PhysicsWorld } from './game/physics.js';
import { Player } from './game/player.js';
import { CameraRig } from './game/camera.js';
import { UnderwaterEnv } from './world/env.js';
import { ParticleSystem } from './world/particles.js';
import { AudioEngine } from './audio/audio.js';
import { OscEngine } from './audio/osc.js';
import { GenerativeMusic } from './audio/instruments.js';
import { wireOscControl } from './core/osccontrol.js';
import { UI } from './ui/hud.js';
import { Game } from './game/game.js';
import { level1 } from './levels/level1.js';
import { hub } from './levels/hub.js';
import { boss1 } from './game/boss.js';
import { level2 } from './levels/level2.js';

const app = document.getElementById('app');
const engine = new Engine(app);
const input = new Input();
const save = new Save();
const events = new Events();
const world = new PhysicsWorld();
const env = new UnderwaterEnv(engine.scene);
const particles = new ParticleSystem(engine.scene);
const player = new Player({ world, input, save, events });
const rig = new CameraRig(engine.camera, save);
const audio = new AudioEngine(save);
const osc = new OscEngine(save);
const ui = new UI(null);   // game ref set below
const game = new Game({ engine, input, save, events, world, env, particles, player, rig, audio, ui });
ui.game = game;
const gen = new GenerativeMusic({ audio, osc, events, player, save, game });
game.osc = osc;
game.gen = gen;
wireOscControl(osc, { input, game, audio, engine, save });
osc.onStatus = (s) => ui.setOscStatus?.(s, osc.midiStatus);
osc.start();

engine.scene.add(player.group);

save.data.lives = 5;
game.registerLevel(level1);
game.registerLevel(hub);
game.registerLevel(boss1);
game.registerLevel(level2);

// Frame wiring
engine.add(input, -100);
engine.add(game, -50);       // game.fixedUpdate before player
engine.add(player, 0);
engine.add(gen, 50);         // generative instruments ride the fixed+frame loop
engine.add({
  update: (dt, t) => {
    env.update(dt, t, player.position, engine.camera);
    particles.update(dt, t);
    events.flush();
  },
}, 100);

engine.start();

// Boot into title (or jump straight into a level for QA: ?level=level1)
const params = new URLSearchParams(location.search);
if (params.has('level')) {
  audio.start?.call?.(audio);  // may fail without gesture; guarded
  game.startLevel(params.get('level'));
} else {
  game.showTitle();
}
// First user gesture starts audio
const gesture = () => { audio.start(); window.removeEventListener('pointerdown', gesture); window.removeEventListener('keydown', gesture); };
window.addEventListener('pointerdown', gesture);
window.addEventListener('keydown', gesture);

window.__game = { engine, input, save, world, player, rig, events, game, audio, osc, gen, ui, THREE, version: '0.3.0' };
console.log('[MANDELPOD] boot complete');
