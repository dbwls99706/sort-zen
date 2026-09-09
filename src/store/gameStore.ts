import { create } from 'zustand';
import { Tube, Move } from '../core/types';
import { pour, isCleared, applyUndo } from '../core/rules';
import { generateLevelWithSolution } from '../core/generator';
import { getDifficulty, getZenParams, getHiddenDepth } from '../core/difficulty';

type GameMode = 'classic' | 'zen';

type GameStoreState = {
  tubes: Tube[];
  initialTubes: Tube[];
  moves: Move[];
  selectedTube: number | null;
  mode: GameMode;
  level: number;
  cleared: boolean;
  /** 이번 보드에서 추가 튜브(리워드 광고 보상)를 이미 썼는지 — 보드당 1회 (T144) */
  extraTubeUsed: boolean;
  /** 시작 보드의 검증된 해 길이 — 최단 경로 보장은 없으며 별점의 기준으로 사용 */
  optimalMoves: number | null;
  boardRevision: number;
  applyMove: (fromId: number, toId: number, expectedRevision?: number) => boolean;
  startNewGame: (mode: GameMode, level?: number) => void;
  selectTube: (id: number) => void;
  undo: () => void;
  reset: () => void;
  addExtraTube: () => void;
};

export const useGameStore = create<GameStoreState>()((set, get) => ({
  tubes: [],
  initialTubes: [],
  moves: [],
  selectedTube: null,
  mode: 'classic' as GameMode,
  level: 1,
  cleared: false,
  extraTubeUsed: false,
  optimalMoves: null,
  boardRevision: 0,

  startNewGame: (mode, level) => {
    const lvl = level ?? 1;
    const params = mode === 'classic' ? getDifficulty(lvl) : getZenParams();
    const { tubes: generated, solution } = generateLevelWithSolution(params);
    // 클래식 고레벨: 바닥부터 일부 레이어를 가린다(회색+?). 해는 실제 색으로 동작하므로
    // 가림은 표시/체감 난이도만 바꾼다(구성한 해는 그대로 유효).
    const hideDepth = mode === 'classic' ? getHiddenDepth(lvl) : 0;
    const tubes =
      hideDepth > 0
        ? generated.map((t) =>
            t.layers.length > 1
              ? { ...t, hiddenCount: Math.min(hideDepth, t.layers.length - 1) }
              : t,
          )
        : generated;
    set({
      tubes,
      initialTubes: tubes,
      moves: [],
      selectedTube: null,
      mode,
      level: lvl,
      cleared: false,
      extraTubeUsed: false,
      optimalMoves: solution.length,
      boardRevision: get().boardRevision + 1,
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

    if (!get().applyMove(selectedTube, id)) {
      set({ selectedTube: toTube.layers.length > 0 ? id : null });
    }
  },

  applyMove: (fromId, toId, expectedRevision) => {
    const { tubes, moves, cleared, boardRevision } = get();
    if (
      cleared ||
      fromId === toId ||
      (expectedRevision !== undefined && expectedRevision !== boardRevision)
    )
      return false;
    const from = tubes.find((tube) => tube.id === fromId);
    const to = tubes.find((tube) => tube.id === toId);
    if (!from || !to) return false;
    const result = pour(from, to);
    if (!result) return false;
    const newTubes = tubes.map((tube) =>
      tube.id === fromId ? result.from : tube.id === toId ? result.to : tube,
    );
    set({
      tubes: newTubes,
      moves: [...moves, result.move],
      selectedTube: null,
      cleared: isCleared(newTubes),
      boardRevision: boardRevision + 1,
    });
    return true;
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
      boardRevision: get().boardRevision + 1,
    });
  },

  reset: () => {
    const { initialTubes } = get();
    set({
      tubes: initialTubes,
      moves: [],
      selectedTube: null,
      cleared: false,
      extraTubeUsed: false,
      boardRevision: get().boardRevision + 1,
    });
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
    set({
      tubes: [...tubes, newTube],
      extraTubeUsed: true,
      boardRevision: get().boardRevision + 1,
    });
  },
}));
