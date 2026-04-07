import { useGameStore } from '../gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.getState().startNewGame('classic', 1);
  });

  test('startNewGame은 튜브를 생성한다', () => {
    const { tubes } = useGameStore.getState();
    expect(tubes.length).toBeGreaterThan(0);
  });

  test('startNewGame은 moves를 초기화한다', () => {
    const { moves } = useGameStore.getState();
    expect(moves).toEqual([]);
  });

  test('startNewGame은 cleared를 false로 설정한다', () => {
    expect(useGameStore.getState().cleared).toBe(false);
  });

  test('selectTube은 빈 튜브를 선택하지 않는다', () => {
    const emptyTube = useGameStore
      .getState()
      .tubes.find((t) => t.layers.length === 0);
    if (emptyTube) {
      useGameStore.getState().selectTube(emptyTube.id);
      expect(useGameStore.getState().selectedTube).toBeNull();
    }
  });

  test('selectTube은 비어있지 않은 튜브를 선택한다', () => {
    const filledTube = useGameStore
      .getState()
      .tubes.find((t) => t.layers.length > 0);
    if (filledTube) {
      useGameStore.getState().selectTube(filledTube.id);
      expect(useGameStore.getState().selectedTube).toBe(filledTube.id);
    }
  });

  test('같은 튜브를 다시 선택하면 해제된다', () => {
    const filledTube = useGameStore
      .getState()
      .tubes.find((t) => t.layers.length > 0);
    if (filledTube) {
      useGameStore.getState().selectTube(filledTube.id);
      useGameStore.getState().selectTube(filledTube.id);
      expect(useGameStore.getState().selectedTube).toBeNull();
    }
  });

  test('undo는 마지막 이동을 되돌린다', () => {
    const state = useGameStore.getState();
    const tubesBefore = state.tubes.map((t) => [...t.layers]);

    const from = state.tubes.find((t) => t.layers.length > 0);
    const to = state.tubes.find((t) => t.layers.length === 0);
    if (from && to) {
      useGameStore.getState().selectTube(from.id);
      useGameStore.getState().selectTube(to.id);

      if (useGameStore.getState().moves.length > 0) {
        useGameStore.getState().undo();
        const restored = useGameStore.getState().tubes;
        expect(restored.map((t) => [...t.layers])).toEqual(tubesBefore);
      }
    }
  });

  test('reset은 보드를 다시 생성한다', () => {
    useGameStore.getState().reset();
    expect(useGameStore.getState().moves).toEqual([]);
    expect(useGameStore.getState().selectedTube).toBeNull();
  });

  test('zen 모드로 시작할 수 있다', () => {
    useGameStore.getState().startNewGame('zen');
    expect(useGameStore.getState().mode).toBe('zen');
    expect(useGameStore.getState().tubes.length).toBeGreaterThan(0);
  });
});
