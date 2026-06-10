import React, { useMemo } from 'react';
import { Canvas, Path, RoundedRect, Group, Skia } from '@shopify/react-native-skia';

// 24x24 뷰박스 기준으로 그린 뒤 size에 맞춰 스케일하는 벡터 아이콘 (Skia, 폰트 비의존)
const VIEWBOX = 24;
const STROKE = 2.2;

type IconProps = { size?: number; color: string };

function IconCanvas({
  size = 22,
  children,
}: {
  size?: number;
  children: React.ReactNode;
}) {
  const s = size / VIEWBOX;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale: s }]}>{children}</Group>
    </Canvas>
  );
}

/** 되돌리기 — 왼쪽을 가리키는 갈고리 화살표 */
export function UndoIcon({ size, color }: IconProps) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    // 왼쪽 화살촉
    p.moveTo(8, 7);
    p.lineTo(4, 11);
    p.lineTo(8, 15);
    // 샤프트 + 아래로 말리는 갈고리
    p.moveTo(4, 11);
    p.lineTo(14, 11);
    p.cubicTo(19, 11, 19, 19, 13, 19);
    return p;
  }, []);
  return (
    <IconCanvas size={size}>
      <Path
        path={path}
        style="stroke"
        strokeWidth={STROKE}
        strokeCap="round"
        strokeJoin="round"
        color={color}
      />
    </IconCanvas>
  );
}

/** 다시 시작 — 원형 화살표 */
export function ResetIcon({ size, color }: IconProps) {
  const arc = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc({ x: 5, y: 5, width: 14, height: 14 }, -45, 290);
    return p;
  }, []);
  const head = useMemo(() => {
    const p = Skia.Path.Make();
    // 호 끝(상단 우측)에 붙는 화살촉
    p.moveTo(15.0, 3.2);
    p.lineTo(16.9, 6.9);
    p.lineTo(12.8, 7.6);
    return p;
  }, []);
  return (
    <IconCanvas size={size}>
      <Path
        path={arc}
        style="stroke"
        strokeWidth={STROKE}
        strokeCap="round"
        strokeJoin="round"
        color={color}
      />
      <Path
        path={head}
        style="stroke"
        strokeWidth={STROKE}
        strokeCap="round"
        strokeJoin="round"
        color={color}
      />
    </IconCanvas>
  );
}

/** 힌트 — 전구 */
export function HintIcon({ size, color }: IconProps) {
  const bulb = useMemo(() => {
    const p = Skia.Path.Make();
    // 전구 머리(원호) + 목으로 이어지는 윤곽
    p.addArc({ x: 6.5, y: 3, width: 11, height: 11 }, 130, 280);
    p.moveTo(10, 13.2);
    p.lineTo(10, 15.5);
    p.moveTo(14, 13.2);
    p.lineTo(14, 15.5);
    return p;
  }, []);
  const base = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(9.6, 17.5);
    p.lineTo(14.4, 17.5);
    p.moveTo(10.4, 20);
    p.lineTo(13.6, 20);
    return p;
  }, []);
  return (
    <IconCanvas size={size}>
      <Path
        path={bulb}
        style="stroke"
        strokeWidth={STROKE}
        strokeCap="round"
        strokeJoin="round"
        color={color}
      />
      <Path
        path={base}
        style="stroke"
        strokeWidth={STROKE}
        strokeCap="round"
        color={color}
      />
    </IconCanvas>
  );
}

/** 일시정지 — 둥근 막대 2개 */
export function PauseIcon({ size, color }: IconProps) {
  return (
    <IconCanvas size={size}>
      <RoundedRect x={7} y={5} width={3.6} height={14} r={1.8} color={color} />
      <RoundedRect x={13.4} y={5} width={3.6} height={14} r={1.8} color={color} />
    </IconCanvas>
  );
}
