"""Sort ZEN ASMR 사운드 절차적 합성 파이프라인.

기존 자산은 정수배(하모닉) 합성 톤이라 실로폰/마림바 특유의 비조화 배음과
물 텍스처가 없어 ASMR 자극이 약했다. 이 스크립트는 다음을 합성한다.

- pour 12음: 마림바 비조화 배음(1 : 3.9 : 9.2 : 16.6) + 온셋 피치드롭 +
  말렛 노이즈 + 물 흐름/물방울 텍스처 → 스테레오 + 가벼운 플레이트 리버브.
- UI 효과음(select/deselect/complete/coin/button) + level_clear 아르페지오.
- BGM zen/classic: 60초 루프 가능한 스테레오 앰비언트 패드(mp3).

모든 톤은 부드러운 저역통과 + 소프트새츄레이션으로 고역 하쉬니스를 제거한다.
사용법: python scripts/synth_audio.py
"""
from __future__ import annotations

import os
import subprocess
import tempfile

import numpy as np
from scipy import signal
from scipy.io import wavfile

FR = 44100
ASSETS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "audio", "assets")
RNG = np.random.default_rng(20260606)  # 결정론적 재현

# 마림바 막대 비조화 배음비와 상대 진폭/감쇠배수 (음향학 근사값)
MARIMBA_RATIOS = np.array([1.0, 3.99, 9.19, 16.6])
MARIMBA_AMPS = np.array([1.0, 0.34, 0.13, 0.05])
MARIMBA_DECAY_MULT = np.array([1.0, 1.7, 2.6, 3.4])

# C장조 음계 12음 (색상 ID 0~11 → 음정), pour_c4..pour_g5 파일명과 일치
NOTE_FREQS = {
    "c4": 261.63, "d4": 293.66, "e4": 329.63, "f4": 349.23,
    "g4": 392.00, "a4": 440.00, "b4": 493.88, "c5": 523.25,
    "d5": 587.33, "e5": 659.25, "f5": 698.46, "g5": 783.99,
}

# ----------------------------------------------------------------------------
# 기본 빌딩 블록
# ----------------------------------------------------------------------------

def t_axis(dur: float) -> np.ndarray:
    return np.linspace(0, dur, int(FR * dur), endpoint=False)


def mallet_env(n: int, attack: float, tau: float) -> np.ndarray:
    """빠른 어택 + 지수 감쇠 (말렛 타격 포락선)."""
    t = np.arange(n) / FR
    atk = np.clip(t / max(attack, 1e-4), 0, 1)
    return atk * np.exp(-t / tau)


def marimba_note(freq: float, dur: float, tau: float = 0.45) -> np.ndarray:
    """마림바 단음: 비조화 배음 + 온셋 피치드롭 + 말렛 노이즈."""
    n = int(FR * dur)
    t = np.arange(n) / FR
    # 온셋에서 살짝 높았다가 내려오는 피치 드롭(~12ms)
    drop = 1.0 + 0.03 * np.exp(-t / 0.012)
    out = np.zeros(n)
    for ratio, amp, dmult in zip(MARIMBA_RATIOS, MARIMBA_AMPS, MARIMBA_DECAY_MULT):
        phase = 2 * np.pi * freq * ratio * np.cumsum(drop) / FR
        out += amp * np.sin(phase) * mallet_env(n, 0.002, tau / dmult)
    # 부드러운 바디용 서브 사인
    out += 0.18 * np.sin(2 * np.pi * freq * t) * mallet_env(n, 0.004, tau * 1.1)
    # 말렛 접촉 노이즈(아주 짧은 저역 클릭)
    knock = RNG.standard_normal(n) * mallet_env(n, 0.0005, 0.006)
    knock = lowpass(knock, 2200)
    out += 0.12 * knock
    return out


