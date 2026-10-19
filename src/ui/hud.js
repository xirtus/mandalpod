// ============================================================================
// MANDELPOD — UI/UX Department
// AAA-feeling HUD + screens: pearlescent glass panels, glowing iconography,
// animated counters, combo pearl counter, timeline indicator, boss bar,
// results ceremony, ability unlock ceremony. All DOM (crisp text) with
// pointer-events only where needed.
// ============================================================================

const CSS = `
#ui * { box-sizing: border-box; margin: 0; padding: 0; }
.mpd-hud { position:absolute; inset:0; font-family:'Avenir Next','Segoe UI',system-ui,sans-serif; color:#eaf6ff; }
.mpd-corner { position:absolute; top:22px; left:26px; display:flex; flex-direction:column; gap:10px; }
.mpd-counter { display:flex; align-items:center; gap:10px; background:linear-gradient(135deg, rgba(10,30,60,.55), rgba(30,10,60,.45));
  border:1px solid rgba(120,220,255,.35); border-radius:16px; padding:7px 16px 7px 10px; backdrop-filter: blur(6px);
  box-shadow: 0 0 18px rgba(60,200,255,.15), inset 0 0 12px rgba(80,220,255,.08); width:max-content;
  transition: transform .12s ease; }
.mpd-counter.pop { transform: scale(1.12); }
.mpd-counter .icon { width:30px; height:30px; filter: drop-shadow(0 0 6px rgba(255,220,120,.8)); }
.mpd-counter .val { font-size:22px; font-weight:700; letter-spacing:1px; text-shadow:0 0 12px rgba(120,220,255,.6); min-width:52px; }
.mpd-counter .sub { font-size:11px; opacity:.75; letter-spacing:2px; }
.mpd-right { position:absolute; top:22px; right:26px; display:flex; flex-direction:column; align-items:flex-end; gap:10px; }
.mpd-lives { display:flex; gap:6px; }
.mpd-life { width:26px; height:26px; border-radius:50%; background: radial-gradient(circle at 35% 30%, #ff8fd0, #c03a90 65%, #701a50);
  box-shadow: 0 0 10px rgba(255,110,200,.6); border:1.5px solid rgba(255,200,235,.5); transition: all .3s; }
.mpd-life.off { background: rgba(60,70,100,.4); box-shadow:none; border-color: rgba(120,140,180,.3); }
.mpd-timeline { display:flex; align-items:center; gap:8px; background:rgba(10,20,50,.5); border-radius:14px; padding:6px 14px;
  border:1px solid rgba(120,220,255,.3); backdrop-filter: blur(6px); }
.mpd-timeline .orb { width:16px; height:16px; border-radius:50%; transition: all .4s; }
.mpd-timeline .lbl { font-size:12px; letter-spacing:2.5px; font-weight:600; opacity:.9; }
.mpd-hint { position:absolute; bottom:110px; width:100%; text-align:center; font-size:15px; letter-spacing:1.5px; opacity:0;
  text-shadow:0 2px 12px rgba(0,20,40,.9); transition: opacity .4s; font-weight:500; }
.mpd-hint.show { opacity:.95; }
.mpd-hint kbd { background:rgba(120,220,255,.15); border:1px solid rgba(120,220,255,.45); border-radius:6px; padding:2px 9px; margin:0 3px;
  font-family:inherit; font-weight:700; box-shadow:0 2px 0 rgba(60,150,200,.4); }
.mpd-bossbar { position:absolute; bottom:36px; left:50%; transform:translateX(-50%); width:min(620px,70vw); opacity:0; transition:opacity .6s; }
.mpd-bossbar.show { opacity:1; }
.mpd-bossbar .name { text-align:center; font-size:15px; letter-spacing:4px; font-weight:700; margin-bottom:7px; text-shadow:0 0 14px rgba(255,80,120,.7); }
.mpd-bossbar .track { height:14px; border-radius:8px; background:rgba(20,10,40,.65); border:1px solid rgba(255,120,160,.4); overflow:hidden;
  box-shadow:0 0 20px rgba(255,60,120,.25); }
.mpd-bossbar .fill { height:100%; width:100%; border-radius:8px; background:linear-gradient(90deg,#ff3a6c,#ff9d2e,#ffd94d); transition:width .35s ease;
  box-shadow:0 0 14px rgba(255,120,80,.8); }
.mpd-vignette-hurt { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .25s;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(255,30,60,.45) 100%); }
/* ---------------- Screens ---------------- */
.mpd-screen { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;
  background: radial-gradient(ellipse at 50% 28%, rgba(10,26,66,.42), rgba(3,2,18,.78)); backdrop-filter: blur(2.5px);
  transition: opacity .5s; opacity:1; overflow-y:auto; padding:24px 0; }
.mpd-screen.hidden { opacity:0; pointer-events:none; }
.mpd-title { font-size: clamp(44px, 8vw, 96px); font-weight:800; letter-spacing: .06em;
  background: linear-gradient(180deg, #aef6ff 10%, #39c8ff 40%, #c05fff 75%, #ff6bd8);
  -webkit-background-clip:text; background-clip:text; color:transparent;
  filter: drop-shadow(0 0 26px rgba(90,200,255,.45)) drop-shadow(0 4px 18px rgba(192,95,255,.35)); text-align:center; line-height:1.04; }
.mpd-subtitle { margin-top:14px; font-size: clamp(13px,1.6vw,19px); letter-spacing:.42em; color:#9fd8ff; opacity:.85; text-align:center; }
.mpd-menu { margin-top:64px; display:flex; flex-direction:column; gap:14px; align-items:center; }
.mpd-btn { font-size:19px; letter-spacing:3px; font-weight:600; color:#cfeeff; background:linear-gradient(135deg, rgba(20,50,100,.5), rgba(50,20,90,.4));
  border:1px solid rgba(120,220,255,.35); padding:13px 54px; border-radius:18px; cursor:pointer; min-width:320px; text-align:center;
  transition: all .18s; backdrop-filter: blur(4px); }
.mpd-btn:hover, .mpd-btn.sel { border-color:rgba(160,240,255,.9); color:#fff; transform:scale(1.045);
  box-shadow:0 0 24px rgba(80,220,255,.35), inset 0 0 16px rgba(120,230,255,.12); }
.mpd-foot { position:absolute; bottom:26px; font-size:12px; letter-spacing:2px; color:#7fb8d8; opacity:.7; text-align:center; width:100%; }
.mpd-big { font-size: clamp(34px,5vw,64px); font-weight:800; letter-spacing:.08em; text-align:center;
  background:linear-gradient(180deg,#fff,#8fe8ff); -webkit-background-clip:text; background-clip:text; color:transparent;
  filter:drop-shadow(0 0 22px rgba(90,200,255,.5)); }
/* Results */
.mpd-results-grid { margin-top:34px; display:grid; grid-template-columns:auto auto; gap:12px 42px; font-size:19px; letter-spacing:1.5px; }
.mpd-results-grid .k { color:#9fd8ff; opacity:.85; }
.mpd-results-grid .v { font-weight:700; text-align:right; text-shadow:0 0 10px rgba(120,220,255,.5); }
.mpd-medal { margin-top:26px; margin-bottom:30px; font-size:27px; font-weight:800; letter-spacing:3px; }
.mpd-medal.sapphire { color:#4fd8ff; text-shadow:0 0 22px rgba(80,220,255,.8); }
.mpd-medal.gold { color:#ffd94d; text-shadow:0 0 22px rgba(255,220,80,.8); }
.mpd-medal.platinum { color:#e8f4ff; text-shadow:0 0 26px rgba(220,240,255,.9); }
.mpd-medal.none { color:#8aa0b8; }
/* Ability unlock */
.mpd-ability { text-align:center; }
.mpd-ability .glyph { font-size:110px; filter:drop-shadow(0 0 34px rgba(90,255,220,.7)); animation: mpdFloat 2.4s ease-in-out infinite; }
@keyframes mpdFloat { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-14px) } }
/* Death */
.mpd-death { font-size:clamp(30px,4.4vw,54px); font-weight:800; letter-spacing:.14em; color:#ff8fb0;
  text-shadow:0 0 30px rgba(255,60,110,.65); animation: mpdDeathIn .5s ease; }
@keyframes mpdDeathIn { from { transform:scale(1.6); opacity:0 } to { transform:scale(1); opacity:1 } }
.mpd-toast { position:absolute; top:88px; width:100%; text-align:center; font-size:21px; font-weight:700; letter-spacing:3px;
  color:#aef6ff; text-shadow:0 0 18px rgba(90,220,255,.8); opacity:0; transition:opacity .3s; }
.mpd-toast.show { opacity:1; }
/* Debug */
.mpd-debug { position:absolute; bottom:14px; left:14px; font:11px/1.6 ui-monospace,monospace; color:#7fe8c8;
  background:rgba(4,12,24,.72); padding:10px 14px; border-radius:10px; border:1px solid rgba(80,255,200,.25); white-space:pre; }
/* ---------------- The Instrument (OSC/MIDI) ---------------- */
.mpd-oscchip { display:flex; align-items:center; gap:7px; background:rgba(10,20,50,.5); border-radius:12px; padding:4px 12px;
  border:1px solid rgba(120,220,255,.25); font-size:10px; letter-spacing:2px; font-weight:700; }
.mpd-oscchip .dot { width:8px; height:8px; border-radius:50%; background:#666; transition:all .3s; }
.mpd-oscchip.open .dot { background:#39ffd0; box-shadow:0 0 8px #39ffd0; }
.mpd-oscchip.connecting .dot { background:#ffd94d; box-shadow:0 0 8px #ffd94d; animation:mpdPulse 1s infinite; }
.mpd-oscchip.error .dot { background:#ff5a7a; box-shadow:0 0 8px #ff5a7a; }
@keyframes mpdPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
.mpd-soundpanel { margin-top:26px; width:min(560px,86vw); background:linear-gradient(135deg, rgba(10,30,60,.5), rgba(30,10,60,.4));
  border:1px solid rgba(120,220,255,.3); border-radius:18px; padding:18px 22px; backdrop-filter:blur(6px);
  font-size:13px; letter-spacing:1.5px; }
.mpd-soundpanel .sp-title { font-size:14px; font-weight:800; letter-spacing:3px; color:#aef6ff; text-shadow:0 0 14px rgba(90,220,255,.6); margin-bottom:12px; text-align:center; }
.mpd-soundpanel .row { display:flex; align-items:center; gap:10px; margin:9px 0; color:#cfeeff; flex-wrap:wrap; }
.mpd-soundpanel .row .dim { opacity:.55; font-size:11px; letter-spacing:1px; }
.mpd-soundpanel input[type=checkbox] { width:17px; height:17px; accent-color:#39c8ff; cursor:pointer; }
.mpd-soundpanel input[type=text], .mpd-soundpanel select, .mpd-soundpanel input[type=number] {
  background:rgba(6,18,38,.7); color:#aef6ff; border:1px solid rgba(120,220,255,.35); border-radius:8px; padding:5px 10px;
  font:12px ui-monospace,monospace; letter-spacing:.5px; outline:none; min-width:0; }
.mpd-soundpanel input[type=text] { flex:1; }
.mpd-soundpanel input[type=range] { flex:1; accent-color:#c05fff; }
.mpd-soundpanel .st { font-size:10px; letter-spacing:2px; font-weight:700; }
.mpd-soundpanel .st.open { color:#39ffd0; } .mpd-soundpanel .st.connecting { color:#ffd94d; }
.mpd-soundpanel .st.error, .mpd-soundpanel .st.unavailable { color:#ff5a7a; } .mpd-soundpanel .st.off { color:#788; }
.mpd-soundpanel code { background:rgba(120,220,255,.12); padding:1px 7px; border-radius:6px; font-size:11px; }
.mpd-btn.mpd-mini { min-width:0; padding:7px 22px; font-size:13px; border-radius:12px; }
`;

