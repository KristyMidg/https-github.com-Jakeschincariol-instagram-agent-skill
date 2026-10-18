// Frame renderer. Draws one output frame of the project at time t onto a
// canvas: the graded source video, timed effects, overlays, captions and the
// progress bar. Preview and export both call renderFrame, so what you see is
// what you get.
const FONTS = [
  { name: 'Montserrat', w: 900 }, { name: 'Anton', w: 400 }, { name: 'Bebas Neue', w: 400 },
  { name: 'Bangers', w: 400 }, { name: 'Luckiest Guy', w: 400 }, { name: 'Archivo Black', w: 400 },
  { name: 'Poppins', w: 800 }, { name: 'Permanent Marker', w: 400 }, { name: 'Playfair Display', w: 900 },
  { name: 'Righteous', w: 400 }, { name: 'Rubik Mono One', w: 400 }, { name: 'Caveat', w: 700 },
  { name: 'Pacifico', w: 400 }, { name: 'Oswald', w: 700 }, { name: 'Courier Prime', w: 700 },
  { name: 'DM Sans', w: 700 },
];
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

function fontStr(name, size) {
  const f = FONTS.find(f => f.name === name) || FONTS[0];
  return `${f.w} ${Math.round(size)}px "${f.name}", Impact, "Arial Black", sans-serif`;
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOutCubic = p => 1 - Math.pow(1 - p, 3);
const easeInOut = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const easeOutElastic = p => (p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1);

function hexA(hex, a) {
  const h = (hex || '#000000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Deterministic per-frame randomness so a glitch looks the same on replay.
function seeded(seed) {
  let s = Math.floor(seed) * 9301 + 49297;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

const EFFECTS = {
  punch: { label: 'Punch-in zoom', dur: 1.5, hint: 'Snap zoom on a key line' },
  kenburns: { label: 'Slow push-in', dur: 4, hint: 'Gentle cinematic zoom' },
  zoomout: { label: 'Zoom out reveal', dur: 1.5, hint: 'Starts tight, pulls back' },
  shake: { label: 'Camera shake', dur: 0.5, hint: 'Impact moments' },
  tilt: { label: 'Dutch tilt', dur: 1.5, hint: 'Dramatic angle' },
  flash: { label: 'White flash', dur: 0.35, hint: 'Transition / beat hit' },
  glitch: { label: 'Glitch', dur: 0.4, hint: 'Digital tear' },
  rgbsplit: { label: 'RGB split', dur: 1, hint: 'Chromatic offset' },
  vhs: { label: 'VHS', dur: 3, hint: 'Retro tape look' },
  bw: { label: 'Black & white', dur: 2, hint: 'Flashback / emphasis' },
  blurin: { label: 'Blur in', dur: 0.8, hint: 'Focus pull opening' },
  invert: { label: 'Invert', dur: 0.2, hint: 'Strobe hit' },
  fadein: { label: 'Fade from black', dur: 0.8, hint: 'Opening' },
  fadeout: { label: 'Fade to black', dur: 1, hint: 'Ending' },
  slowmo: { label: 'Slow motion', dur: 2, hint: 'Plays the clip at half speed' },
  speedup: { label: 'Speed up', dur: 2, hint: 'Plays the clip at double speed' },
};

function effectState(effects, t) {
  const s = { zoom: 1, dx: 0, dy: 0, rot: 0, filter: '', flash: 0, black: 0, glitch: 0, rgb: 0, vhs: 0, rate: 1 };
  for (const e of effects) {
    if (t < e.start || t >= e.end) continue;
    const d = Math.max(0.001, e.end - e.start), p = (t - e.start) / d, I = e.intensity ?? 1, lt = t - e.start;
    switch (e.type) {
      case 'punch': s.zoom *= 1 + 0.18 * I * easeOutCubic(clamp(lt / 0.1)); break;
      case 'kenburns': s.zoom *= 1 + 0.15 * I * easeInOut(p); break;
      case 'zoomout': s.zoom *= 1 + 0.25 * I * (1 - easeOutCubic(p)); break;
      case 'shake': {
        const amp = 30 * I * (1 - p * 0.6);
        s.dx += (Math.sin(t * 83) + Math.sin(t * 47.3)) * amp / 2;
        s.dy += (Math.cos(t * 71) + Math.sin(t * 39.7)) * amp / 2;
        s.rot += Math.sin(t * 61) * 0.012 * I;
        s.zoom *= 1.06;
        break;
      }
      case 'tilt': s.rot += 0.07 * I * easeOutCubic(clamp(lt / 0.25)); s.zoom *= 1 + 0.12 * I; break;
      case 'flash': s.flash = Math.max(s.flash, I * Math.pow(1 - p, 2)); break;
      case 'fadein': s.black = Math.max(s.black, 1 - p); break;
      case 'fadeout': s.black = Math.max(s.black, p); break;
      case 'glitch': s.glitch = Math.max(s.glitch, I); break;
      case 'rgbsplit': s.rgb = Math.max(s.rgb, 14 * I); break;
      case 'vhs': s.vhs = Math.max(s.vhs, I); break;
      case 'bw': s.filter += ' grayscale(1)'; break;
      case 'invert': s.filter += ' invert(1)'; break;
      case 'blurin': s.filter += ` blur(${((1 - easeOutCubic(p)) * 30 * I).toFixed(1)}px)`; break;
      case 'slowmo': s.rate = Math.min(s.rate, clamp(1 - 0.5 * I, 0.25, 1)); break;
      case 'speedup': s.rate = Math.max(s.rate, clamp(1 + I, 1, 4)); break;
    }
  }
  return s;
}

const Renderer = (() => {
  const off = document.createElement('canvas'), offCtx = off.getContext('2d');
  const tmp = document.createElement('canvas'), tmpCtx = tmp.getContext('2d');
  const grain = document.createElement('canvas');
  grain.width = grain.height = 256;
  {
    const g = grain.getContext('2d'), img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  let grainPattern = null;

  function sizeTo(c, W, H) { if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } }

  function snapshot(ctx, W, H) {
    sizeTo(off, W, H);
    offCtx.globalCompositeOperation = 'copy';
    offCtx.drawImage(ctx.canvas, 0, 0);
    offCtx.globalCompositeOperation = 'source-over';
    return off;
  }

  function channelSplit(ctx, W, H, amt) {
    const src = snapshot(ctx, W, H);
    sizeTo(tmp, W, H);
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const [col, dx] of [['#f00', -amt], ['#0f0', 0], ['#00f', amt]]) {
      tmpCtx.globalCompositeOperation = 'copy';
      tmpCtx.drawImage(src, 0, 0);
      tmpCtx.globalCompositeOperation = 'multiply';
      tmpCtx.fillStyle = col; tmpCtx.fillRect(0, 0, W, H);
      ctx.drawImage(tmp, dx, 0);
    }
    tmpCtx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  function glitch(ctx, W, H, I, t) {
    const rnd = seeded(t * 24);
    channelSplit(ctx, W, H, 10 + 25 * I * rnd());
    const src = snapshot(ctx, W, H);
    const n = 4 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      const y = rnd() * H, h = 10 + rnd() * H * 0.08, dx = (rnd() - 0.5) * W * 0.18 * I;
      ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
    }
  }

  function vhs(ctx, W, H, I, t) {
    channelSplit(ctx, W, H, 5 * I);
    ctx.save();
    ctx.globalAlpha = 0.12 * I;
    ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
    const band = ((t * 0.35) % 1) * H;
    ctx.globalAlpha = 0.08 * I;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, band, W, H * 0.04);
    ctx.restore();
  }

  function drawVideo(ctx, W, H, video, look, es, extraFilter) {
    const sw = video.videoWidth, sh = video.videoHeight;
    if (!sw || !sh) return;
    const cover = Math.max(W / sw, H / sh), contain = Math.min(W / sw, H / sh);
    const base = look.fit === 'contain' ? contain : cover;
    const dw = sw * base, dh = sh * base;
    const dx = (W - dw) * (dw > W ? look.fx : 0.5), dy = (H - dh) * (dh > H ? look.fy : 0.5);

    if (look.fit === 'contain' && look.bgBlur && (dw < W - 1 || dh < H - 1)) {
      const bw = sw * cover * 1.1, bh = sh * cover * 1.1;
      ctx.save();
      ctx.filter = 'blur(40px) brightness(0.55) saturate(1.2)';
      ctx.drawImage(video, (W - bw) / 2, (H - bh) / 2, bw, bh);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(W / 2 + es.dx, H / 2 + es.dy);
    ctx.rotate(es.rot);
    ctx.scale(es.zoom, es.zoom);
    ctx.translate(-W / 2, -H / 2);
    ctx.filter = extraFilter || 'none';
    ctx.drawImage(video, dx, dy, dw, dh);
    ctx.restore();
  }

  function lookFilter(l) {
    return `brightness(${l.brightness}) contrast(${l.contrast}) saturate(${l.saturate}) hue-rotate(${l.hue}deg) sepia(${l.sepia}) grayscale(${l.grayscale})`;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  // Overlay entrance/exit animation. Returns transform pieces.
  function anim(o, t, W, H) {
    const lt = t - o.start, rt = o.end - t;
    const p = clamp(lt / 0.35), q = clamp(rt / 0.25);
    const a = { alpha: 1, scale: 1, dx: 0, dy: 0, rot: 0, chars: Infinity, draw: 1 };
    switch (o.anim) {
      case 'pop': a.scale = easeOutBack(p) * (0.7 + 0.3 * q); a.alpha = Math.min(1, p * 3) * q; break;
      case 'fade': a.alpha = p * q; break;
      case 'slide-up': a.dy = (1 - easeOutCubic(p)) * H * 0.08; a.alpha = p * q; break;
      case 'slide-left': a.dx = (1 - easeOutCubic(p)) * W * 0.6; a.alpha = Math.min(1, p * 2) * q; break;
      case 'zoom': a.scale = 1.8 - 0.8 * easeOutCubic(p); a.alpha = p * q; break;
      case 'bounce': a.scale = easeOutElastic(p); a.alpha = Math.min(1, p * 4) * q; break;
      case 'wiggle': a.rot = Math.sin(lt * 9) * 0.06; a.scale = easeOutBack(p); a.alpha = Math.min(1, p * 3) * q; break;
      case 'typewriter': {
        const span = Math.max(0.4, Math.min(1.4, (o.end - o.start) * 0.5));
        a.chars = Math.floor(clamp(lt / span) * (o.text || '').length); a.alpha = q; break;
      }
      case 'draw': a.draw = easeOutCubic(clamp(lt / 0.6)); a.alpha = q; break;
    }
    return a;
  }

  function wrapLines(ctx, text, maxW) {
    const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const test = line ? line + ' ' + word : word;
        if (line && ctx.measureText(test).width > maxW) { out.push(line); line = word; }
        else line = test;
      }
      out.push(line);
    }
    return out;
  }

  // Centered multi-line text block with optional box, outline and shadow.
  function textBlock(ctx, o, W, chars) {
    const size = o.size;
    ctx.font = o.font === '__emoji' ? `${size}px ${EMOJI_FONT}` : fontStr(o.font, size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let text = o.upper ? String(o.text).toUpperCase() : String(o.text);
    const lines = wrapLines(ctx, text, W * 0.86);
    const lh = size * 1.12;
    const widths = lines.map(l => ctx.measureText(l).width);
    const bw = Math.max(...widths, 1), bh = lh * lines.length;
    const pad = size * 0.32;
    if (o.bgOn) {
      ctx.fillStyle = hexA(o.bg, o.bgAlpha ?? 1);
      roundRect(ctx, -bw / 2 - pad, -bh / 2 - pad * 0.7, bw + pad * 2, bh + pad * 1.4, size * 0.22);
      ctx.fill();
    }
    let left = chars;
    lines.forEach((l, i) => {
      const y = -bh / 2 + lh * (i + 0.5);
      let s = l;
      if (left !== Infinity) { s = l.slice(0, Math.max(0, left)); left -= l.length + 1; }
      if (!s) return;
      if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = size * 0.18; ctx.shadowOffsetY = size * 0.06; }
      if (o.strokeW > 0) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = o.strokeW * 2;
        ctx.strokeStyle = o.stroke;
        ctx.strokeText(s, 0, y);
        ctx.shadowColor = 'transparent';
      }
      ctx.fillStyle = o.color;
      ctx.fillText(s, 0, y);
      ctx.shadowColor = 'transparent';
    });
    return { w: bw + pad * 2, h: bh + pad * 1.4 };
  }

  function lowerThird(ctx, o, W) {
    const [l1 = '', l2 = ''] = String(o.text).split('\n');
    const s1 = o.size, s2 = o.size * 0.55;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = fontStr(o.font, s1);
    const w1 = ctx.measureText(l1).width + s1 * 0.8;
    ctx.font = fontStr('DM Sans', s2);
    const w2 = l2 ? ctx.measureText(l2).width + s2 * 1.2 : 0;
    const w = Math.max(w1, w2), h1 = s1 * 1.35, h2 = l2 ? s2 * 1.6 : 0;
    const x0 = -w / 2, y0 = -(h1 + h2) / 2;
    ctx.fillStyle = o.bg;
    ctx.fillRect(x0, y0, w1, h1);
    ctx.fillStyle = o.color;
    ctx.font = fontStr(o.font, s1);
    ctx.fillText(l1, x0 + s1 * 0.4, y0 + h1 / 2 + s1 * 0.04);
    if (l2) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x0, y0 + h1, w2, h2);
      ctx.fillStyle = '#111111';
      ctx.font = fontStr('DM Sans', s2);
      ctx.fillText(l2, x0 + s2 * 0.6, y0 + h1 + h2 / 2);
    }
    return { w, h: h1 + h2 };
  }

  function shape(ctx, o, W, draw) {
    const w = o.w * W, h = (o.h ?? o.w) * W, lw = o.lineW;
    ctx.strokeStyle = o.color;
    ctx.fillStyle = o.color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let len;
    ctx.beginPath();
    if (o.kind === 'circle') {
      ctx.ellipse(0, 0, w / 2, h / 2, 0, -Math.PI / 2, Math.PI * 1.5);
      len = Math.PI * (w + h) / 2;
    } else if (o.kind === 'rect') {
      ctx.rect(-w / 2, -h / 2, w, h);
      len = 2 * (w + h);
    } else if (o.kind === 'underline') {
      ctx.moveTo(-w / 2, 0);
      for (let i = 1; i <= 24; i++) ctx.lineTo(-w / 2 + (w * i) / 24, Math.sin(i * 0.9) * lw * 0.6);
      len = w * 1.1;
    } else {
      ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2 - lw * 1.5, 0);
      len = w;
    }
    if (draw < 1) ctx.setLineDash([len * draw, len * 2]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (o.kind === 'arrow' && draw > 0.85) {
      const hs = lw * 3.2;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2 - hs, -hs * 0.75); ctx.lineTo(w / 2 - hs, hs * 0.75);
      ctx.closePath(); ctx.fill();
    }
    return { w: w + lw * 2, h: Math.max(h, lw * 6) + lw * 2 };
  }

  function overlay(ctx, o, t, W, H, images, hit) {
    const a = anim(o, t, W, H);
    if (a.alpha <= 0.001 || a.scale <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = clamp(a.alpha);
    const cx = o.x * W + a.dx, cy = o.y * H + a.dy;
    ctx.translate(cx, cy);
    ctx.rotate(((o.rotation || 0) * Math.PI) / 180 + a.rot);
    ctx.scale(a.scale, a.scale);
    let box = { w: 0, h: 0 };
    if (o.type === 'text') box = textBlock(ctx, o, W, a.chars);
    else if (o.type === 'emoji') box = textBlock(ctx, { ...o, font: '__emoji', strokeW: 0, bgOn: false }, W, Infinity);
    else if (o.type === 'lowerthird') box = lowerThird(ctx, o, W);
    else if (o.type === 'shape') box = shape(ctx, o, W, a.draw);
    else if (o.type === 'countdown') {
      const n = Math.max(1, o.from), step = (o.end - o.start) / n, k = Math.min(n - 1, Math.floor((t - o.start) / step));
      const lp = clamp((t - o.start - k * step) / 0.25);
      ctx.scale(easeOutBack(lp), easeOutBack(lp));
      box = textBlock(ctx, { ...o, text: String(n - k), bgOn: false }, W, Infinity);
    } else if (o.type === 'image') {
      const img = images[o.id];
      if (img && img.complete && img.naturalWidth) {
        const w = o.w * W, h = (w * img.naturalHeight) / img.naturalWidth;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        box = { w, h };
      }
    }
    ctx.restore();
    if (hit) hit.push({ id: o.id, cx: o.x * W, cy: o.y * H, w: Math.max(box.w, 60), h: Math.max(box.h, 60) });
  }

  // Word-timed captions: one group on screen at a time, with the spoken word highlighted.
  function captions(ctx, P, t, W, H) {
    const cap = P.captions.find(c => t >= c.start && t < c.end);
    if (!cap) return;
    const st = P.captionStyle;
    const words = cap.words && cap.words.length ? cap.words : [{ w: cap.text, start: cap.start, end: cap.end }];
    const size = st.size;
    ctx.save();
    ctx.font = fontStr(st.font, size);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const space = ctx.measureText(' ').width;
    const items = words.map(w => {
      const s = st.upper ? w.w.toUpperCase() : w.w;
      return { s, wd: ctx.measureText(s).width, start: w.start, end: w.end };
    });
    const maxW = W * 0.84, lines = [[]];
    let lw = 0;
    for (const it of items) {
      if (lines[lines.length - 1].length && lw + space + it.wd > maxW) { lines.push([]); lw = 0; }
      lines[lines.length - 1].push(it);
      lw += (lw ? space : 0) + it.wd;
    }
    let active = -1;
    items.forEach((it, i) => { if (t >= it.start) active = i; });

    const lh = size * 1.15, blockH = lh * lines.length, cy = st.y * H;
    const p = clamp((t - cap.start) / 0.18);
    let sc = 1, alpha = 1, oy = 0;
    if (st.anim === 'pop') sc = 0.75 + 0.25 * easeOutBack(p);
    else if (st.anim === 'fade') alpha = p;
    else if (st.anim === 'slide') { oy = (1 - easeOutCubic(p)) * size * 0.6; alpha = p; }
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, cy + oy);
    ctx.scale(sc, sc);

    if (st.boxOn) {
      const bw = Math.max(...lines.map(l => l.reduce((s, it) => s + it.wd, 0) + space * (l.length - 1)));
      ctx.fillStyle = hexA(st.box, st.boxAlpha);
      roundRect(ctx, -bw / 2 - size * 0.35, -blockH / 2 - size * 0.2, bw + size * 0.7, blockH + size * 0.4, size * 0.2);
      ctx.fill();
    }

    let idx = 0;
    lines.forEach((line, li) => {
      const width = line.reduce((s, it) => s + it.wd, 0) + space * (line.length - 1);
      let x = -width / 2;
      const y = -blockH / 2 + lh * (li + 0.5);
      for (const it of line) {
        const isActive = idx === active, future = idx > active;
        idx++;
        if (st.mode === 'reveal' && future) { x += it.wd + space; continue; }
        ctx.save();
        const wordScale = isActive && st.mode === 'word' ? 1 + 0.1 * (1 - clamp((t - it.start) / 0.15)) + 0.04 : 1;
        ctx.translate(x + it.wd / 2, y);
        ctx.scale(wordScale, wordScale);
        if (isActive && st.mode === 'box') {
          ctx.fillStyle = st.highlight;
          roundRect(ctx, -it.wd / 2 - size * 0.12, -size * 0.55, it.wd + size * 0.24, size * 1.1, size * 0.16);
          ctx.fill();
        }
        if (st.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = size * 0.2; ctx.shadowOffsetY = size * 0.06; }
        if (st.strokeW > 0) {
          ctx.lineJoin = 'round';
          ctx.lineWidth = st.strokeW * 2;
          ctx.strokeStyle = st.stroke;
          ctx.strokeText(it.s, -it.wd / 2, 0);
          ctx.shadowColor = 'transparent';
        }
        ctx.fillStyle = isActive && st.mode === 'word' ? st.highlight : st.color;
        if (st.mode === 'dim' && future) ctx.globalAlpha *= 0.45;
        ctx.fillText(it.s, -it.wd / 2, 0);
        ctx.restore();
        x += it.wd + space;
      }
    });
    ctx.restore();
  }

  function renderFrame(ctx, P, t, env) {
    const W = ctx.canvas.width, H = ctx.canvas.height, L = P.look;
    const es = effectState(P.effects, t);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (env.video && env.video.readyState >= 2) {
      drawVideo(ctx, W, H, env.video, L, es, lookFilter(L) + es.filter);
      if (L.glow > 0) {
        const src = snapshot(ctx, W, H);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = L.glow * 0.7;
        ctx.filter = 'blur(22px) brightness(1.1)';
        ctx.drawImage(src, 0, 0);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#16151c';
      ctx.fillRect(0, 0, W, H);
    }

    if (L.tintAmt > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = L.tintAmt;
      ctx.fillStyle = L.tint;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (es.rgb > 0) channelSplit(ctx, W, H, es.rgb);
    if (es.vhs > 0) vhs(ctx, W, H, es.vhs, t);
    if (es.glitch > 0) glitch(ctx, W, H, es.glitch, t);

    if (L.vignette > 0) {
      const r = Math.hypot(W, H) / 2;
      const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.35, W / 2, H / 2, r);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${L.vignette})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    if (L.grain > 0) {
      grainPattern = grainPattern || ctx.createPattern(grain, 'repeat');
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = L.grain * 0.5;
      const ox = Math.floor(Math.random() * 256), oy = Math.floor(Math.random() * 256);
      ctx.translate(-ox, -oy);
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, W + 256, H + 256);
      ctx.restore();
    }
    if (L.letterbox > 0) {
      ctx.fillStyle = '#000';
      const b = H * L.letterbox;
      ctx.fillRect(0, 0, W, b);
      ctx.fillRect(0, H - b, W, b);
    }

    const hit = env.hitboxes;
    if (hit) hit.length = 0;
    for (const o of P.overlays) if (t >= o.start && t < o.end) overlay(ctx, o, t, W, H, env.images, hit);
    captions(ctx, P, t, W, H);

    if (P.progress.on && env.duration > 0) {
      const h = P.progress.height, y = P.progress.pos === 'top' ? 0 : H - h;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, y, W, h);
      ctx.fillStyle = P.progress.color;
      ctx.fillRect(0, y, W * clamp(t / env.duration), h);
    }

    if (es.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${clamp(es.flash)})`; ctx.fillRect(0, 0, W, H); }
    if (es.black > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(es.black)})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    return es;
  }

  return { renderFrame };
})();