def water_texture(dur: float, gain: float = 0.16) -> np.ndarray:
    """액체 흐름 + 물방울 텍스처(밴드패스 노이즈 스윕 + 감쇠 사인 블립)."""
    n = int(FR * dur)
    noise = RNG.standard_normal(n)
    # 800Hz→2400Hz로 이동하는 밴드패스로 '쪼르륵' 흐름 표현
    center = np.linspace(800, 2400, n)
    flow = bandpass_sweep(noise, center, q=4.0)
    env = mallet_env(n, 0.02, dur * 0.5)
    flow *= env
    # 물방울 2~3방울: 짧고 높은 감쇠 사인
    drops = np.zeros(n)
    for _ in range(3):
        f = RNG.uniform(1500, 3200)
        start = int(RNG.uniform(0.04, 0.6) * n)
        ln = min(n - start, int(0.09 * FR))
        tt = np.arange(ln) / FR
        drops[start:start + ln] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.025) * 0.5
    mix = flow / (np.max(np.abs(flow)) + 1e-9) * 0.7 + drops
    return gain * mix


# ----------------------------------------------------------------------------
# 필터 / 공간계
# ----------------------------------------------------------------------------

def lowpass(x: np.ndarray, cutoff: float, order: int = 4) -> np.ndarray:
    b, a = signal.butter(order, cutoff / (FR / 2), btype="low")
    return signal.lfilter(b, a, x)


def highpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    b, a = signal.butter(order, cutoff / (FR / 2), btype="high")
    return signal.lfilter(b, a, x)


def bandpass_sweep(x: np.ndarray, center: np.ndarray, q: float) -> np.ndarray:
    """블록 단위로 중심주파수를 이동시키는 근사 밴드패스."""
    n = len(x)
    out = np.zeros(n)
    block = 1024
    for i in range(0, n, block):
        j = min(i + block, n)
        fc = float(np.clip(np.mean(center[i:j]), 100, FR / 2 - 200))
        bw = fc / q
        low = max(60, fc - bw / 2) / (FR / 2)
        high = min(FR / 2 - 100, fc + bw / 2) / (FR / 2)
        if high <= low:
            out[i:j] = x[i:j]
            continue
        b, a = signal.butter(2, [low, high], btype="band")
        out[i:j] = signal.lfilter(b, a, x[i:j])
    return out


def comb(x: np.ndarray, delay_ms: float, g: float) -> np.ndarray:
    d = int(FR * delay_ms / 1000)
    a = np.zeros(d + 1)
    a[0] = 1.0
    a[d] = -g
    return signal.lfilter([1.0], a, x)


def allpass(x: np.ndarray, delay_ms: float, g: float) -> np.ndarray:
    d = int(FR * delay_ms / 1000)
    b = np.zeros(d + 1)
    a = np.zeros(d + 1)
    b[0] = -g
    b[d] = 1.0
    a[0] = 1.0
    a[d] = -g
    return signal.lfilter(b, a, x)


def soft_clip(x: np.ndarray, drive: float = 1.2) -> np.ndarray:
    """따뜻함을 위한 tanh 소프트 새츄레이션."""
    return np.tanh(x * drive) / np.tanh(drive)


# 좌/우 서로 다른 comb 지연 → 디코릴레이션된 리버브 꼬리(스테레오 폭).
_REVERB_COMBS_L = [29.7, 37.1, 41.1, 43.7]
_REVERB_COMBS_R = [30.9, 35.3, 40.2, 44.8]


def _wet_tail(x: np.ndarray, combs: list[float], g: float) -> np.ndarray:
    w = sum(comb(x, d, g) for d in combs) / len(combs)
    w = allpass(w, 5.0, 0.7)
    return allpass(w, 1.7, 0.7)


def stereo_reverb(mono: np.ndarray, wet: float, decay: float) -> np.ndarray:
    """드라이 톤은 센터(모노)에 두고 리버브 꼬리만 좌우로 디코릴레이션.

    모노 합산(폰 단일 스피커) 시 톤이 그대로 보존돼 위상 상쇄가 없다.
    반환 shape=(n,2).
    """
    g = float(np.clip(0.7 * decay + 0.2, 0, 0.92))
    wl = _wet_tail(mono, _REVERB_COMBS_L, g)
    wr = _wet_tail(mono, _REVERB_COMBS_R, g)
    left = (1 - wet) * mono + wet * wl
    right = (1 - wet) * mono + wet * wr
    return np.stack([left, right], axis=1)


