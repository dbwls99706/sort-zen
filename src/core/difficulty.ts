import { GenParams } from './generator';
import { DEFAULT_CAPACITY } from './constants';

export function getDifficulty(level: number): GenParams {
  const colors = Math.min(3 + Math.floor(level / 15), 12);
  const emptyTubes = level < 30 ? 2 : level < 100 ? 2 : 1;
  const shuffleSteps = 10 + Math.floor(level * 1.8);

  return {
    colors,
    filledTubes: colors,
    emptyTubes,
    capacity: DEFAULT_CAPACITY,
    shuffleSteps,
    seed: `lvl-${level}-${Date.now() % 100000}`,
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
