// Editor shell: project state, panels, timeline, inspector, playback, the
// one-click auto edit, and real-time export with sound.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = t => {
  t = Math.max(0, t || 0);
  const m = Math.floor(t / 60), s = Math.floor(t % 60), cs = Math.floor((t % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};

const ASPECTS = { '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080], '16:9': [1920, 1080] };

const LOOK_BASE = { brightness: 1, contrast: 1, saturate: 1, hue: 0, sepia: 0, grayscale: 0, tint: '#ff9a3c', tintAmt: 0, vignette: 0, grain: 0, glow: 0, letterbox: 0 };
const LOOK_PRESETS = {
  none: { label: 'Original' },
  punchy: { label: 'Punchy', contrast: 1.15, saturate: 1.3, brightness: 1.03, vignette: 0.3, grain: 0.08 },
  cinematic: { label: 'Cinematic', contrast: 1.12, saturate: 0.88, brightness: 0.97, tint: '#ff8a3d', tintAmt: 0.18, vignette: 0.45, grain: 0.15, letterbox: 0.06 },
  warm: { label: 'Golden', brightness: 1.04, contrast: 1.05, saturate: 1.12, sepia: 0.12, tint: '#ffb347', tintAmt: 0.15, vignette: 0.2 },
  cool: { label: 'Cool', contrast: 1.08, saturate: 1.05, hue: -8, tint: '#3da5ff', tintAmt: 0.18, vignette: 0.25 },
  vintage: { label: 'Vintage', contrast: 0.95, saturate: 0.8, sepia: 0.35, brightness: 1.02, vignette: 0.5, grain: 0.35 },
  noir: { label: 'Noir', grayscale: 1, contrast: 1.35, brightness: 0.95, vignette: 0.55, grain: 0.2 },
  dreamy: { label: 'Dreamy', brightness: 1.08, contrast: 0.95, saturate: 1.15, glow: 0.45, tint: '#ff9ad5', tintAmt: 0.12 },
  neon: { label: 'Neon', contrast: 1.18, saturate: 1.7, hue: -12, glow: 0.3, vignette: 0.35 },
};

const CAPTION_PRESETS = {
  bold: { label: 'Bold pop', font: 'Montserrat', size: 86, upper: true, color: '#ffffff', highlight: '#ffd400', mode: 'word', stroke: '#000000', strokeW: 9, shadow: true, boxOn: false, box: '#000000', boxAlpha: 0.6, y: 0.7, words: 3, anim: 'pop' },
  loud: { label: 'Loud', font: 'Luckiest Guy', size: 100, upper: true, color: '#ffffff', highlight: '#3dff6e', mode: 'word', stroke: '#000000', strokeW: 11, shadow: true, boxOn: false, box: '#000000', boxAlpha: 0.6, y: 0.66, words: 2, anim: 'pop' },
  karaoke: { label: 'Highlight box', font: 'Poppins', size: 72, upper: false, color: '#ffffff', highlight: '#7b3fe4', mode: 'box', stroke: '#000000', strokeW: 0, shadow: true, boxOn: false, box: '#000000', boxAlpha: 0.6, y: 0.72, words: 4, anim: 'pop' },
  clean: { label: 'Clean subtitle', font: 'DM Sans', size: 54, upper: false, color: '#ffffff', highlight: '#ffffff', mode: 'none', stroke: '#000000', strokeW: 0, shadow: false, boxOn: true, box: '#000000', boxAlpha: 0.62, y: 0.82, words: 7, anim: 'fade' },
  reveal: { label: 'Word reveal', font: 'Anton', size: 96, upper: true, color: '#ffffff', highlight: '#ff5a36', mode: 'reveal', stroke: '#000000', strokeW: 6, shadow: true, boxOn: false, box: '#000000', boxAlpha: 0.6, y: 0.5, words: 4, anim: 'none' },
  typewriter: { label: 'Typewriter', font: 'Courier Prime', size: 64, upper: false, color: '#111111', highlight: '#111111', mode: 'reveal', stroke: '#ffffff', strokeW: 0, shadow: false, boxOn: true, box: '#ffffff', boxAlpha: 0.92, y: 0.75, words: 5, anim: 'none' },
  neon: { label: 'Neon', font: 'Righteous', size: 80, upper: true, color: '#ffffff', highlight: '#29f3ff', mode: 'word', stroke: '#ff2fb3', strokeW: 6, shadow: true, boxOn: false, box: '#000000', boxAlpha: 0.6, y: 0.7, words: 3, anim: 'pop' },
  readalong: { label: 'Read-along', font: 'Archivo Black', size: 72, upper: false, color: '#ffffff', highlight: '#ffffff', mode: 'dim', stroke: '#000000', strokeW: 6, shadow: true, boxOn: false, box: '#000000', boxAlpha: 0.6, y: 0.72, words: 5, anim: 'slide' },
};

const OVERLAY_BASE = { type: 'text', text: '', x: 0.5, y: 0.3, rotation: 0, anim: 'pop', font: 'Montserrat', size: 90, upper: false, color: '#ffffff', bgOn: false, bg: '#000000', bgAlpha: 1, stroke: '#000000', strokeW: 0, shadow: true, dur: 2.5 };
const TEMPLATES = {
  hook: { label: 'Hook title', text: 'WAIT FOR IT', font: 'Anton', size: 120, upper: true, color: '#111111', bgOn: true, bg: '#ffd400', y: 0.2, rotation: -2, anim: 'pop' },
  headline: { label: 'Big headline', text: '3 things nobody tells you', font: 'Montserrat', size: 92, upper: true, strokeW: 10, y: 0.22, anim: 'slide-up', dur: 3 },
  number: { label: 'Big number', text: '$10K', font: 'Bebas Neue', size: 260, color: '#ffd400', strokeW: 12, y: 0.4, anim: 'zoom', dur: 2 },
  tag: { label: 'Label tag', text: 'BEFORE', font: 'Archivo Black', size: 64, bgOn: true, bg: '#ff3b5c', x: 0.27, y: 0.12, anim: 'slide-left', dur: 3 },
  quote: { label: 'Quote', text: '"This changed everything."', font: 'Playfair Display', size: 80, y: 0.35, anim: 'fade', dur: 3 },
  note: { label: 'Handwritten note', text: 'wait for it...', font: 'Caveat', size: 120, rotation: -6, y: 0.3, anim: 'wiggle' },
  typewriter: { label: 'Typewriter', text: 'POV: you finally get it', font: 'Courier Prime', size: 66, color: '#111111', bgOn: true, bg: '#ffffff', y: 0.18, anim: 'typewriter', shadow: false, dur: 3 },
  cta: { label: 'Call to action', text: 'Follow for more', font: 'Montserrat', size: 68, upper: true, bgOn: true, bg: '#ff3b5c', y: 0.25, anim: 'bounce' },
  lowerthird: { label: 'Name lower third', type: 'lowerthird', text: 'Your Name\nWhat you do · @yourhandle', font: 'Archivo Black', size: 64, bg: '#ff3b5c', x: 0.45, y: 0.58, anim: 'slide-left', dur: 4 },
  countdown: { label: 'Countdown 3-2-1', type: 'countdown', from: 3, font: 'Anton', size: 300, strokeW: 12, y: 0.45, anim: 'none', dur: 3 },
  arrow: { label: 'Arrow', type: 'shape', kind: 'arrow', color: '#ffd400', lineW: 16, w: 0.3, rotation: 30, y: 0.45, anim: 'draw', dur: 2 },
  circle: { label: 'Circle it', type: 'shape', kind: 'circle', color: '#ff3b5c', lineW: 12, w: 0.42, h: 0.26, y: 0.45, anim: 'draw', dur: 2 },
  underline: { label: 'Underline', type: 'shape', kind: 'underline', color: '#ffd400', lineW: 14, w: 0.5, y: 0.32, anim: 'draw', dur: 2 },
  box: { label: 'Highlight box', type: 'shape', kind: 'rect', color: '#ffffff', lineW: 10, w: 0.5, h: 0.2, y: 0.45, anim: 'draw', dur: 2 },
};
const EMOJIS = ['🔥', '😂', '🤯', '💰', '❤️', '✨', '👀', '💡', '🚀', '⏰', '✅', '❌', '📈', '🏆', '💇‍♀️', '💅', '🎉', '👇', '🙌', '😍', '🤔', '⚡', '💯', '🛑'];
const EMOJI_WORDS = [
  [/money|cash|dollar|\$|rich|paid|price|profit|sales?/i, '💰'], [/fire|hot|lit|crazy|insane/i, '🔥'],
  [/love|heart|obsessed/i, '❤️'], [/funny|laugh|lol|joke/i, '😂'], [/wow|shock|unbelievable|mind|blew/i, '🤯'],
  [/idea|tip|hack|secret|trick|learn/i, '💡'], [/time|fast|quick|minutes?|seconds?|hours?/i, '⏰'],
  [/win|best|top|goal|number one/i, '🏆'], [/stop|never|don'?t|wrong|mistake|avoid/i, '🛑'],
  [/grow|growth|increase|double|more/i, '📈'], [/hair|salon|cut|color|blonde|balayage|curl/i, '💇‍♀️'],
  [/beautiful|pretty|glow|shine|gorgeous/i, '✨'], [/look|watch|see/i, '👀'], [/why|how|what|\?/i, '🤔'],
];

// Inspector / panel field definitions. "ctx.key" entries override for one context.
const F = {
  text: { label: 'Text', type: 'textarea' }, font: { label: 'Font', type: 'font' },
  size: { label: 'Size', type: 'range', min: 16, max: 320, step: 1 }, upper: { label: 'All caps', type: 'check' },
  color: { label: 'Color', type: 'color' }, highlight: { label: 'Highlight', type: 'color' },
  mode: { label: 'Highlight style', type: 'select', options: [['word', 'Color the spoken word'], ['box', 'Box behind spoken word'], ['reveal', 'Reveal word by word'], ['dim', 'Dim upcoming words'], ['none', 'No highlight']] },
  stroke: { label: 'Outline', type: 'color' }, strokeW: { label: 'Outline width', type: 'range', min: 0, max: 30, step: 1 },
  shadow: { label: 'Drop shadow', type: 'check' },
  boxOn: { label: 'Background box', type: 'check' }, box: { label: 'Box color', type: 'color' }, boxAlpha: { label: 'Box opacity', type: 'range', min: 0, max: 1, step: 0.01 },
  bgOn: { label: 'Background box', type: 'check' }, bg: { label: 'Box color', type: 'color' }, bgAlpha: { label: 'Box opacity', type: 'range', min: 0, max: 1, step: 0.01 },
  'lowerthird.bg': { label: 'Accent color', type: 'color' },
  x: { label: 'Left / right', type: 'range', min: 0, max: 1, step: 0.01 }, y: { label: 'Up / down', type: 'range', min: 0.03, max: 0.97, step: 0.01 },
  words: { label: 'Words on screen', type: 'range', min: 1, max: 10, step: 1 },
  'cap.anim': { label: 'Entrance', type: 'select', options: [['pop', 'Pop'], ['fade', 'Fade'], ['slide', 'Slide up'], ['none', 'None']] },
  anim: { label: 'Animation', type: 'select', options: [['pop', 'Pop'], ['bounce', 'Bounce'], ['fade', 'Fade'], ['slide-up', 'Slide up'], ['slide-left', 'Slide in'], ['zoom', 'Zoom in'], ['typewriter', 'Typewriter'], ['wiggle', 'Wiggle'], ['draw', 'Draw on'], ['none', 'None']] },
  rotation: { label: 'Rotation', type: 'range', min: -45, max: 45, step: 1 },
  start: { label: 'Start (s)', type: 'time' }, end: { label: 'End (s)', type: 'time' },
  intensity: { label: 'Intensity', type: 'range', min: 0.1, max: 2, step: 0.05 }, gain: { label: 'Volume', type: 'range', min: 0, max: 2, step: 0.05 },
  w: { label: 'Width', type: 'range', min: 0.05, max: 1, step: 0.01 }, h: { label: 'Height', type: 'range', min: 0.02, max: 1, step: 0.01 },
  lineW: { label: 'Line width', type: 'range', min: 2, max: 40, step: 1 }, from: { label: 'Count from', type: 'range', min: 1, max: 10, step: 1 },
  kind: { label: 'Shape', type: 'select', options: [['arrow', 'Arrow'], ['circle', 'Circle'], ['rect', 'Box'], ['underline', 'Underline']] },
  brightness: { label: 'Brightness', type: 'range', min: 0.5, max: 1.5, step: 0.01 }, contrast: { label: 'Contrast', type: 'range', min: 0.5, max: 1.8, step: 0.01 },
  saturate: { label: 'Saturation', type: 'range', min: 0, max: 2.5, step: 0.01 }, hue: { label: 'Hue shift', type: 'range', min: -180, max: 180, step: 1 },
  sepia: { label: 'Sepia', type: 'range', min: 0, max: 1, step: 0.01 }, grayscale: { label: 'Black & white', type: 'range', min: 0, max: 1, step: 0.01 },
  tint: { label: 'Tint color', type: 'color' }, tintAmt: { label: 'Tint strength', type: 'range', min: 0, max: 0.6, step: 0.01 },
  vignette: { label: 'Vignette', type: 'range', min: 0, max: 0.9, step: 0.01 }, grain: { label: 'Film grain', type: 'range', min: 0, max: 1, step: 0.01 },
  glow: { label: 'Glow', type: 'range', min: 0, max: 1, step: 0.01 }, letterbox: { label: 'Cinema bars', type: 'range', min: 0, max: 0.2, step: 0.005 },
  fit: { label: 'Framing', type: 'select', options: [['cover', 'Fill the frame (crop)'], ['contain', 'Show the whole shot']] },
  fx: { label: 'Slide left / right', type: 'range', min: 0, max: 1, step: 0.01 }, fy: { label: 'Slide up / down', type: 'range', min: 0, max: 1, step: 0.01 },
  bgBlur: { label: 'Blurred fill', type: 'check' },
  on: { label: 'Show bar', type: 'check' }, pos: { label: 'Position', type: 'select', options: [['bottom', 'Bottom'], ['top', 'Top']] },
  height: { label: 'Thickness', type: 'range', min: 4, max: 40, step: 1 },
  video: { label: 'Clip volume', type: 'range', min: 0, max: 2, step: 0.05 }, music: { label: 'Music volume', type: 'range', min: 0, max: 1.5, step: 0.05 },
  musicFade: { label: 'Fade out at end', type: 'check' }, musicOffset: { label: 'Music starts at (s)', type: 'time' },
  'effect.type': { label: 'Effect', type: 'select', options: () => Object.entries(EFFECTS).map(([k, v]) => [k, v.label]) },
  'sfx.type': { label: 'Sound', type: 'select', options: () => sfxOptions() },
};

const OVERLAY_KEYS = {
  text: ['text', 'font', 'size', 'upper', 'color', 'bgOn', 'bg', 'bgAlpha', 'stroke', 'strokeW', 'shadow', 'anim', 'x', 'y', 'rotation', 'start', 'end'],
  emoji: ['text', 'size', 'anim', 'x', 'y', 'rotation', 'start', 'end'],
  image: ['w', 'anim', 'x', 'y', 'rotation', 'start', 'end'],
  lowerthird: ['text', 'font', 'size', 'color', 'bg', 'anim', 'x', 'y', 'start', 'end'],
  shape: ['kind', 'color', 'lineW', 'w', 'h', 'anim', 'x', 'y', 'rotation', 'start', 'end'],
  countdown: ['from', 'font', 'size', 'color', 'stroke', 'strokeW', 'x', 'y', 'start', 'end'],
};
const TYPE_NAMES = { text: 'Text', emoji: 'Sticker', image: 'Image', lowerthird: 'Lower third', shape: 'Shape', countdown: 'Countdown' };

function defaultProject() {
  return {
    version: 1, aspect: '9:16',
    look: { ...LOOK_BASE, fit: 'cover', fx: 0.5, fy: 0.5, bgBlur: true },
    captionStyle: stripLabel(CAPTION_PRESETS.bold),
    captions: [], overlays: [], effects: [], sfx: [],
    progress: { on: false, color: '#ffb020', height: 12, pos: 'bottom' },
    audio: { video: 1, music: 0.25, musicFade: true, musicOffset: 0 },
  };
}
function stripLabel(o) { const { label, ...rest } = o; return { ...rest }; }

// ---------- state ----------
let P = defaultProject();
let sel = null;            // { kind: 'captions'|'overlays'|'effects'|'sfx', id }
let duration = 0, videoFile = null, pcm = null, env = null;
const HOP = 0.05;
const images = {}, customSfx = {}, hitboxes = [];
let dirty = true, prevT = 0, exporting = null;
let actx = null, master, vGain, mGain, sfxBus, recDest;

const video = $('#video'), musicEl = $('#music'), canvas = $('#stage'), ctx = canvas.getContext('2d');

// ---------- history ----------
const undoStack = [];
let editing = false;
function snap() { undoStack.push(JSON.stringify(P)); if (undoStack.length > 100) undoStack.shift(); }
function beginEdit() { if (!editing) { snap(); editing = true; } }
function endEdit() { editing = false; }
function undo() {
  const s = undoStack.pop();
  if (!s) return toast('Nothing to undo');
  P = JSON.parse(s);
  loadImages();
  applyAspect();
  refreshAll();
  toast('Undone');
}

// ---------- helpers ----------
function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), ms);
}
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
const now = () => video.currentTime || 0;
const total = () => duration || 10;
const listOf = kind => P[kind];
const findSel = () => (sel ? listOf(sel.kind).find(i => i.id === sel.id) : null);
function itemEnd(kind, it) { return kind === 'sfx' ? it.start + SFX.duration(it.type, customSfx) : it.end; }
function sfxOptions() {
  return [...Object.entries(SFX.LIB).map(([k, v]) => [k, v.label]), ...Object.keys(customSfx).map(k => [k, k.slice(7)])];
}
function select(kind, id) { sel = kind ? { kind, id } : null; renderInspector(); renderTimeline(); renderCaptionList(); }

