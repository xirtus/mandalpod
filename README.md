# MANDELPOD — Psychedelic Octopus in the Sea of SpaceTime

An original AAA-style 3D action platformer for the browser, built with Three.js (WebGL2)
and 100% procedural everything — no downloaded assets: every model, texture, shader,
sound effect and music note is generated in code.

Inspired structurally by the best of *Crash Bandicoot: Warped* (rail camera, linear
handcrafted stages, crates, gems, relics, time trials, chase sequences, boss-gated
abilities) with an original universe: you are a tiny hyper-intelligent octopus cast
into the Mandelbrot Ocean of SpaceTime — an underwater multiverse where every ocean,
epoch and dream exists as one impossible cosmic sea.

## Play

```bash
npm install
npm run dev        # → http://localhost:5173
```

Production build: `npm run build && npm run preview`

## The reef is an instrument (OSC / MIDI)

Every move plays generative music — scuttle steps are mallets tuned by your X
position, jumps are harp glissandi, **J/X spins are pentatonic runs**, slams are
gongs, pearls climb the scale as your combo grows, and every shell rings at a
pitch derived from its own world coordinates. Geometry conducts the score:
**X** pans/widens, **Y** opens the pad filter and climbs octaves, **Z** (depth
into the timeline) densifies the arps and quickens the pulse.

Everything streams out as **OSC** and **MIDI** — and the game is *playable* by
OSC controllers:

```bash
npm run osc    # zero-dep bridge: ws :9130 → udp :57120 (SuperCollider) + UDP-IN :9131
```

Then **Esc → THE REEF IS AN INSTRUMENT** to enable OSC OUT (notes +
30 Hz position/mod stream) and MIDI OUT (notes + geometry on CC 16–20).
Full address map, SuperCollider/Max/TouchDesigner recipes and the incoming
control API (`/mandelpod/in/…`) live in [docs/osc.md](docs/osc.md).

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move / scuttle | WASD / arrows | Left stick |
| Jump (variable height, coyote time, buffering) | Space | A / Cross |
| Tentacle spin (attack, breaks shells, air stall) | J / X | X / Square |
| Body slam (breaks Chrono Coral, defeats armored foes) | L / C | B / Circle |
| Swap timeline (healthy ↔ dead reef) | T / Tab | Y / Triangle |
| Double Current (double jump — after Boss 1) | Space ×2 | A ×2 |
| Pause | Esc | Start |
| Dev perf overlay | F3 | — |

## The vertical slice

- **Chrono-Reef hub** with awakening timeline portals
- **Level 1 — Cambrian Kaleidoscope**: 7 evolving beats (shallows → coral steps →
  shell corridor → sponge canyon → timeline garden → **leviathan chase** → sanctum),
  5 enemy types, 6 breakable types, checkpoints, secret fractal, double-jump-locked vault
- **Boss 1 — The Trilobite King** (3 phases) → unlocks **Double Current**
- **Level 2 — Atlantis at the End of Time**: double-jump aqueducts, collapsing
  causeway, intact↔ruined timeline city
- Full loop: move → jump → spin → collect → break → checkpoint → die/retry →
  chase → gem → results (time/deaths/pearls/shells/fractal/perfect/relic rank) →
  boss → ability → hub → new timeline
- Collectibles: SpaceTime Pearls, Memory Shells, Chrono Gem, Perfect Pearl,
  Hidden Fractal, Relic ranks (sapphire/gold/platinum)

## Tech notes

- **Renderer**: WebGL2, ACES tone mapping, PCF soft shadows, UnrealBloom + custom
  film grade pass (vignette, chromatic aberration, grain, speed warp)
- **Underwater look**: procedural caustics & depth-absorption injected into every
  material, animated water surface, god-ray shafts, fog, plankton motes, fish schools
- **Hero**: fully procedural octopus — verlet tentacle chains with per-segment curled
  pose targets + ground contact, squash & stretch, shader eyes (look-at, blink,
  dilation), blushing, psychedelic mantle bands
- **Physics**: fixed 120 Hz sim, AABB world with substepped resolution, moving
  platforms, one-way/phase-gated colliders, **ledge assist**, spatial hash broadphase
- **Camera**: spline rail + chase/boss/orbit/attract modes, look-ahead, speed FOV,
  ledge-hold on falls, shake
- **Audio**: procedural WebAudio — layered sequencer (dub bass, bubbling arps,
  gamelan glass percussion) that reacts to explore/chase/boss, plus a full SFX kit
- **QA harnesses** (`tools/`): headless Playwright suites — 21 gameplay checks,
  full boss-fight verification, and an autopilot bot that plays the level for real
  and reports where it dies

Made entirely with Claude Code.

## License

Code: MIT (see `LICENSE`). Original procedural assets: CC BY 4.0 (see
`ASSET-LICENSE.md`). Third-party components: see `THIRD_PARTY.md`.
