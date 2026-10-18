// Synthesized sound effects. Every sound is built from oscillators and noise
// at play time, so the editor ships without any audio files and the same code
// drives both the live preview and the exported render.
const SFX = (() => {
  let noiseBuf = null;

  function noise(ctx) {
    if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    return s;
  }

  // Piecewise-linear envelope: pts is a list of [secondsFromStart, gain].
  function env(ctx, out, t, pts) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    for (const [dt, v] of pts) g.gain.linearRampToValueAtTime(v, t + dt);
    g.connect(out);
    return g;
  }

  // Fast attack, exponential tail. Sounds like a struck object.
  function decay(ctx, out, t, peak, dur) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(out);
    return g;
  }

  function osc(ctx, type, t, f0, f1, dur) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== undefined && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    return o;
  }

  function filt(ctx, type, f, q = 1) {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  }

  function shaper(ctx, k = 20) {
    const ws = ctx.createWaveShaper();
    const c = new Float32Array(1024);
    for (let i = 0; i < c.length; i++) {
      const x = (i / (c.length - 1)) * 2 - 1;
      c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    ws.curve = c;
    return ws;
  }

  const run = (node, t, dur) => { node.start(t); node.stop(t + dur + 0.05); };

  const LIB = {
    whoosh: { label: 'Whoosh', dur: 0.7, play(ctx, out, t, g) {
      const n = noise(ctx), bp = filt(ctx, 'bandpass', 300, 1.4);
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.exponentialRampToValueAtTime(3200, t + 0.35);
      bp.frequency.exponentialRampToValueAtTime(500, t + 0.7);
      n.connect(bp).connect(env(ctx, out, t, [[0.3, g * 1.3], [0.7, 0]]));
      run(n, t, 0.7);
    } },
    swoosh: { label: 'Swoosh', dur: 0.3, play(ctx, out, t, g) {
      const n = noise(ctx), bp = filt(ctx, 'bandpass', 1500, 2);
      bp.frequency.setValueAtTime(1500, t);
      bp.frequency.exponentialRampToValueAtTime(7500, t + 0.25);
      n.connect(bp).connect(env(ctx, out, t, [[0.08, g * 1.2], [0.28, 0]]));
      run(n, t, 0.3);
    } },
    pop: { label: 'Pop', dur: 0.15, play(ctx, out, t, g) {
      const o = osc(ctx, 'sine', t, 750, 160, 0.09);
      o.connect(env(ctx, out, t, [[0.005, g], [0.12, 0]]));
      run(o, t, 0.13);
      LIB.click.play(ctx, out, t, g * 0.4);
    } },
    click: { label: 'Click', dur: 0.05, play(ctx, out, t, g) {
      const n = noise(ctx), hp = filt(ctx, 'highpass', 2500);
      n.connect(hp).connect(env(ctx, out, t, [[0.002, g * 0.8], [0.03, 0]]));
      run(n, t, 0.04);
    } },
    ding: { label: 'Ding', dur: 1.4, play(ctx, out, t, g) {
      for (const [f, a] of [[1318.5, 0.6], [2637, 0.25], [3951, 0.08]]) {
        const o = osc(ctx, 'sine', t, f);
        o.connect(decay(ctx, out, t, g * a, 1.4));
        run(o, t, 1.4);
      }
    } },
    sparkle: { label: 'Sparkle', dur: 0.8, play(ctx, out, t, g) {
      [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => {
        const s = t + i * 0.055, o = osc(ctx, 'sine', s, f);
        o.connect(decay(ctx, out, s, g * 0.3, 0.5));
        run(o, s, 0.5);
      });
    } },
    boom: { label: 'Boom', dur: 1.0, play(ctx, out, t, g) {
      const o = osc(ctx, 'sine', t, 150, 38, 0.6);
      o.connect(decay(ctx, out, t, g * 1.3, 1.0));
      run(o, t, 1.0);
      const n = noise(ctx), lp = filt(ctx, 'lowpass', 300);
      n.connect(lp).connect(decay(ctx, out, t, g * 0.7, 0.3));
      run(n, t, 0.3);
    } },
    bassdrop: { label: 'Bass drop', dur: 1.6, play(ctx, out, t, g) {
      const o = osc(ctx, 'sine', t, 90, 28, 1.4), ws = shaper(ctx, 8);
      o.connect(ws).connect(decay(ctx, out, t, g * 0.9, 1.6));
      run(o, t, 1.6);
    } },
    riser: { label: 'Riser', dur: 2.0, play(ctx, out, t, g) {
      const n = noise(ctx), bp = filt(ctx, 'bandpass', 300, 1.2);
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.exponentialRampToValueAtTime(7000, t + 2);
      n.connect(bp).connect(env(ctx, out, t, [[1.9, g * 0.9], [2.0, 0]]));
      run(n, t, 2);
      const o = osc(ctx, 'sawtooth', t, 180, 1400, 2), lp = filt(ctx, 'lowpass', 2200);
      o.connect(lp).connect(env(ctx, out, t, [[1.9, g * 0.22], [2.0, 0]]));
      run(o, t, 2);
    } },
    scratch: { label: 'Record scratch', dur: 0.45, play(ctx, out, t, g) {
      const n = noise(ctx), bp = filt(ctx, 'bandpass', 800, 4);
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const steps = [[0, 800, 120], [0.1, 3000, 420], [0.2, 600, 90], [0.3, 2600, 380], [0.45, 500, 80]];
      for (const [dt, fb, fo] of steps) {
        bp.frequency.linearRampToValueAtTime(fb, t + dt);
        o.frequency.linearRampToValueAtTime(fo, t + dt);
      }
      const e = env(ctx, out, t, [[0.02, g], [0.4, g * 0.8], [0.45, 0]]);
      n.connect(bp).connect(e);
      const og = ctx.createGain(); og.gain.value = 0.25;
      o.connect(og).connect(e);
      run(n, t, 0.45); run(o, t, 0.45);
    } },
    shutter: { label: 'Camera shutter', dur: 0.15, play(ctx, out, t, g) {
      const n = noise(ctx), hp = filt(ctx, 'highpass', 1500);
      n.connect(hp).connect(env(ctx, out, t, [[0.003, g], [0.03, 0], [0.08, 0], [0.083, g * 0.8], [0.13, 0]]));
      run(n, t, 0.15);
    } },
    cash: { label: 'Cha-ching', dur: 1.0, play(ctx, out, t, g) {
      const n = noise(ctx), bp = filt(ctx, 'bandpass', 5000, 0.8);
      n.connect(bp).connect(env(ctx, out, t, [[0.005, g * 0.7], [0.08, 0]]));
      run(n, t, 0.1);
      for (const f of [2093, 2637]) {
        const s = t + 0.09, o = osc(ctx, 'sine', s, f);
        o.connect(decay(ctx, out, s, g * 0.35, 0.9));
        run(o, s, 0.9);
      }
    } },
    glitch: { label: 'Glitch', dur: 0.35, play(ctx, out, t, g) {
      const o = ctx.createOscillator(); o.type = 'square';
      for (let i = 0; i < 12; i++) o.frequency.setValueAtTime(80 + Math.random() * 1600, t + i * 0.03);
      o.connect(env(ctx, out, t, [[0.005, g * 0.3], [0.33, g * 0.3], [0.35, 0]]));
      run(o, t, 0.35);
    } },
    typing: { label: 'Typing', dur: 0.75, play(ctx, out, t, g) {
      let s = t;
      for (let i = 0; i < 9; i++) {
        LIB.click.play(ctx, out, s, g * (0.5 + Math.random() * 0.4));
        s += 0.05 + Math.random() * 0.06;
      }
    } },
    boing: { label: 'Boing', dur: 0.7, play(ctx, out, t, g) {
      const o = osc(ctx, 'sine', t, 260), lfo = osc(ctx, 'sine', t, 14), depth = ctx.createGain();
      depth.gain.setValueAtTime(140, t);
      depth.gain.exponentialRampToValueAtTime(5, t + 0.7);
      lfo.connect(depth).connect(o.frequency);
      o.connect(decay(ctx, out, t, g * 0.8, 0.7));
      run(o, t, 0.7); run(lfo, t, 0.7);
    } },
    airhorn: { label: 'Air horn', dur: 1.0, play(ctx, out, t, g) {
      const lp = filt(ctx, 'lowpass', 2600);
      const e = env(ctx, out, t, [[0.01, g * 0.35], [0.15, g * 0.35], [0.16, 0], [0.2, 0], [0.21, g * 0.35],
        [0.35, g * 0.35], [0.36, 0], [0.4, 0], [0.41, g * 0.35], [0.95, g * 0.35], [1.0, 0]]);
      lp.connect(e);
      for (const f of [466, 469, 699]) {
        const o = osc(ctx, 'sawtooth', t, f);
        o.connect(lp); run(o, t, 1);
      }
    } },
    heartbeat: { label: 'Heartbeat', dur: 0.5, play(ctx, out, t, g) {
      for (const s of [t, t + 0.22]) {
        const o = osc(ctx, 'sine', s, 70, 40, 0.15);
        o.connect(decay(ctx, out, s, g * 1.2, 0.2));
        run(o, s, 0.2);
      }
    } },
  };

  function play(type, ctx, out, t, gain = 1, custom = {}) {
    if (type.startsWith('custom:')) {
      const buf = custom[type];
      if (!buf) return;
      const s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = buf; g.gain.value = gain;
      s.connect(g).connect(out);
      s.start(t);
      return;
    }
    const fx = LIB[type];
    if (fx) fx.play(ctx, out, t, gain);
  }

  function duration(type, custom = {}) {
    if (type.startsWith('custom:')) return custom[type] ? custom[type].duration : 1;
    return LIB[type] ? LIB[type].dur : 0.5;
  }

  return { LIB, play, duration };
})();