function regroupCaptions() {
  if (!P.captions.length) return;
  P.captions = Captions.group(Captions.allWords(P.captions).sort((a, b) => a.start - b.start), P.captionStyle.words);
}

function loadImages() {
  for (const o of P.overlays) {
    if (o.type === 'image' && o.src && !images[o.id]) {
      const img = new Image();
      img.onload = () => { dirty = true; };
      img.src = o.src;
      images[o.id] = img;
    }
  }
}

function applyAspect() {
  const [W, H] = ASPECTS[P.aspect] || ASPECTS['9:16'];
  canvas.width = W; canvas.height = H;
  $('#aspect').value = P.aspect;
  dirty = true;
}

// ---------- fields ----------
function renderFields(box, obj, keys, scope, onChange) {
  box.innerHTML = '';
  for (const key of keys) {
    const def = F[`${scope}.${key}`] || F[key];
    if (!def) continue;
    const id = `f-${scope}-${key}`;
    const row = document.createElement('label');
    row.className = 'field' + (def.type === 'textarea' ? ' stack' : '');
    row.htmlFor = id;
    row.innerHTML = `<span>${def.label}</span>`;
    let input;
    const val = obj[key];
    if (def.type === 'range') {
      const wrap = document.createElement('span');
      wrap.className = 'rng';
      input = Object.assign(document.createElement('input'), { type: 'range', min: def.min, max: def.max, step: def.step, value: val ?? def.min });
      const out = document.createElement('output');
      const show = v => { out.textContent = Number(v).toFixed(def.step < 0.1 ? 2 : def.step < 1 ? 1 : 0); };
      show(input.value);
      input.addEventListener('input', () => show(input.value));
      wrap.append(input, out);
      row.append(wrap);
    } else if (def.type === 'check') {
      input = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !!val });
      row.append(input);
    } else if (def.type === 'color') {
      input = Object.assign(document.createElement('input'), { type: 'color', value: val || '#ffffff' });
      row.append(input);
    } else if (def.type === 'time') {
      input = Object.assign(document.createElement('input'), { type: 'number', step: 0.05, min: 0, value: (+val || 0).toFixed(2) });
      row.append(input);
    } else if (def.type === 'textarea') {
      input = Object.assign(document.createElement('textarea'), { rows: 2, value: val ?? '' });
      row.append(input);
    } else {
      input = document.createElement('select');
      const opts = def.type === 'font' ? FONTS.map(f => [f.name, f.name]) : (typeof def.options === 'function' ? def.options() : def.options);
      for (const [v, l] of opts) {
        const o = new Option(l, v);
        if (def.type === 'font') o.style.fontFamily = `"${v}"`;
        input.append(o);
      }
      input.value = val;
      row.append(input);
    }
    input.id = id;
    const read = () => {
      if (def.type === 'check') return input.checked;
      if (def.type === 'range' || def.type === 'time') return parseFloat(input.value) || 0;
      return input.value;
    };
    input.addEventListener('input', () => {
      beginEdit();
      obj[key] = read();
      if (def.type === 'font') document.fonts.load(fontStr(obj[key], 40)).then(() => { dirty = true; });
      dirty = true;
      onChange && onChange(key, obj[key]);
    });
    input.addEventListener('change', endEdit);
    box.append(row);
  }
}

