import {
  getPourTiming,
  getStreamProgress,
  POUR_STREAM_PER_LAYER_MS,
} from '../pourTiming';

describe('pour timing', () => {
  it('keeps travel and settle phases while scaling the stream by layer count', () => {
    const one = getPourTiming(1);
    const four = getPourTiming(4);

    expect(four.travelMs).toBe(one.travelMs);
    expect(four.settleMs).toBe(one.settleMs);
    expect(four.streamMs - one.streamMs).toBe(POUR_STREAM_PER_LAYER_MS * 3);
    expect(four.totalMs).toBeGreaterThan(one.totalMs);
  });

  it('normalizes invalid and excessive layer counts', () => {
    expect(getPourTiming(Number.NaN).layerCount).toBe(1);
    expect(getPourTiming(0).layerCount).toBe(1);
    expect(getPourTiming(99).layerCount).toBe(8);
  });

  it('maps the global animation progress into the liquid-only interval', () => {
    const timing = getPourTiming(2);

    expect(getStreamProgress(0, timing)).toBe(0);
    expect(getStreamProgress(timing.streamStartRatio, timing)).toBe(0);
    expect(getStreamProgress(timing.streamEndRatio, timing)).toBe(1);
    expect(getStreamProgress(1, timing)).toBe(1);

    const middle =
      timing.streamStartRatio +
      (timing.streamEndRatio - timing.streamStartRatio) / 2;
    expect(getStreamProgress(middle, timing)).toBeCloseTo(0.5);
  });
});
