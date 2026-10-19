# MANDELPOD: Psychedelic Octopus in the Sea of Space Time

Build an **utterly exceptional AAA-quality 3D action platformer in Three.js/WebGPU**, structurally inspired by the best ideas of classic linear hub-based 3D platformers such as *Crash Bandicoot: Warped* and the modern cinematic density, movement polish, alternate dimensions, visual spectacle, and level transformations associated with *Crash Bandicoot 4: It’s About Time*—but make this an **original game, world, character, art direction, enemies, abilities, levels, collectibles, story, UI, music, and identity.**

The game is:

# **MANDELPOD: Psychedelic Octopus in the Sea of Space Time**

You are a small hyper-intelligent psychedelic octopus cast out of the ordinary ocean and into the Mandalbrot **Ocean of SpaceTime**: an infinite underwater multiverse where every possible ocean, epoch, dream, timeline, extinct civilization, alien reef, mathematical universe, and hallucination exists as a current in one impossible cosmic sea.

The entire universe should look like a mixture of:

* Mandelbrot and Julia-set geometry
* DMT hyperspace
* LSD / liquid-light psychedelic art
* fluorescent deep-sea biology
* bioluminescent coral
* glass, pearl, iridescence and chromatic aberration
* impossible underwater ruins
* alien aquariums
* recursive architecture
* Escher-like spaces
* fractal temples
* prehistoric oceans
* cosmic abyssal trenches
* dreamlike submerged cities
* time portals
* impossible non-Euclidean ocean spaces
* microscopic plankton universes
* gigantic creatures moving in the background
* recursive reefs that contain smaller reefs inside themselves

https://github.com/owenyuwono/poseidon fluid physics may be useful
**Do not make a generic underwater game. Every screenshot should immediately communicate: "psychedelic ocean outside normal spacetime."**

## THE MOST IMPORTANT RULE

This must become a **GAME**, with rail system camera like crash bandicoot, not a graphics demo.

The first playable build must contain a complete, addictive:

**move → jump/swim → attack → collect → break → discover → checkpoint → die/retry → reach goal → earn relic → unlock ability → open new timeline → replay earlier stages for secrets**

loop.

Movement quality and level design are more important than raw graphical complexity.

---

# PLAYER MOVEMENT

Make controlling the octopus exceptionally satisfying.

Initially implement:

* run/scuttle
* analog directional movement
* responsive jump
* variable jump height
* coyote time
* jump buffering
* air control
* short distance swimming (like crash double jump spin)
* underwater buoyancy
* surface swimming
* dive
* mantle
* ledge grab
* tentacle slap
* radial tentacle spin attack
* body slam
* ink burst
* enemy bounce
* crate/coral-object bounce
* smooth acceleration/deceleration
* excellent collision response
* excellent animation blending
* squash and stretch
* secondary tentacle physics
* expressive procedural eyes/head motion
* polished camera behavior
* controller support
* keyboard/mouse support

The octopus should feel **absurdly responsive** even though the animation is fluid and organic and bright.

Use procedural tentacle IK where useful so tentacles naturally contact terrain, curl around objects, trail during jumps, ripple underwater, recoil during attacks, and react to velocity.

Never let realistic octopus physics make movement frustrating.

Gameplay comes first.

---

# POWER PROGRESSION

Do **NOT** give the player every move immediately.

A central game loop is defeating bosses and acquiring increasingly reality-breaking abilities. New powers must make later levels possible AND create secrets in earlier levels.

Example progression:

### Starting abilities

* jump
* basic swim
* tentacle slap
* basic spin
* body slam

### Boss 1 — Double Current

Unlock **double jump / double-swim impulse**.

### Boss 2 — Eightfold Cyclone

Unlock an extended **tentacle spin** that attacks enemies, breaks reinforced objects, and slightly extends airtime.

### Boss 3 — Ink Cannon

Unlock aimed **projectile ink**, usable against distant enemies, switches and targets.

### Boss 4 — Chrono Dash

Unlock a fast ground/air dash capable of crossing collapsing spaces and phasing through temporal membranes.

### Boss 5 — Tentacle Grapple

One tentacle can grab designated anchors, enemies, objects and temporal hooks and swing across gaps.

### Boss 6 — Space Time Bubble

Create a localized sphere that **slows time** for enemies, platforms, hazards and machinery while the player remains fast.

