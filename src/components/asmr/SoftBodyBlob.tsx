import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  RadialGradient,
  Circle,
  vec,
  Group,
} from '@shopify/react-native-skia';

/**
 * 재질별 물리.
 * - springK: 형태 복원 속도(클수록 빠르게 단단히 돌아옴)
 * - damping: 감쇠(작을수록 오래 출렁출렁 — 물/슬라임, 클수록 즉시 멈춤 — 스펀지)
 * - reach: 표면이 손가락을 따라 늘어나는 정도(엿가락 스트레치)
 * - squish: 누를 때 전체 압축(<1 수축=스펀지, >1 부풂=크림)
 * - centerK: 몸체가 손가락을 따라가는 정도(작으면 남아서 늘어남=슬라임, 크면 미끄러져 따라옴=로션)
 */
export type BlobPhysics = {
  springK: number;
  damping: number;
  reach: number;
  squish: number;
  centerK: number;
};

/** 정지 상태의 외형 — 재질마다 실루엣을 다르게 한다 */
export type BlobShape = {
  scale: number; // 전체 크기 배수
  lobes: number; // 둘레 돌기 개수 (스펀지=4 모서리, 크림=몽글)
  lobeAmp: number; // 돌기 크기
  aspectX: number; // 가로 비율 (물=넓적, 슬라임=세로 물방울)
  aspectY: number; // 세로 비율
};

type Point = { x: number; y: number; vx: number; vy: number; rx: number; ry: number };

const RING = 20; // 표면 제어점 개수 (lobes 최대 ~9까지 해상)
const DT = 1;
const NEIGHBOR_SMOOTH = 0.16;
const CENTER_DAMP = 0.3;

type Props = {
  size: number;
  outerColor: string;
  innerColor: string;
  physics: BlobPhysics;
  shape: BlobShape;
  /** 재질이 바뀌면 점들을 즉시 정지 외형으로 되돌린다 */
  resetKey: string;
  onSqueezeStart: (e: GestureResponderEvent) => void;
  onSqueezeMove: (e: GestureResponderEvent, g: PanResponderGestureState) => void;
  onRelease: () => void;
};

/** i번째 점의 정지 방향 벡터(돌기·종횡비 반영, 크기는 1 부근) */
function restDir(i: number, shape: BlobShape): { rx: number; ry: number } {
  const a = (i / RING) * Math.PI * 2;
  const lobe = 1 + shape.lobeAmp * Math.cos(shape.lobes * a);
  return {
    rx: Math.cos(a) * shape.aspectX * lobe,
    ry: Math.sin(a) * shape.aspectY * lobe,
  };
}

/**
 * Skia 소프트바디 블롭. RING개 표면 점을 스프링+감쇠로 적분(semi-implicit Euler)하고
 * 이웃 평활화로 매끈한 곡면을 유지한다. 재질별 물리/외형으로 거동과 실루엣을 다르게 한다.
 */
