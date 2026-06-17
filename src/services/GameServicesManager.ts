import type { GamesSignInResult } from 'react-native-google-leaderboards-and-achievements';
import { useUserStore } from '../store/userStore';
import { levelToScore } from '../core/leaderboard';
import {
  LEADERBOARD_ID_HIGHEST_LEVEL,
  isGameServicesPlatform,
  isLeaderboardConfigured,
} from './constants';

/**
 * Google Play Games Services 게이트웨이.
 *
 * 컴포넌트는 SDK를 직접 호출하지 않고 반드시 이 매니저를 거친다(CLAUDE.md 정책).
 * 안드로이드 전용이며, 그 외 플랫폼·미설정·예외 상황에서는 전부 안전한 no-op.
 * 로그인은 선택적 — 게스트는 로컬 진척으로 계속 플레이하고, 로그인 시에만
 * 최고 도달 단계를 리더보드에 기록한다.
 *
 * 주의: 네이티브 라이브러리는 import되는 순간 TurboModule이 생성되며 그 init에서
 * PlayGamesSdk.initialize()가 실행돼 자동 로그인을 시도한다. 이는 "게스트 기본"
 * 정책을 깨고 앱 시작 시 로그인 화면이 앞을 가로막는다. 따라서 정적 import 대신
 * 실제로 호출이 필요한 순간에만 동적 import하며, 리더보드가 실제로 설정되기
 * 전(placeholder)에는 라이브러리를 아예 로드하지 않는다.
 */
async function loadPlayGames() {
  return import('react-native-google-leaderboards-and-achievements');
}

class GameServicesManagerClass {
  /**
   * 게임 서비스를 쓸 수 있는지 (UI 노출·동작 판단용).
   * 안드로이드이면서 리더보드 ID가 실제 값으로 설정된 경우에만 true.
   * placeholder 상태에서는 네이티브 모듈을 절대 건드리지 않는다.
   */
  isAvailable(): boolean {
    return isGameServicesPlatform() && isLeaderboardConfigured();
  }

  /** 앱 시작 시 이전 세션의 로그인 상태를 복원한다. */
  async init(): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const PlayGames = await loadPlayGames();
      const res = await PlayGames.checkAuth();
      this.applyAuth(res);
    } catch (e) {
      console.warn('[GameServices] checkAuth failed', e);
    }
  }

  /** 사용자가 명시적으로 'Google로 로그인'을 눌렀을 때. 성공 여부를 반환. */
  async signIn(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const PlayGames = await loadPlayGames();
      const res = await PlayGames.login();
      const ok = this.applyAuth(res);
      if (ok) await this.submitBestScore();
      return ok;
    } catch (e) {
      console.warn('[GameServices] login failed', e);
      return false;
    }
  }

  /** 로컬 인증 상태 해제 (Play Games는 별도 로그아웃 API를 노출하지 않음). */
  signOut(): void {
    useUserStore.getState().setGoogleAuth(false, null);
  }

  /** 현재 최고 도달 단계를 리더보드에 제출 (로그인+설정 완료 시에만). */
  async submitBestScore(): Promise<void> {
    if (!this.canSubmit()) return;
    try {
      const PlayGames = await loadPlayGames();
      await PlayGames.submitScore(
        LEADERBOARD_ID_HIGHEST_LEVEL,
        levelToScore(useUserStore.getState().level),
      );
    } catch (e) {
      console.warn('[GameServices] submitScore failed', e);
    }
  }

  /** 네이티브 리더보드 UI 열기. */
  async showLeaderboard(): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const PlayGames = await loadPlayGames();
      await PlayGames.showLeaderboard(LEADERBOARD_ID_HIGHEST_LEVEL);
    } catch (e) {
      console.warn('[GameServices] showLeaderboard failed', e);
    }
  }

  private canSubmit(): boolean {
    return this.isAvailable() && useUserStore.getState().googleSignedIn;
  }

  /** 다양한 SDK 반환 형태를 방어적으로 파싱해 userStore에 반영. 로그인 여부 반환. */
  private applyAuth(res: GamesSignInResult): boolean {
    const signedIn =
      res?.isAuthenticated ?? res?.success ?? Boolean(res?.player);
    const name =
      res?.player?.displayName ??
      res?.player?.name ??
      res?.displayName ??
      null;
    useUserStore.getState().setGoogleAuth(Boolean(signedIn), name);
    return Boolean(signedIn);
  }
}

export const GameServicesManager = new GameServicesManagerClass();