### Boss 7 — Fractal Split

Briefly create multiple possible versions of yourself. One remains real while temporal echoes repeat your recent movement to activate multi-position puzzles.

### Final ability — Infinite Octopus

Chain dash + grapple + spin + double jump + time bubble into high-skill traversal sequences.

Later levels should deliberately demand mastery and combinations such as:

**jump → spin glide → grapple → release → dash → double jump → enemy bounce → ink switch → land**

Earlier levels should contain visible mysteries the player understands they cannot reach yet.

Reward returning later with new abilities.

---

# LEVEL STRUCTURE

Build handcrafted, mostly linear cinematic stages with branching secrets rather than giant empty open worlds.

Each stage should constantly introduce something new.

Use:

* forward-facing platforming
* side-scrolling 2.5D sections
* vertical ascents
* descending sequences
* chase sequences
* escape sequences
* swimming tunnels
* precision platforming
* rail/grind equivalents using ocean currents
* vehicle/creature stages
* puzzle rooms
* boss encounters
* reverse-camera chase moments
* perspective changes
* gravity changes
* time changes
* dimension changes

A stage should evolve every 30–90 seconds.

Avoid repetitive corridors.

Every level needs memorable authored moments.

---

# OCEAN OF SPACE TIME HUB

Create a beautiful explorable central **Chrono-Reef**.

It contains portals into fractured ocean timelines.

Portals progressively awaken as relics are recovered.

Possible worlds:

## 1. CAMBRIAN KALEIDOSCOPE

An impossible prehistoric reef filled with anomalocarids, trilobites, hallucigenia and enormous alien organisms.

## 2. ATLANTIS AT THE END OF TIME

A submerged classical civilization being recursively duplicated as its timeline collapses.

## 3. MANDELBROT TRENCH

Geometry becomes increasingly recursive as the player descends. Coral branches into coral branches into entire miniature oceans.

## 4. METASYNTH AQUARIUM

Synthwave architecture, chrome fish, laser grids, VHS water and submerged shopping malls from a future that never existed.

## 5. CLOCKWORK ELF ABYSS

Mechanical jellyfish and spidercrabs, planetary gears, ticking whales and impossible underwater clocks.

## 6. DREAMING WHALE

A complete level occurring inside the dream of an ancient cosmic whale.

## 7. MICRO-OCEAN

The octopus is reduced to microscopic size and navigates plankton, cells, diatoms and molecular machinery to defeat the solid state intelligence nautalus.

## 8. SUNKEN THETA

Low-gravity water trapped inside an extinct undetwater shattered moon alien civilization.

## 9. FRACTAL EDEN

Colorful carnivorous Plants and organisms recursively reproduce their own geometry. Traversal literally follows mathematical iterations.

## 10. THE DEAD TIMELINE

Icy cold titanic wreck and lost skeleton fish where time has stopped and almost everything is frozen in place.

## 11. HYPERSPACE REEF

Full DMT-like impossible geometry: jeweled entities, transforming architecture, neon tunnels and continuously folding dimensions.

## 12. NON EUCLIDEAN OCEAN OUTSIDE THE UNIVERSE

Final world: an infinite non euclidean cosmic sea containing timelines and non euclidean tunnels protected by carnivorous glowing organisms.

Each timeline should have its own gameplay mechanic, enemy ecology, shader treatment, sound palette, architecture and visual identity.

---

# DIMENSION / TIME MECHANICS

Make timeline manipulation central to the game.

Possible mechanics:

* instantly switch between two versions of the same level
* healthy reef ↔ dead reef
* prehistoric ↔ future
* microscopic ↔ gigantic
* normal geometry ↔ fractal geometry
* flowing time ↔ frozen time
* gravity down ↔ gravity sideways
* water ↔ air
* solid structures ↔ spectral structures
* ruined city ↔ city before destruction

Switching timelines must affect **collision geometry and gameplay**, not merely colors.

Example:

A wall is destroyed in the future but intact in the past.

Jump toward it → swap to past → wall appears → wall jump → swap back → pass through destroyed section → grapple ancient coral → time bubble collapsing bridge → dash to exit.

Build levels around these combinations.

---

# COLLECTIBLES

Every normal stage should support obsessive replayability.

Include original equivalents of:

### Space Time Pearls

Common collectible trail guiding movement.

