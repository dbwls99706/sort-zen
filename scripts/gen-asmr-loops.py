"""Sort ZEN — ASMR 감각 방 '접촉 루프' 사운드 생성기 (끊김 없는 텍스처 루프).

기존 mp3 루프(water_pour/slime/handcream/shaving_cream/sponge)는 순수 톤(예: 물이
~140Hz 단일 사인이라 '삐용' 허밍)이라 재질감이 없었다. 이 스크립트는 각 재질을
넓은 대역의 노이즈 텍스처로 합성하고 끝~앞을 이퀄파워 크로스페이드해 심리스 루프를
만든다. 절차적 생성이라 외부 자산/라이선스가 필요 없고 결정론적으로 재현된다.

사용법: python scripts/gen-asmr-loops.py   (ffmpeg 필요 — mp3 인코딩)
"""
from __future__ import annotations

import os
import subprocess
import tempfile

import numpy as np
from scipy import signal

FR = 44100
ASSETS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "audio", "assets"
)
RNG = np.random.default_rng(20260620)  # 결정론적 재현

LOOP_LEN = 5.0   # 최종 루프 길이(초)
CROSS = 0.4      # 끝→앞 크로스페이드 길이(초)
GEN_LEN = LOOP_LEN + CROSS


# ----------------------------------------------------------------------------
# 필터 / 보조
# ----------------------------------------------------------------------------

def band(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    ny = FR / 2
    low = max(20.0, lo) / ny
    high = min(ny - 100.0, hi) / ny
    b, a = signal.butter(order, [low, high], btype="band")
    return signal.lfilter(b, a, x)


def low(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    b, a = signal.butter(order, cutoff / (FR / 2), btype="low")
    return signal.lfilter(b, a, x)


def smooth_lfo(n: int, rate: float, lo: float, hi: float) -> np.ndarray:
    """lo~hi 사이를 천천히 오가는 부드러운 진폭 변조(랜덤 위상)."""
    t = np.arange(n) / FR
    phase = RNG.uniform(0, 2 * np.pi)
    return lo + (hi - lo) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + phase))


def seamless(x: np.ndarray) -> np.ndarray:
    """끝 CROSS초를 앞부분과 이퀄파워 크로스페이드해 LOOP_LEN 심리스 루프 생성."""
    ln = int(LOOP_LEN * FR)
    cn = int(CROSS * FR)
    head = x[:cn].copy()
    tail = x[ln:ln + cn].copy()
    fade = np.linspace(0, 1, cn)
    out = x[:ln].copy()
    out[:cn] = tail * np.cos(fade * np.pi / 2) + head * np.sin(fade * np.pi / 2)
    return out


def normalize(x: np.ndarray, peak: float = 0.72) -> np.ndarray:
    return x * (peak / (np.max(np.abs(x)) + 1e-9))


def bubbles(out: np.ndarray, count: int, f_lo: float, f_hi: float, gain: float) -> None:
    """하강 피치 거품 블립을 루프 내부(경계 회피)에 흩뿌린다."""
    n = len(out)
    safe = LOOP_LEN - 0.12
    for _ in range(count):
        f0 = RNG.uniform(f_lo, f_hi)
        start = int(RNG.uniform(0.0, safe) * FR)
        ln = min(n - start, int(0.07 * FR))
        tt = np.arange(ln) / FR
        f = f0 * (1 - 0.4 * (1 - np.exp(-tt / 0.02)))
        out[start:start + ln] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.022) * gain


# ----------------------------------------------------------------------------
# 재질별 텍스처
# ----------------------------------------------------------------------------

def water_loop() -> np.ndarray:
    """흐르는 물: 넓은 대역 노이즈 + 느린 움직임 + 잔거품('졸졸')."""
    n = int(GEN_LEN * FR)
    flow = band(RNG.standard_normal(n), 320, 2600)
    flow *= smooth_lfo(n, 0.7, 0.55, 1.0) * smooth_lfo(n, 0.23, 0.65, 1.0)
    out = flow / (np.max(np.abs(flow)) + 1e-9) * 0.55
    bubbles(out, int(LOOP_LEN * 8), 700, 2200, 0.18)
    return out


def slime_loop() -> np.ndarray:
    """끈적 슬라임: 저-중역 노이즈 + 느린 스퀠치 워블 + 글룹."""
    n = int(GEN_LEN * FR)
    nz = band(RNG.standard_normal(n), 130, 1100)
    nz *= smooth_lfo(n, 1.6, 0.25, 1.0) * smooth_lfo(n, 0.5, 0.5, 1.0)
    out = nz / (np.max(np.abs(nz)) + 1e-9) * 0.5
    bubbles(out, int(LOOP_LEN * 5), 180, 420, 0.16)
    return out


def handcream_loop() -> np.ndarray:
    """매끈 핸드크림: 부드러운 중역 노이즈, 잔잔한 문지름."""
    n = int(GEN_LEN * FR)
    nz = band(RNG.standard_normal(n), 280, 2000)
    nz *= smooth_lfo(n, 1.1, 0.4, 1.0) * smooth_lfo(n, 0.33, 0.6, 1.0)
    out = nz / (np.max(np.abs(nz)) + 1e-9) * 0.5
    return out


def shaving_loop() -> np.ndarray:
    """폼/쉐이빙: 공기감 있는 고역 히스, 부드러운 거품 꺼짐."""
    n = int(GEN_LEN * FR)
    nz = band(RNG.standard_normal(n), 1200, 5500)
    nz *= smooth_lfo(n, 0.9, 0.5, 1.0) * smooth_lfo(n, 2.7, 0.7, 1.0)
    out = nz / (np.max(np.abs(nz)) + 1e-9) * 0.42
    return out


def sponge_loop() -> np.ndarray:
    """젖은 스펀지: 끊임없는 미세 크래클 팝 + 약한 저역 스퀴시."""
    n = int(GEN_LEN * FR)
    out = np.zeros(n)
    base = low(RNG.standard_normal(n), 600) * smooth_lfo(n, 1.3, 0.2, 0.6)
    out += base / (np.max(np.abs(base)) + 1e-9) * 0.3
    safe = LOOP_LEN - 0.05
    for _ in range(int(LOOP_LEN * 90)):
        start = int(RNG.uniform(0.0, safe) * FR)
        pl = int(RNG.uniform(0.003, 0.012) * FR)
        if start + pl >= n:
            continue
        g = band(RNG.standard_normal(pl), 800, 4200)
        tt = np.arange(pl)
        out[start:start + pl] += g * np.exp(-tt / (0.0028 * FR)) * 0.5
    return out


# ----------------------------------------------------------------------------

def write_mp3(name: str, mono: np.ndarray, bitrate: str = "96k") -> None:
    data = np.clip(normalize(seamless(mono)), -1, 1)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    from scipy.io import wavfile

    wavfile.write(tmp_path, FR, (data * 32767).astype(np.int16))
    out = os.path.join(ASSETS, name)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp_path, "-b:a", bitrate, out],
        check=True,
    )
    os.remove(tmp_path)
    print(f"loop -> {name} ({LOOP_LEN:.0f}s seamless mp3 {bitrate})")


def main() -> None:
    write_mp3("water_pour.mp3", water_loop())
    write_mp3("slime.mp3", slime_loop())
    write_mp3("handcream.mp3", handcream_loop())
    write_mp3("shaving_cream.mp3", shaving_loop())
    write_mp3("sponge.mp3", sponge_loop())
    print("done.")


if __name__ == "__main__":
    main()
