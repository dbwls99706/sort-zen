// 16진수 색을 밝게/어둡게 보정하는 순수 유틸 (액체 그라데이션용)

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

const HEX6 = /^#?[0-9a-fA-F]{6}$/;

function parseHex(hex: string): [number, number, number] | null {
  if (!HEX6.test(hex)) return null;
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return (
    '#' +
    rgb
      .map((v) => clampByte(v).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** 흰색 쪽으로 amount(0~1)만큼 섞어 밝게 (6자리 hex가 아니면 원본 반환) */
export function lighten(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return toHex([
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  ]);
}

/** 검정 쪽으로 amount(0~1)만큼 섞어 어둡게 (6자리 hex가 아니면 원본 반환) */
export function darken(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return toHex([r * (1 - amount), g * (1 - amount), b * (1 - amount)]);
}