const PEARL_SVG = `<svg class="icon" viewBox="0 0 32 32"><defs><radialGradient id="pg" cx="38%" cy="32%"><stop offset="0%" stop-color="#fff8e0"/><stop offset="45%" stop-color="#ffd94d"/><stop offset="100%" stop-color="#c98a1a"/></radialGradient></defs><circle cx="16" cy="16" r="12" fill="url(#pg)"/><ellipse cx="12" cy="11" rx="4" ry="2.6" fill="#fffdf4" opacity=".85"/></svg>`;
const SHELL_SVG = `<svg class="icon" viewBox="0 0 32 32"><path d="M16 4 C8 8 5 15 5 22 L27 22 C27 15 24 8 16 4Z" fill="#e8a86a" stroke="#a06830" stroke-width="1.4"/><path d="M16 6 L16 21 M11 8 L9 21 M21 8 L23 21" stroke="#a06830" stroke-width="1.2" fill="none"/><circle cx="16" cy="25.5" r="3.4" fill="#c05fff"/></svg>`;

export class UI {
  constructor(game) {
    this.game = game;
    // Any screen open → Enter/Space/Gamepad-A activates its primary button.
    // (A modal that only answers the mouse feels like a freeze to a keyboard player.)
    window.addEventListener('keydown', (e) => {
      if (!['Enter', 'Space', 'NumpadEnter'].includes(e.code)) return;
      const btn = this.$('mpd-screens')?.querySelector('.mpd-btn');
      if (btn) { e.preventDefault(); btn.click(); }
    });
    this.root = document.getElementById('ui');
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.root.innerHTML = `
      <div class="mpd-hud">
        <div class="mpd-corner">
          <div class="mpd-counter" id="mpd-pearls">${PEARL_SVG}<span class="val" id="mpd-pearls-v">0</span><span class="sub">PEARLS</span></div>
          <div class="mpd-counter" id="mpd-shells">${SHELL_SVG}<span class="val" id="mpd-shells-v">0/0</span><span class="sub">MEMORIES</span></div>
        </div>
        <div class="mpd-right">
          <div class="mpd-lives" id="mpd-lives"></div>
          <div class="mpd-timeline" id="mpd-timeline" style="display:none">
            <div class="orb" id="mpd-tl-orb"></div><span class="lbl" id="mpd-tl-lbl">HEALTHY REEF</span>
          </div>
          <div class="mpd-oscchip" id="mpd-oscchip" style="display:none"><div class="dot"></div><span id="mpd-oscchip-lbl">OSC</span></div>
        </div>
        <div class="mpd-hint" id="mpd-hint"></div>
        <div class="mpd-toast" id="mpd-toast"></div>
        <div class="mpd-bossbar" id="mpd-boss"><div class="name" id="mpd-boss-name"></div><div class="track"><div class="fill" id="mpd-boss-fill"></div></div></div>
        <div class="mpd-vignette-hurt" id="mpd-hurt"></div>
      </div>
      <div id="mpd-screens"></div>
      <div class="mpd-debug" id="mpd-debug" style="display:none"></div>`;

    this.$ = (id) => document.getElementById(id);
    this._pearlCount = 0;
    this._shellCount = 0;
    this._hintTimer = null;
    this._toastTimer = null;
    this.setLives(5);
  }

