/**
 * `react-native-google-leaderboards-and-achievements`(안드로이드 전용,
 * Google Play Games v2 SDK 바인딩)의 최소 타입 선언.
 *
 * 라이브러리가 자체 타입을 충분히 제공하지 않으므로, strict 모드에서
 * GameServicesManager가 사용하는 표면(login/checkAuth/submitScore/showLeaderboard)
 * 만 앰비언트로 선언한다. 실제 런타임 반환 형태는 버전에 따라 다를 수 있어
 * 모든 필드를 optional로 두고 GameServicesManager가 방어적으로 파싱한다.
 */
declare module 'react-native-google-leaderboards-and-achievements' {
  export type GamesSignInResult = {
    isAuthenticated?: boolean;
    success?: boolean;
    player?: { displayName?: string; name?: string } | null;
    displayName?: string;
  };

  export function login(): Promise<GamesSignInResult>;
  export function checkAuth(): Promise<GamesSignInResult>;
  export function submitScore(
    leaderboardId: string,
    score: number,
  ): Promise<void>;
  export function showLeaderboard(leaderboardId: string): Promise<void>;
}
