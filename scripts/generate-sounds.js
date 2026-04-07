/**
 * Sort ZEN 사운드 자산 생성기
 * 실로폰 12음 + UI 효과음 + BGM 2종을 WAV로 생성
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'audio', 'assets');

// WAV 파일 작성
function writeWav(filename, samples, sampleRate = SAMPLE_RATE) {
  const numSamples = samples.length;
  const byteRate = sampleRate * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }

  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`  ✓ ${filename} (${(buffer.length / 1024).toFixed(1)}KB)`);
}

// 실로폰 음 생성 (배음 + 지수 감쇠 + 부드러운 어택)
function generateXylophone(freq, duration = 0.45) {
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(len);
  const attackLen = Math.floor(SAMPLE_RATE * 0.005);

  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const attack = i < attackLen ? i / attackLen : 1;
    const decay = Math.exp(-t * 8);
    const decayHigh = Math.exp(-t * 16);

    // 기본 + 배음 (실로폰 특성)
    const fundamental = Math.sin(2 * Math.PI * freq * t) * 0.5;
    const harmonic2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.2 * decayHigh;
    const harmonic3 = Math.sin(2 * Math.PI * freq * 3 * t) * 0.1 * decayHigh;
    const harmonic4 = Math.sin(2 * Math.PI * freq * 4.17 * t) * 0.05 * decayHigh;

    samples[i] = (fundamental + harmonic2 + harmonic3 + harmonic4) * decay * attack * 0.7;
  }

  return samples;
}

// 부드러운 탭 소리
function generateTap(freq = 2000, duration = 0.08) {
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(len);

  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const decay = Math.exp(-t * 50);
    const noise = (Math.random() * 2 - 1) * 0.15;
    const tone = Math.sin(2 * Math.PI * freq * t) * 0.4;
    samples[i] = (tone + noise) * decay * 0.5;
  }

  return samples;
}

// 벨/완성 사운드
function generateBell(freq = 880, duration = 0.6) {
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(len);
  const attackLen = Math.floor(SAMPLE_RATE * 0.003);

  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const attack = i < attackLen ? i / attackLen : 1;
    const decay = Math.exp(-t * 5);

    const f1 = Math.sin(2 * Math.PI * freq * t) * 0.4;
    const f2 = Math.sin(2 * Math.PI * freq * 2.0 * t) * 0.2;
    const f3 = Math.sin(2 * Math.PI * freq * 3.0 * t) * 0.1;
    const shimmer = Math.sin(2 * Math.PI * freq * 5.43 * t) * 0.03 * Math.exp(-t * 12);

    samples[i] = (f1 + f2 + f3 + shimmer) * decay * attack * 0.7;
  }

  return samples;
}

// 레벨 클리어 멜로디 (도-미-솔-높은도)
function generateLevelClear() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  const noteLen = 0.25;
  const gap = 0.08;
  const total = notes.length * (noteLen + gap) + 0.3;
  const len = Math.floor(SAMPLE_RATE * total);
  const samples = new Float64Array(len);

  notes.forEach((freq, idx) => {
    const start = Math.floor(idx * (noteLen + gap) * SAMPLE_RATE);
    const noteSamples = generateXylophone(freq, noteLen + 0.15);
    for (let i = 0; i < noteSamples.length && start + i < len; i++) {
      samples[start + i] += noteSamples[i] * 0.8;
    }
  });

  return samples;
}

// 코인 사운드 (밝은 2연타)
function generateCoin() {
  const len = Math.floor(SAMPLE_RATE * 0.3);
  const samples = new Float64Array(len);

  [0, 0.1].forEach((offset, idx) => {
    const freq = idx === 0 ? 1200 : 1600;
    const start = Math.floor(offset * SAMPLE_RATE);
    for (let i = 0; i < Math.floor(0.15 * SAMPLE_RATE) && start + i < len; i++) {
      const t = i / SAMPLE_RATE;
      const decay = Math.exp(-t * 20);
      const tone = Math.sin(2 * Math.PI * freq * t) * 0.3;
      const harm = Math.sin(2 * Math.PI * freq * 2.5 * t) * 0.1;
      samples[start + i] += (tone + harm) * decay * 0.6;
    }
  });

  return samples;
}

// BGM 생성 (앰비언트 패드)
function generateBGM(mood = 'zen', durationSec = 30) {
  const len = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float64Array(len);

  const chords = mood === 'zen'
    ? [[261.63, 329.63, 392.00], [293.66, 349.23, 440.00], [246.94, 311.13, 369.99], [261.63, 329.63, 392.00]]
    : [[329.63, 415.30, 493.88], [349.23, 440.00, 523.25], [392.00, 493.88, 587.33], [349.23, 440.00, 523.25]];

  const chordDuration = durationSec / chords.length;

  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const chordIdx = Math.min(Math.floor(t / chordDuration), chords.length - 1);
    const chord = chords[chordIdx];

    const crossfadePos = (t % chordDuration) / chordDuration;
    const envelope = Math.sin(crossfadePos * Math.PI) * 0.7 + 0.3;

    let sample = 0;
    chord.forEach((freq) => {
      // 부드러운 패드 (사인 + 약간의 디튠)
      sample += Math.sin(2 * Math.PI * freq * t) * 0.08;
      sample += Math.sin(2 * Math.PI * freq * 1.003 * t) * 0.06; // 디튠 → 코러스 효과
      sample += Math.sin(2 * Math.PI * (freq / 2) * t) * 0.04; // 옥타브 아래
    });

    // 느린 LFO 모듈레이션
    const lfo = 1 + Math.sin(2 * Math.PI * 0.1 * t) * 0.15;
    samples[i] = sample * envelope * lfo * 0.5;
  }

  return samples;
}

// ============ 생성 시작 ============
console.log('\n🎵 Sort ZEN 사운드 생성 시작\n');

// 12음 실로폰 pour 사운드
const NOTES = {
  pour_c4: 261.63, pour_d4: 293.66, pour_e4: 329.63, pour_f4: 349.23,
  pour_g4: 392.00, pour_a4: 440.00, pour_b4: 493.88, pour_c5: 523.25,
  pour_d5: 587.33, pour_e5: 659.25, pour_f5: 698.46, pour_g5: 783.99,
};

console.log('🎹 Pour 사운드 (12음 실로폰):');
Object.entries(NOTES).forEach(([name, freq]) => {
  writeWav(`${name}.wav`, generateXylophone(freq));
});

console.log('\n🔊 UI 효과음:');
writeWav('tube_select.wav', generateTap(1800, 0.08));
writeWav('tube_deselect.wav', generateTap(1200, 0.06));
writeWav('complete_tube.wav', generateBell(880, 0.7));
writeWav('level_clear.wav', generateLevelClear());
writeWav('coin.wav', generateCoin());
writeWav('button_tap.wav', generateTap(1500, 0.05));

console.log('\n🎶 BGM:');
writeWav('bgm_zen.wav', generateBGM('zen', 30));
writeWav('bgm_classic.wav', generateBGM('classic', 30));

console.log('\n✅ 총 20개 사운드 생성 완료!\n');
