/**
 * 웹/비안드로이드용 no-op 스텁. Play 인앱 업데이트는 안드로이드 전용이므로
 * 웹 번들에서는 네이티브 모듈을 import하지 않도록 이 파일이 대체된다.
 * 네이티브 UpdateManager와 동일한 표면을 유지한다.
 */
export const UpdateManager = {
  isAvailable(): boolean {
    return false;
  },
  async checkOnLaunch(): Promise<void> {},
};
