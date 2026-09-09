import { TapQueue } from '../TapQueue';
import { useGameStore } from '../../store/gameStore';
import { pour } from '../../core/rules';

describe('tap serialization', () => {
  test('rapid select/deselect reads the latest selection without a render', () => {
    useGameStore.setState({
      tubes: [{ id: 0, capacity: 4, layers: [1, 0] }],
      cleared: false,
      selectedTube: null,
    });
    const queue = new TapQueue((id) => useGameStore.getState().selectTube(id));
    queue.press(0);
    queue.press(0);
    expect(useGameStore.getState().selectedTube).toBeNull();
  });

  test('queued next move runs after the actual pour and duplicate completion cannot release it', () => {
    useGameStore.setState({
      tubes: [
        { id: 0, capacity: 4, layers: [1, 0] },
        { id: 1, capacity: 4, layers: [2, 0] },
        { id: 2, capacity: 4, layers: [1] },
      ],
      moves: [],
      selectedTube: null,
      cleared: false,
      boardRevision: 0,
    });
    let pending: { from: number; to: number; revision: number; token: number } | null = null;
    const queue = new TapQueue((id) => {
      const state = useGameStore.getState();
      const from = state.tubes.find((tube) => tube.id === state.selectedTube);
      const to = state.tubes.find((tube) => tube.id === id);
      if (from && to && pour(from, to)) {
        pending = { from: from.id, to: id, revision: state.boardRevision, token: queue.begin() };
      } else state.selectTube(id);
    });
    const finish = () => {
      const move = pending!;
      expect(useGameStore.getState().applyMove(move.from, move.to, move.revision)).toBe(true);
      queue.finish(move.token);
      return move.token;
    };
    [0, 1, 0, 2].forEach((id) => queue.press(id));
    expect(useGameStore.getState().moves).toHaveLength(0);
    const firstToken = finish();
    expect(useGameStore.getState().moves).toHaveLength(1);
    expect(queue.finish(firstToken)).toBe(false);
    finish();
    expect(useGameStore.getState().moves.map(({ from, to }) => [from, to])).toEqual([
      [0, 1],
      [0, 2],
    ]);
  });

  test('pause/reset clears queued intent and rejects an earlier animation callback', () => {
    const delivered: number[] = [];
    const queue = new TapQueue((id) => delivered.push(id));
    const previous = queue.begin();
    queue.press(3);
    queue.press(4);
    queue.clear();
    const current = queue.begin();
    queue.press(5);
    expect(queue.finish(previous)).toBe(false);
    expect(delivered).toEqual([]);
    queue.finish(current);
    expect(delivered).toEqual([5]);
  });
});