  // ---------------- HUD ----------------
  setPearls(n) {
    if (n === this._pearlCount) return;
    this._pearlCount = n;
    this.$('mpd-pearls-v').textContent = n;
    const el = this.$('mpd-pearls');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
  setShells(n, total) {
    this._shellCount = n;
    this.$('mpd-shells-v').textContent = `${n}/${total}`;
    const el = this.$('mpd-shells');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
  setLives(n) {
    const c = this.$('mpd-lives');
    c.innerHTML = '';
    for (let i = 0; i < Math.max(n, 0); i++) c.insertAdjacentHTML('beforeend', `<div class="mpd-life"></div>`);
    if (n === 0) c.insertAdjacentHTML('beforeend', `<div class="mpd-life off"></div>`);
  }
  setTimeline(tl, visible = true) {
    const el = this.$('mpd-timeline');
    el.style.display = visible ? 'flex' : 'none';
    const orb = this.$('mpd-tl-orb');
    if (tl === 'A') { orb.style.background = 'radial-gradient(circle at 35% 30%, #aef6ff, #35d5ff 60%, #1a6a9a)'; orb.style.boxShadow = '0 0 12px rgba(80,220,255,.9)'; this.$('mpd-tl-lbl').textContent = 'HEALTHY REEF'; }
    else { orb.style.background = 'radial-gradient(circle at 35% 30%, #ffe9b0, #ff9d2e 60%, #9a4a1a)'; orb.style.boxShadow = '0 0 12px rgba(255,160,60,.9)'; this.$('mpd-tl-lbl').textContent = 'DEAD REEF'; }
  }
  hint(html, dur = 3.4) {
    const el = this.$('mpd-hint');
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => el.classList.remove('show'), dur * 1000);
  }
  toast(text, dur = 2.2) {
    const el = this.$('mpd-toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), dur * 1000);
  }
  hurtFlash() {
    const el = this.$('mpd-hurt');
    el.style.opacity = 1;
    setTimeout(() => el.style.opacity = 0, 320);
  }
  bossBar(show, name = '', frac = 1) {
    this.$('mpd-boss').classList.toggle('show', show);
    if (name) this.$('mpd-boss-name').textContent = name;
    this.$('mpd-boss-fill').style.width = `${Math.max(0, Math.min(frac, 1)) * 100}%`;
  }
  debug(text) {
    const el = this.$('mpd-debug');
    el.style.display = text ? 'block' : 'none';
    if (text) el.textContent = text;
  }
  setOscStatus(oscS, midiS) {
    const chip = this.$('mpd-oscchip');
    if (!chip) return;
    const enabled = this.game?.save?.data.options.oscEnabled || this.game?.save?.data.options.midiEnabled;
    chip.style.display = enabled ? 'flex' : 'none';
    if (!enabled) return;
    chip.className = `mpd-oscchip ${oscS === 'open' ? 'open' : oscS === 'connecting' ? 'connecting' : oscS === 'error' ? 'error' : ''}`;
    this.$('mpd-oscchip-lbl').textContent =
      `OSC ${oscS === 'open' ? '●' : oscS}${midiS && midiS !== 'off' ? ` · MIDI ${midiS === 'open' ? '●' : midiS}` : ''}`;
  }

  // ---------------- Screens ----------------
  _screen(html) {
    const wrap = this.$('mpd-screens');
    wrap.innerHTML = `<div class="mpd-screen ui-clickable">${html}</div>`;
    this.root.querySelector('.mpd-hud').style.display = 'none';   // chrome behind screens
    return wrap.firstElementChild;
  }
  clearScreens() {
    clearInterval(this._panelTimer);
    this._panelTimer = null;
    this.$('mpd-screens').innerHTML = '';
    this.root.querySelector('.mpd-hud').style.display = '';
  }

  title(onStart) {
    const s = this._screen(`
      <div class="mpd-title">MANDELPOD</div>
      <div class="mpd-subtitle" style="margin-bottom:8px">PSYCHEDELIC OCTOPUS IN THE SEA OF SPACETIME</div>
      <div class="mpd-menu">
        <div class="mpd-btn" id="mpd-start">▶&nbsp;&nbsp;ENTER THE OCEAN OF TIME</div>
      </div>
      <div class="mpd-foot">WASD MOVE&nbsp;&nbsp;·&nbsp;&nbsp;SPACE JUMP&nbsp;&nbsp;·&nbsp;&nbsp;J SPIN&nbsp;&nbsp;·&nbsp;&nbsp;L SLAM&nbsp;&nbsp;·&nbsp;&nbsp;T SWAP TIMELINE&nbsp;&nbsp;·&nbsp;&nbsp;GAMEPAD SUPPORTED</div>`);
    s.querySelector('#mpd-start').addEventListener('click', onStart);
    return s;
  }

  death(onRespawn) {
    const s = this._screen(`<div class="mpd-death">THE CURRENT TAKES YOU</div>`);
    setTimeout(() => { this.clearScreens(); onRespawn(); }, 1400);
    return s;
  }

  results(stats, onContinue) {
    const medalClass = stats.relicRank >= 3 ? 'platinum' : stats.relicRank === 2 ? 'gold' : stats.relicRank === 1 ? 'sapphire' : 'none';
    const medalName = ['NO RELIC', '✦ SAPPHIRE RELIC', '✦✦ GOLD RELIC', '✦✦✦ PLATINUM RELIC'][stats.relicRank];
    const s = this._screen(`
      <div class="mpd-big">TIMELINE RESTORED</div>
      <div class="mpd-results-grid">
        <div class="k">COMPLETION TIME</div><div class="v">${stats.time.toFixed(1)}s</div>
        <div class="k">DEATHS</div><div class="v">${stats.deaths}</div>
        <div class="k">SPACE-TIME PEARLS</div><div class="v">${stats.pearls}</div>
        <div class="k">MEMORY SHELLS</div><div class="v">${stats.shells}/${stats.shellsTotal}</div>
        <div class="k">HIDDEN FRACTAL</div><div class="v">${stats.fractal ? '◆ FOUND' : '—'}</div>
        <div class="k">PERFECT PEARL</div><div class="v">${stats.perfect ? '◆ FLAWLESS' : '—'}</div>
      </div>
      <div class="mpd-medal ${medalClass}">${medalName}</div>
      <div class="mpd-menu"><div class="mpd-btn" id="mpd-continue">CONTINUE</div></div>`);
    s.querySelector('#mpd-continue').addEventListener('click', onContinue);
    return s;
  }

  abilityUnlock(name, desc, glyph, onContinue) {
    const s = this._screen(`
      <div class="mpd-ability">
        <div class="glyph">${glyph}</div>
        <div class="mpd-big" style="font-size:clamp(26px,3.6vw,44px)">ABILITY AWAKENED</div>
        <div style="margin-top:16px;font-size:30px;font-weight:800;letter-spacing:4px;color:#7fffe8;text-shadow:0 0 24px rgba(90,255,220,.8)">${name}</div>
        <div style="margin-top:12px;font-size:17px;color:#cfeeff;opacity:.9;max-width:520px;line-height:1.6">${desc}</div>
      </div>
      <div class="mpd-menu"><div class="mpd-btn" id="mpd-continue">EMBRACE IT</div></div>`);
    s.querySelector('#mpd-continue').addEventListener('click', onContinue);
    return s;
  }

  pause(onResume, onQuit) {
    const o = this.game.save.data.options;
    const s = this._screen(`
      <div class="mpd-big">SUSPENDED IN TIME</div>
      <div class="mpd-menu">
        <div class="mpd-btn" id="mpd-resume">RESUME</div>
        <div class="mpd-btn" id="mpd-quit">RETURN TO CHRONO-REEF</div>
      </div>
      <div class="mpd-soundpanel">
        <div class="sp-title">✦ THE REEF IS AN INSTRUMENT ✦</div>
        <label class="row"><input type="checkbox" id="mpd-sonify" ${o.sonify ? 'checked' : ''}> GENERATIVE INSTRUMENTS <span class="dim">every move plays a note</span></label>
        <label class="row"><input type="checkbox" id="mpd-geoscore" ${o.geoScore ? 'checked' : ''}> GEOMETRY CONDUCTS THE SCORE <span class="dim">x / y / z bend the music</span></label>
        <div class="row"><span style="min-width:128px">INSTRUMENT VOL</span><input type="range" id="mpd-volsonify" min="0" max="1" step="0.05" value="${o.volSonify}"></div>
        <label class="row"><input type="checkbox" id="mpd-oscen" ${o.oscEnabled ? 'checked' : ''}> OSC OUT <span class="dim">notes + position stream → synths</span></label>
        <div class="row"><span style="min-width:52px">RELAY</span><input type="text" id="mpd-oscurl" value="${o.oscUrl}" spellcheck="false"><span class="st" id="mpd-osc-st"></span></div>
        <label class="row"><input type="checkbox" id="mpd-midien" ${o.midiEnabled ? 'checked' : ''}> MIDI OUT <span class="dim">notes + CC 16-20 (x,y,z,speed,height)</span></label>
        <div class="row"><select id="mpd-mididev" style="flex:1"><option value="">(any device)</option></select><span>CH</span><input type="number" id="mpd-midich" min="1" max="16" value="${(o.midiChannel ?? 0) + 1}" style="width:56px"><span class="st" id="mpd-midi-st"></span></div>
        <div class="row dim" style="font-size:11px;justify-content:center">bridge: <code>npm run osc</code> → SuperCollider <code>:57120</code> · control the game: <code>/mandelpod/in/…</code> · full map in <code>docs/osc.md</code></div>
        <div class="row" style="justify-content:center"><div class="mpd-btn mpd-mini" id="mpd-testnote">♪ TEST THE INSTRUMENT</div></div>
      </div>`);
    s.querySelector('#mpd-resume').addEventListener('click', onResume);
    s.querySelector('#mpd-quit').addEventListener('click', onQuit);

    // ---- Instrument panel wiring ----
    const g = this.game;
    const commit = () => { g.save.commit(); g.osc?.applyOptions(); refresh(); };
    const refresh = () => {
      const st = (id, v) => { const el = s.querySelector(id); if (el) { el.textContent = v.toUpperCase(); el.className = `st ${v}`; } };
      st('#mpd-osc-st', g.osc?.status ?? 'off');
      st('#mpd-midi-st', g.osc?.midiStatus ?? 'off');
    };
    s.querySelector('#mpd-sonify').addEventListener('change', (e) => { o.sonify = e.target.checked; commit(); });
    s.querySelector('#mpd-geoscore').addEventListener('change', (e) => { o.geoScore = e.target.checked; commit(); });
    s.querySelector('#mpd-volsonify').addEventListener('input', (e) => { o.volSonify = +e.target.value; commit(); });
    s.querySelector('#mpd-oscen').addEventListener('change', (e) => { o.oscEnabled = e.target.checked; commit(); this.setOscStatus(g.osc.status, g.osc.midiStatus); });
    s.querySelector('#mpd-oscurl').addEventListener('change', (e) => { o.oscUrl = e.target.value.trim() || 'ws://127.0.0.1:9130'; commit(); });
    s.querySelector('#mpd-midien').addEventListener('change', (e) => { o.midiEnabled = e.target.checked; commit(); });
    s.querySelector('#mpd-midich').addEventListener('change', (e) => { o.midiChannel = Math.max(0, Math.min(15, (+e.target.value || 1) - 1)); commit(); });
    s.querySelector('#mpd-mididev').addEventListener('change', (e) => { o.midiOut = e.target.value; commit(); });
    s.querySelector('#mpd-testnote').addEventListener('click', () => {
      g.audio.start();
      g.gen?.gliss('chime', 69, [0, 3, 7, 12], 70, { vel: 0.6, dur: 0.5 });
    });
    // Populate MIDI devices (async — Web MIDI may need permission)
    if (g.osc && navigator.requestMIDIAccess) {
      const fill = () => {
        const sel = s.querySelector('#mpd-mididev');
        if (!sel?.isConnected) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">(any device)</option>' + g.osc.midiOutputs().map((n) => `<option ${n === o.midiOut ? 'selected' : ''}>${n}</option>`).join('');
        if (cur) sel.value = cur;
      };
      navigator.requestMIDIAccess().then((acc) => { fill(); acc.onstatechange = fill; }).catch(() => {});
      fill();
    }
    refresh();
    this._panelTimer = setInterval(refresh, 900);
    return s;
  }
}
