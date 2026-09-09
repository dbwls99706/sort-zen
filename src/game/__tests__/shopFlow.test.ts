import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ShopScreen from '../../../app/shop';
import { AdManager } from '../../ads/AdManager';
import { SubscriptionManager } from '../../iap/SubscriptionManager';
import { useUserStore } from '../../store/userStore';
import { useSettingsStore } from '../../store/settingsStore';
import { REWARDED_COIN_AMOUNT } from '../../core/constants';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    View: 'View',
    Text: 'Text',
    Pressable: (props: Record<string, unknown>) =>
      React.createElement('View', { accessible: true, ...props }),
    StyleSheet: { create: (styles: unknown) => styles, flatten: (styles: unknown) => styles },
    Alert: { alert: jest.fn() },
  };
});
jest.mock('expo-router', () => ({
  useRouter: () => ({ canGoBack: () => true, back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    jest.requireActual<typeof import('react')>('react').useEffect(callback, [callback]);
  },
}));
jest.mock('../../components/ScreenLayout', () => ({
  ScreenLayout: ({ children }: { children: React.ReactNode }) =>
    jest.requireActual<typeof import('react')>('react').createElement('View', {}, children),
}));
jest.mock('../../audio/SoundManager', () => ({ SoundManager: { play: jest.fn() } }));
jest.mock('../../utils/haptics', () => ({ Haptic: { light: jest.fn(), success: jest.fn() } }));
jest.mock('../../ads/AdManager', () => ({ AdManager: { showRewarded: jest.fn() } }));
jest.mock('../../iap/SubscriptionManager', () => ({
  SubscriptionManager: {
    getOfferings: jest.fn().mockResolvedValue({
      monthlyPrice: '₩2,500',
      yearlyPrice: '₩19,900',
      lifetimePrice: '₩9,900',
    }),
    buyLifetime: jest.fn(),
    buySubscription: jest.fn(),
    restorePurchases: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  useUserStore.setState({ coins: 100, isPremium: false });
  useSettingsStore.setState({ language: 'ko' });
});

test('rapid and cross-product taps issue one shop action and award once after the ad closes', async () => {
  let reward!: () => void;
  let close!: (earned: boolean) => void;
  jest.mocked(AdManager.showRewarded).mockImplementation((callback) => {
    reward = callback;
    return new Promise((resolve) => {
      close = resolve;
    });
  });
  await render(React.createElement(ShopScreen));
  const buttons = screen.getAllByRole('button');
  let first!: Promise<void>;
  await act(() => {
    first = buttons[0].props.onPress();
    buttons[0].props.onPress();
    buttons[1].props.onPress();
    buttons[4].props.onPress();
  });
  expect(AdManager.showRewarded).toHaveBeenCalledTimes(1);
  expect(SubscriptionManager.buyLifetime).not.toHaveBeenCalled();
  expect(SubscriptionManager.restorePurchases).not.toHaveBeenCalled();
  expect(screen.getAllByRole('button').every((button) => button.props.disabled)).toBe(true);
  expect(screen.getByText('처리 중…')).toBeTruthy();
  await act(async () => {
    reward();
    close(true);
    await first;
  });
  expect(useUserStore.getState().coins).toBe(100 + REWARDED_COIN_AMOUNT);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole('button').every((button) => !button.props.disabled)).toBe(true);
});

test('a failed shop action releases controls for a successful retry', async () => {
  jest
    .mocked(SubscriptionManager.buyLifetime)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce();
  await render(React.createElement(ShopScreen));
  const buy = () => screen.getAllByRole('button')[1];
  await act(async () => {
    await buy().props.onPress();
  });
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(buy().props.disabled).toBe(false);
  await act(async () => {
    await buy().props.onPress();
  });
  expect(SubscriptionManager.buyLifetime).toHaveBeenCalledTimes(2);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
});

test('a reward earned while leaving the shop is retained without an alert on the next screen', async () => {
  let reward!: () => void;
  let close!: (earned: boolean) => void;
  jest.mocked(AdManager.showRewarded).mockImplementation((callback) => {
    reward = callback;
    return new Promise((resolve) => {
      close = resolve;
    });
  });
  const { unmount } = await render(React.createElement(ShopScreen));
  let request!: Promise<void>;
  await act(() => {
    request = screen.getAllByRole('button')[0].props.onPress();
  });
  await unmount();
  await act(async () => {
    reward();
    close(true);
    await request;
  });
  expect(useUserStore.getState().coins).toBe(100 + REWARDED_COIN_AMOUNT);
  expect(Alert.alert).not.toHaveBeenCalled();
});
