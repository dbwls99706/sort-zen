import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useBoardControls } from '../useBoardControls';
import { useGameStore } from '../../store/gameStore';
import { useUserStore } from '../../store/userStore';
import { AdManager } from '../../ads/AdManager';
import { findSolutionAsync } from '../../core/solver';
import type { Tube } from '../../core/types';

const mockAppState = AppState as { currentState: string };
jest.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (value: number) => {
    const { useRef } = jest.requireActual<typeof import('react')>('react');
    return useRef({ value }).current;
  },
  cancelAnimation: jest.fn(),
}));
jest.mock('../../audio/SoundManager', () => ({
  SoundManager: {
    play: jest.fn(),
    playPour: jest.fn(),
    stopBGM: jest.fn(),
  },
}));
jest.mock('../../utils/haptics', () => ({
  Haptic: {
    light: jest.fn(),
    medium: jest.fn(),
    flow: () => jest.fn(),
  },
}));
jest.mock('../../ads/AdManager', () => ({
  AdManager: {
    showRewarded: jest.fn(),
    maybeShowInterstitial: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../../core/solver', () => ({
  ...jest.requireActual<typeof import('../../core/solver')>('../../core/solver'),
  findSolutionAsync: jest.fn(),
}));

const board: Tube[] = [
  { id: 0, capacity: 2, layers: [0, 1], hiddenCount: 0 },
  { id: 1, capacity: 2, layers: [1, 0], hiddenCount: 0 },
  { id: 2, capacity: 2, layers: [], hiddenCount: 0 },
];
const layouts = {
  current: Object.fromEntries(
    board.map((tube, index) => [
      tube.id,
      {
        x: index * 64,
        y: 0,
        width: 52,
        height: 184,
      },
    ]),
  ),
};
const onNextLevel = jest.fn(() => useGameStore.getState().startNewGame('classic', 2));
const onMenu = jest.fn();
const setup = () =>
  renderHook(() =>
    useBoardControls({
      scale: 1,
      layouts,
      onNextLevel,
      onMenu,
      onReset: () => undefined,
    }),
  );

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockAppState.currentState = 'active';
  useGameStore.setState({
    tubes: board,
    initialTubes: board,
    moves: [],
    selectedTube: null,
    cleared: false,
    boardRevision: 1,
    mode: 'classic',
    level: 1,
    extraTubeUsed: false,
  });
  useUserStore.setState({ coins: 100 });
  jest.mocked(AdManager.maybeShowInterstitial).mockResolvedValue(undefined);
});
afterEach(() => {
  jest.useRealTimers();
});

test('a same-frame double tap deselects without moving liquid', async () => {
  const { result } = await setup();
  await act(() => {
    result.current.handleTubePress(0);
    result.current.handleTubePress(0);
  });
  expect(useGameStore.getState().selectedTube).toBeNull();
  expect(useGameStore.getState().moves).toHaveLength(0);
});

test('a rapid complete solution commits queued pours once and ignores duplicate callbacks', async () => {
  const { result } = await setup();
  await act(() => {
    [0, 2, 1, 0, 2, 1].forEach(result.current.handleTubePress);
  });
  expect(useGameStore.getState().moves).toHaveLength(0);
  const firstComplete = result.current.complete;
  await act(firstComplete);
  await act(firstComplete);
  expect(useGameStore.getState().moves).toHaveLength(1);
  await act(result.current.complete);
  await act(result.current.complete);
  expect(useGameStore.getState().moves).toHaveLength(3);
  expect(useGameStore.getState().cleared).toBe(true);
});

test.each(['undo', 'reset', 'pause'] as const)(
  '%s settles or cancels a pour and discards queued taps',
  async (action) => {
    const { result } = await setup();
    await act(() => {
      [0, 2, 1, 0].forEach(result.current.handleTubePress);
    });
    const lateComplete = result.current.complete;
    await act(result.current[action]);
    await act(lateComplete);
    await act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.animatingPour).toBeNull();
    expect(useGameStore.getState().moves).toHaveLength(action === 'pause' ? 1 : 0);
    if (action === 'pause') {
      await act(() => {
        result.current.handleTubePress(1);
      });
      expect(useGameStore.getState().selectedTube).toBeNull();
      await act(result.current.resume);
      await act(() => {
        result.current.handleTubePress(1);
      });
      expect(useGameStore.getState().selectedTube).toBe(1);
    } else expect(useGameStore.getState().tubes).toEqual(board);
  },
);

test('a missing animation callback recovers and a late callback cannot duplicate the move', async () => {
  const { result } = await setup();
  await act(() => {
    result.current.handleTubePress(0);
    result.current.handleTubePress(2);
  });
  const lateComplete = result.current.complete;
  await act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(useGameStore.getState().moves).toHaveLength(1);
  expect(result.current.animatingPour).toBeNull();
  await act(lateComplete);
  expect(useGameStore.getState().moves).toHaveLength(1);
  await act(() => {
    result.current.handleTubePress(1);
  });
  expect(useGameStore.getState().selectedTube).toBe(1);
});

