/** One linear clock drives travel, liquid transfer, sound and return. */
export const POUR_TRAVEL_MS = 190;
export const POUR_STREAM_BASE_MS = 240;
export const POUR_STREAM_PER_LAYER_MS = 65;
export const POUR_SETTLE_MS = 150;
export const POUR_STREAM_FILL_PHASE = 0.16;
export const CLEAR_BOARD_CELEBRATION_MS = 820;

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

export function getStreamProgress(progress: number, timing: PourTiming): number {
  'worklet';
  if (!Number.isFinite(progress)) return 0;
  return Math.max(
    0,
    Math.min(
      1,
      (progress - timing.streamStartRatio) /
        Math.max(0.0001, timing.streamEndRatio - timing.streamStartRatio),
    ),
  );
}

/** Flow stays connected until the source empties, then its tail falls away. */
export function getStreamWindow(stream: number): { head: number; tail: number } {
  'worklet';
  const t = Number.isFinite(stream) ? Math.max(0, Math.min(1, stream)) : 0;
  return {
    head: Math.min(1, t / POUR_STREAM_FILL_PHASE),
    tail: Math.max(0, Math.min(1, (t - (1 - POUR_STREAM_FILL_PHASE)) / POUR_STREAM_FILL_PHASE)),
  };
}

/** The receiver starts filling only after the first liquid reaches its rim. */
export function getTransferProgress(stream: number, role: 'source' | 'target'): number {
  'worklet';
  const t = Number.isFinite(stream) ? stream : 0;
  const offset = role === 'target' ? POUR_STREAM_FILL_PHASE : 0;
  return Math.max(0, Math.min(1, (t - offset) / (1 - POUR_STREAM_FILL_PHASE)));
}
