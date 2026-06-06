export const FIRST_RUN_GRACE_MS = 5 * 60 * 1000;
export const INTERSTITIAL_COOLDOWN_MS = 60 * 1000;
export const INTERSTITIAL_LEVEL_INTERVAL = 3;

export type AdPolicyInput = {
  mode: 'classic' | 'zen';
  isPremium: boolean;
  appStartedAt: number;
  now: number;
  clearCount: number;
  lastInterstitialAt: number;
};

export function shouldShowInterstitial(input: AdPolicyInput): boolean {
  if (input.mode === 'zen') return false;
  if (input.isPremium) return false;
  if (input.now - input.appStartedAt < FIRST_RUN_GRACE_MS) return false;
  if (input.clearCount % INTERSTITIAL_LEVEL_INTERVAL !== 0) return false;
  if (input.clearCount === 0) return false;
  if (input.now - input.lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS)
    return false;
  return true;
}