// ---------- panels ----------
function buildPanels() {
  // tabs
  $$('.tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.toggle('active', t === tab));
    $$('.panel').forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
  }));

  // caption presets
  const cp = $('#cap-presets');
  for (const [k, v] of Object.entries(CAPTION_PRESETS)) {
    const b = Object.assign(document.createElement('button'), { className: 'chip', textContent: v.label });
    b.dataset.key = k;
    b.style.fontFamily = `"${v.font}", sans-serif`;
    b.addEventListener('click', () => applyCaptionPreset(k));
    cp.append(b);
  }

  // text templates
  const tg = $('#tpl-grid');
  for (const [k, v] of Object.entries(TEMPLATES)) {
    const b = document.createElement('button');
    b.className = 'tile';
    const sample = v.type === 'shape' ? { arrow: '➜', circle: '◯', underline: '﹏', rect: '▢' }[v.kind] : v.type === 'countdown' ? '3 · 2 · 1' : v.text.split('\n')[0];
    b.innerHTML = `<span class="sample"></span><small></small>`;
    b.querySelector('.sample').textContent = sample;
    b.querySelector('.sample').style.fontFamily = `"${v.font || 'Montserrat'}", sans-serif`;
    b.querySelector('small').textContent = v.label;
    b.addEventListener('click', () => addOverlay(k));
    tg.append(b);
  }

  // emoji
  const eg = $('#emoji-grid');
  for (const e of EMOJIS) {
    const b = Object.assign(document.createElement('button'), { textContent: e, title: 'Add sticker' });
    b.addEventListener('click', () => addOverlay(null, { type: 'emoji', text: e, size: 180, anim: 'bounce', x: 0.74, y: 0.36, dur: 1.6, shadow: true }));
    eg.append(b);
  }

  // effects
  const fg = $('#fx-grid');
  for (const [k, v] of Object.entries(EFFECTS)) {
    const b = document.createElement('button');
    b.className = 'tile';
    b.innerHTML = '<b></b><small></small>';
    b.querySelector('b').textContent = v.label;
    b.querySelector('small').textContent = v.hint;
    b.addEventListener('click', () => addEffect(k));
    fg.append(b);
  }

  // look presets
  const lp = $('#look-presets');
  for (const [k, v] of Object.entries(LOOK_PRESETS)) {
    const b = Object.assign(document.createElement('button'), { className: 'chip', textContent: v.label });
    b.dataset.key = k;
    b.addEventListener('click', () => {
      snap();
      P.look = { ...P.look, ...LOOK_BASE, ...stripLabel(v) };
      P.look.preset = k;
      renderStaticFields();
      dirty = true;
    });
    lp.append(b);
  }

  renderSfxList();
}

