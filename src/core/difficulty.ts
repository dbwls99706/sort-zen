import { GenParams } from './generator';
import {
  DEFAULT_CAPACITY,
  DEFAULT_EMPTY_TUBES,
  MAX_COLORS,
  MIN_COLORS,
  MAX_SHUFFLE_STEPS,
} from './constants';

/** 난이도 랜덤 색상 수 하한(너무 쉬운 판 방지) */
const MIN_RANDOM_COLORS = MIN_COLORS + 1; // 4

/**
 * 난이도는 스테이지 번호에 비례해 증가하지 않고 **매 판 랜덤화**한다(사용자 요청).
 * 색상 수·셔플·빈 튜브 수를 무작위로 변주해 같은 레벨이라도 매번 다른 난이도가 나온다.
 * 솔버블은 generator가 보장하고, reset(다시하기)은 gameStore가 시작 스냅샷으로 복원하므로
 * 시드 랜덤화는 같은 판 안에서의 안정성에 영향을 주지 않는다.
 */
export function getDifficulty(level: number): GenParams {
  // 4 .. MAX_COLORS 사이 랜덤
  const colors =
    MIN_RANDOM_COLORS +
    Math.floor(Math.random() * (MAX_COLORS - MIN_RANDOM_COLORS + 1));
  // 가끔 빈 튜브를 1개 더 줘 난이도/여유를 변주 (갯수 변화)
  const emptyTubes = DEFAULT_EMPTY_TUBES + (Math.random() < 0.25 ? 1 : 0);
  // 셔플은 색상 수에 비례한 높은 하한 + 랜덤 가산 — 충분히 섞어 단색 시작을 막는다.
  const shuffleSteps = Math.min(
    colors * 8 + Math.floor(Math.random() * colors * 6),
    MAX_SHUFFLE_STEPS,
  );

  return {
    colors,
    filledTubes: colors,
    emptyTubes,
    capacity: DEFAULT_CAPACITY,
    shuffleSteps,
    seed: `lvl-${level}-${Math.floor(Math.random() * 1e9)}`,
  };
}

export function getZenParams(): GenParams {
  const colors = 5 + Math.floor(Math.random() * 5);
  return {
    colors,
    filledTubes: colors,
    emptyTubes: 2,
    capacity: DEFAULT_CAPACITY,
    shuffleSteps: 30 + Math.floor(Math.random() * 40),
    seed: `zen-${Date.now()}-${Math.random()}`,
  };
}
