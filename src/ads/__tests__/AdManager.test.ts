type MockAd = ReturnType<typeof mockMakeAd>;
const mockRewarded: MockAd[] = [];
const mockInterstitial: MockAd[] = [];
const mockUser = { isPremium: false };

function mockMakeAd() {
  const listeners = new Map<string, Set<() => void>>();
  const ad = {
    loaded: true,
    load: jest.fn(() => {
      ad.loaded = true;
    }),
    show: jest.fn<Promise<void>, []>(() => Promise.resolve()),
    addAdEventListener: jest.fn((event: string, callback: () => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(callback);
      return () => {
        listeners.get(event)?.delete(callback);
      };
    }),
    emit: (event: string) => {
      if (event === 'closed' || event === 'error') ad.loaded = false;
      for (const callback of [...(listeners.get(event) ?? [])]) callback();
    },
    listenerCount: (event?: string) =>
      event
        ? (listeners.get(event)?.size ?? 0)
        : [...listeners.values()].reduce((count, group) => count + group.size, 0),
  };
  return ad;
}

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({ initialize: jest.fn().mockResolvedValue(undefined) }),
  AdsConsent: {
    requestInfoUpdate: jest.fn().mockResolvedValue({ isConsentFormAvailable: false }),
    showForm: jest.fn().mockResolvedValue(undefined),
  },
  RewardedAd: {
    createForAdRequest: jest.fn(() => {
      const ad = mockMakeAd();
      mockRewarded.push(ad);
      return ad;
    }),
  },
  InterstitialAd: {
    createForAdRequest: jest.fn(() => {
      const ad = mockMakeAd();
      mockInterstitial.push(ad);
      return ad;
    }),
  },
  RewardedAdEventType: { EARNED_REWARD: 'earned' },
  AdEventType: { OPENED: 'opened', CLOSED: 'closed', ERROR: 'error' },
}));
jest.mock('../constants', () => ({
  AD_UNITS: { interstitial: 'interstitial', rewarded: 'rewarded' },
}));
jest.mock('../../store/userStore', () => ({ useUserStore: { getState: () => mockUser } }));

let manager: typeof import('../AdManager').AdManager;