function renderSfxList() {
  const ul = $('#sfx-list');
  ul.innerHTML = '';
  for (const [k, label] of sfxOptions()) {
    const li = document.createElement('li');
    li.innerHTML = '<button class="hear"></button><button class="add" aria-label="Add at playhead">+</button>';
    li.querySelector('.hear').textContent = label;
    li.querySelector('.hear').addEventListener('click', () => { ensureAudio(); SFX.play(k, actx, sfxBus, actx.currentTime + 0.01, 1, customSfx); });
    li.querySelector('.add').title = `Add ${label} at playhead`;
    li.querySelector('.add').addEventListener('click', () => addSfx(k));
    ul.append(li);
  }
}

function renderStaticFields() {
  renderFields($('#cap-style'), P.captionStyle, ['font', 'size', 'upper', 'color', 'mode', 'highlight', 'stroke', 'strokeW', 'shadow', 'boxOn', 'box', 'boxAlpha', 'y', 'words', 'anim'], 'cap', key => {
    if (key === 'words') { regroupCaptions(); renderTimeline(); renderCaptionList(); }
  });
  $$('#cap-presets .chip').forEach(c => c.classList.toggle('on', c.dataset.key === P.captionStyle.preset));
  renderFields($('#look-fields'), P.look, ['brightness', 'contrast', 'saturate', 'hue', 'sepia', 'grayscale', 'tint', 'tintAmt', 'vignette', 'grain', 'glow', 'letterbox'], 'look');
  renderFields($('#frame-fields'), P.look, ['fit', 'fx', 'fy', 'bgBlur'], 'look');
  $$('#look-presets .chip').forEach(c => c.classList.toggle('on', c.dataset.key === (P.look.preset || 'none')));
  renderFields($('#progress-fields'), P.progress, ['on', 'color', 'height', 'pos'], 'progress');
  renderFields($('#audio-fields'), P.audio, ['video', 'music', 'musicFade', 'musicOffset'], 'audio', applyAudioLevels);
}

function applyCaptionPreset(k) {
  snap();
  const keepWords = P.captionStyle.words;
  P.captionStyle = { ...stripLabel(CAPTION_PRESETS[k]), preset: k };
  if (P.captionStyle.words !== keepWords) regroupCaptions();
  document.fonts.load(fontStr(P.captionStyle.font, 40)).then(() => { dirty = true; });
  renderStaticFields();
  renderTimeline();
  renderCaptionList();
  dirty = true;
}

