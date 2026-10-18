// Caption timing: grouping words into on-screen captions, SRT/VTT in and out,
// fitting a pasted transcript to the voice, and in-browser Whisper transcription.
const Captions = (() => {
  const uid = () => Math.random().toString(36).slice(2, 9);

  // Spread words across [start, end] weighted by length, for text without word timings.
  function estimateWords(text, start, end) {
    const ws = String(text).trim().split(/\s+/).filter(Boolean);
    const weights = ws.map(w => w.length + 2), total = weights.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    return ws.map((w, i) => {
      const s = start + ((end - start) * acc) / total;
      acc += weights[i];
      return { w, start: s, end: start + ((end - start) * acc) / total };
    });
  }

  function group(words, maxWords) {
    const caps = [];
    let cur = [];
    const flush = () => {
      if (!cur.length) return;
      caps.push({ id: uid(), start: cur[0].start, end: cur[cur.length - 1].end, text: cur.map(w => w.w).join(' '), words: cur });
      cur = [];
    };
    words.forEach((w, i) => {
      const prev = cur[cur.length - 1];
      if (prev && (w.start - prev.end > 0.6 || cur.length >= maxWords)) flush();
      cur.push({ ...w });
      if (/[.!?…]$/.test(w.w) || (/[,;:]$/.test(w.w) && cur.length >= Math.ceil(maxWords / 2))) flush();
    });
    flush();
    // Hold each caption until the next one starts when the gap is short.
    for (let i = 0; i < caps.length - 1; i++) {
      const gap = caps[i + 1].start - caps[i].end;
      if (gap > 0 && gap < 0.6) caps[i].end = caps[i + 1].start;
    }
    return caps;
  }

  function allWords(captions) {
    return captions.flatMap(c => (c.words && c.words.length ? c.words : estimateWords(c.text, c.start, c.end)));
  }

  function parseTime(s) {
    const m = s.trim().replace(',', '.').split(':').map(Number);
    return m.length === 3 ? m[0] * 3600 + m[1] * 60 + m[2] : m[0] * 60 + m[1];
  }

  function parseSubs(text) {
    const caps = [];
    const blocks = text.replace(/\r/g, '').split(/\n\s*\n/);
    for (const b of blocks) {
      const lines = b.split('\n');
      const ti = lines.findIndex(l => l.includes('-->'));
      if (ti < 0) continue;
      const [a, z] = lines[ti].split('-->');
      const start = parseTime(a), end = parseTime(z.trim().split(/\s+/)[0]);
      const body = lines.slice(ti + 1).join(' ').replace(/<[^>]+>/g, '').trim();
      if (!body || !(end > start)) continue;
      caps.push({ id: uid(), start, end, text: body, words: estimateWords(body, start, end) });
    }
    return caps;
  }

  function srtTime(t) {
    const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60,
      s = Math.floor(ms / 1000) % 60, r = ms % 1000;
    const p = (n, l = 2) => String(n).padStart(l, '0');
    return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
  }

  function toSRT(caps) {
    return caps.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
  }

  // Fit a pasted transcript to the clip by spreading words over the voiced
  // parts of the loudness envelope, so silences stay silent.
  function fitTranscript(text, envelope, hop, duration) {
    const ws = String(text).trim().split(/\s+/).filter(Boolean);
    if (!ws.length) return [];
    let voiced = [];
    if (envelope && envelope.length) {
      const sorted = Array.from(envelope).sort((a, b) => a - b);
      const lo = sorted[Math.floor(sorted.length * 0.2)], hi = sorted[Math.floor(sorted.length * 0.95)];
      const th = lo + (hi - lo) * 0.15;
      envelope.forEach((v, i) => { if (v > th) voiced.push(i * hop); });
    }
    if (voiced.length < ws.length) {
      voiced = [];
      for (let t = 0; t < duration; t += hop) voiced.push(t);
    }
    const weights = ws.map(w => w.length + 2), total = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    const words = ws.map((w, i) => {
      const s = voiced[Math.min(voiced.length - 1, Math.floor((acc / total) * voiced.length))];
      acc += weights[i];
      return { w, start: s, end: s };
    });
    words.forEach((w, i) => {
      const next = words[i + 1];
      w.end = next ? Math.min(next.start, w.start + 0.8) : Math.min(duration, w.start + 0.6);
      if (w.end <= w.start) w.end = w.start + 0.15;
    });
    return words;
  }

  // Mono 16 kHz PCM, the format Whisper wants. Also feeds the loudness envelope.
  async function decodeAudio(file) {
    const buf = await file.arrayBuffer();
    const ac = new OfflineAudioContext(1, 16000, 16000);
    const audio = await ac.decodeAudioData(buf);
    const n = audio.length, out = new Float32Array(n);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const d = audio.getChannelData(c);
      for (let i = 0; i < n; i++) out[i] += d[i] / audio.numberOfChannels;
    }
    return out;
  }

  function envelope(pcm, sr = 16000, hop = 0.05) {
    const win = Math.floor(sr * hop), n = Math.floor(pcm.length / win), env = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = i * win; j < (i + 1) * win; j++) s += pcm[j] * pcm[j];
      env[i] = Math.sqrt(s / win);
    }
    return env;
  }

  // Loud moments at least minGap seconds apart, loudest first.
  function peaks(env, hop, count, minGap = 2) {
    if (!env || !env.length) return [];
    const idx = Array.from(env.keys()).sort((a, b) => env[b] - env[a]);
    const picked = [];
    for (const i of idx) {
      const t = i * hop;
      if (picked.every(p => Math.abs(p - t) >= minGap)) picked.push(t);
      if (picked.length >= count) break;
    }
    return picked;
  }

  let asrCache = {};
  async function transcribe(pcm, language, onStatus) {
    onStatus('Loading the speech model. The first run downloads 80 to 150 MB, then it is cached.');
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');
    const device = navigator.gpu ? 'webgpu' : 'wasm';
    const progress = p => {
      if (p.status === 'progress' && p.total) onStatus(`Downloading ${p.file}: ${Math.round((p.loaded / p.total) * 100)}%`);
    };
    const opts = { chunk_length_s: 30, stride_length_s: 5 };
    if (language && language !== 'auto') opts.language = language;
    try {
      const id = 'onnx-community/whisper-base_timestamped';
      asrCache[id] = asrCache[id] || await pipeline('automatic-speech-recognition', id, {
        device, dtype: device === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8', progress_callback: progress,
      });
      onStatus('Listening to your clip…');
      const out = await asrCache[id](pcm, { ...opts, return_timestamps: 'word' });
      const words = (out.chunks || [])
        .map(c => ({ w: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] ?? c.timestamp[0] + 0.3 }))
        .filter(w => w.w);
      if (words.length) return words;
      throw new Error('no word timestamps');
    } catch (err) {
      console.warn('Word-level model failed, falling back to sentence timing', err);
      const id = 'Xenova/whisper-base';
      asrCache[id] = asrCache[id] || await pipeline('automatic-speech-recognition', id, { dtype: 'q8', progress_callback: progress });
      onStatus('Listening to your clip…');
      const out = await asrCache[id](pcm, { ...opts, return_timestamps: true });
      return (out.chunks || []).flatMap(c => estimateWords(c.text, c.timestamp[0], c.timestamp[1] ?? c.timestamp[0] + 2));
    }
  }

  return { estimateWords, group, allWords, parseSubs, toSRT, fitTranscript, decodeAudio, envelope, peaks, transcribe };
})();