beforeEach(async () => {
  jest.useFakeTimers();
  jest.resetModules();
  mockRewarded.length = 0;
  mockInterstitial.length = 0;
  mockUser.isPremium = false;
  manager = (await import('../AdManager')).AdManager;
  await Promise.all([manager.init(), manager.init()]);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('concurrent initialization and repeated closes reuse one ad without growing listeners', async () => {
  expect(mockRewarded).toHaveLength(1);
  expect(mockInterstitial).toHaveLength(1);
  const ad = mockRewarded[0];
  const reward = jest.fn();
  for (let cycle = 0; cycle < 4; cycle++) {
    const result = manager.showRewarded(reward);
    ad.emit('opened');
    ad.emit('earned');
    ad.emit('earned');
    ad.emit('closed');
    await expect(result).resolves.toBe(true);
    expect(ad.listenerCount('earned')).toBe(0);
    expect(ad.listenerCount()).toBe(3);
  }
  expect(reward).toHaveBeenCalledTimes(4);
  expect(ad.load).toHaveBeenCalledTimes(5);
  expect(mockRewarded).toHaveLength(1);
  expect(jest.getTimerCount()).toBe(0);
});

test("overlapping callers do not launch twice or receive each other's reward", async () => {
  const firstReward = jest.fn();
  const duplicateReward = jest.fn();
  const result = manager.showRewarded(firstReward);
  await expect(manager.showRewarded(duplicateReward)).resolves.toBe(false);
  expect(mockRewarded[0].show).toHaveBeenCalledTimes(1);
  mockRewarded[0].emit('earned');
  mockRewarded[0].emit('closed');
  await expect(result).resolves.toBe(true);
  expect(firstReward).toHaveBeenCalledTimes(1);
  expect(duplicateReward).not.toHaveBeenCalled();
});

test.each(['rejection', 'throw'])(
  'show %s settles false and removes all old callbacks',
  async (failure) => {
    const ad = mockRewarded[0];
    if (failure === 'rejection') ad.show.mockRejectedValueOnce(new Error('show failed'));
    else
      ad.show.mockImplementationOnce(() => {
        throw new Error('show failed');
      });
    const reward = jest.fn();
    await expect(manager.showRewarded(reward)).resolves.toBe(false);
    expect(ad.listenerCount()).toBe(0);
    ad.emit('earned');
    ad.emit('closed');
    expect(reward).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(30_000);
    expect(mockRewarded).toHaveLength(2);
    const retry = manager.showRewarded(reward);
    mockRewarded[1].emit('earned');
    mockRewarded[1].emit('closed');
    await expect(retry).resolves.toBe(true);
  },
);

test('ERROR without CLOSED releases the waiting control and schedules only one reload', async () => {
  const ad = mockRewarded[0];
  const reward = jest.fn();
  const result = manager.showRewarded(reward);
  ad.emit('opened');
  ad.emit('error');
  ad.emit('error');
  await expect(result).resolves.toBe(false);
  expect(ad.listenerCount('earned')).toBe(0);
  expect(jest.getTimerCount()).toBe(1);
  jest.advanceTimersByTime(30_000);
  expect(mockRewarded).toHaveLength(1);
  expect(ad.load).toHaveBeenCalledTimes(2);
  expect(ad.listenerCount()).toBe(3);
  const retry = manager.showRewarded(reward);
  ad.emit('closed');
  await expect(retry).resolves.toBe(false);
});

test('a silent native show cannot keep game controls waiting indefinitely', async () => {
  const ad = mockRewarded[0];
  ad.show.mockReturnValueOnce(new Promise(() => {}));
  const reward = jest.fn();
  const result = manager.showRewarded(reward);
  jest.advanceTimersByTime(15_000);
  await expect(result).resolves.toBe(false);
  expect(ad.listenerCount()).toBe(0);
  ad.emit('earned');
  expect(reward).not.toHaveBeenCalled();
});

test('OPENED extends the deadline; missing CLOSED preserves an already earned reward', async () => {
  const ad = mockRewarded[0];
  const reward = jest.fn();
  const result = manager.showRewarded(reward);
  let resolved = false;
  void result.then(() => {
    resolved = true;
  });
  ad.emit('opened');
  jest.advanceTimersByTime(16_000);
  await Promise.resolve();
  expect(resolved).toBe(false);
  ad.emit('earned');
  jest.advanceTimersByTime(164_000);
  await expect(result).resolves.toBe(true);
  expect(reward).toHaveBeenCalledTimes(1);
  expect(ad.listenerCount()).toBe(0);
});

test('a late rejected show from a closed session cannot cancel its successor', async () => {
  const ad = mockRewarded[0];
  let rejectOld!: (error: Error) => void;
  ad.show.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      rejectOld = reject;
    }),
  );
  const oldResult = manager.showRewarded(jest.fn());
  ad.emit('closed');
  await expect(oldResult).resolves.toBe(false);
  const reward = jest.fn();
  const newResult = manager.showRewarded(reward);
  rejectOld(new Error('late native rejection'));
  await Promise.resolve();
  expect(ad.listenerCount('earned')).toBe(1);
  ad.emit('earned');
  ad.emit('closed');
  await expect(newResult).resolves.toBe(true);
  expect(reward).toHaveBeenCalledTimes(1);
});

test('a presented interstitial excludes rewarded launches until it closes', async () => {
  jest.advanceTimersByTime(6 * 60_000);
  for (let clear = 0; clear < 3; clear++) await manager.maybeShowInterstitial('classic');
  const interstitial = mockInterstitial[0];
  expect(interstitial.show).toHaveBeenCalledTimes(1);
  interstitial.emit('opened');
  await expect(manager.showRewarded(jest.fn())).resolves.toBe(false);
  expect(mockRewarded[0].show).not.toHaveBeenCalled();
  interstitial.emit('closed');
  const result = manager.showRewarded(jest.fn());
  mockRewarded[0].emit('closed');
  await expect(result).resolves.toBe(false);
});

test('premium, ZEN and first-run protection remain enforced', async () => {
  for (let clear = 0; clear < 6; clear++) await manager.maybeShowInterstitial('classic');
  jest.advanceTimersByTime(6 * 60_000);
  for (let clear = 0; clear < 6; clear++) await manager.maybeShowInterstitial('zen');
  mockUser.isPremium = true;
  for (let clear = 0; clear < 6; clear++) await manager.maybeShowInterstitial('classic');
  expect(mockInterstitial[0].show).not.toHaveBeenCalled();
  const result = manager.showRewarded(jest.fn());
  mockRewarded[0].emit('earned');
  mockRewarded[0].emit('closed');
  await expect(result).resolves.toBe(true);
});
