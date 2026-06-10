import { create } from 'zustand';
import { Tube, Move } from '../core/types';
import { pour, isCleared, applyUndo } from '../core/rules';
import { generateLevel } from '../core/generator';
import { getDifficulty, getZenParams } from '../core/difficulty';

type GameMode = 'classic' | 'zen';

type GameStoreState = {
  tubes: Tube[];
  moves: Move[];
  selectedTube: number | null;
  mode: GameMode;
  level: number;
  cleared: boolean;
  /** 이번 보드에서 추가 튜브(리워드 광고 보상)를 이미 썼는지 — 보드당 1회 (T144) */
  extraTubeUsed: boolean;
  startNewGame: (mode: GameMode, level?: number) => void;
  selectTube: (id: number) => void;
  undo: () => void;
  reset: () => void;
  addExtraTube: () => void;
};

export const useGameStore = create<GameStoreState>()((set, get) => ({
  tubes: [],
  moves: [],
  selectedTube: null,
  mode: 'classic' as GameMode,
  level: 1,
  cleared: false,
  extraTubeUsed: false,

  startNewGame: (mode, level) => {
    const lvl = level ?? 1;
    const params =
      mode === 'classic' ? getDifficulty(lvl) : getZenParams();
    const tubes = generateLevel(params);
    set({
      tubes,
      moves: [],
      selectedTube: null,
      mode,
      level: lvl,
      cleared: false,
      extraTubeUsed: false,
    });
  },

  selectTube: (id) => {
    const { selectedTube, tubes, cleared } = get();
    if (cleared) return;

    if (selectedTube === null) {
      const tube = tubes.find((t) => t.id === id);
      if (tube && tube.layers.length > 0) {
        set({ selectedTube: id });
      }
      return;
    }

    if (selectedTube === id) {
      set({ selectedTube: null });
      return;
    }

    const fromTube = tubes.find((t) => t.id === selectedTube);
    const toTube = tubes.find((t) => t.id === id);
    if (!fromTube || !toTube) {
      set({ selectedTube: null });
      return;
    }

    const result = pour(fromTube, toTube);
    if (result) {
      const newTubes = tubes.map((t) => {
        if (t.id === selectedTube) return result.from;
        if (t.id === id) return result.to;
        return t;
      });
      const newMoves = [...get().moves, result.move];
      set({
        tubes: newTubes,
        moves: newMoves,
        selectedTube: null,
        cleared: isCleared(newTubes),
      });
    } else {
      set({ selectedTube: id });
    }
  },

  undo: () => {
    const { moves, tubes } = get();
    if (moves.length === 0) return;
    const lastMove = moves[moves.length - 1];
    const restoredTubes = applyUndo(tubes, lastMove);
    set({
      tubes: restoredTubes,
      moves: moves.slice(0, -1),
      selectedTube: null,
      cleared: false,
    });
  },

  reset: () => {
    const { mode, level } = get();
    get().startNewGame(mode, level);
  },

  /** 빈 튜브 1개를 보드 끝에 추가 (데드엔드 회복, 보드당 1회) */
  addExtraTube: () => {
    const { tubes, extraTubeUsed, cleared } = get();
    if (extraTubeUsed || cleared || tubes.length === 0) return;
    const newTube: Tube = {
      id: Math.max(...tubes.map((t) => t.id)) + 1,
      capacity: tubes[0].capacity,
      layers: [],
    };
    set({ tubes: [...tubes, newTube], extraTubeUsed: true });
  },
}));
