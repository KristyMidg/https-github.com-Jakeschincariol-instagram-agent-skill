// Studio shell: project state, tool panels, the one-tap "Make my reel" flow,
// pause cutting, timeline, inspector, playback and real-time export with sound.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = t => {
  t = Math.max(0, t || 0);
  const m = Math.floor(t / 60), s = Math.floor(t % 60), cs = Math.floor((t % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};
const fmtS = t => { t = Math.max(0, t || 0); return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; };
const secs = t => (t >= 10 ? `${Math.round(t)}s` : `${(+t.toFixed(1))}s`);
const isPhone = () => matchMedia('(max-width: 860px)').matches;

const ASPECTS = { '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080], '16:9': [1920, 1080] };

const LOOK_BASE = { brightness: 1, contrast: 1, saturate: 1, hue: 0, sepia: 0, grayscale: 0, tint: '#ff9a3c', tintAmt: 0, vignette: 0, grain: 0, glow: 0, letterbox: 0 };
const LOOK_PRESETS = {
  none: { label: 'Original' },
  airy: { label: 'Airy', brightness: 1.07, contrast: 0.94, saturate: 0.94, tint: '#ffd6c9', tintAmt: 0.1, glow: 0.15 },
  warm: { label: 'Golden', brightness: 1.04, contrast: 1.05, saturate: 1.12, sepia: 0.12, tint: '#ffb347', tintAmt: 0.15, vignette: 0.2 },
  blush: { label: 'Blush', brightness: 1.05, contrast: 0.98, saturate: 1.05, tint: '#f3a6b5', tintAmt: 0.16, glow: 0.2 },
  honey: { label: 'Honey', brightness: 1.03, contrast: 1.06, saturate: 1.08, sepia: 0.18, tint: '#f4b860', tintAmt: 0.2, vignette: 0.25, glow: 0.1 },
  punchy: { label: 'Punchy', contrast: 1.15, saturate: 1.3, brightness: 1.03, vignette: 0.3, grain: 0.08 },
  cinematic: { label: 'Cinematic', contrast: 1.12, saturate: 0.88, brightness: 0.97, tint: '#ff8a3d', tintAmt: 0.18, vignette: 0.45, grain: 0.15, letterbox: 0.06 },
  cool: { label: 'Cool', contrast: 1.08, saturate: 1.05, hue: -8, tint: '#3da5ff', tintAmt: 0.18, vignette: 0.25 },
  vintage: { label: 'Vintage', contrast: 0.95, saturate: 0.8, sepia: 0.35, brightness: 1.02, vignette: 0.5, grain: 0.35 },
  noir: { label: 'Noir', grayscale: 1, contrast: 1.35, brightness: 0.95, vignette: 0.55, grain: 0.2 },
  dreamy: { label: 'Dreamy', brightness: 1.08, contrast: 0.95, saturate: 1.15, glow: 0.45, tint: '#ff9ad5', tintAmt: 0.12 },
  neon: { label: 'Neon', contrast: 1.18, saturate: 1.7, hue: -12, glow: 0.3, vignette: 0.35 },
};

const CAP = { stroke: '#000000', strokeW: 0, shadow: true, boxOn: false, box: '#000000', boxAlpha: 0.6, y: 0.7, words: 4, anim: 'pop', upper: false };
const CAPTION_PRESETS = {
  cozy: { ...CAP, label: 'Cozy serif', font: 'Fraunces', size: 80, color: '#ffffff', highlight: '#FFD3BF', mode: 'word', y: 0.7, words: 4 },
  pill: { ...CAP, label: 'Soft pill', font: 'Nunito', size: 64, color: '#3A2A26', highlight: '#F6C6B8', mode: 'box', shadow: false, boxOn: true, box: '#FFFAF5', boxAlpha: 0.95, y: 0.72 },
  minimal: { ...CAP, label: 'Minimal', font: 'DM Sans', size: 60, color: '#ffffff', highlight: '#ffffff', mode: 'dim', y: 0.7, words: 5, anim: 'fade' },
  editorial: { ...CAP, label: 'Editorial', font: 'Instrument Serif', size: 104, color: '#ffffff', highlight: '#F4D98C', mode: 'word', y: 0.66, words: 3, anim: 'slide' },
  butter: { ...CAP, label: 'Butter box', font: 'Poppins', size: 64, color: '#2B211E', highlight: '#2B211E', mode: 'none', shadow: false, boxOn: true, box: '#F4D98C', boxAlpha: 1, y: 0.72 },
  scribble: { ...CAP, label: 'Handwritten', font: 'Caveat', size: 110, color: '#ffffff', highlight: '#FFB8C9', mode: 'word', stroke: '#3A2A26', strokeW: 4, y: 0.7, words: 3 },
  bold: { ...CAP, label: 'Bold pop', font: 'Montserrat', size: 86, upper: true, color: '#ffffff', highlight: '#ffd400', mode: 'word', strokeW: 9, words: 3 },
  loud: { ...CAP, label: 'Loud', font: 'Luckiest Guy', size: 100, upper: true, color: '#ffffff', highlight: '#3dff6e', mode: 'word', strokeW: 11, y: 0.66, words: 2 },
  karaoke: { ...CAP, label: 'Highlight box', font: 'Poppins', size: 72, color: '#ffffff', highlight: '#7b3fe4', mode: 'box', y: 0.72 },
  clean: { ...CAP, label: 'Subtitle', font: 'DM Sans', size: 54, color: '#ffffff', highlight: '#ffffff', mode: 'none', shadow: false, boxOn: true, boxAlpha: 0.62, y: 0.82, words: 7, anim: 'fade' },
  reveal: { ...CAP, label: 'Word reveal', font: 'Anton', size: 96, upper: true, color: '#ffffff', highlight: '#ff5a36', mode: 'reveal', strokeW: 6, y: 0.5, anim: 'none' },
  neon: { ...CAP, label: 'Neon', font: 'Righteous', size: 80, upper: true, color: '#ffffff', highlight: '#29f3ff', mode: 'word', stroke: '#ff2fb3', strokeW: 6, words: 3 },
};

// The one-tap vibes. Each picks a grade, a caption style, how much motion and the hook card look.
const VIBES = {
  cozy: { label: 'Cozy', desc: 'Warm tones, soft serif words, gentle push-ins', look: 'warm', cap: 'cozy', motion: 'gentle', bar: '#F7B79B',
    hook: { font: 'Fraunces', color: '#3A2A26', bg: '#FFF6EE', upper: false, size: 92 }, cta: { bg: '#C9715A', font: 'Fraunces', upper: false },
    sw: 'linear-gradient(135deg,#F7C9A8,#D98F78)', sample: ['Fraunces', '#fff', 'transparent'] },
  upbeat: { label: 'Upbeat', desc: 'Bold words, punchy zooms, pops and whooshes', look: 'punchy', cap: 'bold', motion: 'punchy', bar: '#FFD400',
    hook: { font: 'Anton', color: '#111111', bg: '#FFD400', upper: true, size: 120 }, cta: { bg: '#ff3b5c' },
    sw: 'linear-gradient(135deg,#FFE27A,#FF8E6B)', sample: ['Montserrat', '#111', '#FFD400'] },
  minimal: { label: 'Minimal', desc: 'Bright and quiet. You do the talking', look: 'airy', cap: 'minimal', motion: 'still', bar: '#ffffff',
    hook: { font: 'DM Sans', color: '#111111', bg: '#ffffff', upper: false, size: 80 }, cta: { bg: '#2B211E', font: 'DM Sans', upper: false },
    sw: 'linear-gradient(135deg,#F4EFEA,#DCD3CB)', sample: ['DM Sans', '#2B211E', 'transparent'] },
  cinematic: { label: 'Cinematic', desc: 'Film grade, slow pushes and fades', look: 'cinematic', cap: 'editorial', motion: 'cinematic', bar: '#ffffff',
    hook: { font: 'Instrument Serif', color: '#ffffff', bgOn: false, upper: false, size: 130, strokeW: 0 }, cta: { bg: '#111111', font: 'Instrument Serif', upper: false },
    sw: 'linear-gradient(135deg,#3B2F2A,#8A5A44)', sample: ['Instrument Serif', '#F4D98C', 'transparent'] },
};

const OVERLAY_BASE = { type: 'text', text: '', x: 0.5, y: 0.3, rotation: 0, anim: 'pop', font: 'Montserrat', size: 90, upper: false, color: '#ffffff', bgOn: false, bg: '#000000', bgAlpha: 1, stroke: '#000000', strokeW: 0, shadow: true, dur: 2.5 };
const TEMPLATES = {
  hook: { label: 'Hook title', text: 'Wait for it', font: 'Fraunces', size: 96, color: '#3A2A26', bgOn: true, bg: '#FFF6EE', y: 0.2, rotation: -2, anim: 'pop' },
  headline: { label: 'Big headline', text: '3 things nobody tells you', font: 'Montserrat', size: 92, upper: true, strokeW: 10, y: 0.22, anim: 'slide-up', dur: 3 },
  note: { label: 'Handwritten', text: 'wait for it...', font: 'Caveat', size: 120, rotation: -6, y: 0.3, anim: 'wiggle' },
  tag: { label: 'Label tag', text: 'BEFORE', font: 'Archivo Black', size: 64, bgOn: true, bg: '#C9715A', x: 0.27, y: 0.12, anim: 'slide-left', dur: 3 },
  quote: { label: 'Quote', text: '"This changed everything."', font: 'Instrument Serif', size: 96, y: 0.35, anim: 'fade', dur: 3 },
  number: { label: 'Big number', text: '$10K', font: 'Bebas Neue', size: 260, color: '#F4D98C', strokeW: 12, y: 0.4, anim: 'zoom', dur: 2 },
  typewriter: { label: 'Typewriter', text: 'POV: you finally get it', font: 'Courier Prime', size: 66, color: '#111111', bgOn: true, bg: '#ffffff', y: 0.18, anim: 'typewriter', shadow: false, dur: 3 },
  cta: { label: 'Call to action', text: 'Follow for more', font: 'Montserrat', size: 68, upper: true, bgOn: true, bg: '#C9715A', y: 0.25, anim: 'bounce' },
  lowerthird: { label: 'Name tag', type: 'lowerthird', text: 'Your Name\nWhat you do · @yourhandle', font: 'Archivo Black', size: 64, bg: '#C9715A', x: 0.45, y: 0.58, anim: 'slide-left', dur: 4 },
  countdown: { label: 'Countdown 3-2-1', type: 'countdown', from: 3, font: 'Anton', size: 300, strokeW: 12, y: 0.45, anim: 'none', dur: 3 },
  arrow: { label: 'Arrow', type: 'shape', kind: 'arrow', color: '#F4D98C', lineW: 16, w: 0.3, rotation: 30, y: 0.45, anim: 'draw', dur: 2 },
  circle: { label: 'Circle it', type: 'shape', kind: 'circle', color: '#F7B79B', lineW: 12, w: 0.42, h: 0.26, y: 0.45, anim: 'draw', dur: 2 },
  underline: { label: 'Underline', type: 'shape', kind: 'underline', color: '#F4D98C', lineW: 14, w: 0.5, y: 0.32, anim: 'draw', dur: 2 },
  box: { label: 'Highlight box', type: 'shape', kind: 'rect', color: '#ffffff', lineW: 10, w: 0.5, h: 0.2, y: 0.45, anim: 'draw', dur: 2 },
};
const EMOJIS = ['✨', '❤️', '😂', '🥹', '👀', '💡', '☕', '🍼', '🧺', '🏡', '🌸', '🙌', '✅', '❌', '🔥', '💰', '⏰', '🎉', '👇', '😍', '🤔', '💯', '🛑', '💇‍♀️'];
const EMOJI_WORDS = [
  [/money|cash|dollar|\$|rich|paid|price|profit|sales?|budget|save[ds]?/i, '💰'], [/coffee|tired|exhausted|sleep/i, '☕'],
  [/baby|toddler|newborn|bottle|nap/i, '🍼'], [/laundry|clean|cleaning|chores?/i, '🧺'], [/home|house|kitchen/i, '🏡'],
  [/love|heart|obsessed/i, '❤️'], [/funny|laugh|lol|joke/i, '😂'], [/cry|tears|emotional/i, '🥹'],
  [/idea|tip|hack|secret|trick|learn/i, '💡'], [/time|fast|quick|minutes?|seconds?|hours?|morning/i, '⏰'],
  [/stop|never|don'?t|wrong|mistake|avoid/i, '🛑'], [/win|best|top|goal/i, '🙌'], [/hair|salon|blonde|curl/i, '💇‍♀️'],
  [/beautiful|pretty|glow|shine|gorgeous|magic/i, '✨'], [/look|watch|see/i, '👀'], [/why|how|what|\?/i, '🤔'],
];
const FILLER = /^(u+m+|u+h+m*|e+r+m*|h+m+|mm+|a+h+)[,.!?…]*$/i;

// Inspector / panel field definitions. "ctx.key" entries override for one context.
const F = {
  text: { label: 'Text', type: 'textarea' }, font: { label: 'Font', type: 'font' },
  size: { label: 'Size', type: 'range', min: 16, max: 320, step: 1 }, upper: { label: 'All caps', type: 'check' },
  color: { label: 'Color', type: 'color' }, highlight: { label: 'Highlight', type: 'color' },
  mode: { label: 'Highlight style', type: 'select', options: [['word', 'Color the spoken word'], ['box', 'Box behind spoken word'], ['reveal', 'Reveal word by word'], ['dim', 'Dim upcoming words'], ['none', 'No highlight']] },
  stroke: { label: 'Outline', type: 'color' }, strokeW: { label: 'Outline width', type: 'range', min: 0, max: 30, step: 1 },
  shadow: { label: 'Drop shadow', type: 'check' },
  boxOn: { label: 'Background', type: 'check' }, box: { label: 'Background color', type: 'color' }, boxAlpha: { label: 'Background opacity', type: 'range', min: 0, max: 1, step: 0.01 },
  bgOn: { label: 'Background', type: 'check' }, bg: { label: 'Background color', type: 'color' }, bgAlpha: { label: 'Background opacity', type: 'range', min: 0, max: 1, step: 0.01 },
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
  video: { label: 'Your voice', type: 'range', min: 0, max: 2, step: 0.05 }, music: { label: 'Music volume', type: 'range', min: 0, max: 1.5, step: 0.05 },
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
const TYPE_NAMES = { text: 'Text', emoji: 'Sticker', image: 'Image', lowerthird: 'Name tag', shape: 'Shape', countdown: 'Countdown' };
const CUT_NAMES = { pause: 'Pause', gap: 'Um or gap', um: 'Um', manual: 'Your cut' };

function defaultProject() {
  return {
    version: 2, name: 'Untitled reel', aspect: '9:16',
    look: { ...LOOK_BASE, fit: 'cover', fx: 0.5, fy: 0.5, bgBlur: true },
    captionStyle: { ...stripLabel(CAPTION_PRESETS.cozy), preset: 'cozy' },
    captions: [], overlays: [], effects: [], sfx: [], cuts: [],
    progress: { on: false, color: '#F7B79B', height: 12, pos: 'bottom' },
    audio: { video: 1, music: 0.25, musicFade: true, musicOffset: 0 },
  };
}
function stripLabel(o) { const { label, ...rest } = o; return { ...rest }; }
function mergeProject(data) {
  const d = defaultProject();
  const p = { ...d, ...data, look: { ...d.look, ...data.look }, captionStyle: { ...d.captionStyle, ...data.captionStyle }, progress: { ...d.progress, ...data.progress }, audio: { ...d.audio, ...data.audio } };
  for (const k of ['captions', 'overlays', 'effects', 'sfx', 'cuts']) p[k] = Array.isArray(p[k]) ? p[k] : [];
  for (const c of p.captions) { c.id = c.id || uid(); if (!c.words) c.words = Captions.estimateWords(c.text, c.start, c.end); }
  for (const k of ['overlays', 'effects', 'sfx', 'cuts']) for (const it of p[k]) it.id = it.id || uid();
  p.overlays = p.overlays.map(o => ({ ...OVERLAY_BASE, ...o }));
  return p;
}

// ---------- state ----------
let P = defaultProject();
let sel = null;            // { kind: 'captions'|'overlays'|'effects'|'sfx'|'cuts', id }
let duration = 0, videoFile = null, pcm = null, env = null, draftKey = null;
let vibe = 'cozy', exportedOnce = false;
const HOP = 0.05;
const images = {}, customSfx = {}, hitboxes = [];
let dirty = true, prevT = 0, exporting = null;
let actx = null, master, vGain, mGain, sfxBus, recDest;
let strip = null; // filmstrip: { canvas, n, dt, tw, th }

const video = $('#video'), musicEl = $('#music'), canvas = $('#stage'), ctx = canvas.getContext('2d');

// ---------- history + autosave ----------
const undoStack = [];
let editing = false;
function snap() { undoStack.push(JSON.stringify(P)); if (undoStack.length > 100) undoStack.shift(); scheduleSave(); }
function beginEdit() { if (!editing) { snap(); editing = true; } scheduleSave(); }
function endEdit() { editing = false; }
function undo() {
  const s = undoStack.pop();
  if (!s) return toast('Nothing to undo');
  P = JSON.parse(s);
  loadImages();
  applyAspect();
  renderStaticFields();
  refreshAll();
  toast('Undone');
}
function scheduleSave() {
  clearTimeout(scheduleSave.t);
  scheduleSave.t = setTimeout(() => {
    if (!draftKey) return;
    try { localStorage.setItem(draftKey, JSON.stringify(P)); } catch { /* storage full or blocked: drafts are a convenience */ }
  }, 1200);
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
const slug = () => (P.name || 'reel').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'reel';
const now = () => video.currentTime || 0;
const total = () => duration || 10;
const listOf = kind => P[kind];
const findSel = () => (sel ? listOf(sel.kind).find(i => i.id === sel.id) : null);
function itemEnd(kind, it) { return kind === 'sfx' ? it.start + SFX.duration(it.type, customSfx) : it.end; }
function sfxOptions() {
  return [...Object.entries(SFX.LIB).map(([k, v]) => [k, v.label]), ...Object.keys(customSfx).map(k => [k, k.slice(7)])];
}
function select(kind, id, open = false) {
  sel = kind ? { kind, id } : null;
  document.body.classList.toggle('inspecting', !!sel && (open || document.body.classList.contains('inspecting')));
  renderInspector(); renderTimeline(); renderCaptionList(); renderCutList();
}

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
  $('#stage-box').dataset.aspect = P.aspect;
  $('#btn-safe').hidden = P.aspect !== '9:16';
  if (P.aspect !== '9:16') setSafe(false);
  dirty = true;
}
function setSafe(on) {
  $('#safe').hidden = !on;
  $('#btn-safe').setAttribute('aria-pressed', String(on));
}

// ---------- cuts: removed stretches of the source clip ----------
// The edit keeps every time in source-clip seconds. Cuts are skipped on playback and export,
// so "output time" is source time minus the cut seconds before it.
const cutAt = t => P.cuts.find(c => t >= c.start && t < c.end - 0.001);
const cutTotal = () => P.cuts.reduce((s, c) => s + Math.max(0, Math.min(c.end, duration) - c.start), 0);
const outDuration = () => Math.max(0, duration - cutTotal());
function outTime(t) {
  let o = t;
  for (const c of P.cuts) { if (c.start >= t) break; o -= Math.min(c.end, t) - c.start; }
  return o;
}
function srcTime(o) {
  let t = o;
  for (const c of P.cuts) { if (c.start <= t) t += c.end - c.start; else break; }
  return Math.min(t, duration);
}
const firstPlayable = () => { const c = cutAt(0); return c ? c.end : 0; };
const endsInCut = t => { const c = cutAt(t); return c && c.end >= duration - 0.04; };

function normalizeCuts(list) {
  const out = [];
  for (const c of [...list].sort((a, b) => a.start - b.start)) {
    c.start = clamp(c.start, 0, duration); c.end = clamp(c.end, 0, duration);
    if (c.end - c.start < 0.08) continue;
    const last = out[out.length - 1];
    if (last && c.start <= last.end + 0.02) {
      last.end = Math.max(last.end, c.end);
      if (c.reason === 'manual') last.reason = 'manual';
      last.auto = last.auto && c.auto;
    } else out.push({ ...c });
  }
  return out;
}

function detectCuts(minPause, useWords) {
  const pad = 0.12, found = [];
  if (env && env.length) {
    const sorted = Array.from(env).sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.15)], hi = sorted[Math.floor(sorted.length * 0.95)];
    const th = lo + (hi - lo) * 0.12;
    let run = null;
    for (let i = 0; i <= env.length; i++) {
      const quiet = i < env.length && env[i] < th;
      if (quiet && run === null) run = i * HOP;
      if (!quiet && run !== null) {
        const end = Math.min(duration, i * HOP);
        if (end - run >= minPause) found.push({ start: run <= 0.01 ? 0 : run + pad, end: end >= duration - HOP * 2 ? duration : end - pad, reason: 'pause' });
        run = null;
      }
    }
  }
  if (useWords && P.captions.length) {
    const ws = Captions.allWords(P.captions).sort((a, b) => a.start - b.start);
    if (ws.length) {
      if (ws[0].start > minPause) found.push({ start: 0, end: ws[0].start - pad, reason: 'pause' });
      for (let i = 1; i < ws.length; i++) {
        const gap = ws[i].start - ws[i - 1].end;
        if (gap >= minPause) found.push({ start: ws[i - 1].end + pad, end: ws[i].start - pad, reason: 'gap' });
      }
      const last = ws[ws.length - 1];
      if (duration - last.end > minPause) found.push({ start: last.end + pad, end: duration, reason: 'pause' });
      for (const w of ws) if (FILLER.test(w.w)) found.push({ start: w.start - 0.03, end: w.end + 0.03, reason: 'um' });
    }
  }
  return found.map(c => ({ ...c, id: uid(), auto: true }));
}

function applyCuts(minPause, useWords) {
  if (!duration) { toast('Add a video first'); return null; }
  if (!env && !P.captions.length) { toast('Still reading the audio. Try again in a moment.'); return null; }
  snap();
  const before = cutTotal();
  const manual = P.cuts.filter(c => !c.auto);
  P.cuts = normalizeCuts([...manual, ...detectCuts(minPause, useWords)]);
  dropCutWords();
  refreshAll();
  return { n: P.cuts.length, saved: cutTotal(), delta: cutTotal() - before };
}

// Words that sit inside a cut would still flash up in their caption, so take them out.
function dropCutWords() {
  if (!P.captions.length || !P.cuts.length) return;
  const keep = Captions.allWords(P.captions).filter(w => !cutAt((w.start + w.end) / 2));
  P.captions = keep.length ? Captions.group(keep.sort((a, b) => a.start - b.start), P.captionStyle.words) : [];
}

function renderCutStats() {
  const d = duration || 0, saved = cutTotal();
  $('#st-before').textContent = fmtS(d);
  $('#st-after').textContent = fmtS(d - saved);
  $('#st-saved').textContent = secs(saved);
  const pill = $('#len-pill');
  pill.hidden = !saved;
  pill.textContent = `✂ ${secs(saved)} of pauses trimmed`;
}

function renderCutList() {
  const ol = $('#cut-list');
  $('#cut-count').textContent = P.cuts.length ? `(${P.cuts.length})` : '';
  renderCutStats();
  if (!P.cuts.length) { ol.innerHTML = '<li class="empty">No cuts yet. Tap <b>Cut the pauses</b>, or add your own below.</li>'; }
  else {
    ol.innerHTML = '';
    for (const c of P.cuts) {
      const li = document.createElement('li');
      li.innerHTML = '<button class="t"></button><span class="what"></span><span class="tag"></span><button class="x">Put back</button>';
      li.querySelector('.t').textContent = fmtS(c.start) + '.' + String(Math.floor((c.start % 1) * 10));
      li.querySelector('.t').addEventListener('click', () => { seek(Math.max(0, c.start - 1.2)); select('cuts', c.id, true); });
      li.querySelector('.what').textContent = CUT_NAMES[c.reason] || 'Cut';
      li.querySelector('.tag').textContent = secs(c.end - c.start);
      li.querySelector('.x').addEventListener('click', () => { snap(); P.cuts = P.cuts.filter(x => x !== c); refreshAll(); });
      ol.append(li);
    }
  }
  const add = document.createElement('li');
  add.innerHTML = '<button class="btn small">+ Cut a bit by hand at the playhead</button>';
  add.querySelector('button').addEventListener('click', () => {
    if (!duration) return toast('Add a video first');
    snap();
    const s = now(), c = { id: uid(), start: s, end: Math.min(duration, s + 0.6), reason: 'manual' };
    P.cuts = normalizeCuts([...P.cuts, c]);
    const hit = P.cuts.find(x => x.start <= s + 0.01 && x.end >= s);
    refreshAll();
    if (hit) select('cuts', hit.id, true);
  });
  ol.append(add);
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
function setTab(tab) {
  document.body.dataset.tab = tab;
  $$('.rail-btn').forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
  $$('.panel').forEach(p => { p.hidden = p.dataset.panel !== tab; });
  if (sel) select(null);
  document.body.classList.remove('inspecting');
  renderGalleries();
  if (tab === 'timeline') renderTimeline();
}

function buildPanels() {
  $$('.rail-btn').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  // vibes
  const vb = $('#vibes');
  for (const [k, v] of Object.entries(VIBES)) {
    const b = document.createElement('button');
    b.className = 'vibe' + (k === vibe ? ' on' : '');
    b.dataset.vibe = k;
    b.innerHTML = '<span class="sw"><span></span></span><b></b><small></small>';
    b.querySelector('.sw').style.background = v.sw;
    const s = b.querySelector('.sw span');
    s.textContent = 'hi, friend';
    s.style.fontFamily = `"${v.sample[0]}"`; s.style.color = v.sample[1]; s.style.background = v.sample[2];
    s.style.fontWeight = '700';
    b.querySelector('b').textContent = v.label;
    b.querySelector('small').textContent = v.desc;
    b.addEventListener('click', () => { vibe = k; $$('.vibe').forEach(x => x.classList.toggle('on', x === b)); });
    vb.append(b);
  }
  const countSwitches = () => {
    const all = $$('.switches input'), on = all.filter(i => i.checked).length;
    $('#magic-count').textContent = `(${on} of ${all.length} on)`;
  };
  $$('.switches input').forEach(i => i.addEventListener('change', countSwitches));
  countSwitches();

  // caption styles: live thumbnails, drawn in renderGalleries
  const cp = $('#cap-presets');
  for (const [k, v] of Object.entries(CAPTION_PRESETS)) {
    const b = document.createElement('button');
    b.className = 'style-card';
    b.dataset.key = k;
    b.title = v.label;
    b.innerHTML = '<canvas width="216" height="312"></canvas><span></span>';
    b.querySelector('span').textContent = v.label;
    b.addEventListener('click', () => applyCaptionPreset(k));
    cp.append(b);
  }

  // looks
  const lp = $('#look-presets');
  for (const [k, v] of Object.entries(LOOK_PRESETS)) {
    const b = document.createElement('button');
    b.className = 'style-card';
    b.dataset.key = k;
    b.innerHTML = '<canvas width="216" height="312"></canvas><span></span>';
    b.querySelector('span').textContent = v.label;
    b.addEventListener('click', () => {
      snap();
      P.look = { ...P.look, ...LOOK_BASE, ...stripLabel(v) };
      P.look.preset = k;
      renderStaticFields();
      dirty = true;
    });
    lp.append(b);
  }

  // text templates
  const tg = $('#tpl-grid');
  for (const [k, v] of Object.entries(TEMPLATES)) {
    const b = document.createElement('button');
    b.className = 'tile';
    const sample = v.type === 'shape' ? { arrow: '➜', circle: '◯', underline: '﹏', rect: '▢' }[v.kind] : v.type === 'countdown' ? '3 · 2 · 1' : v.text.split('\n')[0];
    b.innerHTML = '<span class="sample"></span><small></small>';
    b.querySelector('.sample').textContent = sample;
    b.querySelector('.sample').style.fontFamily = `"${v.font || 'DM Sans'}", sans-serif`;
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

  renderSfxList();
}

// Thumbnails for the caption and look galleries, drawn over the current frame of the clip
// (or a warm gradient before a clip is loaded).
function warmBg(c, W, H) {
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#6E4C40'); g.addColorStop(0.55, '#B98068'); g.addColorStop(1, '#EBC2A6');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const r = c.createRadialGradient(W * 0.5, H * 0.36, 0, W * 0.5, H * 0.36, W * 0.42);
  r.addColorStop(0, 'rgba(255,230,214,.55)'); r.addColorStop(1, 'rgba(255,230,214,0)');
  c.fillStyle = r; c.fillRect(0, 0, W, H);
}
function thumbEnv() { return { video: duration ? video : null, images: {}, hitboxes: null, duration: 1, bg: warmBg }; }
function sampleText() {
  const c = P.captions.find(c => c.words && c.words.length >= 3);
  return c ? c.words.slice(0, 4).map(w => w.w).join(' ') : 'this changed my mornings';
}
function renderGalleries() {
  const tab = document.body.dataset.tab;
  if (tab === 'captions') {
    const text = sampleText(), words = Captions.estimateWords(text, 0, 2);
    const t = (words[1].start + words[1].end) / 2;
    for (const card of $$('#cap-presets .style-card')) {
      const cv = card.querySelector('canvas'), c = cv.getContext('2d'), k = card.dataset.key;
      const s = cv.width / 1080, st = { ...stripLabel(CAPTION_PRESETS[k]) };
      st.size *= s * 1.9; st.strokeW *= s * 1.9; st.y = 0.6; st.anim = 'none';
      const Pt = { ...P, captionStyle: st, captions: [{ start: 0, end: 2, text, words }], overlays: [], effects: [], progress: { on: false } };
      Renderer.renderFrame(c, Pt, t, thumbEnv());
      card.classList.toggle('on', P.captionStyle.preset === k);
    }
  }
  if (tab === 'look') {
    for (const card of $$('#look-presets .style-card')) {
      const cv = card.querySelector('canvas'), c = cv.getContext('2d'), k = card.dataset.key;
      const look = { ...P.look, ...LOOK_BASE, ...stripLabel(LOOK_PRESETS[k]) };
      const Pt = { ...P, look, captions: [], overlays: [], effects: [], progress: { on: false } };
      Renderer.renderFrame(c, Pt, 0, thumbEnv());
      card.classList.toggle('on', (P.look.preset || 'none') === k);
    }
  }
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
  renderFields($('#look-fields'), P.look, ['brightness', 'contrast', 'saturate', 'hue', 'sepia', 'grayscale', 'tint', 'tintAmt', 'vignette', 'grain', 'glow', 'letterbox'], 'look');
  renderFields($('#frame-fields'), P.look, ['fit', 'fx', 'fy', 'bgBlur'], 'look');
  renderFields($('#progress-fields'), P.progress, ['on', 'color', 'height', 'pos'], 'progress');
  renderFields($('#audio-fields'), P.audio, ['video', 'music', 'musicFade', 'musicOffset'], 'audio', applyAudioLevels);
  $('#proj-name').value = P.name || 'Untitled reel';
  renderGalleries();
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
  if (!P.captions.length && duration) toast('Style picked. Tap Auto-caption to see it on your video.');
}

function renderCaptionList() {
  const ol = $('#cap-list');
  $('#cap-count').textContent = P.captions.length ? `(${P.captions.length})` : '';
  if (!P.captions.length) {
    ol.innerHTML = '<li class="empty">No captions yet. Tap Auto-caption, paste your script, or import subtitles.</li>';
    return;
  }
  // Keep the input being typed into intact.
  if (ol.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
  ol.innerHTML = '';
  for (const c of P.captions) {
    const li = document.createElement('li');
    if (sel && sel.id === c.id) li.className = 'on';
    li.innerHTML = '<button class="t"></button><input type="text"><button class="x" aria-label="Delete line">×</button>';
    li.querySelector('.t').textContent = fmtS(outTime(c.start));
    li.querySelector('.t').addEventListener('click', () => { seek(c.start + 0.01); });
    const inp = li.querySelector('input');
    inp.value = c.text;
    inp.setAttribute('aria-label', `Caption at ${fmtS(c.start)}`);
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
  select('overlays', o.id, true);
  dirty = true;
  return o;
}
function addEffect(type, start = now(), end, intensity = 1, auto = false) {
  const d = EFFECTS[type].dur;
  const e = { id: uid(), type, start: Math.max(0, start), end: Math.min(total(), end ?? start + d), intensity };
  if (auto) e.auto = true;
  if (e.end - e.start < 0.05) return null;
  if (!auto) { snap(); P.effects.push(e); select('effects', e.id, true); dirty = true; }
  else P.effects.push(e);
  return e;
}
function addSfx(type, start = now(), gain = 0.8, auto = false) {
  if (start < 0 || (duration && start >= duration)) return null;
  const s = { id: uid(), type, start, gain };
  if (auto) { s.auto = true; P.sfx.push(s); return s; }
  snap();
  P.sfx.push(s);
  select('sfx', s.id, true);
  return s;
}

// ---------- inspector ----------
function renderInspector() {
  const box = $('#inspector');
  const it = findSel();
  if (!it) {
    sel = null;
    box.hidden = true;
    box.innerHTML = '';
    document.body.classList.remove('inspecting');
    return;
  }
  box.hidden = false;
  const kind = sel.kind;
  const color = { captions: 'var(--lane-cap)', overlays: 'var(--lane-ovl)', effects: 'var(--lane-fx)', sfx: 'var(--lane-snd)', cuts: 'var(--lane-cut)' }[kind];
  const titleOf = () => kind === 'captions' ? 'Caption line' : kind === 'overlays' ? TYPE_NAMES[it.type] : kind === 'effects' ? EFFECTS[it.type].label : kind === 'cuts' ? (CUT_NAMES[it.reason] || 'Cut') : (SFX.LIB[it.type]?.label || it.type.slice(7));
  const group = { captions: 'Caption', overlays: 'Text & stickers', effects: 'Effect', sfx: 'Sound effect', cuts: 'Cut' }[kind];
  box.innerHTML = `
    <div class="insp-head">
      <button class="icon-btn" id="insp-back" aria-label="Back to tools" title="Back"><svg><use href="#i-chev"/></svg></button>
      <div class="insp-kind"><small style="color:${color}">${group}</small><span id="insp-title"></span></div>
    </div>
    ${kind === 'cuts' ? '<p class="hint">This part of your clip is skipped when it plays and exports. Drag its edges on the timeline, or put it back.</p>' : ''}
    <div class="fields" id="insp-fields"></div>
    <div class="insp-actions">
      ${kind === 'cuts' ? '<button class="btn" id="insp-del">Put it back</button>' : '<button class="btn" id="insp-dup">Duplicate</button><button class="btn danger" id="insp-del">Delete</button>'}
    </div>`;
  $('#insp-title').textContent = titleOf();
  $('#insp-back').addEventListener('click', () => select(null));
  $('#insp-dup')?.addEventListener('click', duplicateSel);
  $('#insp-del').addEventListener('click', deleteSel);
  const keys = kind === 'captions' ? ['text', 'start', 'end'] : kind === 'overlays' ? OVERLAY_KEYS[it.type] : kind === 'effects' ? ['type', 'intensity', 'start', 'end'] : kind === 'cuts' ? ['start', 'end'] : ['type', 'gain', 'start'];
  const scope = kind === 'effects' ? 'effect' : kind === 'sfx' ? 'sfx' : kind === 'overlays' ? it.type : kind === 'cuts' ? 'cut' : 'caption';
  renderFields($('#insp-fields'), it, keys, scope, key => {
    if (kind === 'captions' && (key === 'text' || key === 'start' || key === 'end')) {
      it.words = Captions.estimateWords(it.text, it.start, it.end);
      renderCaptionList();
    }
    if (kind === 'cuts') { P.cuts.sort((a, b) => a.start - b.start); renderCutStats(); }
    if (key === 'start' || key === 'end' || key === 'type' || key === 'text') renderTimeline();
    if (key === 'type') $('#insp-title').textContent = titleOf();
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
  if (!it || sel.kind === 'cuts') return;
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
  select(sel.kind, copy.id, true);
  dirty = true;
}

// ---------- timeline ----------
const LANES = [
  { kind: 'cuts', label: 'Cuts', cls: 'cut', color: 'var(--lane-cut)' },
  { kind: 'captions', label: 'Captions', cls: 'cap', color: 'var(--lane-cap)' },
  { kind: 'overlays', label: 'Text', cls: 'ovl', color: 'var(--lane-ovl)' },
  { kind: 'effects', label: 'Effects', cls: 'fx', color: 'var(--lane-fx)' },
  { kind: 'sfx', label: 'Sound', cls: 'snd', color: 'var(--lane-snd)' },
];
let pps = 60;
const ROW = 26;

function itemLabel(kind, it) {
  if (kind === 'captions') return it.text;
  if (kind === 'cuts') return '✂ ' + (CUT_NAMES[it.reason] || 'Cut');
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

  // The clip itself: filmstrip with the voice waveform over it.
  if (duration) {
    const lane = document.createElement('div');
    lane.className = 'lane strip';
    lane.style.height = '48px';
    lane.append(stripCanvas(W, 48));
    inner.append(lane);
    const lb = document.createElement('div');
    lb.className = 'lbl';
    lb.style.height = '48px';
    lb.innerHTML = '<i style="background:var(--ink)"></i>Your clip';
    labels.append(lb);
  }

  for (const lane of LANES) {
    if (lane.kind === 'cuts' && !P.cuts.length) continue;
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
    for (const { it, s, e, r } of placed) {
      const d = document.createElement('div');
      d.className = `item ${lane.cls}${sel && sel.id === it.id ? ' sel' : ''}${it.auto ? ' auto' : ''}`;
      d.style.left = s * pps + 'px';
      d.style.width = Math.max(8, (e - s) * pps) + 'px';
      d.style.top = 4 + r * ROW + 'px';
      d.dataset.kind = lane.kind;
      d.dataset.id = it.id;
      d.tabIndex = 0;
      d.title = itemLabel(lane.kind, it) + (it.auto ? ' (added by Magic)' : '');
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
  for (const c of P.cuts) {
    const sh = document.createElement('div');
    sh.className = 'cut-shade';
    sh.style.left = c.start * pps + 'px';
    sh.style.width = Math.max(1, (c.end - c.start) * pps) + 'px';
    inner.append(sh);
  }
  const ph = document.createElement('div');
  ph.className = 'playhead';
  ph.id = 'playhead';
  inner.append(ph);
  updatePlayhead(now());
}

function stripCanvas(W, h) {
  const c = document.createElement('canvas');
  const cw = Math.min(W, 16000);
  c.width = cw; c.height = h;
  c.style.width = W + 'px';
  const g = c.getContext('2d');
  const sx = cw / W;
  g.fillStyle = '#1d1715';
  g.fillRect(0, 0, cw, h);
  if (strip && strip.ready) {
    const tw = strip.tw * (h / strip.th);
    for (let x = 0; x < duration * pps; x += tw) {
      const i = Math.min(strip.ready - 1, Math.round((x / pps) / strip.dt));
      g.drawImage(strip.canvas, i * strip.tw, 0, strip.tw, strip.th, x * sx, 0, tw * sx, h);
    }
    g.fillStyle = 'rgba(29,23,21,.35)';
    g.fillRect(0, 0, cw, h);
  }
  if (env) {
    let max = 0;
    for (const v of env) max = Math.max(max, v);
    g.fillStyle = 'rgba(255, 236, 225, .85)';
    for (let i = 0; i < env.length; i++) {
      const x = i * HOP * pps * sx, bh = (env[i] / (max || 1)) * (h * 0.7);
      g.fillRect(x, h - bh - 3, Math.max(1, HOP * pps * sx - 0.6), bh);
    }
  }
  return c;
}

// Grab one small frame per second (up to 90) with a second video element.
async function buildFilmstrip(url) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; });
  const n = Math.max(2, Math.min(90, Math.ceil(duration)));
  const th = 64, tw = Math.max(24, Math.round(th * (v.videoWidth / v.videoHeight)));
  const cv = document.createElement('canvas');
  cv.width = tw * n; cv.height = th;
  const g = cv.getContext('2d');
  const s = { canvas: cv, n, dt: duration / (n - 1), tw, th, ready: 0, url };
  strip = s;
  for (let i = 0; i < n; i++) {
    if (strip !== s) return;
    await new Promise(r => { v.onseeked = r; v.currentTime = Math.min(duration - 0.05, i * s.dt); });
    g.drawImage(v, i * tw, 0, tw, th);
    s.ready = i + 1;
    if (i % 15 === 14 || i === n - 1) renderTimeline();
  }
  v.removeAttribute('src');
  v.load();
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
      // On touch screens a drag on empty lanes should scroll; only the ruler and clip strip scrub.
      if (e.pointerType === 'touch' && !e.target.closest('.ruler, .strip')) return;
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
    if (Math.abs(e.clientX - drag.x0) > 3) drag.moved = true;
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
    if (!drag.moved) { undoStack.pop(); document.body.classList.add('inspecting'); }
    else if (drag.kind === 'captions') P.captions.sort((a, b) => a.start - b.start);
    else if (drag.kind === 'cuts') P.cuts = normalizeCuts(P.cuts);
    if (drag.kind === 'cuts' && !P.cuts.find(c => c.id === drag.it.id)) sel = null;
    drag = null;
    renderTimeline();
    renderInspector();
    renderCaptionList();
    renderCutList();
  };
  inner.addEventListener('pointerup', up);
  inner.addEventListener('pointercancel', up);
  inner.addEventListener('keydown', e => {
    const el = e.target.closest('.item');
    if (el && e.key === 'Enter') select(el.dataset.kind, el.dataset.id, true);
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
    if (!hit) {
      if (sel && sel.kind === 'overlays') select(null);
      else if (duration && e.pointerType !== 'mouse') togglePlay();
      return;
    }
    const o = P.overlays.find(o => o.id === hit.id);
    if (!sel || sel.id !== o.id) select('overlays', o.id, true);
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
// Music follows output time, so it keeps flowing smoothly across cuts.
function syncMusic(t) {
  if (!musicEl.src || !actx) return;
  const mt = outTime(t) - P.audio.musicOffset;
  const should = !video.paused && mt >= 0 && mt < (musicEl.duration || Infinity);
  if (should && musicEl.paused) { musicEl.currentTime = mt; musicEl.play().catch(() => {}); }
  if (!should && !musicEl.paused) musicEl.pause();
  if (should && Math.abs(musicEl.currentTime - mt) > 0.3 && video.playbackRate === 1) musicEl.currentTime = mt;
  let g = P.audio.music;
  const od = outDuration(), ot = outTime(t);
  if (P.audio.musicFade && od && ot > od - 2) g *= Math.max(0, (od - ot) / 2);
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
  if (!duration) return toast('Add a video first');
  ensureAudio();
  if (video.paused) {
    const t = video.currentTime;
    if (video.ended || t >= duration - 0.05 || endsInCut(t)) video.currentTime = firstPlayable();
    prevT = video.currentTime - 0.001;
    video.play();
  } else {
    video.pause();
  }
}
function endPlayback() {
  video.pause();
  if (exporting && exporting.finish) exporting.finish();
}
function updateClock(t) {
  $('#clock').textContent = `${fmtS(outTime(t))} / ${fmtS(outDuration())}`;
}

function tick() {
  requestAnimationFrame(tick);
  let t = now();
  const playing = !video.paused;
  if (playing) {
    const c = P.cuts.length && cutAt(t);
    if (c) {
      if (c.end >= duration - 0.04) { endPlayback(); return; }
      // While exporting, pause the recorder during the jump so the seek doesn't add dead frames.
      if (exporting && exporting.rec && exporting.rec.state === 'recording') {
        exporting.rec.pause();
        video.addEventListener('seeked', () => { if (exporting && exporting.rec.state === 'paused') exporting.rec.resume(); }, { once: true });
      }
      video.currentTime = c.end;
      prevT = c.end;
      return; // hold the last good frame while the video seeks past the cut
    }
    if (t >= prevT && t - prevT < 0.75) for (const s of P.sfx) if (s.start > prevT && s.start <= t) fireSfx(s);
    prevT = t;
    syncMusic(t);
    dirty = true;
  }
  if (!dirty || video.seeking && playing) return;
  dirty = false;
  const od = outDuration();
  const es = Renderer.renderFrame(ctx, P, t, { video, images, hitboxes, duration, progress: od ? outTime(t) / od : 0 });
  document.body.classList.toggle('in-cut', !playing && !!duration && !!cutAt(t));
  $('#cut-badge').hidden = !(!playing && duration && cutAt(t));
  if (playing) {
    if (video.playbackRate !== es.rate) video.playbackRate = es.rate;
    updatePlayhead(t);
    updateClock(t);
    if (exporting) {
      $('#exp-bar').style.width = (100 * outTime(t)) / od + '%';
      $('#exp-clock').textContent = `${fmtS(outTime(t))} of ${fmtS(od)}`;
    }
  }
}

// ---------- loading media ----------
async function loadVideo(file) {
  if (!file || !file.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v|mkv)$/i.test(file.name)) return toast('That file is not a video');
  videoFile = file;
  pcm = env = null;
  strip = null;
  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(file);
  await new Promise((res, rej) => { video.onloadedmetadata = res; video.onerror = () => rej(new Error('This browser cannot play that video format. Try an MP4.')); })
    .catch(err => { toast(err.message, 5000); throw err; });
  duration = video.duration;
  document.body.classList.remove('empty');
  $('#dropzone').hidden = true;
  video.currentTime = 0.001;
  video.onseeked = () => { dirty = true; if (video.paused) renderGalleries(); };
  video.onended = () => { musicEl.pause(); document.body.classList.remove('playing'); endPlayback(); };
  video.onplay = () => { document.body.classList.add('playing'); $('#btn-play use').setAttribute('href', '#i-pause'); $('#btn-play').setAttribute('aria-label', 'Pause'); };
  video.onpause = () => { document.body.classList.remove('playing'); $('#btn-play use').setAttribute('href', '#i-play'); $('#btn-play').setAttribute('aria-label', 'Play'); musicEl.pause(); dirty = true; };

  // Same clip as last time? Pick the draft back up.
  draftKey = `reelsmith:draft:${file.name}:${file.size}`;
  let restored = false;
  try {
    const saved = localStorage.getItem(draftKey);
    if (saved && !P.captions.length && !P.overlays.length && !P.cuts.length) {
      snap();
      P = mergeProject(JSON.parse(saved));
      loadImages();
      applyAspect();
      restored = true;
    }
  } catch { /* no draft */ }
  if (!restored && P.name === 'Untitled reel') P.name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60);

  // A sideways clip in a vertical frame: show the whole shot over a blurred fill.
  const landscape = video.videoWidth > video.videoHeight;
  const [W, H] = ASPECTS[P.aspect];
  if (!restored && landscape && H > W && !P.captions.length && !P.overlays.length) P.look.fit = 'contain';
  P.effects = P.effects.filter(e => e.start < duration);
  P.cuts = normalizeCuts(P.cuts);
  renderStaticFields();
  refreshAll();
  updateClock(0);
  setStep();
  if (restored) toast('Welcome back. We picked up where you left off (Undo starts fresh).', 5000);
  else toast('Looking good! Next: tap Make my reel.', 4000);
  buildFilmstrip(video.src).catch(() => {});
  Captions.decodeAudio(file).then(p => {
    pcm = p;
    env = Captions.envelope(p, 16000, HOP);
    renderTimeline();
  }).catch(() => { toast('Could not read the audio track. Captions can still be pasted or imported.', 5000); });
}

// ---------- captions ----------
function setCapStatus(msg) { $('#cap-status').textContent = msg; }

async function transcribeInto(onStatus) {
  const audio = pcm || await Captions.decodeAudio(videoFile);
  const words = await Captions.transcribe(audio, $('#cap-lang').value, onStatus);
  if (!words.length) throw new Error('No speech found in this clip');
  snap();
  P.captions = Captions.group(words, P.captionStyle.words);
  dropCutWords();
  refreshAll();
  return words.length;
}

async function autoCaption() {
  if (!videoFile) return toast('Add a video first');
  const btn = $('#btn-transcribe');
  btn.disabled = true;
  try {
    const n = await transcribeInto(setCapStatus);
    setCapStatus(`Done: ${n} words in ${P.captions.length} lines. Tap any line below to fix a word.`);
    toast('Captions ready');
  } catch (err) {
    console.error(err);
    setCapStatus(`Captions didn't finish (${err.message}). The first run needs internet to download the speech model. You can paste your script instead.`);
  } finally {
    btn.disabled = false;
  }
}

function fitPasted() {
  const text = $('#cap-paste').value.trim();
  if (!text) return toast('Paste your script first');
  if (!duration) return toast('Add a video first');
  snap();
  P.captions = Captions.group(Captions.fitTranscript(text, env, HOP, duration), P.captionStyle.words);
  refreshAll();
  toast(env ? 'Timed to your voice. Drag lines on the timeline to fine-tune.' : 'Spread evenly over the clip. Drag lines to fine-tune.', 4000);
}

function guessHook() {
  if (!P.captions.length) return '';
  const first = P.captions.slice(0, 3).map(c => c.text).join(' ').split(/(?<=[.!?])\s/)[0];
  return first.split(/\s+/).slice(0, 7).join(' ').replace(/[,.]$/, '');
}

// ---------- Magic: the one-tap edit ----------
function autoEdit(o) {
  snap();
  const dur = duration, rnd = Math.random, V = VIBES[o.vibe];
  P.overlays = P.overlays.filter(x => !x.auto);
  P.effects = P.effects.filter(x => !x.auto);
  P.sfx = P.sfx.filter(x => !x.auto);

  if (o.look) { P.look = { ...P.look, ...LOOK_BASE, ...stripLabel(LOOK_PRESETS[V.look]), preset: V.look }; }
  if (o.capStyle) {
    const keep = P.captionStyle.words;
    P.captionStyle = { ...stripLabel(CAPTION_PRESETS[V.cap]), preset: V.cap };
    document.fonts.load(fontStr(P.captionStyle.font, 40)).then(() => { dirty = true; });
    if (keep !== P.captionStyle.words) regroupCaptions();
  }
  const fx = (type, s, e, i = 1) => addEffect(type, clamp(s, 0, dur), clamp(e, 0, dur), i, true);
  const sfx = (type, s, g) => o.sfx && !cutAt(Math.max(0, s)) && addSfx(type, Math.max(0, s), g, true);
  const ov = (tpl, extra) => {
    const it = { ...OVERLAY_BASE, ...stripLabel(TEMPLATES[tpl] || {}), ...extra, id: uid(), auto: true };
    delete it.dur;
    if (it.font) document.fonts.load(fontStr(it.font, 40)).then(() => { dirty = true; });
    P.overlays.push(it);
  };
  // Everything is placed in output time, then mapped back to the source clip, so cuts are respected.
  const od = outDuration(), t0 = firstPlayable();
  const hookEnd = srcTime(Math.min(3, od * 0.3));
  const ctaStart = srcTime(Math.max(outTime(hookEnd) + 1, od - 2.6));
  const beatsFrom = every => (P.captions.length
    ? P.captions.filter((c, i) => i > 0 && i % every === 0).map(c => [c.start, Math.min(c.end, c.start + 2.2)])
    : Array.from({ length: Math.floor(od / 3.5) }, (_, i) => { const s = srcTime(3.5 * (i + 1)); return [s, s + 1.6]; })
  ).filter(([s]) => s > hookEnd && s < ctaStart - 0.3 && !cutAt(s));

  if (o.hook) {
    ov('hook', { text: o.hook, start: t0, end: hookEnd, rotation: rnd() < 0.5 ? -2 : 2, bgOn: true, ...V.hook });
    sfx(o.vibe === 'cozy' ? 'sparkle' : 'pop', t0 + 0.05, 0.5);
  }
  if (o.effects) {
    if (V.motion === 'cinematic') {
      fx('fadein', t0, t0 + 0.9);
      fx('fadeout', srcTime(od - 1.2), dur);
      for (let t = 0; t < dur - 1; t += 5) fx('kenburns', t, Math.min(dur, t + 4.6), 0.7 + rnd() * 0.5);
      sfx('boom', t0 + 0.1, 0.4);
    } else if (V.motion === 'still') {
      fx('kenburns', 0, dur, 0.45);
    } else if (V.motion === 'gentle') {
      fx('fadein', t0, t0 + 0.4);
      beatsFrom(3).forEach(([s, e], i) => {
        if (i % 2) fx('punch', s, e, 0.45);
        else fx('kenburns', s, Math.min(dur, e + 2), 0.6);
        if (i % 3 === 0) sfx('swoosh', s - 0.1, 0.15);
      });
    } else {
      fx('flash', t0, t0 + 0.3, 0.9);
      fx('zoomout', t0, t0 + 1.1, 1);
      sfx('whoosh', t0, 0.5);
      const beats = beatsFrom(2);
      beats.forEach(([s, e], i) => {
        if (rnd() < 0.2) fx('kenburns', s, e + 1, 1.2);
        else fx('punch', s, e, i % 2 ? 1.35 : 0.8);
        if (i % 2 === 0) sfx(i % 4 === 0 ? 'whoosh' : 'swoosh', s - 0.12, 0.3);
      });
      if (env) {
        for (const p of Captions.peaks(env, HOP, 3, 3)) {
          if (p < hookEnd || p > ctaStart || cutAt(p)) continue;
          fx('shake', p, p + 0.45, 0.7);
          sfx('boom', p, 0.35);
        }
      }
    }
  }

  // Emoji stickers on words that call for one.
  if (o.emoji && P.captions.length) {
    let last = -10, n = 0;
    for (const c of P.captions) {
      if (n >= 6 || c.start - last < 3 || c.start < hookEnd || c.start > ctaStart || cutAt(c.start)) continue;
      const hit = EMOJI_WORDS.find(([re]) => re.test(c.text));
      if (!hit) continue;
      const left = n % 2 === 0;
      ov(null, { type: 'emoji', text: hit[1], size: 160, anim: 'bounce', x: left ? 0.2 : 0.8, y: P.captionStyle.y - 0.13, rotation: left ? -12 : 12, start: c.start, end: Math.min(c.start + 1.4, dur), shadow: true });
      sfx('pop', c.start, 0.3);
      last = c.start; n++;
    }
  }

  if (o.cta && od > 5) {
    ov('cta', { text: o.cta, start: ctaStart, end: dur, ...V.cta });
    sfx('ding', ctaStart, 0.45);
  }
  if (o.progress) { P.progress.on = true; P.progress.color = V.bar; }

  renderStaticFields();
  refreshAll();
}

let magicRunning = false;
async function runMagic() {
  if (!duration) { toast('Add a video first'); return; }
  if (magicRunning) return;
  magicRunning = true;
  const btn = $('#btn-magic');
  btn.disabled = true;
  video.pause();
  const opts = {
    vibe, hook: $('#auto-hook').value.trim(), cta: $('#auto-cta').value.trim(),
    cut: $('#auto-cut').checked, look: $('#auto-look').checked, capStyle: $('#auto-capstyle').checked, effects: $('#auto-effects').checked,
    sfx: $('#auto-sfx').checked, emoji: $('#auto-emoji').checked, progress: $('#auto-progress').checked,
  };
  const steps = [['listen', 'Listening to your words'], ['cut', 'Cutting pauses and ums'], ['style', 'Styling your captions'], ['polish', 'Adding the finishing touches']];
  const ol = $('#magic-run');
  ol.hidden = false;
  ol.innerHTML = steps.map(([k, l]) => `<li data-k="${k}">${l}<small></small></li>`).join('');
  const mark = (k, state, note = '') => { const li = $(`li[data-k="${k}"]`, ol); li.className = state; li.querySelector('small').textContent = note; };
  try {
    mark('listen', 'doing');
    if (P.captions.length) mark('listen', 'done', `${P.captions.length} lines`);
    else {
      try {
        const n = await transcribeInto(msg => mark('listen', 'doing', msg.replace(/^Downloading /, '').slice(0, 42)));
        mark('listen', 'done', `${n} words`);
      } catch (err) {
        console.error(err);
        mark('listen', 'skip', 'Couldn\'t caption (offline?)');
      }
    }
    if (!opts.hook) { opts.hook = guessHook(); $('#auto-hook').value = opts.hook; }

    mark('cut', 'doing');
    await sleep(250);
    if (opts.cut && duration) {
      for (let i = 0; i < 40 && !env && !P.captions.length; i++) await sleep(150);
      const r = applyCuts(+$('#cut-min').value, $('#cut-words').checked);
      mark('cut', r ? 'done' : 'skip', r ? `${secs(r.saved)} saved` : '');
    } else mark('cut', 'skip', 'Off');

    mark('style', 'doing');
    await sleep(300);
    mark('style', opts.capStyle ? 'done' : 'skip', opts.capStyle ? CAPTION_PRESETS[VIBES[vibe].cap].label : 'Off');
    mark('polish', 'doing');
    await sleep(300);
    autoEdit(opts);
    mark('polish', 'done', VIBES[vibe].label);
    seek(firstPlayable());
    toast('Your reel is ready. Press play!', 4000);
  } finally {
    magicRunning = false;
    btn.disabled = false;
  }
}

// ---------- export ----------
function pickMime() {
  const list = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
}

let lastExport = null;
async function exportVideo() {
  if (!duration) return toast('Add a video first');
  const mime = pickMime();
  if (!mime || !canvas.captureStream) return toast('This browser cannot record video. Use Chrome, Edge or Safari.', 5000);
  ensureAudio();
  await actx.resume();
  video.pause();
  select(null);
  setSafe(false);
  await new Promise(r => { video.onseeked = () => { dirty = true; r(); }; video.currentTime = firstPlayable(); });
  video.onseeked = () => { dirty = true; };

  const stream = canvas.captureStream(30);
  recDest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000, audioBitsPerSecond: 192_000 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise(r => { rec.onstop = r; });
  exporting = { cancelled: false, rec };
  $('#exp-progress').hidden = false;
  $('#exp-done').hidden = true;
  $('#exp-bar').style.width = '0';
  $('#dlg-export').showModal();

  rec.start(500);
  prevT = video.currentTime - 0.001;
  video.playbackRate = 1;
  dirty = true;
  await new Promise(r => {
    let done = false;
    const end = () => { if (done) return; done = true; video.removeEventListener('ended', end); r(); };
    video.addEventListener('ended', end);
    exporting.finish = end;
    video.play().catch(end);
  });
  await sleep(200);
  if (rec.state === 'paused') rec.resume();
  rec.stop();
  await stopped;
  stream.getVideoTracks().forEach(t => t.stop());
  const cancelled = exporting.cancelled;
  exporting = null;
  if (cancelled) { $('#dlg-export').close(); toast('Export cancelled'); return; }

  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  const blob = new Blob(chunks, { type: mime.split(';')[0] });
  const url = URL.createObjectURL(blob);
  const name = `${slug()}.${ext}`;
  lastExport = new File([blob], name, { type: blob.type });
  $('#exp-video').src = url;
  const dl = $('#exp-download');
  dl.href = url;
  dl.download = name;
  $('#exp-share').hidden = !(navigator.canShare && navigator.canShare({ files: [lastExport] }));
  $('#exp-info').textContent = `${fmtS(outDuration())} long · ${(blob.size / 1e6).toFixed(1)} MB · ${ext.toUpperCase()}` +
    (ext === 'webm' ? '. Instagram prefers MP4, which Chrome, Edge and Safari make directly.' : '');
  $('#exp-progress').hidden = true;
  $('#exp-done').hidden = false;
  exportedOnce = true;
  setStep();
}

// ---------- refresh ----------
function setStep() {
  const step = !duration ? 1 : exportedOnce ? 3 : 2;
  $$('#stepper li').forEach(li => {
    const n = +li.dataset.step;
    li.classList.toggle('now', n === step);
    li.classList.toggle('done', n < step || (exportedOnce && n === 3));
  });
}
function refreshAll() {
  renderTimeline();
  renderInspector();
  renderCaptionList();
  renderCutList();
  renderGalleries();
  updateClock(now());
  dirty = true;
}

// ---------- wiring ----------
function bindUI() {
  $('#file-video').addEventListener('change', e => { closeMenu(); loadVideo(e.target.files[0]).catch(() => {}); e.target.value = ''; });
  const stageBox = $('#stage-box');
  ['dragenter', 'dragover'].forEach(ev => stageBox.addEventListener(ev, e => { e.preventDefault(); $('#dropzone').classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => stageBox.addEventListener(ev, () => $('#dropzone').classList.remove('over')));
  stageBox.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadVideo(f).catch(() => {}); });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f && f.type.startsWith('video/')) loadVideo(f).catch(() => {}); });

  $('#proj-name').addEventListener('input', e => { P.name = e.target.value; scheduleSave(); });
  $('#aspect').addEventListener('change', e => { snap(); P.aspect = e.target.value; applyAspect(); });
  $('#btn-safe').addEventListener('click', () => setSafe($('#safe').hidden));
  $('#btn-play').addEventListener('click', togglePlay);
  $('#btn-back').addEventListener('click', () => seek(firstPlayable()));
  $('#btn-undo').addEventListener('click', undo);
  $('#btn-tl-toggle').addEventListener('click', () => $('#timeline').classList.toggle('collapsed'));

  // menu
  const menu = $('#menu-pop'), mbtn = $('#btn-menu');
  function closeMenu() { menu.hidden = true; mbtn.setAttribute('aria-expanded', 'false'); }
  window.closeMenu = closeMenu;
  mbtn.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; mbtn.setAttribute('aria-expanded', String(!menu.hidden)); });
  document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('.menu')) closeMenu(); });
  $('#btn-shortcuts').addEventListener('click', () => { closeMenu(); $('#dlg-keys').showModal(); });

  // magic
  $('#btn-magic').addEventListener('click', () => runMagic().catch(err => { console.error(err); toast('Something went wrong: ' + err.message, 5000); }));

  // tighten
  const minIn = $('#cut-min');
  const showMin = () => { $('#cut-min-out').textContent = (+minIn.value).toFixed(2).replace(/0$/, '') + 's'; $$('.seg-btn').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.snap - minIn.value) < 0.01)); };
  minIn.addEventListener('input', showMin);
  $$('.seg-btn').forEach(b => b.addEventListener('click', () => { minIn.value = b.dataset.snap; showMin(); }));
  showMin();
  $('#btn-cut').addEventListener('click', () => {
    const r = applyCuts(+minIn.value, $('#cut-words').checked);
    if (!r) return;
    $('#cut-status').textContent = r.n ? `${r.n} cuts, ${secs(r.saved)} shorter. Press play to hear it.` : 'No pauses that long. Try Snappy.';
    if (r.n) seek(firstPlayable());
  });
  $('#btn-cut-clear').addEventListener('click', () => {
    if (!P.cuts.length) return;
    snap();
    P.cuts = [];
    refreshAll();
    $('#cut-status').textContent = 'All cuts put back. Undo brings them back.';
  });

  // captions
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
    closeMenu();
    if (!P.captions.length) return toast('No captions to download');
    download(new Blob([Captions.toSRT(P.captions)], { type: 'text/plain' }), `${slug()}.srt`);
  });
  $('#btn-cap-add').addEventListener('click', () => {
    snap();
    const s = now(), e = Math.min(total(), s + 1.5);
    const c = { id: uid(), start: s, end: e, text: 'New caption', words: Captions.estimateWords('New caption', s, e) };
    P.captions.push(c);
    P.captions.sort((a, b) => a.start - b.start);
    select('captions', c.id, true);
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
    toast('Music added. It plays softly under your voice.');
  });

  $('#btn-export').addEventListener('click', () => exportVideo().catch(err => { console.error(err); exporting = null; $('#dlg-export').close(); toast('Export failed: ' + err.message, 5000); }));
  $('#exp-cancel').addEventListener('click', () => { if (exporting) { exporting.cancelled = true; video.pause(); exporting.finish && exporting.finish(); } });
  $('#exp-close').addEventListener('click', () => $('#dlg-export').close());
  $('#exp-share').addEventListener('click', () => { if (lastExport) navigator.share({ files: [lastExport], title: P.name }).catch(() => {}); });
  $('#dlg-export').addEventListener('cancel', e => { if (exporting) e.preventDefault(); });

  $('#btn-save').addEventListener('click', () => {
    closeMenu();
    download(new Blob([JSON.stringify(P, null, 1)], { type: 'application/json' }), `${slug()}.reelsmith.json`);
    toast('Project saved. Open it again with the same video.');
  });
  $('#file-project').addEventListener('change', async e => {
    closeMenu();
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      snap();
      P = mergeProject(data);
      if (duration) P.cuts = normalizeCuts(P.cuts);
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
setTab('magic');
renderStaticFields();
refreshAll();
setStep();
Promise.all(FONTS.map(f => document.fonts.load(fontStr(f.name, 40)).catch(() => {}))).then(() => { dirty = true; renderGalleries(); });
requestAnimationFrame(tick);
