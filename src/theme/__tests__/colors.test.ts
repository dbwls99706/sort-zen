import { THEMES } from '../colors';

function luminance(hex: string): number {
  const values = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

function contrast(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

test.each(Object.entries(THEMES))(
  '%s keeps ordinary labels and filled actions readable',
  (_name, theme) => {
    for (const background of [
      theme.background,
      theme.surface,
      theme.surfaceMuted,
      theme.accentSoft,
    ]) {
      expect(contrast(theme.text, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.textSecondary, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.accentInk, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(theme.accentText, theme.accent)).toBeGreaterThanOrEqual(4.5);
  },
);
