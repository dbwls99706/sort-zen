import React from 'react';
import { useTheme } from './ThemeProvider';
import { lighten, darken } from '../utils/color';
import { prand } from '../utils/prand';

// 웹 전용 배경: Skia Canvas 대신 CSS 그라데이션 + blur 처리한 보케 원들.
// 네이티브(Background.tsx)의 톤/움직임을 standard DOM/CSS로 재현한다.
const BOKEH_COUNT = 6;
const DRIFT_PX = 16;

export function Background({ animated = true }: { animated?: boolean }) {
  const theme = useTheme();

  const gradient = `linear-gradient(180deg, ${lighten(theme.background, 0.03)} 0%, ${theme.background} 50%, ${darken(theme.background, 0.05)} 100%)`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        backgroundImage: gradient,
      }}
    >
      {Array.from({ length: BOKEH_COUNT }, (_, i) => {
        const left = prand(i, 1) * 100;
        const top = prand(i, 2) * 100;
        const diameter = (50 + prand(i, 3) * 80) * 2;
        const color = theme.colors[(i * 2) % theme.colors.length];
        const duration = 7 + prand(i, 4) * 4;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: diameter,
              height: diameter,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: 0.1,
              filter: 'blur(32px)',
              transform: 'translate(-50%, -50%)',
              animation: animated
                ? `sortzen-bokeh ${duration}s ease-in-out infinite`
                : undefined,
            }}
          />
        );
      })}
      {animated && (
        <style>
          {`@keyframes sortzen-bokeh{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,calc(-50% - ${DRIFT_PX}px))}}`}
        </style>
      )}
    </div>
  );
}
