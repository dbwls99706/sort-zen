import { GenParams } from './generator';
import {
  DEFAULT_CAPACITY,
  DEFAULT_EMPTY_TUBES,
  MAX_COLORS,
  MAX_SHUFFLE_STEPS,
} from './constants';

export function getDifficulty(level: number): GenParams {
  const colors = Math.min(3 + Math.floor(level / 15), MAX_COLORS);
  // 빈튜브 1개는 역방향 셔플로 솔버블 보장이 안 됨(레벨 150+ ~0%, T141 측정).
  // 항상 2개를 유지하고 난이도는 색상 수/셔플로만 조절한다 (T147).
  const emptyTubes = DEFAULT_EMPTY_TUBES;
  const shuffleSteps = Math.min(
    10 + Math.floor(level * 1.8),
    MAX_SHUFFLE_STEPS,
  );

  return {
    colors,
    filledTubes: colors,
    emptyTubes,
    capacity: DEFAULT_CAPACITY,
    shuffleSteps,
    seed: `lvl-${level}`,
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
