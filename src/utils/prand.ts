/**
 * 인덱스 기반 결정적 의사난수 (0~1).
 * 렌더 순수성 규칙을 지키면서(같은 입력 → 같은 출력) 변주를 주기 위한 해시.
 */
export function prand(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
