/**
 * 붓기 연출의 단일 타임라인.
 * 이동 층 수가 많을수록 실제로 더 오래·굵게 흐르도록 모든 감각 피드백이 이 값을 공유한다.
 */
export const POUR_TRAVEL_MS = 320;
export const POUR_STREAM_BASE_MS = 480;
export const POUR_STREAM_PER_LAYER_MS = 90;
export const POUR_SETTLE_MS = 180;
export const POUR_STREAM_FILL_PHASE = 0.58;
export const CLEAR_BOARD_CELEBRATION_MS = 1150;

export type PourTiming = {
  layerCount: number;
  travelMs: number;
  streamMs: number;
  settleMs: number;
  totalMs: number;
  streamStartMs: number;
  streamEndMs: number;
  impactMs: number;
  streamStartRatio: number;
  streamEndRatio: number;
  impactRatio: number;
};

function normalizeLayerCount(layerCount: number): number {
  if (!Number.isFinite(layerCount)) return 1;
  return Math.max(1, Math.min(8, Math.round(layerCount)));
}

export function getPourTiming(layerCount: number): PourTiming {
  const count = normalizeLayerCount(layerCount);
  const streamMs = POUR_STREAM_BASE_MS + (count - 1) * POUR_STREAM_PER_LAYER_MS;
  const streamStartMs = POUR_TRAVEL_MS;
  const streamEndMs = streamStartMs + streamMs;
  const totalMs = streamEndMs + POUR_SETTLE_MS;
  const impactMs = streamStartMs + Math.round(streamMs * POUR_STREAM_FILL_PHASE);

  return {
    layerCount: count,
    travelMs: POUR_TRAVEL_MS,
    streamMs,
    settleMs: POUR_SETTLE_MS,
    totalMs,
    streamStartMs,
    streamEndMs,
    impactMs,
    streamStartRatio: streamStartMs / totalMs,
    streamEndRatio: streamEndMs / totalMs,
    impactRatio: impactMs / totalMs,
  };
}

/** 전체 진행도(0~1)를 실제 액체가 흐르는 구간의 진행도(0~1)로 변환한다. */
export function getStreamProgress(progress: number, timing: PourTiming): number {
  'worklet';
  if (!Number.isFinite(progress)) return 0;
  if (progress <= timing.streamStartRatio) return 0;
  if (progress >= timing.streamEndRatio) return 1;
  return (
    (progress - timing.streamStartRatio) /
    (timing.streamEndRatio - timing.streamStartRatio)
  );
}
