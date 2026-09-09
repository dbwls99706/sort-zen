import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ASMRSensoryScreen from '../../../app/game/slime';
import { SoundManager } from '../../audio/SoundManager';
import { useSettingsStore } from '../../store/settingsStore';

let mockFocused = true;
let mockAppStateChange: (state: string) => void;
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: (props: Record<string, unknown>) =>
      React.createElement('View', { accessible: true, ...props }),
    StyleSheet: { create: (styles: unknown) => styles, flatten: (styles: unknown) => styles },
    useWindowDimensions: () => ({ width: 320, height: 568, fontScale: 1 }),
    AppState: {
      currentState: 'active',
      addEventListener: (_event: string, listener: typeof mockAppStateChange) => {
        mockAppStateChange = listener;
        return { remove: jest.fn() };
      },
    },
  };
});
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const focused = mockFocused;
    React.useEffect(() => (focused ? callback() : undefined), [callback, focused]);
  },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));
jest.mock('../../components/asmr/SoftBodyBlob', () => ({
  SoftBodyBlob: (props: Record<string, unknown>) =>
    jest
      .requireActual<typeof import('react')>('react')
      .createElement('View', { testID: 'blob', ...props }),
}));
jest.mock('../../components/asmr/MaterialEffects', () => ({
  MaterialEffects: (props: Record<string, unknown>) =>
    jest
      .requireActual<typeof import('react')>('react')
      .createElement('View', { testID: 'effects', ...props }),
}));
jest.mock('../../components/asmr/AsmrParticles', () => ({ AsmrParticles: () => null }));
jest.mock('../../audio/SoundManager', () => ({
  SoundManager: {
    play: jest.fn(),
    playBGM: jest.fn(),
    stopBGM: jest.fn(),
    preloadAsmr: jest.fn(),
    stopAsmr: jest.fn(),
    setBgmDucked: jest.fn(),
    startLoop: jest.fn(),
    stopLoop: jest.fn(),
    playImpact: jest.fn(),
    setLoopVolume: jest.fn(),
  },
}));
jest.mock('../../utils/haptics', () => ({
  Haptic: { light: jest.fn(), medium: jest.fn(), heavy: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockFocused = true;
  useSettingsStore.setState({ language: 'ko' });
});

test('changing materials and visiting settings ends touch audio, preserves selection and guards repeated navigation', async () => {
  const { rerender } = await render(React.createElement(ASMRSensoryScreen));
  expect(SoundManager.preloadAsmr).toHaveBeenLastCalledWith('slime');
  expect(screen.getByTestId('effects').props.active).toBe(false);
  await fireEvent(screen.getByTestId('blob'), 'squeezeStart', 120, 120);
  expect(SoundManager.startLoop).toHaveBeenLastCalledWith('slime', 0.46);
  expect(screen.getByTestId('effects').props.active).toBe(true);
  const oldBlob = screen.getByTestId('blob').props;

  await fireEvent.press(screen.getByRole('button', { name: '쉐이빙 크림' }));
  expect(SoundManager.stopAsmr).toHaveBeenCalled();
  expect(screen.getByTestId('blob').props.resetKey).toBe('shaving_cream');
  expect(screen.getByTestId('effects').props.active).toBe(false);
  await fireEvent(screen.getByTestId('blob'), 'squeezeStart', 120, 120);
  expect(SoundManager.startLoop).toHaveBeenLastCalledWith('shaving', 0.46);
  // Old native gesture callbacks can arrive after the new material is mounted.
  await act(() => {
    oldBlob.onSqueezeStart(120, 120);
    oldBlob.onSqueezeMove(140, 140, 20);
    oldBlob.onRelease();
  });
  expect(SoundManager.startLoop).toHaveBeenCalledTimes(2);
  expect(SoundManager.setLoopVolume).not.toHaveBeenCalled();
  expect(SoundManager.stopLoop).not.toHaveBeenCalled();
  expect(screen.getByTestId('effects').props.active).toBe(true);

  await fireEvent.press(screen.getByRole('button', { name: '설정' }));
  await fireEvent.press(screen.getByRole('button', { name: '설정' }));
  expect(mockRouter.push).toHaveBeenCalledTimes(1);
  expect(mockRouter.push).toHaveBeenCalledWith('/settings');
  expect(screen.getByTestId('blob').props.enabled).toBe(false);
  expect(SoundManager.stopBGM).toHaveBeenCalled();
  const loops = jest.mocked(SoundManager.startLoop).mock.calls.length;
  await fireEvent(screen.getByTestId('blob'), 'squeezeStart', 120, 120);
  await fireEvent.press(screen.getByRole('button', { name: '찰랑찰랑 물' }));
  expect(SoundManager.startLoop).toHaveBeenCalledTimes(loops);
  expect(screen.getByTestId('blob').props.resetKey).toBe('shaving_cream');

  mockFocused = false;
  await rerender(React.createElement(ASMRSensoryScreen));
  mockFocused = true;
  await rerender(React.createElement(ASMRSensoryScreen));
  expect(screen.getByTestId('blob').props.enabled).toBe(true);
  expect(screen.getByTestId('blob').props.resetKey).toBe('shaving_cream');
  await fireEvent(screen.getByTestId('blob'), 'squeezeStart', 120, 120);
  expect(SoundManager.startLoop).toHaveBeenCalledTimes(loops + 1);
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

test('backgrounding cancels audio and ignores late gesture events until a fresh touch on return', async () => {
  await render(React.createElement(ASMRSensoryScreen));
  await fireEvent(screen.getByTestId('blob'), 'squeezeStart', 120, 120);
  await act(() => mockAppStateChange('background'));
  expect(screen.getByTestId('blob').props.enabled).toBe(false);
  expect(screen.getByTestId('effects').props.active).toBe(false);
  expect(SoundManager.stopAsmr).toHaveBeenCalled();
  expect(SoundManager.stopBGM).toHaveBeenCalled();
  const impacts = jest.mocked(SoundManager.playImpact).mock.calls.length;
  await fireEvent(screen.getByTestId('blob'), 'squeezeMove', 140, 140, 20);
  await fireEvent(screen.getByTestId('blob'), 'release');
  expect(SoundManager.playImpact).toHaveBeenCalledTimes(impacts);
  await act(() => mockAppStateChange('active'));
  expect(screen.getByTestId('blob').props.enabled).toBe(true);
  await fireEvent(screen.getByTestId('blob'), 'squeezeMove', 160, 160, 20);
  expect(SoundManager.setLoopVolume).not.toHaveBeenCalled();
  await fireEvent(screen.getByTestId('blob'), 'squeezeStart', 120, 120);
  expect(SoundManager.startLoop).toHaveBeenCalledTimes(2);
});
