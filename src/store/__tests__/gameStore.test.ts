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
    const emptyTube = useGameStore.getState().tubes.find((t) => t.layers.length === 0);
    if (emptyTube) {
      useGameStore.getState().selectTube(emptyTube.id);
      expect(useGameStore.getState().selectedTube).toBeNull();
    }
  });

  test('selectTube은 비어있지 않은 튜브를 선택한다', () => {
    const filledTube = useGameStore.getState().tubes.find((t) => t.layers.length > 0);
    if (filledTube) {
      useGameStore.getState().selectTube(filledTube.id);
      expect(useGameStore.getState().selectedTube).toBe(filledTube.id);
    }
  });

  test('같은 튜브를 다시 선택하면 해제된다', () => {
    const filledTube = useGameStore.getState().tubes.find((t) => t.layers.length > 0);
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

  test('addExtraTube는 빈 튜브 1개를 추가한다 (T144)', () => {
    const before = useGameStore.getState().tubes;
    useGameStore.getState().addExtraTube();
    const after = useGameStore.getState().tubes;
    expect(after.length).toBe(before.length + 1);
    const added = after[after.length - 1];
    expect(added.layers).toEqual([]);
    expect(added.capacity).toBe(before[0].capacity);
    expect(added.id).toBeGreaterThan(Math.max(...before.map((t) => t.id)));
    expect(useGameStore.getState().extraTubeUsed).toBe(true);
  });

  test('addExtraTube는 보드당 1회만 동작한다', () => {
    useGameStore.getState().addExtraTube();
    const count = useGameStore.getState().tubes.length;
    useGameStore.getState().addExtraTube();
    expect(useGameStore.getState().tubes.length).toBe(count);
  });

  test('startNewGame은 extraTubeUsed를 초기화한다', () => {
    useGameStore.getState().addExtraTube();
    expect(useGameStore.getState().extraTubeUsed).toBe(true);
    useGameStore.getState().startNewGame('classic', 2);
    expect(useGameStore.getState().extraTubeUsed).toBe(false);
  });
});

describe('atomic animation commits', () => {
  beforeEach(() => {
    const tubes = [
      { id: 0, capacity: 4, layers: [0, 0, 1, 1] },
      { id: 1, capacity: 4, layers: [1, 1, 0, 0] },
      { id: 2, capacity: 4, layers: [] },
    ];
    useGameStore.setState({
      tubes,
      initialTubes: tubes,
      moves: [],
      cleared: false,
      selectedTube: null,
      extraTubeUsed: false,
    });
  });

  test('commits explicit ids even when a newer selection changed', () => {
    const revision = useGameStore.getState().boardRevision;
    useGameStore.getState().selectTube(1);
    expect(useGameStore.getState().applyMove(0, 2, revision)).toBe(true);
    expect(useGameStore.getState().moves).toEqual([{ from: 0, to: 2, colorId: 1, count: 2 }]);
    expect(useGameStore.getState().boardRevision).toBe(revision + 1);
    expect(useGameStore.getState().selectedTube).toBeNull();
  });

  test('a duplicate completion callback cannot apply the same move twice', () => {
    const revision = useGameStore.getState().boardRevision;
    expect(useGameStore.getState().applyMove(0, 2, revision)).toBe(true);
    expect(useGameStore.getState().applyMove(0, 2, revision)).toBe(false);
    expect(useGameStore.getState().moves).toHaveLength(1);
  });

  test.each(['reset', 'undo', 'addExtraTube', 'startNewGame'] as const)(
    '%s invalidates an animation captured on the previous board',
    (action) => {
      useGameStore.getState().applyMove(0, 2);
      const revision = useGameStore.getState().boardRevision;
      if (action === 'startNewGame') useGameStore.getState().startNewGame('classic', 2);
      else useGameStore.getState()[action]();
      const before = useGameStore.getState();
      expect(before.applyMove(1, 0, revision)).toBe(false);
      expect(useGameStore.getState()).toBe(before);
    },
  );

  test('invalid ids, self-pours and full targets leave the board untouched', () => {
    const before = useGameStore.getState();
    expect(before.applyMove(0, 0)).toBe(false);
    expect(before.applyMove(0, 99)).toBe(false);
    expect(before.applyMove(99, 2)).toBe(false);
    expect(before.applyMove(0, 1)).toBe(false);
    expect(useGameStore.getState()).toBe(before);
  });

  test('committing the final pour marks a board cleared and rejects later input', () => {
    const tubes = [
      { id: 0, capacity: 2, layers: [0] },
      { id: 1, capacity: 2, layers: [0] },
      { id: 2, capacity: 2, layers: [] },
    ];
    useGameStore.setState({ tubes });
    expect(useGameStore.getState().applyMove(0, 1)).toBe(true);
    expect(useGameStore.getState().cleared).toBe(true);
    expect(useGameStore.getState().applyMove(1, 2)).toBe(false);
  });
});