function renderCaptionList() {
  const ol = $('#cap-list');
  $('#cap-count').textContent = P.captions.length ? `(${P.captions.length})` : '';
  if (!P.captions.length) {
    ol.innerHTML = '<li class="empty">No captions yet. Auto-caption, paste a script, or import subtitles.</li>';
    return;
  }
  // Keep the input being typed into intact.
  if (ol.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
  ol.innerHTML = '';
  for (const c of P.captions) {
    const li = document.createElement('li');
    if (sel && sel.id === c.id) li.className = 'on';
    li.innerHTML = '<button class="t"></button><input type="text"><button class="x" aria-label="Delete line">×</button>';
    li.querySelector('.t').textContent = fmt(c.start).slice(0, 8);
    li.querySelector('.t').addEventListener('click', () => { seek(c.start); select('captions', c.id); });
    const inp = li.querySelector('input');
    inp.value = c.text;
    inp.setAttribute('aria-label', `Caption at ${fmt(c.start)}`);
    inp.addEventListener('focus', () => { seek(c.start + 0.01); });
    inp.addEventListener('input', () => {
      beginEdit();
      c.text = inp.value;
      c.words = Captions.estimateWords(c.text, c.start, c.end);
      dirty = true;
    });
    inp.addEventListener('change', () => { endEdit(); renderTimeline(); });
    li.querySelector('.x').addEventListener('click', () => { snap(); P.captions = P.captions.filter(x => x !== c); refreshAll(); });
    ol.append(li);
  }
}

// ---------- adding things ----------
function addOverlay(tplKey, extra = {}) {
  snap();
  const tpl = tplKey ? TEMPLATES[tplKey] : {};
  const o = { ...OVERLAY_BASE, ...stripLabel(tpl), ...extra, id: uid() };
  o.start = Math.min(now(), Math.max(0, total() - 0.5));
  o.end = Math.min(total(), o.start + o.dur);
  delete o.dur;
  if (o.font) document.fonts.load(fontStr(o.font, 40)).then(() => { dirty = true; });
  P.overlays.push(o);
  loadImages();
  select('overlays', o.id);
  dirty = true;
  return o;
}
function addEffect(type, start = now(), end, intensity = 1, auto = false) {
  const d = EFFECTS[type].dur;
  const e = { id: uid(), type, start: Math.max(0, start), end: Math.min(total(), end ?? start + d), intensity };
  if (auto) e.auto = true;
  if (e.end - e.start < 0.05) return null;
  if (!auto) { snap(); P.effects.push(e); select('effects', e.id); dirty = true; }
  else P.effects.push(e);
  return e;
}
function addSfx(type, start = now(), gain = 0.8, auto = false) {
  if (start < 0 || (duration && start >= duration)) return null;
  const s = { id: uid(), type, start, gain };
  if (auto) { s.auto = true; P.sfx.push(s); return s; }
  snap();
  P.sfx.push(s);
  select('sfx', s.id);
  return s;
}

// ---------- inspector ----------
function renderInspector() {
  const box = $('#inspector');
  const it = findSel();
  if (!it) {
    sel = null;
    box.innerHTML = `
      <div class="insp-head"><div class="insp-kind"><small style="color:var(--muted)">Inspector</small>Nothing selected</div></div>
      <p class="hint">Click a block on the timeline, or click text on the video, to edit it here. Drag text on the video to move it.</p>
      <ul class="keys">
        <li><kbd>Space</kbd></li><li>Play / pause</li>
        <li><kbd>← →</kbd></li><li>Step a frame (Shift: 1 second)</li>
        <li><kbd>Del</kbd></li><li>Delete selected</li>
        <li><kbd>Ctrl D</kbd></li><li>Duplicate selected</li>
        <li><kbd>Ctrl Z</kbd></li><li>Undo</li>
      </ul>`;
    return;
  }
  const kind = sel.kind;
  const color = { captions: 'var(--lane-cap)', overlays: 'var(--lane-ovl)', effects: 'var(--lane-fx)', sfx: 'var(--lane-snd)' }[kind];
  const title = kind === 'captions' ? 'Caption line' : kind === 'overlays' ? TYPE_NAMES[it.type] : kind === 'effects' ? EFFECTS[it.type].label : (SFX.LIB[it.type]?.label || it.type.slice(7));
  const group = { captions: 'Caption', overlays: 'Text & graphics', effects: 'Effect', sfx: 'Sound effect' }[kind];
  box.innerHTML = `
    <div class="insp-head">
      <div class="insp-kind"><small style="color:${color}">${group}</small><span id="insp-title"></span></div>
      <div class="row"><button class="btn small" id="insp-dup">Duplicate</button><button class="btn small danger" id="insp-del">Delete</button></div>
    </div>
    <div class="fields" id="insp-fields"></div>`;
  $('#insp-title').textContent = title;
  $('#insp-dup').addEventListener('click', duplicateSel);
  $('#insp-del').addEventListener('click', deleteSel);
  const keys = kind === 'captions' ? ['text', 'start', 'end'] : kind === 'overlays' ? OVERLAY_KEYS[it.type] : kind === 'effects' ? ['type', 'intensity', 'start', 'end'] : ['type', 'gain', 'start'];
  const scope = kind === 'effects' ? 'effect' : kind === 'sfx' ? 'sfx' : kind === 'overlays' ? it.type : 'caption';
  renderFields($('#insp-fields'), it, keys, scope, key => {
    if (kind === 'captions' && (key === 'text' || key === 'start' || key === 'end')) {
      it.words = Captions.estimateWords(it.text, it.start, it.end);
      renderCaptionList();
    }
    if (key === 'start' || key === 'end' || key === 'type' || key === 'text') renderTimeline();
    if (key === 'type') $('#insp-title').textContent = kind === 'effects' ? EFFECTS[it.type].label : (SFX.LIB[it.type]?.label || it.type.slice(7));
    if (key === 'type' && kind === 'sfx') { ensureAudio(); SFX.play(it.type, actx, sfxBus, actx.currentTime + 0.01, it.gain, customSfx); }
  });
}

function deleteSel() {
  if (!sel) return;
  snap();
  P[sel.kind] = P[sel.kind].filter(i => i.id !== sel.id);
  sel = null;
  refreshAll();
}
function duplicateSel() {
  const it = findSel();
  if (!it) return;
  snap();
  const copy = JSON.parse(JSON.stringify(it));
  copy.id = uid();
  delete copy.auto;
  const len = itemEnd(sel.kind, it) - it.start;
  copy.start = Math.min(itemEnd(sel.kind, it), Math.max(0, total() - len));
  if ('end' in copy) copy.end = copy.start + len;
  if (copy.words) copy.words = Captions.estimateWords(copy.text, copy.start, copy.end);
  if (copy.src) { images[copy.id] = images[it.id]; }
  P[sel.kind].push(copy);
  if (sel.kind === 'captions') P.captions.sort((a, b) => a.start - b.start);
  select(sel.kind, copy.id);
  dirty = true;
}

// ---------- timeline ----------
const LANES = [
  { kind: 'captions', label: 'Captions', cls: 'cap', color: 'var(--lane-cap)' },
  { kind: 'overlays', label: 'Graphics', cls: 'ovl', color: 'var(--lane-ovl)' },
  { kind: 'effects', label: 'Effects', cls: 'fx', color: 'var(--lane-fx)' },
  { kind: 'sfx', label: 'Sound', cls: 'snd', color: 'var(--lane-snd)' },
];
let pps = 60;
const ROW = 26;

function itemLabel(kind, it) {
  if (kind === 'captions') return it.text;
  if (kind === 'overlays') return it.type === 'image' ? 'Image' : it.type === 'shape' ? TEMPLATES[{ arrow: 'arrow', circle: 'circle', underline: 'underline', rect: 'box' }[it.kind]].label : it.type === 'countdown' ? 'Countdown' : String(it.text).replace(/\n/g, ' · ');
  if (kind === 'effects') return EFFECTS[it.type].label;
  return SFX.LIB[it.type]?.label || it.type.slice(7);
}

function renderTimeline() {
  const inner = $('#tl-inner'), labels = $('#tl-labels');
  const W = Math.ceil(total() * pps) + 60;
  inner.style.width = W + 'px';
  inner.innerHTML = '';
  labels.innerHTML = '<div class="ruler-sp"></div>';

  const ruler = document.createElement('div');
  ruler.className = 'ruler';
  const step = [0.5, 1, 2, 5, 10, 15, 30, 60].find(s => s * pps >= 56) || 60;
  for (let t = 0; t <= total() + 0.001; t += step) {
    const sp = document.createElement('span');
    sp.style.left = t * pps + 'px';
    sp.textContent = t >= 60 ? `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}` : `${+t.toFixed(1)}s`;
    ruler.append(sp);
  }
  inner.append(ruler);

  for (const lane of LANES) {
    const items = [...listOf(lane.kind)].sort((a, b) => a.start - b.start);
    const rows = [];
    const placed = items.map(it => {
      const s = it.start, e = Math.max(itemEnd(lane.kind, it), s + 8 / pps);
      let r = rows.findIndex(end => end <= s + 0.001);
      if (r < 0) { r = rows.length; rows.push(0); }
      rows[r] = e;
      return { it, s, e, r };
    });
    const h = Math.max(1, rows.length) * ROW + 8;
    const el = document.createElement('div');
    el.className = 'lane';
    el.style.height = h + 'px';
    el.dataset.kind = lane.kind;
    if (lane.kind === 'sfx' && env) el.append(waveCanvas(W, h));
    for (const { it, s, e, r } of placed) {
      const d = document.createElement('div');
      d.className = `item ${lane.cls}${sel && sel.id === it.id ? ' sel' : ''}${it.auto ? ' auto' : ''}`;
      d.style.left = s * pps + 'px';
      d.style.width = Math.max(8, (e - s) * pps) + 'px';
      d.style.top = 4 + r * ROW + 'px';
      d.dataset.kind = lane.kind;
      d.dataset.id = it.id;
      d.tabIndex = 0;
      d.title = itemLabel(lane.kind, it) + (it.auto ? ' (added by Make it spectacular)' : '');
      d.textContent = itemLabel(lane.kind, it);
      if (lane.kind !== 'sfx') d.insertAdjacentHTML('beforeend', '<span class="h h-l"></span><span class="h h-r"></span>');
      el.append(d);
    }
    inner.append(el);
    const lb = document.createElement('div');
    lb.className = 'lbl';
    lb.style.height = h + 'px';
    lb.innerHTML = `<i style="background:${lane.color}"></i>${lane.label}`;
    labels.append(lb);
  }
  const ph = document.createElement('div');
  ph.className = 'playhead';
  ph.id = 'playhead';
  inner.append(ph);
  updatePlayhead(now());
}

function waveCanvas(W, h) {
  const c = document.createElement('canvas');
  const cw = Math.min(W, 16000);
  c.width = cw; c.height = h;
  c.style.width = W + 'px';
  const g = c.getContext('2d');
  let max = 0;
  for (const v of env) max = Math.max(max, v);
  g.fillStyle = '#3ddc97';
  const sx = cw / W;
  for (let i = 0; i < env.length; i++) {
    const x = i * HOP * pps * sx, bh = (env[i] / (max || 1)) * (h - 6);
    g.fillRect(x, (h - bh) / 2, Math.max(1, HOP * pps * sx - 0.5), bh);
  }
  return c;
}

function updatePlayhead(t) {
  const ph = $('#playhead');
  if (!ph) return;
  const x = t * pps;
  ph.style.left = x + 'px';
  const sc = $('#tl-scroll');
  if (!video.paused && (x > sc.scrollLeft + sc.clientWidth - 40 || x < sc.scrollLeft)) sc.scrollLeft = x - 80;
}

function bindTimeline() {
  const inner = $('#tl-inner');
  let drag = null, scrub = false;
  const timeAt = e => clamp((e.clientX - inner.getBoundingClientRect().left) / pps, 0, total());

  inner.addEventListener('pointerdown', e => {
    const el = e.target.closest('.item');
    if (!el) {
      scrub = true;
      inner.setPointerCapture(e.pointerId);
      seek(timeAt(e));
      if (e.target.closest('.lane')) select(null);
      return;
    }
    const kind = el.dataset.kind, it = listOf(kind).find(i => i.id === el.dataset.id);
    if (!sel || sel.id !== it.id) {
      sel = { kind, id: it.id };
      $$('.item.sel', inner).forEach(x => x.classList.remove('sel'));
      el.classList.add('sel');
      renderInspector();
    }
    snap();
    const mode = e.target.classList.contains('h-l') ? 'l' : e.target.classList.contains('h-r') ? 'r' : 'move';
    drag = { it, kind, el, mode, x0: e.clientX, s0: it.start, e0: itemEnd(kind, it), w0: it.words ? JSON.parse(JSON.stringify(it.words)) : null, moved: false };
    el.setPointerCapture(e.pointerId);
  });

  inner.addEventListener('pointermove', e => {
    if (scrub) { seek(timeAt(e)); return; }
    if (!drag) return;
    const dt = (e.clientX - drag.x0) / pps;
    if (Math.abs(e.clientX - drag.x0) > 2) drag.moved = true;
    if (!drag.moved) return;
    const { it, s0, e0, mode } = drag, len = e0 - s0;
    const snapT = v => (Math.abs(v - now()) * pps < 7 ? now() : v);
    if (mode === 'move') {
      it.start = clamp(snapT(s0 + dt), 0, Math.max(0, total() - (drag.kind === 'sfx' ? 0.05 : len)));
      if ('end' in it) it.end = it.start + len;
    } else if (mode === 'l') {
      it.start = clamp(snapT(s0 + dt), 0, e0 - 0.1);
    } else {
      it.end = clamp(snapT(e0 + dt), s0 + 0.1, total());
    }
    if (drag.w0) {
      const ns = it.start, ne = it.end;
      it.words = drag.w0.map(w => ({ ...w, start: ns + ((w.start - s0) / len) * (ne - ns), end: ns + ((w.end - s0) / len) * (ne - ns) }));
    }
    drag.el.style.left = it.start * pps + 'px';
    drag.el.style.width = Math.max(8, (itemEnd(drag.kind, it) - it.start) * pps) + 'px';
    dirty = true;
  });

  const up = () => {
    if (scrub) { scrub = false; return; }
    if (!drag) return;
    if (!drag.moved) undoStack.pop();
    else if (drag.kind === 'captions') P.captions.sort((a, b) => a.start - b.start);
    drag = null;
    renderTimeline();
    renderInspector();
    renderCaptionList();
  };
  inner.addEventListener('pointerup', up);
  inner.addEventListener('pointercancel', up);
  inner.addEventListener('keydown', e => {
    const el = e.target.closest('.item');
    if (el && e.key === 'Enter') select(el.dataset.kind, el.dataset.id);
  });

  $('#tl-zoom').addEventListener('input', e => { pps = +e.target.value; renderTimeline(); });
}

// ---------- stage interaction: drag overlays on the video ----------
function bindStage() {
  let drag = null;
  const toCanvas = e => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * canvas.width, ((e.clientY - r.top) / r.height) * canvas.height];
  };
  const hitAt = (x, y) => [...hitboxes].reverse().find(b => Math.abs(x - b.cx) <= b.w / 2 && Math.abs(y - b.cy) <= b.h / 2);
  canvas.addEventListener('pointerdown', e => {
    const [x, y] = toCanvas(e);
    const hit = hitAt(x, y);
    if (!hit) { if (sel && sel.kind === 'overlays') select(null); return; }
    const o = P.overlays.find(o => o.id === hit.id);
    if (!sel || sel.id !== o.id) select('overlays', o.id);
    snap();
    drag = { o, x0: x, y0: y, ox: o.x, oy: o.y, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    const [x, y] = toCanvas(e);
    if (!drag) { canvas.classList.toggle('grab', !!hitAt(x, y)); return; }
    drag.moved = true;
    drag.o.x = clamp(drag.ox + (x - drag.x0) / canvas.width);
    drag.o.y = clamp(drag.oy + (y - drag.y0) / canvas.height);
    dirty = true;
  });
  const up = () => {
    if (!drag) return;
    if (!drag.moved) undoStack.pop();
    else renderInspector();
    drag = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
}

// ---------- audio ----------
function ensureAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  actx = new AudioContext();
  master = actx.createGain();
  master.connect(actx.destination);
  recDest = actx.createMediaStreamDestination();
  master.connect(recDest);
  vGain = actx.createGain();
  actx.createMediaElementSource(video).connect(vGain).connect(master);
  mGain = actx.createGain();
  actx.createMediaElementSource(musicEl).connect(mGain).connect(master);
  sfxBus = actx.createGain();
  sfxBus.connect(master);
  applyAudioLevels();
}
function applyAudioLevels() {
  if (!actx) return;
  vGain.gain.value = P.audio.video;
  mGain.gain.value = P.audio.music;
}
function fireSfx(s) {
  ensureAudio();
  SFX.play(s.type, actx, sfxBus, actx.currentTime + 0.005, s.gain, customSfx);
}
function syncMusic(t) {
  if (!musicEl.src || !actx) return;
  const mt = t - P.audio.musicOffset;
  const should = !video.paused && mt >= 0 && mt < (musicEl.duration || Infinity);
  if (should && musicEl.paused) { musicEl.currentTime = mt; musicEl.play().catch(() => {}); }
  if (!should && !musicEl.paused) musicEl.pause();
  if (should && Math.abs(musicEl.currentTime - mt) > 0.3 && video.playbackRate === 1) musicEl.currentTime = mt;
  let g = P.audio.music;
  if (P.audio.musicFade && duration && t > duration - 2) g *= Math.max(0, (duration - t) / 2);
  mGain.gain.value = g;
}

