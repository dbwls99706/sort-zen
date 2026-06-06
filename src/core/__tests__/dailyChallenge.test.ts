import {
  toDateKey,
  generateDailyChallenge,
  dailyEventDelta,
  isNextDay,
} from '../dailyChallenge';

describe('dailyChallenge', () => {
  test('toDateKey는 로컬 YYYY-MM-DD를 만든다', () => {
    expect(toDateKey(new Date(2026, 5, 6))).toBe('2026-06-06');
    expect(toDateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  test('같은 날짜는 항상 같은 과제를 생성한다 (결정론적)', () => {
    expect(generateDailyChallenge('2026-06-06')).toEqual(
      generateDailyChallenge('2026-06-06'),
    );
  });

  test('생성된 과제는 유효한 범위를 가진다', () => {
    for (let d = 1; d <= 28; d++) {
      const key = `2026-06-${String(d).padStart(2, '0')}`;
      const c = generateDailyChallenge(key);
      expect(c.goal).toBeGreaterThan(0);
      expect(c.reward).toBeGreaterThan(0);
      if (c.type === 'clearUnderMoves') {
        expect(c.movesLimit).toBeGreaterThanOrEqual(14);
      } else {
        expect(c.movesLimit).toBe(0);
      }
    }
  });

  test('여러 날에 걸쳐 3가지 타입이 모두 등장한다', () => {
    const types = new Set<string>();
    for (let d = 1; d <= 31; d++) {
      types.add(generateDailyChallenge(`2026-06-${String(d).padStart(2, '0')}`).type);
    }
    expect(types.size).toBe(3);
  });

  test('clearLevels는 clear 이벤트만 카운트', () => {
    const c = { type: 'clearLevels' as const, goal: 3, reward: 60, movesLimit: 0 };
    expect(dailyEventDelta(c, { kind: 'clear' })).toBe(1);
    expect(dailyEventDelta(c, { kind: 'pour' })).toBe(0);
  });

  test('pourLiquid는 pour 이벤트만 카운트', () => {
    const c = { type: 'pourLiquid' as const, goal: 30, reward: 60, movesLimit: 0 };
    expect(dailyEventDelta(c, { kind: 'pour' })).toBe(1);
    expect(dailyEventDelta(c, { kind: 'clear' })).toBe(0);
  });

  test('clearUnderMoves는 이동수 제한 이하 클리어만 카운트', () => {
    const c = { type: 'clearUnderMoves' as const, goal: 2, reward: 80, movesLimit: 15 };
    expect(dailyEventDelta(c, { kind: 'clear', moveCount: 15 })).toBe(1);
    expect(dailyEventDelta(c, { kind: 'clear', moveCount: 16 })).toBe(0);
    expect(dailyEventDelta(c, { kind: 'clear' })).toBe(0);
  });

  test('isNextDay는 정확히 하루 차이만 true', () => {
    expect(isNextDay('2026-06-06', '2026-06-07')).toBe(true);
    expect(isNextDay('2026-06-30', '2026-07-01')).toBe(true);
    expect(isNextDay('2026-06-06', '2026-06-08')).toBe(false);
    expect(isNextDay('2026-06-06', '2026-06-06')).toBe(false);
    expect(isNextDay('2026-06-07', '2026-06-06')).toBe(false);
  });
});
