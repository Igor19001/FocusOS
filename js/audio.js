/* ── js/audio.js ─ ES Module ────────────────────────────────────────────────
   Item 5 — Industrial Haptic & Audio Environment (Web Audio API, no files).
   ═══════════════════════════════════════════════════════════════════════════ */

let _ctx = null;

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

export function playClick(type = 'soft') {
  try {
    const ctx  = getCtx();
    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.15));
    }
    const src  = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    gain.gain.setValueAtTime(type === 'hard' ? 0.18 : 0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
    src.connect(gain); gain.connect(ctx.destination); src.start();
  } catch (_) {}
}

export function playSessionStart() {
  try {
    const ctx  = getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.22);
  } catch (_) {}
}

export function playSessionComplete() {
  const freqs = [523, 659, 784];
  try {
    const ctx = getCtx();
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const t    = ctx.currentTime + i * 0.12;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.4);
    });
  } catch (_) {}
}

let _ambientNode = null, _ambientGain = null;

export function startAmbient(type = 'brown', volume = 0.04) {
  stopAmbient();
  try {
    const ctx  = getCtx();
    const buf  = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * w) / 1.02;
        last = data[i]; data[i] *= 3.5;
      }
    } else {
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    _ambientNode = ctx.createBufferSource();
    _ambientGain = ctx.createGain();
    _ambientNode.buffer = buf; _ambientNode.loop = true;
    _ambientGain.gain.value = volume;
    _ambientNode.connect(_ambientGain); _ambientGain.connect(ctx.destination);
    _ambientNode.start();
  } catch (_) {}
}

export function stopAmbient() {
  try { _ambientNode?.stop(); } catch (_) {}
  _ambientNode = null; _ambientGain = null;
}

export function setAmbientVolume(v) {
  if (_ambientGain) _ambientGain.gain.value = Math.max(0, Math.min(1, v));
}

export function vibrateClick()   { navigator.vibrate?.(10); }
export function vibrateSuccess() { navigator.vibrate?.([40, 30, 80]); }
export function vibrateFail()    { navigator.vibrate?.([20, 20, 20, 20, 60]); }
