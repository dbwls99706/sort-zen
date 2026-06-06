"""Sort ZEN 스토어/앱 자산 빌드 파이프라인.

원본 아트(.png 확장자이나 내부가 JPEG로 저장돼 있던 파일)를 디코드해
플랫폼 요건에 맞는 진짜 PNG로 재인코딩한다.

규칙:
- 앱/adaptive/스플래시 아이콘: iOS는 아이콘 알파 채널을 금지하므로 불투명(RGB) PNG.
- favicon: 웹용이므로 48x48 불투명 PNG로 축소.
- 피처 그래픽: Google Play 규격에 맞춰 정확히 1024x500으로 중앙 크롭한 불투명 PNG.

사용법: python scripts/build_assets.py
"""
from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (상대 경로, 출력 크기 또는 None=원본 유지)
OPAQUE_SQUARE = [
    ("assets/icon.png", 1024),
    ("assets/adaptive-icon.png", 1024),
    ("assets/splash-icon.png", 1024),
    ("assets/favicon.png", 48),
]

FEATURE_GRAPHIC = ("assets/store/feature-graphic.png", (1024, 500))


def to_opaque_png(path: str, size: int) -> None:
    """정사각형 아이콘을 불투명 PNG로 재저장한다."""
    img = Image.open(path).convert("RGB")
    if img.size != (size, size):
        img = img.resize((size, size), Image.LANCZOS)
    img.save(path, "PNG")
    print(f"icon  -> {path} ({size}x{size}, RGB)")


def crop_feature_graphic(path: str, target: tuple[int, int]) -> None:
    """정사각형 원본에서 중앙 가로 띠를 잘라 피처 그래픽 규격을 만든다."""
    tw, th = target
    img = Image.open(path).convert("RGB")
    w, h = img.size

    # target 비율에 맞춰 가능한 한 크게 중앙 크롭한 뒤 리사이즈.
    target_ratio = tw / th
    if w / h > target_ratio:
        crop_h = h
        crop_w = round(h * target_ratio)
    else:
        crop_w = w
        crop_h = round(w / target_ratio)

    left = (w - crop_w) // 2
    top = (h - crop_h) // 2
    img = img.crop((left, top, left + crop_w, top + crop_h))
    img = img.resize(target, Image.LANCZOS)
    img.save(path, "PNG")
    print(f"feature -> {path} ({tw}x{th}, RGB)")


def main() -> None:
    for rel, size in OPAQUE_SQUARE:
        to_opaque_png(os.path.join(ROOT, rel), size)
    rel, target = FEATURE_GRAPHIC
    crop_feature_graphic(os.path.join(ROOT, rel), target)
    print("done.")


if __name__ == "__main__":
    main()
