import {
  getPourTiming,
  getStreamProgress,
  getStreamWindow,
  getTransferProgress,
  POUR_STREAM_FILL_PHASE,
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

    const middle = timing.streamStartRatio + (timing.streamEndRatio - timing.streamStartRatio) / 2;
    expect(getStreamProgress(middle, timing)).toBeCloseTo(0.5);
  });
});

describe('liquid flow continuity', () => {
  it('keeps the flow connected through most of the transfer', () => {
    expect(getStreamWindow(0)).toEqual({ head: 0, tail: 0 });
    expect(getStreamWindow(0.12).head).toBeLessThan(1);
    expect(getStreamWindow(0.5)).toEqual({ head: 1, tail: 0 });
    expect(getStreamWindow(0.8)).toEqual({ head: 1, tail: 0 });
    expect(getStreamWindow(0.92).tail).toBeGreaterThan(0);
    expect(getStreamWindow(1).head).toBe(1);
    expect(getStreamWindow(1).tail).toBeCloseTo(1);
  });

  it('delays receiving liquid until impact and drains the source before the trailing stream lands', () => {
    expect(getTransferProgress(POUR_STREAM_FILL_PHASE, 'target')).toBe(0);
    expect(getTransferProgress(POUR_STREAM_FILL_PHASE, 'source')).toBeGreaterThan(0);
    expect(getTransferProgress(1 - POUR_STREAM_FILL_PHASE, 'source')).toBe(1);
    expect(getTransferProgress(1 - POUR_STREAM_FILL_PHASE, 'target')).toBeLessThan(1);
    expect(getTransferProgress(1, 'target')).toBe(1);
  });

  it('never creates liquid or moves it outside its valid volume', () => {
    for (let step = -2; step <= 12; step += 1) {
      const source = getTransferProgress(step / 10, 'source');
      const target = getTransferProgress(step / 10, 'target');
      expect(target).toBeGreaterThanOrEqual(0);
      expect(source).toBeLessThanOrEqual(1);
      expect(target).toBeLessThanOrEqual(source);
    }
    expect(getTransferProgress(Number.NaN, 'source')).toBe(0);
    expect(getStreamWindow(Number.NaN)).toEqual({ head: 0, tail: 0 });
  });
});