### Memory Shells

Breakable level objects distributed throughout stages.

Track how many were destroyed.

### Chrono Gem

Awarded for reaching the level exit.

### Perfect Pearl

Awarded for completing a level while breaking every Memory Shell without dying.

### Hidden Fractal

Extremely well-hidden collectible requiring observation or alternate routes.

### Space Time Relic

Earned through time-trial completion.

Use multiple relic ranks for progressively faster completion.

### Paradox Shards

Rare fragments opening secret timelines.

### Cosmic Cuttlefish

Occasional difficult hidden creature collectible which attempts to escape when discovered.

Give every stage a post-completion screen showing:

* completion time
* deaths
* objects destroyed
* collectibles found
* hidden collectible
* relic rank
* perfect-run status

Make 100%+ completion meaningful.

---

# OBJECTS AND BREAKABLES

Create satisfying breakable environmental objects analogous to classic platforming crates but entirely original to this universe.

Examples:

* Memory Shell
* Pearl Pod
* Ink Bladder
* Temporal Barnacle
* Bounce Sponge
* Exploding Puffer Pod
* Countdown Anemone
* Reinforced Chrono Coral
* Phase Coral visible only in one timeline
* Roulette Clam
* Quantum Shell whose contents change until touched

Breaking objects should have:

* satisfying animation
* particles
* sound
* fragments
* tentacle interaction
* combo feedback
* collectible explosions
* slight controller feedback
* strong visual readability

---

# ENEMIES

Enemies must behave like designed platforming obstacles, not generic shooter AI.

Create diverse creatures whose behavior changes traversal:

* charging crab
* rotating urchin
* snapping pearl clam
* floating jellyfish
* ink-sniper squid
* tunneling worm
* armored trilobite
* temporal eel
* fractal seahorse
* mimic coral
* puffer mine
* pursuing shark
* giant isopod
* phase-shifting predator
* clockwork lobster
* recursive enemy that splits into smaller copies

Every enemy needs:

* readable anticipation
* attack state
* vulnerability rules
* hit reaction
* defeat animation
* interaction with player abilities
* interaction with the environment

Some should be throwable.

Some should become platforms.

Some should freeze under Space Time Bubble.

Some should appear only in one timeline.

---

# CHASE LEVELS

Create spectacular reverse-camera chase sequences.

Examples:

* giant prehistoric leviathan swimming toward camera while the octopus races toward the viewer
* recursive Mandelbrot wave devouring geometry behind you
* collapsing Atlantis
* enormous cosmic shark
* black hole propagating through an ocean
* thousands of jellyfish forming a pursuing wall
* timeline deletion literally erasing the stage

Camera readability is critical.

The player must be able to see upcoming hazards.

---

# CREATURE / VEHICLE LEVELS

Occasionally change the game radically.

Examples:

* ride a manta ray at enormous speed
* control a miniature submarine
* surf a temporal current
* cling to a whale through hyperspace
* pilot a nautilus shell
* steer a jellyfish balloon
* escape on the back of a giant seahorse
* free-swimming 3D tunnel sequence

These should be short, polished palate cleansers—not replace the core platforming.

---

# BOSSES

Bosses are enormous psychedelic sea entities representing broken aspects of time.

Bosses should test mechanics rather than simply absorb damage.

Potential bosses:

* **The Trilobite King** — Cambrian armored titan
* **Medusa Meridian** — clock-faced cosmic jellyfish
* **The Recursive Crab** — every damaged claw generates smaller versions
* **The Chronophage** — eel that literally eats portions of the timeline
* **Eightfold Shadow** — alternate-universe evil octopus
* **Mandelmaw** — living Mandelbrot leviathan
* **The Eternal Nautilus** — final guardian spiraling infinitely inward

Every boss should contain multiple phases and culminate in acquiring a traversal power.

---

# CHECKPOINTS / DEATH / RESTART

Fast iteration is essential.

Death should restart almost immediately.

No long loading screens.

Use generous checkpoints while still rewarding perfect runs.

Death animations can be playful and surreal:

* octopus becomes bubbles
* becomes eight tiny versions
* pixelates into plankton
* fractalizes infinitely
* gets sucked backward through time
* transforms into an ammonite fossil
* turns into a cloud of ink

---

# CAMERA

The camera must receive enormous attention.

Implement:

