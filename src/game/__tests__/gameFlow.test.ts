import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import GameScreen from '../../../app/game/[mode]';
import { useGameStore } from '../../store/gameStore';
import { useUserStore } from '../../store/userStore';
import { canPour } from '../../core/rules';
import { CLEAR_BOARD_CELEBRATION_MS } from '../../components/pourTiming';
import type { Tube } from '../../core/types';

let mockLayoutEvents = 0;
jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  type ViewProps = {
    children?: React.ReactNode;
    onLayout?: (event: {
      nativeEvent: { layout: { x: number; y: number; width: number; height: number } };
    }) => void;
  };
  function View({ children, onLayout, ...props }: ViewProps) {
    const initialLayout = React.useRef(onLayout);
    // Native reports mounting/layout changes, not every content render.
    React.useEffect(() => {
      if (initialLayout.current) {
        mockLayoutEvents++;
        initialLayout.current({ nativeEvent: { layout: { x: 0, y: 0, width: 52, height: 184 } } });
      }
    }, []);
    return React.createElement('View', props, children);
  }
  return {
    View,
    Text: 'Text',
    ScrollView: 'ScrollView',
    StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
    AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
    BackHandler: { addEventListener: () => ({ remove: () => undefined }) },
  };
});
jest.mock('expo-router', () => {
  const router = { canGoBack: () => false, replace: jest.fn(), back: jest.fn() };
  return { useRouter: () => router, useLocalSearchParams: () => ({ mode: 'classic' }) };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (value: number) => {
    const { useRef } = jest.requireActual<typeof import('react')>('react');
    return useRef({ value }).current;
  },
  cancelAnimation: jest.fn(),
}));
jest.mock('../../components/Tube', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    TUBE_CONTAINER_TOP_GAP: 24,
    TubeComponent: ({ tube, onPress }: { tube: Tube; onPress: (id: number) => void }) =>
      React.createElement('View', {
        accessible: true,
        accessibilityRole: 'button',
        accessibilityLabel: `Tube ${tube.id}`,
        onPress: () => onPress(tube.id),
      }),
  };
});
jest.mock('../../components/PourAnimation', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    PourAnimation: ({ onComplete }: { onComplete: () => void }) =>
      React.createElement('View', {
        accessible: true,
        accessibilityRole: 'button',
        accessibilityLabel: 'Finish pouring',
        onPress: onComplete,
      }),
  };
});
jest.mock('../../components/ClearModal', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    ClearModal: ({ visible, onNextLevel }: { visible: boolean; onNextLevel: () => void }) =>
      visible
        ? React.createElement('View', {
            accessible: true,
            accessibilityRole: 'button',
            accessibilityLabel: 'Next level',
            onPress: onNextLevel,
          })
        : null,
  };
});
jest.mock('../../components/HUD', () => ({ HUD: () => null, GameToolbar: () => null }));
jest.mock('../../components/Background', () => ({ Background: () => null }));
jest.mock('../../components/BoardCelebration', () => ({ BoardCelebration: () => null }));
jest.mock('../../components/GameDialog', () => ({ GameDialog: () => null }));
jest.mock('../../components/StuckModal', () => ({ StuckModal: () => null }));
jest.mock('../../audio/SoundManager', () => ({
  SoundManager: {
    play: jest.fn(),
    playPour: jest.fn(),
    playBGM: jest.fn(),
    stopBGM: jest.fn(),
  },
}));
jest.mock('../../utils/haptics', () => ({
  Haptic: {
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    flow: () => jest.fn(),
  },
}));
jest.mock('../../ads/AdManager', () => ({
  AdManager: {
    showRewarded: jest.fn(),
    maybeShowInterstitial: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../../services/GameServicesManager', () => ({
  GameServicesManager: { submitBestScore: jest.fn() },
}));

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('clear then next level retains measured tube positions and animates the first new pour', async () => {
  jest.useFakeTimers();
  // Exercise a new level with the same eight colors and two empty tube slots.
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  const tubes: Tube[] = Array.from({ length: 10 }, (_, id) => ({
    id,
    capacity: 4,
    layers: id < 8 ? Array<number>(id === 0 ? 3 : 4).fill(id) : id === 8 ? [0] : [],
  }));
  useGameStore.setState({
    tubes,
    initialTubes: tubes,
    moves: [],
    selectedTube: null,
    cleared: false,
    boardRevision: 1,
    mode: 'classic',
    level: 1,
    optimalMoves: 1,
  });
  useUserStore.setState({ level: 1, coins: 100, totalCleared: 0 });
  mockLayoutEvents = 0;
  await render(React.createElement(GameScreen));
  await fireEvent.press(screen.getByRole('button', { name: 'Tube 8' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Tube 0' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Finish pouring' }));
  expect(useGameStore.getState().cleared).toBe(true);
  expect(useUserStore.getState().level).toBe(2);
  expect(useUserStore.getState().totalCleared).toBe(1);
  await act(() => {
    jest.advanceTimersByTime(CLEAR_BOARD_CELEBRATION_MS);
  });
  const measured = mockLayoutEvents;
  await fireEvent.press(screen.getByRole('button', { name: 'Next level' }));
  expect(useGameStore.getState().level).toBe(2);
  expect(mockLayoutEvents).toBe(measured);
  const board = useGameStore.getState().tubes;
  const from = board.find((source) =>
    board.some((target) => source.id !== target.id && canPour(source, target)),
  )!;
  const to = board.find((target) => target.id !== from.id && canPour(from, target))!;
  await fireEvent.press(screen.getByRole('button', { name: `Tube ${from.id}` }));
  await fireEvent.press(screen.getByRole('button', { name: `Tube ${to.id}` }));
  expect(useGameStore.getState().moves).toHaveLength(0);
  await fireEvent.press(screen.getByRole('button', { name: 'Finish pouring' }));
  expect(useGameStore.getState().moves).toHaveLength(1);
  expect(useUserStore.getState().totalCleared).toBe(1);
});