test('unmount cancels pending hint work without charging coins', async () => {
  const pending = deferred<Awaited<ReturnType<typeof findSolutionAsync>>>();
  jest.mocked(findSolutionAsync).mockReturnValueOnce(pending.promise);
  const { result, unmount } = await setup();
  let request!: Promise<void>;
  await act(() => {
    request = result.current.requestHint();
  });
  const signal = jest.mocked(findSolutionAsync).mock.calls[0][1]?.signal;
  await unmount();
  pending.resolve([{ from: 0, to: 2, colorId: 1, count: 1 }]);
  await request;
  expect(signal?.aborted).toBe(true);
  expect(useUserStore.getState().coins).toBe(100);
});

test('double hint request charges once; changing the board discards an old result', async () => {
  const pending = deferred<Awaited<ReturnType<typeof findSolutionAsync>>>();
  jest.mocked(findSolutionAsync).mockReturnValueOnce(pending.promise);
  const { result } = await setup();
  let request!: Promise<void>;
  await act(() => {
    request = result.current.requestHint();
    void result.current.requestHint();
  });
  await act(async () => {
    pending.resolve([{ from: 0, to: 2, colorId: 1, count: 1 }]);
    await request;
  });
  await act(result.current.requestHint);
  expect(useUserStore.getState().coins).toBe(85);
  expect(findSolutionAsync).toHaveBeenCalledTimes(1);
  await act(() => {
    result.current.handleTubePress(0);
  });
  const stale = deferred<Awaited<ReturnType<typeof findSolutionAsync>>>();
  jest.mocked(findSolutionAsync).mockReturnValueOnce(stale.promise);
  await act(() => {
    request = result.current.requestHint();
  });
  await act(result.current.reset);
  await act(async () => {
    stale.resolve([{ from: 0, to: 2, colorId: 1, count: 1 }]);
    await request;
  });
  expect(useUserStore.getState().coins).toBe(85);
  expect(result.current.hint).toBeNull();
});

test('next level stays on the completed board until the ad closes and rejects duplicate navigation', async () => {
  useGameStore.setState({ cleared: true });
  const pending = deferred<void>();
  jest.mocked(AdManager.maybeShowInterstitial).mockReturnValueOnce(pending.promise);
  const { result } = await setup();
  let transition!: Promise<void>;
  await act(() => {
    transition = result.current.nextLevel();
    void result.current.nextLevel();
    result.current.menu();
    result.current.handleTubePress(0);
  });
  expect(result.current.adBusy).toBe(true);
  expect(useGameStore.getState().level).toBe(1);
  expect(onNextLevel).not.toHaveBeenCalled();
  expect(onMenu).not.toHaveBeenCalled();
  await act(async () => {
    pending.resolve();
    await transition;
  });
  expect(onNextLevel).toHaveBeenCalledTimes(1);
  expect(useGameStore.getState().level).toBe(2);
  expect(result.current.adBusy).toBe(false);
});

test('an ad closing while backgrounded leaves the next puzzle paused', async () => {
  useGameStore.setState({ cleared: true });
  const pending = deferred<void>();
  jest.mocked(AdManager.maybeShowInterstitial).mockReturnValueOnce(pending.promise);
  const { result } = await setup();
  let transition!: Promise<void>;
  await act(() => {
    transition = result.current.nextLevel();
  });
  mockAppState.currentState = 'background';
  await act(async () => {
    pending.resolve();
    await transition;
  });
  expect(result.current.dialog).toBe('pause');
  const nonempty = useGameStore.getState().tubes.find((tube) => tube.layers.length > 0)!;
  await act(() => {
    result.current.handleTubePress(nonempty.id);
  });
  expect(useGameStore.getState().selectedTube).toBeNull();
});

test('leaving during an ad cannot start another puzzle after unmount', async () => {
  useGameStore.setState({ cleared: true });
  const pending = deferred<void>();
  jest.mocked(AdManager.maybeShowInterstitial).mockReturnValueOnce(pending.promise);
  const { result, unmount } = await setup();
  let transition!: Promise<void>;
  await act(() => {
    transition = result.current.nextLevel();
  });
  await unmount();
  pending.resolve();
  await transition;
  expect(onNextLevel).not.toHaveBeenCalled();
  expect(useGameStore.getState().level).toBe(1);
});

test('an earned hint survives a background ad close and remains available after resuming', async () => {
  useUserStore.setState({ coins: 0 });
  jest.mocked(findSolutionAsync).mockResolvedValueOnce([{ from: 0, to: 2, colorId: 1, count: 1 }]);
  const pending = deferred<boolean>();
  jest.mocked(AdManager.showRewarded).mockReturnValueOnce(pending.promise);
  const { result } = await setup();
  await act(result.current.requestHint);
  expect(result.current.dialog).toBe('hint');
  let watching!: Promise<void>;
  await act(() => {
    watching = result.current.watchHintAd();
  });
  mockAppState.currentState = 'background';
  await act(async () => {
    jest.mocked(AdManager.showRewarded).mock.calls[0][0]();
    pending.resolve(true);
    await watching;
  });
  expect(result.current.dialog).toBe('pause');
  expect(result.current.hint).toEqual({ from: 0, to: 2 });
  mockAppState.currentState = 'active';
  await act(result.current.resume);
  expect(result.current.dialog).toBeNull();
  expect(result.current.hint).toEqual({ from: 0, to: 2 });
  expect(useUserStore.getState().coins).toBe(0);
});
