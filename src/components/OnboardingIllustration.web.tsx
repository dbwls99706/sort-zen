import React from 'react';
import { useTheme } from './ThemeProvider';

// 웹 전용: Skia Canvas/Path 대신 inline SVG. 네이티브와 동일한 좌표·색으로 미니 보드를
// 그리고, 액체 스트림은 strokeDasharray/offset CSS 애니메이션으로 흐르듯 재현한다.
const W = 218;
const H = 150;
const TUBE_W = 34;
const TUBE_H = 92;
const BASE_Y = 124;
const SEG_H = 22;
const TUBE_X = [26, 92, 158];
const ARC_LIFT = 34;
const STREAM_DASH = 22; // 흐르는 액체 머리 길이(정규화 pathLength=100 기준)

const LAYOUT: number[][] = [
  [0, 1, 1],
  [2, 0],
  [1, 2, 0],
];

/** 온보딩용: 한 튜브에서 다른 튜브로 액체가 반복해서 흐르는 미니 일러스트 (웹) */
export function OnboardingIllustration() {
  const theme = useTheme();

  const fromX = TUBE_X[0] + TUBE_W / 2;
  const fromY = BASE_Y - LAYOUT[0].length * SEG_H;
  const toX = TUBE_X[1] + TUBE_W / 2;
  const toY = BASE_Y - LAYOUT[1].length * SEG_H;
  const peakY = Math.min(fromY, toY) - ARC_LIFT;
  const streamPath = `M ${fromX} ${fromY} C ${fromX} ${peakY} ${toX} ${peakY} ${toX} ${toY}`;
  const streamColor =
    theme.colors[LAYOUT[0][LAYOUT[0].length - 1] % theme.colors.length];

  return (
    <svg width={W} height={H} style={{ marginBottom: 28 }}>
      {TUBE_X.map((x, ti) => (
        <g key={ti}>
          {LAYOUT[ti].map((colorId, si) => (
            <rect
              key={si}
              x={x + 3}
              y={BASE_Y - (si + 1) * SEG_H}
              width={TUBE_W - 6}
              height={SEG_H}
              fill={theme.colors[colorId % theme.colors.length]}
            />
          ))}
          <rect
            x={x}
            y={BASE_Y - TUBE_H}
            width={TUBE_W}
            height={TUBE_H}
            rx={10}
            fill="none"
            stroke={theme.tubeOutline}
            strokeWidth={2.5}
          />
        </g>
      ))}

      <path
        d={streamPath}
        pathLength={100}
        fill="none"
        stroke={streamColor}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.92}
        style={{
          strokeDasharray: `${STREAM_DASH} 100`,
          animation: 'sortzen-stream 1.9s linear infinite',
        }}
      />
      <style>
        {`@keyframes sortzen-stream{from{stroke-dashoffset:100}to{stroke-dashoffset:-${STREAM_DASH}}}`}
      </style>
    </svg>
  );
}
