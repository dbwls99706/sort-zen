/**
 * Sort ZEN — ASMR 감각 방 스펀지 '뽀독' 임팩트 원샷 생성기 (순수 Node, 의존성 없음).
 *
 * 물/핸드크림/슬라임/폼 임팩트는 CC0 실제 녹음 풀(src/audio/asmrPools.ts)로 대체됐고,
 * 스펀지만 전용 CC0가 없어 절차적 합성(impact_sponge.wav)을 유지한다. 결정론적 재현.
 * 사용법: node scripts/gen-asmr-impacts.js
 */
const fs = require('fs');
const path = require('path');

const SR = 44100;
const OUT = path.join(__dirname, '..', 'src', 'audio', 'assets');

// 결정론적 난수 (mulberry32) — 빌드마다 동일한 자산
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260619);

function noise(n) {
  const o = new Float64Array(n);
  for (let i = 0; i < n; i++) o[i] = rng() * 2 - 1;
  return o;
}

// 1극 저역통과 / 고역통과 (짧은 임팩트에 충분, scipy 불필요)
function lowpass(x, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  const o = new Float64Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y = a * y + (1 - a) * x[i];
    o[i] = y;
  }
  return o;
}
function highpass(x, cutoff) {
  const lp = lowpass(x, cutoff);
  const o = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) o[i] = x[i] - lp[i];
  return o;
}
function bandpass(x, lo, hi) {
  return highpass(lowpass(x, hi), lo);
}

function finalize(x) {
  let out = highpass(x, 38);
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 1.2) / Math.tanh(1.2);
  const f = Math.floor(SR * 0.005);
  for (let i = 0; i < f; i++) {
    out[i] *= i / f;
    out[out.length - 1 - i] *= i / f;
  }
  let peak = 1e-9;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const g = 0.82 / peak;
  for (let i = 0; i < out.length; i++) out[i] *= g;
  return out;
}

// 뽀독 — 스펀지 크래클: 무수한 미세 노이즈 팝
function spongeCrackle() {
  const dur = 0.33;
  const n = Math.floor(SR * dur);
  const out = new Float64Array(n);
  for (let p = 0; p < 16; p++) {
    const start = Math.floor(rng() * 0.9 * dur * SR);
    const pl = Math.floor((0.004 + rng() * 0.011) * SR);
    const g = bandpass(noise(pl), 800, 4200);
    const tau = 0.003 * SR;
    for (let i = 0; i < pl && start + i < n; i++) {
      out[start + i] += g[i] * Math.exp(-i / tau) * 0.6;
    }
  }
  return finalize(out);
}

function writeWav(filename, samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SR, 24);
  buffer.writeUInt32LE(SR * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, filename), buffer);
  console.log(`  ✓ ${filename} (${(buffer.length / 1024).toFixed(1)}KB)`);
}

console.log('\n💦 ASMR 스펀지 임팩트 사운드 생성\n');
writeWav('impact_sponge.wav', spongeCrackle());
console.log('\n✅ 스펀지 임팩트 생성 완료\n');