export function SoftBodyBlob({
  size,
  outerColor,
  innerColor,
  physics,
  shape,
  resetKey,
  onSqueezeStart,
  onSqueezeMove,
  onRelease,
}: Props) {
  const R = size * 0.3;
  const cx0 = size / 2;
  const cy0 = size / 2;

  const phys = useRef(physics);
  phys.current = physics;
  const shapeRef = useRef(shape);
  shapeRef.current = shape;

  const center = useRef({ x: cx0, y: cy0, vx: 0, vy: 0 });
  const finger = useRef<{ x: number; y: number } | null>(null);

  const points = useRef<Point[]>(
    Array.from({ length: RING }, (_, i) => {
      const d = restDir(i, shape);
      const rr = R * shape.scale;
      return { x: cx0 + d.rx * rr, y: cy0 + d.ry * rr, vx: 0, vy: 0, rx: d.rx, ry: d.ry };
    }),
  );
  const [, setTick] = useState(0);

  // 재질 변경 시 즉시 정지 외형으로 복원
  useEffect(() => {
    center.current = { x: cx0, y: cy0, vx: 0, vy: 0 };
    const rr = R * shapeRef.current.scale;
    points.current.forEach((p, i) => {
      const d = restDir(i, shapeRef.current);
      p.rx = d.rx;
      p.ry = d.ry;
      p.x = cx0 + d.rx * rr;
      p.y = cy0 + d.ry * rr;
      p.vx = 0;
      p.vy = 0;
    });
  }, [resetKey, cx0, cy0, R]);

  // 물리 적분 루프 (JS rAF — 기존 파티클 루프와 동일 패턴)
  useEffect(() => {
    let raf: number;
    const step = () => {
      const pts = points.current;
      const c = center.current;
      const f = finger.current;
      const { springK, damping, reach, squish, centerK } = phys.current;
      const scale = shapeRef.current.scale;

      // 중심: 손가락으로 끌리거나 원점으로 복원 (관성 보존)
      const ctx = f ? f.x : cx0;
      const cty = f ? f.y : cy0;
      c.vx += centerK * (ctx - c.x) - CENTER_DAMP * c.vx;
      c.vy += centerK * (cty - c.y) - CENTER_DAMP * c.vy;
      c.x += c.vx * DT;
      c.y += c.vy * DT;

      const grabbed = f !== null;
      const rr = R * scale * (grabbed ? squish : 1);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        let tx = c.x + p.rx * rr;
        let ty = c.y + p.ry * rr;
        if (grabbed && f) {
          // 손가락에 가까운 표면은 손가락을 거의 따라붙고, 넓은 호(弧)가 함께 끌려가
          // 엿가락처럼 길게 늘어난다. 먼 쪽 표면은 남아 탄성 스트레치를 만든다.
          const dx = f.x - tx;
          const dy = f.y - ty;
          const d2 = dx * dx + dy * dy;
          const infl = Math.exp(-d2 / (R * R * 1.9));
          const pull = Math.min(0.95, infl * reach);
          tx += dx * pull;
          ty += dy * pull;
        }
        p.vx += springK * (tx - p.x) - damping * p.vx;
        p.vy += springK * (ty - p.y) - damping * p.vy;
        p.x += p.vx * DT;
        p.y += p.vy * DT;
      }
      // 이웃 평활화 — 곡면 연속성 유지
      for (let i = 0; i < pts.length; i++) {
        const a = pts[(i - 1 + pts.length) % pts.length];
        const b = pts[(i + 1) % pts.length];
        const p = pts[i];
        p.x += ((a.x + b.x) / 2 - p.x) * NEIGHBOR_SMOOTH;
        p.y += ((a.y + b.y) / 2 - p.y) * NEIGHBOR_SMOOTH;
      }
      setTick((t) => (t + 1) % 1000000);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cx0, cy0, R]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          finger.current = { x: locationX, y: locationY };
          onSqueezeStart(e);
        },
        onPanResponderMove: (e, g) => {
          const { locationX, locationY } = e.nativeEvent;
          finger.current = { x: locationX, y: locationY };
          onSqueezeMove(e, g);
        },
        onPanResponderRelease: () => {
          finger.current = null;
          onRelease();
        },
        onPanResponderTerminate: () => {
          finger.current = null;
          onRelease();
        },
      }),
    [onSqueezeStart, onSqueezeMove, onRelease],
  );

  // 현재 점들로 매끈한 닫힌 곡선(Catmull-Rom → 큐빅 베지어) 생성.
  // 매 프레임 새 SkPath를 만들어 prop 참조가 바뀌게 해 Skia가 다시 그리도록 한다.
  const pts = points.current;
  const n = pts.length;
  const path = Skia.Path.Make();
  path.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    path.cubicTo(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
      p2.x,
      p2.y,
    );
  }
  path.close();

  const c = center.current;

  return (
    <View style={{ width: size, height: size }} {...pan.panHandlers}>
      <Canvas style={{ width: size, height: size }} pointerEvents="none">
        <Group>
          <Path path={path}>
            <RadialGradient
              c={vec(c.x - R * 0.3, c.y - R * 0.3)}
              r={R * 1.6}
              colors={[innerColor, outerColor]}
            />
          </Path>
          {/* 젤리 하이라이트 */}
          <Circle
            cx={c.x - R * 0.32}
            cy={c.y - R * 0.34}
            r={R * 0.18}
            color="rgba(255,255,255,0.5)"
          />
        </Group>
      </Canvas>
    </View>
  );
}
