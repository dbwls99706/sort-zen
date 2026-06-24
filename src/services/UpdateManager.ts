import { Platform } from 'react-native';

/**
 * Google Play 인앱 업데이트 게이트웨이.
 *
 * 컴포넌트/화면은 SDK를 직접 호출하지 않고 반드시 이 매니저를 거친다(CLAUDE.md 정책).
 * 안드로이드 전용 — 그 외 플랫폼·예외 상황에서는 전부 안전한 no-op.
 *
 * 앱 시작 시 1회만 호출한다. 버전 소스를 직접 운영하지 않고 Play를 진실
 * 공급원으로 삼는다: 설치 버전이 스토어 최신보다 낮으면 Play가 자체 UI를
 * 띄우고(나중에/업데이트), Play Console에 설정한 업데이트 우선순위에 따라
 * 즉시(전체화면)·유연(백그라운드) 플로우를 자동으로 선택한다.
 *
 * 네이티브 모듈은 import되는 순간 로드되므로 웹 번들에 들어가지 않도록 동적
 * import한다(웹은 `.web.ts` 스텁이 대체).
 */
async function loadInAppUpdates() {
  return import('expo-in-app-updates');
}

class UpdateManagerClass {
  private checked = false;

  /** 인앱 업데이트를 쓸 수 있는 플랫폼인지 (안드로이드 전용). */
  isAvailable(): boolean {
    return Platform.OS === 'android';
  }

  /**
   * 앱 시작 시 1회: 업데이트가 있으면 Play 업데이트 플로우를 띄운다.
   * 세션당 한 번만 실제로 동작하며, 실패는 조용히 무시(플레이를 막지 않는다).
   */
  async checkOnLaunch(): Promise<void> {
    if (!this.isAvailable() || this.checked) return;
    this.checked = true;
    try {
      const InAppUpdates = await loadInAppUpdates();
      // 인자 없음 → Play 우선순위에 따라 즉시/유연 자동 선택.
      await InAppUpdates.checkAndStartUpdate();
    } catch (e) {
      console.warn('[Update] check failed', e);
    }
  }
}

export const UpdateManager = new UpdateManagerClass();
