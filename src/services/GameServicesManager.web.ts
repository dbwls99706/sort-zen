/**
 * 웹/비안드로이드용 no-op 스텁. Play Games Services는 안드로이드 전용이므로
 * 웹 번들에서는 네이티브 모듈을 import하지 않도록 이 파일이 대체된다.
 * 네이티브 GameServicesManager와 동일한 표면을 유지한다.
 */
export const GameServicesManager = {
  isAvailable(): boolean {
    return false;
  },
  async init(): Promise<void> {},
  async signIn(): Promise<boolean> {
    return false;
  },
  signOut(): void {},
  async submitBestScore(): Promise<void> {},
  async showLeaderboard(): Promise<void> {},
};
