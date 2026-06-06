// 데일리 도전과제 — 날짜로 결정론적 생성되는 매일 색다른 과제.
// 순수 함수만 둔다 (스토어가 상태/시간을 주입). 단위 테스트 대상.

export type DailyChallengeType = 'clearLevels' | 'pourLiquid' | 'clearUnderMoves';

export type DailyChallenge = {
  type: DailyChallengeType;
  goal: number;
  reward: number; // 완료 보상 코인
  movesLimit: number; // clearUnderMoves 전용, 그 외 0
};

export type DailyEvent = { kind: 'clear' | 'pour'; moveCount?: number };

const TYPES: DailyChallengeType[] = ['clearLevels', 'pourLiquid', 'clearUnderMoves'];

/** Date → 'YYYY-MM-DD' (로컬). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// FNV-1a 32bit — 외부 의존성 없는 결정론적 해시.
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 날짜 키로부터 그날의 과제를 결정론적으로 생성한다. */
export function generateDailyChallenge(dateKey: string): DailyChallenge {
  const h = hash(dateKey);
  const type = TYPES[h % TYPES.length];

  switch (type) {
    case 'clearLevels':
      return { type, goal: 3 + ((h >>> 3) % 3), reward: 60, movesLimit: 0 };
    case 'pourLiquid':
      return { type, goal: 30 + ((h >>> 3) % 4) * 10, reward: 60, movesLimit: 0 };
    case 'clearUnderMoves':
      return {
        type,
        goal: 2 + ((h >>> 3) % 2),
        reward: 80,
        movesLimit: 14 + ((h >>> 5) % 5),
      };
  }
}

/** 이벤트가 과제 진행을 얼마나 올리는지(0 또는 1). */
export function dailyEventDelta(c: DailyChallenge, e: DailyEvent): number {
  switch (c.type) {
    case 'clearLevels':
      return e.kind === 'clear' ? 1 : 0;
    case 'pourLiquid':
      return e.kind === 'pour' ? 1 : 0;
    case 'clearUnderMoves':
      return e.kind === 'clear' &&
        e.moveCount !== undefined &&
        e.moveCount <= c.movesLimit
        ? 1
        : 0;
  }
}

/** currKey가 prevKey 바로 다음 날인지 (연속 스트릭 판정). */
export function isNextDay(prevKey: string, currKey: string): boolean {
  const p = Date.parse(`${prevKey}T00:00:00Z`);
  const c = Date.parse(`${currKey}T00:00:00Z`);
  if (Number.isNaN(p) || Number.isNaN(c)) return false;
  return c - p === 24 * 60 * 60 * 1000;
}
