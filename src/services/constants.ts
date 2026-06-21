import { Platform } from 'react-native';

/**
 * Play Games Services 식별자.
 *
 * LEADERBOARD_ID_HIGHEST_LEVEL은 Play Console → Play Games Services →
 * 리더보드에서 만든 "최고 도달 단계" 리더보드의 ID(`CgkI...` 형식)로 교체한다.
 * 설정 절차는 docs/06-game-services.md 참조.
 *
 * placeholder 상태(미설정)에서는 점수 제출/리더보드 열기가 안전하게 no-op이 된다.
 */
export const LEADERBOARD_ID_HIGHEST_LEVEL = 'CgkItYmFzfUeEAIQAQ';

/** 리더보드 ID가 실제 값으로 교체되었는지 */
export const isLeaderboardConfigured = (): boolean =>
  !LEADERBOARD_ID_HIGHEST_LEVEL.startsWith('PLACEHOLDER');

/** Play Games Services는 안드로이드 전용 */
export const isGameServicesPlatform = (): boolean => Platform.OS === 'android';
