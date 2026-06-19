/**
 * Sort ZEN — ASMR 감각 방 '터치 임팩트' 원샷 사운드 생성기 (순수 Node, 의존성 없음).
 *
 * 누르는 동안 이어지는 루프(slime/water_pour/... mp3)와 별개로, 손가락이 닿는
 * 매 순간 터지는 짧은 임팩트음(첨벙/찰싹/꾸덕/뽀독)을 합성한다. 절차적 생성이라
 * 외부 자산/라이선스가 필요 없고 결정론적으로 재현된다.
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

// 어택 + 지수 감쇠 포락선
function env(n, attack, tau) {
  const o = new Float64Array(n);
  const aL = Math.max(1, Math.floor(SR * attack));
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    o[i] = (i < aL ? i / aL : 1) * Math.exp(-t / tau);
  }
  return o;
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

// 첨벙 — 밴드패스 노이즈 스플래시 + 하강 버블 블립
function waterSplash() {
  const dur = 0.34;
  const n = Math.floor(SR * dur);
  const body = bandpass(noise(n), 550, 3600);
  const e = env(n, 0.003, 0.11);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = body[i] * e[i] * 0.6;
  for (let b = 0; b < 4; b++) {
    const start = Math.floor((0.01 + rng() * 0.16) * SR);
    const f0 = 900 + rng() * 1500;
    const bl = Math.min(n - start, Math.floor(0.08 * SR));
    for (let i = 0; i < bl; i++) {
      const t = i / SR;
      const f = f0 * (1 - 0.45 * (1 - Math.exp(-t / 0.02)));
      out[start + i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.024) * 0.34;
    }
  }
  return finalize(out);
}

// 찰싹 — 매끈한 젖은 슬랩: 저역 텀프 + 중역 노이즈 트랜지언트
function lotionSlap() {
  const dur = 0.22;
  const n = Math.floor(SR * dur);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] += Math.sin(2 * Math.PI * 150 * t) * Math.exp(-t / 0.05) * 0.5;
  }
  const nz = bandpass(noise(n), 400, 2300);
  const e = env(n, 0.0015, 0.045);
  for (let i = 0; i < n; i++) out[i] += nz[i] * e[i] * 0.55;
  return finalize(out);
}

// 꾸덕 — 끈적한 스퀠치: 느린 어택 저역 노이즈 + 하강 글룹 톤
function slimeGloop() {
  const dur = 0.4;
  const n = Math.floor(SR * dur);
  const out = new Float64Array(n);
  const nz = highpass(lowpass(noise(n), 950), 120);
  const e = env(n, 0.022, 0.17);
  for (let i = 0; i < n; i++) out[i] += nz[i] * e[i] * 0.62;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 230 * (1 - 0.32 * (t / dur));
    out[i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.13) * 0.26;
  }
  return finalize(out);
}

// 몽글 — 푹신한 크림 퍼프: 고역 에어리 노이즈
function creamPuff() {
  const dur = 0.26;
  const n = Math.floor(SR * dur);
  const nz = bandpass(noise(n), 1300, 5200);
  const e = env(n, 0.009, 0.085);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = nz[i] * e[i] * 0.55;
  return finalize(out);
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

console.log('\n💦 ASMR 터치 임팩트 사운드 생성\n');
writeWav('impact_water.wav', waterSplash());
writeWav('impact_handcream.wav', lotionSlap());
writeWav('impact_slime.wav', slimeGloop());
writeWav('impact_shaving.wav', creamPuff());
writeWav('impact_sponge.wav', spongeCrackle());
console.log('\n✅ 5개 임팩트 사운드 생성 완료\n');