def finalize(x: np.ndarray, cutoff: float = 9000, fade_ms: float = 6.0) -> np.ndarray:
    """모노 톤 정리: HPF/LPF + 소프트새츄레이션 + 클릭 방지 페이드."""
    x = highpass(x, 35)
    x = lowpass(x, cutoff)
    x = soft_clip(x, 1.15)
    f = int(FR * fade_ms / 1000)
    if len(x) > 2 * f:
        x[:f] *= np.linspace(0, 1, f)
        x[-f:] *= np.linspace(1, 0, f)
    return x


def _normalize_stereo(st: np.ndarray, peak_db: float) -> np.ndarray:
    peak = np.max(np.abs(st)) + 1e-9
    return st * (10 ** (peak_db / 20) / peak)


def render(name: str, mono: np.ndarray, wet: float = 0.16, decay: float = 0.5,
           cutoff: float = 9000, peak_db: float = -1.5) -> None:
    """모노 효과음을 모노 세이프 스테레오 WAV로 렌더."""
    st = stereo_reverb(finalize(mono, cutoff=cutoff), wet, decay)
    data = np.clip(_normalize_stereo(st, peak_db), -1, 1)
    wavfile.write(os.path.join(ASSETS, name), FR, (data * 32767).astype(np.int16))
    print(f"sfx -> {name} ({len(mono)/FR*1000:.0f}ms stereo)")


def write_mp3_stereo(name: str, stereo: np.ndarray, bitrate: str = "128k") -> None:
    data = np.clip(stereo, -1, 1)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    wavfile.write(tmp_path, FR, (data * 32767).astype(np.int16))
    out = os.path.join(ASSETS, name)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp_path, "-b:a", bitrate, out],
        check=True,
    )
    os.remove(tmp_path)
    print(f"bgm -> {name} ({len(stereo)/FR:.0f}s stereo mp3 {bitrate})")


# ----------------------------------------------------------------------------
# 개별 효과음
# ----------------------------------------------------------------------------

def make_pour(name: str, freq: float) -> None:
    # 또렷한 말렛 타격감을 위해 tau를 짧게(0.3) → 펀치 + 자연 감쇠
    tone = marimba_note(freq, 0.55, tau=0.30)
    tex = water_texture(0.4, gain=0.16)
    tone[: len(tex)] += tex
    render(name, tone, wet=0.16, decay=0.5)


def make_select() -> None:
    n = marimba_note(523.25, 0.18, tau=0.09) * 0.6
    render("tube_select.wav", n, wet=0.12, decay=0.4)


def make_deselect() -> None:
    n = marimba_note(392.00, 0.18, tau=0.09) * 0.55
    render("tube_deselect.wav", n, wet=0.12, decay=0.4)


def make_complete() -> None:
    # 두 음 상행 '띵-딩'
    a = marimba_note(659.25, 0.55, tau=0.32)
    b = marimba_note(987.77, 0.65, tau=0.4)
    shift = int(0.09 * FR)
    out = np.concatenate([a, np.zeros(shift)])
    out[shift:shift + len(b)] += b[: len(out) - shift]
    render("complete_tube.wav", out, wet=0.22, decay=0.6)


def make_level_clear() -> None:
    # C장조 펜타토닉 상행 아르페지오 C5 E5 G5 C6
    notes = [523.25, 659.25, 783.99, 1046.50]
    gap = int(0.12 * FR)
    total = gap * len(notes) + int(0.7 * FR)
    out = np.zeros(total)
    for i, f in enumerate(notes):
        nt = marimba_note(f, 0.65, tau=0.42)
        s = i * gap
        out[s:s + len(nt)] += nt[: total - s]
    render("level_clear.wav", out, wet=0.26, decay=0.7)