// ---------- playback ----------
function seek(t) {
  video.currentTime = clamp(t, 0, total());
  prevT = video.currentTime;
  dirty = true;
  updatePlayhead(video.currentTime);
  updateClock(video.currentTime);
}
function togglePlay() {
  if (!duration) return toast('Open a video first');
  ensureAudio();
  if (video.paused) {
    if (video.ended || video.currentTime >= duration - 0.05) video.currentTime = 0;
    prevT = video.currentTime - 0.001;
    video.play();
  } else {
    video.pause();
  }
}
function updateClock(t) { $('#clock').textContent = `${fmt(t)} / ${fmt(duration)}`; }

function tick() {
  requestAnimationFrame(tick);
  const t = now();
  const playing = !video.paused;
  if (playing) {
    if (t >= prevT && t - prevT < 0.75) for (const s of P.sfx) if (s.start > prevT && s.start <= t) fireSfx(s);
    prevT = t;
    syncMusic(t);
    dirty = true;
  }
  if (!dirty) return;
  dirty = false;
  const es = Renderer.renderFrame(ctx, P, t, { video, images, hitboxes, duration });
  if (playing) {
    if (video.playbackRate !== es.rate) video.playbackRate = es.rate;
    updatePlayhead(t);
    updateClock(t);
    if (exporting) {
      $('#exp-bar').style.width = (100 * t) / duration + '%';
      $('#exp-clock').textContent = `${fmt(t)} of ${fmt(duration)}`;
    }
  }
}

// ---------- loading media ----------
async function loadVideo(file) {
  if (!file || !file.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v|mkv)$/i.test(file.name)) return toast('That file is not a video');
  videoFile = file;
  pcm = env = null;
  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(file);
  await new Promise((res, rej) => { video.onloadedmetadata = res; video.onerror = () => rej(new Error('This browser cannot play that video format. Try an MP4.')); })
    .catch(err => { toast(err.message, 5000); throw err; });
  duration = video.duration;
  $('#dropzone').hidden = true;
  video.currentTime = 0.001;
  video.onseeked = () => { dirty = true; };
  video.onended = () => { musicEl.pause(); document.body.classList.remove('playing'); };
  video.onplay = () => { document.body.classList.add('playing'); $('#btn-play').innerHTML = '&#10074;&#10074;'; };
  video.onpause = () => { document.body.classList.remove('playing'); $('#btn-play').innerHTML = '&#9654;'; musicEl.pause(); };
  // A sideways clip in a vertical frame: show the whole shot over a blurred fill.
  const landscape = video.videoWidth > video.videoHeight;
  const [W, H] = ASPECTS[P.aspect];
  if (landscape && H > W && !P.captions.length && !P.overlays.length) P.look.fit = 'contain';
  P.effects = P.effects.filter(e => e.start < duration);
  renderStaticFields();
  refreshAll();
  updateClock(0);
  toast(P.captions.length ? 'Video loaded' : 'Video loaded. Next: Auto-caption, then Make it spectacular.', 4000);
  Captions.decodeAudio(file).then(p => {
    pcm = p;
    env = Captions.envelope(p, 16000, HOP);
    renderTimeline();
  }).catch(() => { toast('Could not read the audio track. Captions can still be pasted or imported.', 5000); });
}

