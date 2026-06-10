import React from 'react';

// 웹 전용: Skia Canvas/Path 대신 inline SVG. 24x24 뷰박스 기준 형상을
// 네이티브 icons.tsx와 동일하게 맞춘다.
const VIEWBOX = 24;
const STROKE = 2.2;

type IconProps = { size?: number; color: string };

function IconSvg({
  size = 22,
  children,
}: {
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      fill="none"
    >
      {children}
    </svg>
  );
}

/** 되돌리기 — 왼쪽을 가리키는 갈고리 화살표 */
export function UndoIcon({ size, color }: IconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M8 7 L4 11 L8 15 M4 11 L14 11 C19 11 19 19 13 19"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconSvg>
  );
}

/** 다시 시작 — 원형 화살표 */
export function ResetIcon({ size, color }: IconProps) {
  return (
    <IconSvg size={size}>
      {/* 중심(12,12) 반지름 7, -45°~245° 호 (상단에 갈고리용 틈) */}
      <path
        d="M16.95 7.05 A7 7 0 1 1 9.04 5.66"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 3.2 L16.9 6.9 L12.8 7.6"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconSvg>
  );
}

/** 힌트 — 전구 */
export function HintIcon({ size, color }: IconProps) {
  return (
    <IconSvg size={size}>
      <circle
        cx={12}
        cy={8.5}
        r={5.5}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
      />
      <path
        d="M10 13.2 L10 15.5 M14 13.2 L14 15.5 M9.6 17.5 L14.4 17.5 M10.4 20 L13.6 20"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </IconSvg>
  );
}

/** 일시정지 — 둥근 막대 2개 */
export function PauseIcon({ size, color }: IconProps) {
  return (
    <IconSvg size={size}>
      <rect x={7} y={5} width={3.6} height={14} rx={1.8} fill={color} />
      <rect x={13.4} y={5} width={3.6} height={14} rx={1.8} fill={color} />
    </IconSvg>
  );
}
