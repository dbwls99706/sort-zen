import { useProgressStore } from '../progressStore';
import { useUserStore } from '../userStore';
import { toDateKey } from '../../core/dailyChallenge';

const DAY = new Date(2026, 5, 6); // 2026-06-06
const KEY = toDateKey(DAY);

function resetStores() {
  useUserStore.setState({
    coins: 100,
    level: 1,
    isPremium: false,
    premiumType: 'none',
    totalPlayTime: 0,
    totalCleared: 0,
  });
  useProgressStore.setState({
    totalPours: 0,
    zenCleared: 0,
    dailyStreak: 0,
    lastDailyCompletedDate: null,
    unlocked: [],
    recentUnlocks: [],
    daily: null,
  });
}

/** 특정 타입의 데일리 과제를 강제로 세팅한다. */
function setDaily(partial: Partial<NonNullable<ReturnType<typeof useProgressStore.getState>['daily']>>) {
  useProgressStore.setState({
    daily: {
      date: KEY,
      type: 'clearLevels',
      goal: 3,
      reward: 60,
      movesLimit: 0,
      progress: 0,
      completed: false,
      claimed: false,
      ...partial,
    },
  });
}

describe('progressStore', () => {
  beforeEach(resetStores);

  test('recordPour는 totalPours를 누적한다', () => {
    useProgressStore.getState().recordPour(DAY);
    useProgressStore.getState().recordPour(DAY);
    expect(useProgressStore.getState().totalPours).toBe(2);
  });

  test('recordClear(zen)는 zenCleared를 누적한다', () => {
    useProgressStore.getState().recordClear({ mode: 'zen', moveCount: 10 }, DAY);
    expect(useProgressStore.getState().zenCleared).toBe(1);
    useProgressStore.getState().recordClear({ mode: 'classic', moveCount: 10 }, DAY);
    expect(useProgressStore.getState().zenCleared).toBe(1);
  });

  test('ensureDaily는 그날의 과제를 생성한다', () => {
    useProgressStore.getState().ensureDaily(DAY);
    expect(useProgressStore.getState().daily?.date).toBe(KEY);
  });

  test('pourLiquid 과제는 recordPour로 진행되고 완료된다', () => {
    setDaily({ type: 'pourLiquid', goal: 2 });
    useProgressStore.getState().recordPour(DAY);
    expect(useProgressStore.getState().daily?.progress).toBe(1);
    useProgressStore.getState().recordPour(DAY);
    expect(useProgressStore.getState().daily?.completed).toBe(true);
  });

  test('clearUnderMoves는 제한 이하 클리어만 카운트', () => {
    setDaily({ type: 'clearUnderMoves', goal: 1, movesLimit: 15 });
    useProgressStore.getState().recordClear({ mode: 'classic', moveCount: 16 }, DAY);
    expect(useProgressStore.getState().daily?.progress).toBe(0);
    useProgressStore.getState().recordClear({ mode: 'classic', moveCount: 15 }, DAY);
    expect(useProgressStore.getState().daily?.completed).toBe(true);
  });

  test('claimDaily는 완료+미수령일 때 보상 코인을 지급한다', () => {
    setDaily({ type: 'clearLevels', goal: 1, reward: 60, completed: true });
    const before = useUserStore.getState().coins;
    const ok = useProgressStore.getState().claimDaily(DAY);
    expect(ok).toBe(true);
    expect(useUserStore.getState().coins).toBe(before + 60);
    expect(useProgressStore.getState().daily?.claimed).toBe(true);
    // 중복 수령 불가
    expect(useProgressStore.getState().claimDaily(DAY)).toBe(false);
  });

  test('연속일 완료 시 스트릭이 증가한다', () => {
    useProgressStore.setState({ lastDailyCompletedDate: '2026-06-05', dailyStreak: 4 });
    setDaily({ goal: 1, completed: true });
    useProgressStore.getState().claimDaily(DAY); // 06-06, 전날 06-05
    expect(useProgressStore.getState().dailyStreak).toBe(5);
  });

  test('하루 이상 건너뛰면 스트릭이 리셋된다', () => {
    useProgressStore.setState({ lastDailyCompletedDate: '2026-06-03', dailyStreak: 9 });
    useProgressStore.getState().ensureDaily(DAY); // 06-06, 3일 공백
    expect(useProgressStore.getState().dailyStreak).toBe(0);
  });

  test('통계 도달 시 도전과제가 해제되고 보상 코인이 지급된다', () => {
    useUserStore.setState({ totalCleared: 1 }); // levelsCleared_1 (reward 50)
    const before = useUserStore.getState().coins;
    const fresh = useProgressStore.getState().syncAchievements();
    expect(fresh).toContain('levelsCleared_1');
    expect(useUserStore.getState().coins).toBe(before + 50);
    expect(useProgressStore.getState().recentUnlocks).toContain('levelsCleared_1');
    // 재호출 시 중복 지급 없음
    const before2 = useUserStore.getState().coins;
    useProgressStore.getState().syncAchievements();
    expect(useUserStore.getState().coins).toBe(before2);
  });
});