// ---------- captions actions ----------
function setCapStatus(msg) { $('#cap-status').textContent = msg; }

async function autoCaption() {
  if (!videoFile) return toast('Open a video first');
  const btn = $('#btn-transcribe');
  btn.disabled = true;
  try {
    const audio = pcm || await Captions.decodeAudio(videoFile);
    const words = await Captions.transcribe(audio, $('#cap-lang').value, setCapStatus);
    if (!words.length) throw new Error('No speech found in this clip');
    snap();
    P.captions = Captions.group(words, P.captionStyle.words);
    refreshAll();
    setCapStatus(`Done: ${words.length} words in ${P.captions.length} lines. Fix any word in the list below.`);
    toast('Captions ready');
  } catch (err) {
    console.error(err);
    setCapStatus(`Auto-caption did not finish (${err.message}). Check your connection for the first model download, or paste your script instead.`);
  } finally {
    btn.disabled = false;
  }
}

function fitPasted() {
  const text = $('#cap-paste').value.trim();
  if (!text) return toast('Paste your script first');
  if (!duration) return toast('Open a video first');
  snap();
  P.captions = Captions.group(Captions.fitTranscript(text, env, HOP, duration), P.captionStyle.words);
  refreshAll();
  toast(env ? 'Timed to your voice. Drag lines on the timeline to fine-tune.' : 'Spread evenly over the clip. Drag lines to fine-tune.', 4000);
}

// ---------- the one-click edit ----------
function openAuto() {
  if (!duration) return toast('Open a video first');
  const first = P.captions.length ? P.captions.slice(0, 3).map(c => c.text).join(' ').split(/(?<=[.!?])\s/)[0] : '';
  const hook = $('#auto-hook');
  if (!hook.value) hook.value = (first.split(/\s+/).slice(0, 7).join(' ') || 'Watch this').replace(/[,.]$/, '');
  $('#auto-note').textContent = P.captions.length ? '' : 'Tip: auto-caption first. The edit times its zooms and stickers to your words.';
  $('#dlg-auto').showModal();
}

function autoEdit(o) {
  snap();
  const dur = duration, rnd = Math.random;
  P.overlays = P.overlays.filter(x => !x.auto);
  P.effects = P.effects.filter(x => !x.auto);
  P.sfx = P.sfx.filter(x => !x.auto);
  const V = {
    energetic: { look: 'punchy', cap: 'bold', every: 2, glitch: true, shake: true, bar: '#ffd400' },
    cinematic: { look: 'cinematic', cap: 'clean', every: 0, glitch: false, shake: false, bar: '#ffffff' },
    clean: { look: 'warm', cap: 'karaoke', every: 3, glitch: false, shake: false, bar: '#7b3fe4' },
  }[o.vibe];

  if (o.look) { P.look = { ...P.look, ...LOOK_BASE, ...stripLabel(LOOK_PRESETS[V.look]), preset: V.look }; }
  if (o.capStyle) {
    const keep = P.captionStyle.words;
    P.captionStyle = { ...stripLabel(CAPTION_PRESETS[V.cap]), preset: V.cap };
    document.fonts.load(fontStr(P.captionStyle.font, 40)).then(() => { dirty = true; });
    if (keep !== P.captionStyle.words) regroupCaptions();
  }
  const fx = (type, s, e, i = 1) => addEffect(type, clamp(s, 0, dur), clamp(e, 0, dur), i, true);
  const sfx = (type, s, g) => o.sfx && addSfx(type, Math.max(0, s), g, true);
  const ov = (tpl, extra) => {
    const it = { ...OVERLAY_BASE, ...stripLabel(TEMPLATES[tpl] || {}), ...extra, id: uid(), auto: true };
    delete it.dur;
    if (it.font) document.fonts.load(fontStr(it.font, 40)).then(() => { dirty = true; });
    P.overlays.push(it);
  };
  const hookEnd = Math.min(3, dur * 0.3);
  const ctaStart = Math.max(hookEnd + 1, dur - 2.6);

  // Hook and intro.
  if (o.hook) {
    ov('hook', { text: o.hook, start: 0.05, end: hookEnd, rotation: rnd() < 0.5 ? -2 : 2, bg: o.vibe === 'clean' ? '#ffffff' : '#ffd400' });
    sfx('pop', 0.05, 0.6);
  }
  if (o.effects) {
    if (o.vibe === 'cinematic') {
      fx('fadein', 0, 0.9);
      fx('fadeout', dur - 1.2, dur);
      for (let t = 0; t < dur - 1; t += 5) fx('kenburns', t, Math.min(dur, t + 4.6), 0.7 + rnd() * 0.5);
      sfx('boom', 0.1, 0.5);
    } else {
      fx('flash', 0, 0.3, 0.9);
      fx('zoomout', 0, 1.1, 1);
      sfx('whoosh', 0, 0.5);
      // Beats: caption starts when we have them, otherwise a steady pulse.
      let beats = P.captions.length
        ? P.captions.filter((c, i) => i > 0 && i % V.every === 0).map(c => [c.start, Math.min(c.end, c.start + 2.2)])
        : Array.from({ length: Math.floor(dur / 3.5) }, (_, i) => [3.5 * (i + 1), 3.5 * (i + 1) + 1.6]);
      beats = beats.filter(([s]) => s > hookEnd && s < ctaStart - 0.3);
      beats.forEach(([s, e], i) => {
        if (rnd() < 0.2) fx('kenburns', s, e + 1, 1.2);
        else fx('punch', s, e, i % 2 ? 1.35 : 0.8);
        if (i % 2 === 0) sfx(i % 4 === 0 ? 'whoosh' : 'swoosh', s - 0.12, 0.3);
      });
      if (V.glitch && beats.length > 2) {
        for (const [s] of [beats[1], beats[Math.floor(beats.length * 0.66)]]) { fx('glitch', s - 0.05, s + 0.25, 1); sfx('glitch', s - 0.05, 0.2); }
      }
      if (V.shake && env) {
        for (const p of Captions.peaks(env, HOP, 3, 3)) {
          if (p < hookEnd || p > ctaStart) continue;
          fx('shake', p, p + 0.45, 0.9);
          fx('flash', p, p + 0.2, 0.5);
          sfx('boom', p, 0.45);
        }
      }
    }
  }

  // Emoji stickers on words that call for one.
  if (o.emoji && P.captions.length) {
    let last = -10, n = 0;
    for (const c of P.captions) {
      if (n >= 6 || c.start - last < 3 || c.start < hookEnd || c.start > ctaStart) continue;
      const hit = EMOJI_WORDS.find(([re]) => re.test(c.text));
      if (!hit) continue;
      const left = n % 2 === 0;
      ov(null, { type: 'emoji', text: hit[1], size: 170, anim: 'bounce', x: left ? 0.2 : 0.8, y: P.captionStyle.y - 0.13, rotation: left ? -12 : 12, start: c.start, end: Math.min(c.start + 1.4, dur), shadow: true });
      sfx('pop', c.start, 0.35);
      last = c.start; n++;
    }
  }

  if (o.cta && dur > 5) {
    ov('cta', { text: o.cta, start: ctaStart, end: dur });
    sfx('ding', ctaStart, 0.5);
  }
  if (o.progress) { P.progress.on = true; P.progress.color = V.bar; }

  renderStaticFields();
  refreshAll();
  toast('Edit built. Press play, then tweak anything on the timeline.', 4000);
}

// ---------- export ----------
function pickMime() {
  const list = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
}

