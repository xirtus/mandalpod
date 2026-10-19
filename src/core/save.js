// ============================================================================
// MANDELPOD — Save / Progression
// localStorage persistence: relics, gems, abilities, per-level records.
// ============================================================================
const KEY = 'mandalpod.save.v1';

const DEFAULT_SAVE = () => ({
  abilities: { doubleJump: false, cycloneSpin: false, inkCannon: false, chronoDash: false, grapple: false, timeBubble: false, fractalSplit: false },
  levels: {},           // id -> { gem, perfectPearl, fractal, relicRank, bestTime, shellsBest, completions }
  relics: 0,
  pearls: 0,            // lifetime pearls (currency-feel)
  lives: 5,
  unlockedLevels: ['level1'],
  defeatedBosses: [],
  options: {
    camSensitivity: 1, invertY: false, reduceShake: false, reduceChroma: false,
    reduceFlash: false, reducePsychedelia: false, fov: 58,
    volMusic: 0.8, volSfx: 1.0, volAmbience: 0.7, subtitles: true, colorblind: 'off',
    // The Instrument: generative sonification + OSC/MIDI output
    sonify: true, geoScore: true, volSonify: 0.8,
    oscEnabled: false, oscUrl: 'ws://127.0.0.1:9130', oscRate: 30,
    midiEnabled: false, midiOut: '', midiChannel: 0,
  },
});

export class Save {
  constructor() {
    this.data = DEFAULT_SAVE();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...DEFAULT_SAVE(), ...parsed, abilities: { ...DEFAULT_SAVE().abilities, ...(parsed.abilities || {}) }, options: { ...DEFAULT_SAVE().options, ...(parsed.options || {}) } };
      }
    } catch (e) { /* private mode etc. — run unsaved */ }
  }
  commit() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} }
  level(id) {
    if (!this.data.levels[id]) this.data.levels[id] = { gem: false, perfectPearl: false, fractal: false, relicRank: 0, bestTime: 0, shellsBest: 0, completions: 0 };
    return this.data.levels[id];
  }
  hasAbility(a) { return !!this.data.abilities[a]; }
  grantAbility(a) { this.data.abilities[a] = true; this.commit(); }
  isLevelUnlocked(id) { return this.data.unlockedLevels.includes(id); }
  unlockLevel(id) { if (!this.isLevelUnlocked(id)) { this.data.unlockedLevels.push(id); this.commit(); } }
  reset() { this.data = DEFAULT_SAVE(); this.commit(); }
}