def make_coin() -> None:
    # 빠른 두 음 반짝임
    a = marimba_note(1046.50, 0.22, tau=0.12)
    b = marimba_note(1567.98, 0.28, tau=0.14)
    shift = int(0.05 * FR)
    out = np.concatenate([a, np.zeros(shift)])
    out[shift:shift + len(b)] += b[: len(out) - shift]
    render("coin.wav", out, wet=0.2, decay=0.5)


def make_button() -> None:
    n = int(0.05 * FR)
    click = RNG.standard_normal(n) * mallet_env(n, 0.001, 0.012)
    click = lowpass(click, 1800) * 0.5
    click += 0.3 * np.sin(2 * np.pi * 440 * np.arange(n) / FR) * mallet_env(n, 0.001, 0.02)
    render("button_tap.wav", click, wet=0.08, decay=0.3)


# ----------------------------------------------------------------------------
# BGM (60초 루프 가능 스테레오 앰비언트)
# ----------------------------------------------------------------------------

def ambient_pad(root: float, chord: list[float], dur: float, bright: float) -> np.ndarray:
    n = int(FR * dur)
    t = np.arange(n) / FR
    pad = np.zeros(n)
    for mult in chord:
        f = root * mult
        # 약한 디튠 2겹으로 두께
        for det in (-0.3, 0.3):
            ph = 2 * np.pi * (f + det) * t
            pad += np.sin(ph) + 0.3 * bright * np.sin(2 * ph)
    pad /= (np.max(np.abs(pad)) + 1e-9)
    # 천천히 숨쉬는 진폭 LFO
    lfo = 0.75 + 0.25 * np.sin(2 * np.pi * 0.05 * t)
    pad *= lfo
    return lowpass(pad, 3500)


def sprinkle_marimba(base: np.ndarray, freqs: list[float], every: float, gain: float) -> np.ndarray:
    n = len(base)
    out = base.copy()
    step = int(every * FR)
    k = 0
    for s in range(0, n - int(0.7 * FR), step):
        f = freqs[k % len(freqs)]
        nt = marimba_note(f, 0.7, tau=0.5) * gain
        out[s:s + len(nt)] += nt
        k += 1
    return out


def make_bgm(name: str, root: float, chord: list[float], sprinkle: list[float],
             bright: float, sprinkle_gain: float) -> None:
    loop_len = 60.0
    cross = 3.0
    raw = ambient_pad(root, chord, loop_len + cross, bright)
    raw = sprinkle_marimba(raw, sprinkle, every=2.2, gain=sprinkle_gain)
    # 끝 cross초를 앞부분과 이퀄파워 크로스페이드해 심리스 루프 생성
    cn = int(cross * FR)
    ln = int(loop_len * FR)
    head = raw[:cn].copy()
    tail = raw[ln:ln + cn].copy()
    fade = np.linspace(0, 1, cn)
    looped = raw[:ln].copy()
    looped[:cn] = tail * np.cos(fade * np.pi / 2) + head * np.sin(fade * np.pi / 2)
    st = stereo_reverb(finalize(looped, cutoff=6500), wet=0.32, decay=0.8)
    st = _normalize_stereo(st, peak_db=-3.0)
    write_mp3_stereo(name, st)


# ----------------------------------------------------------------------------

def main() -> None:
    for note, freq in NOTE_FREQS.items():
        make_pour(f"pour_{note}.wav", freq)
    make_select()
    make_deselect()
    make_complete()
    make_level_clear()
    make_coin()
    make_button()
    # zen: Cmaj9 잔잔 / classic: Gmaj 약간 밝게
    make_bgm("bgm_zen.mp3", 130.81, [1, 1.5, 2.0, 2.5, 3.0], [523.25, 659.25, 783.99, 587.33], bright=0.4, sprinkle_gain=0.22)
    make_bgm("bgm_classic.mp3", 146.83, [1, 1.5, 2.0, 2.997, 3.75], [587.33, 698.46, 880.0, 783.99], bright=0.7, sprinkle_gain=0.18)
    print("done.")


if __name__ == "__main__":
    main()