async function exportVideo() {
  if (!duration) return toast('Open a video first');
  const mime = pickMime();
  if (!mime || !canvas.captureStream) return toast('This browser cannot record video. Use Chrome, Edge or Safari 17+.', 5000);
  ensureAudio();
  await actx.resume();
  video.pause();
  select(null);
  await new Promise(r => { video.onseeked = () => { dirty = true; r(); }; video.currentTime = 0; });
  video.onseeked = () => { dirty = true; };

  const stream = canvas.captureStream(30);
  recDest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000, audioBitsPerSecond: 192_000 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise(r => { rec.onstop = r; });
  exporting = { cancelled: false };
  $('#exp-progress').hidden = false;
  $('#exp-done').hidden = true;
  $('#exp-bar').style.width = '0';
  $('#dlg-export').showModal();

  rec.start(500);
  prevT = -0.001;
  video.playbackRate = 1;
  dirty = true;
  await video.play();
  await new Promise(r => {
    const end = () => { video.removeEventListener('ended', end); r(); };
    video.addEventListener('ended', end);
    exporting.finish = end;
  });
  await new Promise(r => setTimeout(r, 200));
  rec.stop();
  await stopped;
  stream.getVideoTracks().forEach(t => t.stop());
  const cancelled = exporting.cancelled;
  exporting = null;
  if (cancelled) { $('#dlg-export').close(); toast('Export cancelled'); return; }

  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  const blob = new Blob(chunks, { type: mime.split(';')[0] });
  const url = URL.createObjectURL(blob);
  $('#exp-video').src = url;
  const dl = $('#exp-download');
  dl.href = url;
  dl.download = `reel-${new Date().toISOString().slice(0, 10)}.${ext}`;
  $('#exp-info').textContent = `${ext.toUpperCase()}, ${canvas.width}×${canvas.height}, ${(blob.size / 1e6).toFixed(1)} MB.` +
    (ext === 'webm' ? ' Instagram prefers MP4: Chrome 126+ and Safari export MP4 directly.' : '');
  $('#exp-progress').hidden = true;
  $('#exp-done').hidden = false;
}

// ---------- refresh ----------
function refreshAll() {
  renderTimeline();
  renderInspector();
  renderCaptionList();
  $$('#cap-presets .chip').forEach(c => c.classList.toggle('on', c.dataset.key === P.captionStyle.preset));
  dirty = true;
}

// ---------- wiring ----------
function bindUI() {
  $('#file-video').addEventListener('change', e => { loadVideo(e.target.files[0]).catch(() => {}); e.target.value = ''; });
  const stageBox = $('#stage-box');
  ['dragenter', 'dragover'].forEach(ev => stageBox.addEventListener(ev, e => { e.preventDefault(); $('#dropzone').classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => stageBox.addEventListener(ev, () => $('#dropzone').classList.remove('over')));
  stageBox.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadVideo(f).catch(() => {}); });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => e.preventDefault());

  $('#aspect').addEventListener('change', e => { snap(); P.aspect = e.target.value; applyAspect(); });
  $('#btn-play').addEventListener('click', togglePlay);
  $('#btn-back').addEventListener('click', () => seek(0));
  $('#btn-undo').addEventListener('click', undo);

  $('#btn-transcribe').addEventListener('click', autoCaption);
  $('#btn-fit').addEventListener('click', fitPasted);
  $('#file-subs').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const caps = Captions.parseSubs(await f.text());
    if (!caps.length) return toast('No subtitles found in that file');
    snap();
    P.captions = caps;
    regroupCaptions();
    refreshAll();
    toast(`Imported ${caps.length} subtitles`);
  });
  $('#btn-srt').addEventListener('click', () => {
    if (!P.captions.length) return toast('No captions to download');
    download(new Blob([Captions.toSRT(P.captions)], { type: 'text/plain' }), 'captions.srt');
  });
  $('#btn-cap-add').addEventListener('click', () => {
    snap();
    const s = now(), e = Math.min(total(), s + 1.5);
    const c = { id: uid(), start: s, end: e, text: 'New caption', words: Captions.estimateWords('New caption', s, e) };
    P.captions.push(c);
    P.captions.sort((a, b) => a.start - b.start);
    select('captions', c.id);
    dirty = true;
  });
  $('#btn-cap-clear').addEventListener('click', () => {
    if (!P.captions.length) return;
    snap();
    P.captions = [];
    refreshAll();
    toast('Captions cleared. Undo brings them back.');
  });

  $('#file-image').addEventListener('change', e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const r = new FileReader();
    r.onload = () => addOverlay(null, { type: 'image', src: r.result, w: 0.32, y: 0.14, anim: 'pop', dur: 3 });
    r.readAsDataURL(f);
  });
  $('#file-sfx').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    ensureAudio();
    try {
      customSfx['custom:' + f.name.replace(/\.[^.]+$/, '')] = await actx.decodeAudioData(await f.arrayBuffer());
      renderSfxList();
      toast('Sound added to the list');
    } catch { toast('Could not read that audio file'); }
  });
  $('#file-music').addEventListener('change', e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    ensureAudio();
    if (musicEl.src) URL.revokeObjectURL(musicEl.src);
    musicEl.src = URL.createObjectURL(f);
    $('#music-name').textContent = f.name;
    toast('Music added. It plays under your clip from the start.');
  });

  $('#btn-auto').addEventListener('click', openAuto);
  $('#form-auto').addEventListener('submit', e => {
    if (e.submitter && e.submitter.value !== 'apply') return;
    autoEdit({
      vibe: new FormData(e.target).get('vibe'),
      hook: $('#auto-hook').value.trim(),
      cta: $('#auto-cta').value.trim(),
      look: $('#auto-look').checked, capStyle: $('#auto-capstyle').checked, effects: $('#auto-effects').checked,
      sfx: $('#auto-sfx').checked, emoji: $('#auto-emoji').checked, progress: $('#auto-progress').checked,
    });
  });

  $('#btn-export').addEventListener('click', () => exportVideo().catch(err => { console.error(err); exporting = null; $('#dlg-export').close(); toast('Export failed: ' + err.message, 5000); }));
  $('#exp-cancel').addEventListener('click', () => { if (exporting) { exporting.cancelled = true; video.pause(); exporting.finish && exporting.finish(); } });
  $('#exp-close').addEventListener('click', () => $('#dlg-export').close());
  $('#dlg-export').addEventListener('cancel', e => { if (exporting) e.preventDefault(); });

  $('#btn-save').addEventListener('click', () => {
    download(new Blob([JSON.stringify(P, null, 1)], { type: 'application/json' }), 'reel-project.json');
    toast('Project saved. Open it again with the same video.');
  });
  $('#file-project').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      snap();
      const d = defaultProject();
      P = { ...d, ...data, look: { ...d.look, ...data.look }, captionStyle: { ...d.captionStyle, ...data.captionStyle }, progress: { ...d.progress, ...data.progress }, audio: { ...d.audio, ...data.audio } };
      for (const k of ['captions', 'overlays', 'effects', 'sfx']) P[k] = Array.isArray(P[k]) ? P[k] : [];
      for (const c of P.captions) { c.id = c.id || uid(); if (!c.words) c.words = Captions.estimateWords(c.text, c.start, c.end); }
      for (const k of ['overlays', 'effects', 'sfx']) for (const it of P[k]) it.id = it.id || uid();
      P.overlays = P.overlays.map(o => ({ ...OVERLAY_BASE, ...o }));
      loadImages();
      applyAspect();
      renderStaticFields();
      refreshAll();
      toast('Project opened');
    } catch { toast('That file is not a Reelsmith project'); }
  });

  document.addEventListener('keydown', e => {
    const tag = document.activeElement && document.activeElement.tagName;
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.querySelector('dialog[open]');
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); undo(); return; }
    if (typing) return;
    if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (sel) { e.preventDefault(); deleteSel(); } }
    else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSel(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); seek(now() + (e.shiftKey ? 1 : 1 / 30)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(now() - (e.shiftKey ? 1 : 1 / 30)); }
    else if (e.key === 'Escape') select(null);
  });
}

// ---------- boot ----------
buildPanels();
bindUI();
bindTimeline();
bindStage();
applyAspect();
renderStaticFields();
refreshAll();
updateClock(0);
Promise.all(FONTS.map(f => document.fonts.load(fontStr(f.name, 40)).catch(() => {}))).then(() => { dirty = true; });
requestAnimationFrame(tick);