* cinematic third-person follow camera
* collision avoidance
* framing volumes
* camera rails for authored sequences
* automatic yaw assistance
* platform-aware framing
* look-ahead
* speed FOV changes
* boss framing
* side-scroller camera
* chase camera
* swimming camera
* configurable camera sensitivity
* optional reduced camera motion

Never accept a camera that makes platforming difficult.

---

# GRAPHICS

Push Three.js/WebGPU exceptionally hard.

Use where appropriate:

* physically based rendering
* transmission
* subsurface scattering approximations
* iridescence
* procedural caustics
* volumetric underwater fog
* depth-dependent color absorption
* god rays
* animated kelp
* schools of fish
* bubble particles
* suspended particulate
* coral procedural animation
* bioluminescence
* chromatic effects
* fractal shaders
* Mandelbrot / Julia distance estimation
* signed-distance-field geometry
* GPU particles
* instancing
* indirect animation
* procedural tentacle animation
* screen-space effects
* bloom
* tone mapping
* temporal distortion
* refraction
* water surface rendering
* reactive vegetation
* destructible props
* excellent shadows
* dynamic lighting

But maintain exceptional frame pacing.

**Never sacrifice gameplay clarity for psychedelic effects.**

Important platforms, enemies and hazards must remain visually readable even when reality is exploding around them.

---

# FRACTALS

Do not treat "fractal" as a texture pasted everywhere.

Fractals should become architecture and gameplay.

Implement systems capable of rendering:

* Mandelbulbs
* Mandelbox structures
* Julia sets
* recursive coral
* recursive terrain
* L-systems
* reaction-diffusion patterns
* domain-warped procedural surfaces
* infinite tunnel illusions
* nested miniature worlds
* iterative geometry

Use GPU shaders and bounded iteration counts intelligently.

Levels can modify fractal parameters over time so architecture appears to grow, bloom and transform around the player.

---

# SOUND

Build a reactive psychedelic underwater soundtrack.

Blend:

* aquatic ambience
* dub
* psychedelic rock
* early electronic music
* modular synthesis
* glass percussion
* gamelan-like metallic tones
* reversed sounds
* hydrophone textures
* bubbling analog synths
* granular synthesis
* impossible spatial voices

Music should dynamically transition between exploration, platforming, chase, secret areas and boss phases.

Every major gameplay interaction needs strong sonic feedback.

---

# ACCESSIBILITY / OPTIONS

Include:

* keyboard remapping
* controller remapping
* camera sensitivity
* invert camera
* subtitles
* colorblind support
* reduced screen shake
* reduced chromatic aberration
* reduced flashing
* reduced psychedelic distortion
* motion-reduction mode
* configurable FOV where appropriate
* music/SFX/dialogue sliders
* performance presets

The psychedelic aesthetic must not prevent accessibility.

---

# ARCHITECTURE

Do not build everything inside one enormous file.

Build reusable systems for:

* character controller
* ability system
* camera
* animation
* interaction
* collectibles
* checkpoints
* save state
* level scripting
* world portals
* enemies
* boss state machines
* breakables
* timeline swapping
* fractals
* particles
* shaders
* audio
* UI
* controller input
* performance profiling
* asset loading

Levels should be data-driven wherever practical.

Maintain clean boundaries between simulation and presentation.

---

# PERFORMANCE

Target smooth gameplay on modern desktop hardware.

Use:

* instancing
* LOD
* spatial partitioning
* object pooling
* frustum culling
* occlusion strategies
* compressed textures
* GPU-friendly particles
* shader complexity controls
* asynchronous asset streaming
* reusable geometry/materials
* adaptive visual quality where sensible

Create an in-game performance/debug panel showing CPU, GPU where measurable, frame time, draw calls, triangles, textures and active entities.

Do not "optimize" by making the world visually barren.

---

# BUILD ORDER

Do not attempt twenty unfinished worlds simultaneously.

First create an extraordinarily polished **vertical slice**:

**Chrono-Reef Hub → one complete level → boss → ability unlock → second level requiring the new ability → replayable secret in level one.**

The first complete level must contain:

* polished character controller
* excellent camera
* combat
* breakables
* collectibles
* checkpoint
* death/restart
* secret route
* timeline mechanic
* several enemy types
* environmental hazard
* cinematic sequence
* chase/set-piece moment
* level ending
* scoring
* save progression
* ability unlock
* attractive UI
* sound
* music
* particle/VFX polish

