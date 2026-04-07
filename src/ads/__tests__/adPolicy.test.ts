import { shouldShowInterstitial, AdPolicyInput } from '../adPolicy';

const BASE_TIME = 1_000_000;
const AFTER_GRACE = BASE_TIME + 6 * 60 * 1000;

function makeInput(overrides: Partial<AdPolicyInput> = {}): AdPolicyInput {
  return {
    mode: 'classic',
    isPremium: false,
    appStartedAt: BASE_TIME,
    now: AFTER_GRACE,
    clearCount: 3,
    lastInterstitialAt: 0,
    ...overrides,
  };
}

describe('광고 정책', () => {
  test('ZEN 모드에서는 전면 광고 차단', () => {
    expect(shouldShowInterstitial(makeInput({ mode: 'zen' }))).toBe(false);
  });

  test('구독자는 전면 광고 차단', () => {
    expect(shouldShowInterstitial(makeInput({ isPremium: true }))).toBe(false);
  });

  test('첫 5분간 전면 광고 차단', () => {
    const input = makeInput({ now: BASE_TIME + 3 * 60 * 1000 });
    expect(shouldShowInterstitial(input)).toBe(false);
  });

  test('5분 후 3레벨마다 전면 광고 허용', () => {
    expect(shouldShowInterstitial(makeInput())).toBe(true);
  });

  test('3의 배수가 아닌 클리어 수에서는 차단', () => {
    expect(shouldShowInterstitial(makeInput({ clearCount: 2 }))).toBe(false);
    expect(shouldShowInterstitial(makeInput({ clearCount: 4 }))).toBe(false);
    expect(shouldShowInterstitial(makeInput({ clearCount: 5 }))).toBe(false);
  });

  test('60초 쿨다운 내에는 차단', () => {
    const input = makeInput({
      lastInterstitialAt: AFTER_GRACE - 30_000,
      now: AFTER_GRACE,
    });
    expect(shouldShowInterstitial(input)).toBe(false);
  });

  test('60초 쿨다운 후에는 허용', () => {
    const input = makeInput({
      lastInterstitialAt: AFTER_GRACE - 61_000,
      now: AFTER_GRACE,
      clearCount: 6,
    });
    expect(shouldShowInterstitial(input)).toBe(true);
  });

  test('clearCount 0이면 차단', () => {
    expect(shouldShowInterstitial(makeInput({ clearCount: 0 }))).toBe(false);
  });

  test('구독자는 ZEN 모드에서도 차단 (이중 보호)', () => {
    const input = makeInput({ mode: 'zen', isPremium: true });
    expect(shouldShowInterstitial(input)).toBe(false);
  });

  test('6레벨 클리어도 허용 (3의 배수)', () => {
    expect(shouldShowInterstitial(makeInput({ clearCount: 6 }))).toBe(true);
  });
});
