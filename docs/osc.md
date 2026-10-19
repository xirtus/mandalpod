# MANDELPOD — THE REEF IS AN INSTRUMENT (OSC / MIDI)

Every move the octopus makes is a musical gesture. Every shell, pearl, enemy
and platform is a tuned instrument. The geometry itself conducts the score:
**X** pans and picks melodies, **Y** opens filters and climbs octaves,
**Z** (depth into the timeline) densifies the rhythm and quickens the pulse.

All of it streams out live as **OSC** and **MIDI** — and the game is also
*playable* over OSC.

## Quick start

```bash
npm run osc      # starts the bridge: ws :9130 → udp 127.0.0.1:57120
npm run dev      # play: http://localhost:5173
```

In-game: **Esc → THE REEF IS AN INSTRUMENT** → enable **OSC OUT** / **MIDI OUT**.
Generative instruments are on by default (toggle: *GENERATIVE INSTRUMENTS*).

Browsers cannot send UDP, so the game speaks binary OSC over a WebSocket to
`tools/osc-bridge.mjs` (zero dependencies), which relays to any UDP targets:

```bash
node tools/osc-bridge.mjs --ws 9130 --listen 9131 \
  --to 127.0.0.1:57120 --to 127.0.0.1:9000   # SC + Max/PD at once
```

MIDI needs no bridge: Web MIDI talks straight to your IAC bus / synths / DAW.
Notes arrive on the configured channel; geometry CCs on **CC 16=X, 17=Y,
18=Z, 19=speed, 20=height**.

## What plays what (the instrument map)

| Move | Instrument | Tuning |
|---|---|---|
| Scuttling (WASD) | soft mallets, one step per stride | X picks the scale degree, Y the octave |
| Jump / double jump | harp glissando | pitched from where you left the ground |
| Landing | taiko drum | velocity scaled by impact |
| **Spin (J / X)** | pentatonic pluck run | root from your X/Y position |
| Slam landing | gong + sub drop | — |
| Bounce sponge | mallet boing | position-tuned |
| Dash | flute run | position-tuned |
| Pearls | chimes | combo count climbs the scale — you write the melody |
| Shells / pods | shell-glass clusters | **each one pitched by its own world coordinates** |
| Enemies defeated | woodblock tumble | — |
| Checkpoints / gem / goal | chime & gong ceremonies | — |
| Timeline swap (T) | gong + the whole reef transposes | healthy ↔ dead reef keys |
| Falling fast | flute dive-whistle | — |

## OSC address reference — OUT

```
/mandelpod/note <inst:s> <midi:i> <vel:f> <dur:f> <x:f> <y:f> <z:f>
/mandelpod/player/pos <x> <y> <z>        (streamed at oscRate Hz)
/mandelpod/player/vel <x> <y> <z>
/mandelpod/player/state <state:s> <grounded:i> <speed:f>
/mandelpod/mod/x|y|z|speed|height <0..1> (the "geometry oscillators")
/mandelpod/event/jump|doubleJump|land|spin|slam|bounce|dash|break|…
/mandelpod/hello
```

## OSC address reference — IN (play the game from a controller)

Send to the bridge's UDP-IN port (default `127.0.0.1:9131`):

```
/mandelpod/in/move <x -1..1> <z -1..1>    analog stick
/mandelpod/in/stop                        release stick
/mandelpod/in/press <jump|spin|slam|dash|swap|pause|…>
/mandelpod/in/hold <action> <seconds>
/mandelpod/in/level <level1|level2|hub|boss1>
/mandelpod/in/mode <explore|chase|boss|results|title>
/mandelpod/in/param/bpm <40..220>
/mandelpod/in/param/volMusic|volSfx|volAmbience|volSonify <0..1>
/mandelpod/in/param/timescale <0.1..3>
/mandelpod/in/param/psychedelia <0..2>
/mandelpod/in/param/caustics <0..1.5>
```

## SuperCollider example

```supercollider
// boot server, then:
SynthDef(\mallet, { |freq=440, vel=0.7, dur=0.3, pan=0|
  var sig = SinOsc.ar(freq) * 0.6 + SinOsc.ar(freq*3.01) * 0.15;
  Out.ar(0, Pan2.ar(sig * EnvGen.kr(Env.perc(0.003, dur), doneAction:2) * vel, pan));
}).add;

OSCdef(\mp_notes, { |msg|
  // /mandelpod/note inst midi vel dur x y z
  Synth(\mallet, [\freq, msg[2].midicps, \vel, msg[3], \dur, msg[4],
                  \pan, (msg[5] / 9).clip(-1, 1)]);
}, '/mandelpod/note');

// geometry as LFOs: height → a drone's cutoff
OSCdef(\mp_mod, { |msg| msg.postln }, '/mandelpod/mod/y');
```

## Max/MSP / PD

`udpreceive 57120` → `route /mandelpod/note /mandelpod/mod/x …` — done.

## TouchDesigner

OSC In CHOP, port `57120` — channels appear per address; wire
`/mandelpod/mod/*` into any parameter.

## Test harness

`window.__game.osc` and `window.__game.gen` are exposed; the QA bot
(`tools/play.mjs`, `tools/autopilot.mjs`) exercises the same event bus the
instruments listen to, so every automated playtest is also a synth jam.