Once this loop is genuinely excellent, fan its architecture outward into additional worlds.

---

# AGENT WORKFLOW

**Fan out sub-agents aggressively.**

Have specialized agents independently own:

1. player movement and feel
2. octopus procedural animation/tentacles
3. camera
4. platforming level design
5. underwater rendering
6. psychedelic/fractal shaders
7. environment art
8. enemies
9. bosses
10. collectibles/progression
11. temporal/dimension mechanics
12. particles/VFX
13. sound/music
14. UI/UX
15. controller/accessibility
16. performance
17. testing
18. visual QA
19. gameplay QA
20. architecture/code quality

Each discipline should `/loop`.

For every major milestone, launch separate critic agents.

One critic should evaluate **game feel**.

One should evaluate **visual quality**.

One should evaluate **level design**.

One should evaluate **performance and bugs**.

The critic agent must be extremely harsh.

Do not accept:

* "pretty good"
* "functional"
* "close enough"
* placeholder-looking environments
* generic primitives pretending to be finished assets
* floaty jumping
* weak camera
* empty levels
* repetitive obstacles
* broken collision
* cheap UI
* effects hiding poor art
* huge loading pauses
* unfinished transitions

When something fails, fix it and repeat the evaluation.

---

# VISUAL COMPARISON LOOP

Regularly capture gameplay screenshots from representative angles.

Have a separate visual critic compare the game **blind** against screenshots representing the quality bar of the best contemporary stylized AAA platformers.

Ask:

> Which image looks like the professionally shipped game?

Then ask why.

If our game loses, turn every criticism into actionable tasks and repeat.

Evaluate separately:

* silhouette
* lighting
* materials
* environmental density
* composition
* animation pose
* VFX
* depth
* color hierarchy
* UI
* readability
* sense of motion
* authored detail

Do not imitate copyrighted characters or assets.

Compare **quality**, not exact appearance.

---

# GAMEPLAY COMPARISON LOOP

The same standard applies to gameplay.

Have critic agents repeatedly evaluate:

* Is movement immediately fun?
* Are jumps predictable?
* Does the camera help rather than fight?
* Is every death understandable?
* Is there visual anticipation before hazards?
* Are levels teaching mechanics without excessive text?
* Is there meaningful escalation?
* Are secrets tempting?
* Does replaying for completion feel compelling?
* Do acquired powers fundamentally improve traversal?
* Are later stages testing combinations of earlier abilities?
* Does every stage contain at least one memorable idea?
* Would someone voluntarily continue playing after the first level?

If not, iterate.

---

# NO FAKE COMPLETENESS

Never claim an implementation works because code exists.

Actually run it.

Actually play it.

Actually inspect screenshots.

Actually test controls.

Actually test death and restart.

Actually test every collectible.

Actually test every ability.

Actually test every boss phase.

Actually test progression and save/load.

Actually profile performance.

Maintain a living checklist of broken, weak, placeholder or incomplete elements.

Do not mark them finished until they work.

---

# ART DIRECTION RULE

The final result should feel like somebody discovered an unreleased psychedelic AAA platformer from another timeline.

It should be:

**cute + mysterious + funny + cosmic + aquatic + mathematically impossible + occasionally terrifying.**

The octopus should remain charming and emotionally readable even when surrounded by overwhelming cosmic imagery.

Use visual contrast:

simple readable protagonist
against
insane impossible universe.

---

# FINAL DIRECTIVE

Make **OCTOPUS OF TIME** feel like a complete, commercially compelling 3D platformer rather than a Three.js experiment.

Take the precision, replayability, secret hunting, escalating unlockable abilities, varied stage formats and tightly authored progression of the greatest linear 3D platformers and combine them with rendering and environmental spectacle worthy of a modern game.

**Fan out sub-agents. Ultracode. Test everything. `/loop` on everything.**

Do not stop at the first implementation.

Do not stop when it works.

Do not stop when it looks good.

Keep iterating until movement, camera, level design, art, animation, performance, sound, progression, bosses, collectibles, UI and replayability all reinforce one another.

The benchmark is not:

> "Impressive for Three.js."

The benchmark is:

> **"This feels like a real game I would pay for."**

Start with the vertical slice immediately.
