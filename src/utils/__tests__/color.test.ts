import { lighten, darken } from '../color';

describe('color lighten/darken', () => {
  test('lighten은 흰색 쪽으로 이동한다', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080');
    expect(lighten('#000000', 1)).toBe('#ffffff');
  });

  test('darken은 검정 쪽으로 이동한다', () => {
    expect(darken('#ffffff', 0.5)).toBe('#808080');
    expect(darken('#ffffff', 1)).toBe('#000000');
  });

  test('amount 0이면 원본 유지', () => {
    expect(lighten('#3a7bd5', 0)).toBe('#3a7bd5');
    expect(darken('#3a7bd5', 0)).toBe('#3a7bd5');
  });

  test('6자리 hex가 아니면 원본을 그대로 반환(NaN 방지)', () => {
    expect(lighten('#fff', 0.3)).toBe('#fff');
    expect(darken('rgba(0,0,0,0.5)', 0.3)).toBe('rgba(0,0,0,0.5)');
    expect(lighten('transparent', 0.3)).toBe('transparent');
  });
});
