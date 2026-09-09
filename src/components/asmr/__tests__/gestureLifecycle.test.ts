import React from 'react';
import { act, render } from '@testing-library/react-native';
import { SoftBodyBlob } from '../SoftBodyBlob';

type TouchEvent = { allTouches: { id: number; x: number; y: number }[]; numberOfTouches: number };
type Manager = { activate: () => void; end: () => void };
let mockDown: (event: TouchEvent, manager: Manager) => void;
let mockFinalize: () => void;
jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { flatten: (value: unknown) => value },
}));
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (value: unknown) =>
    jest.requireActual<typeof React>('react').useRef({ value }).current,
  useDerivedValue: () => ({ value: null }),
  useFrameCallback: () =>
    jest.requireActual<typeof React>('react').useRef({ setActive: jest.fn() }).current,
  runOnJS: (callback: unknown) => callback,
}));
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'View',
  Path: 'View',
  RadialGradient: 'View',
  Circle: 'View',
  Group: 'View',
  Skia: { Path: { Make: () => ({}) } },
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: 'View',
  Gesture: {
    Manual: () => ({
      enabled() {
        return this;
      },
      onTouchesDown(callback: typeof mockDown) {
        mockDown = callback;
        return this;
      },
      onTouchesMove() {
        return this;
      },
      onTouchesUp() {
        return this;
      },
      onTouchesCancelled() {
        return this;
      },
      onFinalize(callback: typeof mockFinalize) {
        mockFinalize = callback;
        return this;
      },
    }),
  },
}));

const touch = { allTouches: [{ id: 1, x: 120, y: 120 }], numberOfTouches: 1 };
const manager = { activate: jest.fn(), end: jest.fn() };

test.each(['resize', 'disable', 'unmount'] as const)(
  '%s releases an active ASMR touch exactly once',
  async (change) => {
    const props = {
      size: 240,
      outerColor: '#00AA00',
      innerColor: '#BBFFBB',
      physics: { pressure: 0.3, tension: 0.08, friction: 0.86 },
      shape: { scale: 1, lobes: 0, lobeAmp: 0, aspectX: 1, aspectY: 1 },
      resetKey: 'slime',
      enabled: true,
      onSqueezeStart: jest.fn(),
      onSqueezeMove: jest.fn(),
      onRelease: jest.fn(),
    };
    const { rerender, unmount } = await render(React.createElement(SoftBodyBlob, props));
    await act(() => mockDown(touch, manager));
    expect(props.onSqueezeStart).toHaveBeenCalledTimes(1);
    if (change === 'unmount') await unmount();
    else
      await rerender(
        React.createElement(SoftBodyBlob, {
          ...props,
          size: change === 'resize' ? 300 : 240,
          enabled: change !== 'disable',
        }),
      );
    expect(props.onRelease).toHaveBeenCalledTimes(1);
    await act(() => mockFinalize());
    expect(props.onRelease).toHaveBeenCalledTimes(1);
    if (change === 'resize') {
      await act(() => mockDown(touch, manager));
      await act(() => mockFinalize());
      expect(props.onSqueezeStart).toHaveBeenCalledTimes(2);
      expect(props.onRelease).toHaveBeenCalledTimes(2);
    }
  },
);
