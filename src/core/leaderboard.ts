/**
 * 리더보드 점수 산정 순수 로직.
 *
 * 무한 절차적 생성이라 "점수"의 단일 정의가 필요하다 → **최고 도달 단계**.
 * userStore.level(다음에 플레이할 레벨 = 지금까지 도달한 최고 단계)을
 * Play Games 리더보드가 받는 정수 점수로 변환한다.
 */

const safeLevel = (level: number): number =>
  Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;

/** 도달 단계 → 리더보드 정수 점수 (최소 1). */
export function levelToScore(level: number): number {
  return safeLevel(level);
}

/** 새 도달 단계가 기존 기록보다 갱신인지 (동률은 갱신 아님). */
export function isNewBest(level: number, previousBest: number): boolean {
  return safeLevel(level) > safeLevel(previousBest);
}
