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
 * 압력 기반 소프트바디(pressurized soft body) 물리.
 * 닫힌 막(둘레 점) + 막 스프링(표면장력) + 내부 부피 보존(압력) 모델.
 * 손가락은 "고체 원"으로 표면을 밀어 넣어 쭈그러뜨리고(멀티터치 지원),
 * 압력이 그 부피를 옆으로 밀어내 부푼다. (참고: Maciej Matyka, pressurized soft body)
 * - pressure: 부피 보존력. 높을수록 비압축적(물처럼 눌러도 강하게 되밀어 부푼다)
 * - tension:  막 스프링 강성 = 표면장력. 높을수록 둥글고 매끈, 빨리 원형 복원(물)
 * - friction: 속도 유지. 높을수록 오래 출렁(물), 낮을수록 점성있게 곧 멈춤(크림/슬라임)
 */
export type BlobPhysics = {
  pressure: number;
  tension: number;
  friction: number;
};

/** 정지 외형 — 막 rest 길이에 인코딩되어 재질별 실루엣을 유지한다 */
export type BlobShape = {
  scale: number;
  lobes: number;
  lobeAmp: number;
  aspectX: number;
  aspectY: number;
};

type Node = { x: number; y: number; ox: number; oy: number };

const RING = 28; // 둘레 점 개수 (유체 표현·손가락 충돌 해상)
const ITER = 6; // 막 스프링 이완 반복 (관통/자기교차 방지)
const ANCHOR_K = 0.05; // 무게중심을 제자리로 되돌리는 약한 힘
const FINGER_R_FACTOR = 0.62; // 손끝(고체 원) 반경 = R * 이 값
const FINGER_PUSH = 0.85; // 손끝 밖으로 표면을 밀어내는 비율
const MAX_FINGER_DISP = 0.13; // 프레임당 손가락 변위 상한 (R 대비) — 점 관통/곡선 깨짐 방지
const PRESS_SCALE = 0.02; // 가스압 → 변 법선 힘 스케일
const MAX_PRESS_MULT = 3; // 가스압 폭주 클램프 (압축 시 발산 방지)

type Props = {
  size: number;
  outerColor: string;
  innerColor: string;
  physics: BlobPhysics;
  shape: BlobShape;
  resetKey: string;
  onSqueezeStart: (e: GestureResponderEvent) => void;
  onSqueezeMove: (e: GestureResponderEvent, g: PanResponderGestureState) => void;
  onRelease: () => void;
};

function restDir(i: number, shape: BlobShape): { rx: number; ry: number } {
  const a = (i / RING) * Math.PI * 2;
  const lobe = 1 + shape.lobeAmp * Math.cos(shape.lobes * a);
  return {
    rx: Math.cos(a) * shape.aspectX * lobe,
    ry: Math.sin(a) * shape.aspectY * lobe,
  };
}

type Sim = { nodes: Node[]; restLen: number[]; restArea: number };

function polygonArea(nodes: Node[]): number {
  let a = 0;
  for (let i = 0; i < nodes.length; i++) {
    const p = nodes[i];
    const q = nodes[(i + 1) % nodes.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a * 0.5;
}

function buildSim(s: BlobShape, R: number, cx0: number, cy0: number): Sim {
  const rr = R * s.scale;
  const nodes: Node[] = [];
  for (let i = 0; i < RING; i++) {
    const d = restDir(i, s);
    const x = cx0 + d.rx * rr;
    const y = cy0 + d.ry * rr;
    nodes.push({ x, y, ox: x, oy: y });
  }
  const restLen: number[] = [];
  for (let i = 0; i < RING; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % RING];
    restLen.push(Math.hypot(a.x - b.x, a.y - b.y));
  }
  return { nodes, restLen, restArea: Math.abs(polygonArea(nodes)) };
}

/** 손가락 좌표 배열 추출 (멀티터치 — 엄지 두 개 쭈그리기 지원) */
function readFingers(e: GestureResponderEvent): { x: number; y: number }[] {
  const touches = e.nativeEvent.touches;
  if (!touches || touches.length === 0) return [];
  return touches.map((t) => ({ x: t.locationX, y: t.locationY }));
}

/**
 * Skia 압력 소프트바디 블롭. 멀티터치로 누르면 표면이 들어가고 압력이 옆으로 부푼다.
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
  const fingerR = R * FINGER_R_FACTOR;

  const phys = useRef(physics);
  phys.current = physics;
  const shapeRef = useRef(shape);
  shapeRef.current = shape;

  const fingers = useRef<{ x: number; y: number }[]>([]);
  const sim = useRef<Sim>(buildSim(shape, R, cx0, cy0));
  const [, setTick] = useState(0);

  useEffect(() => {
    sim.current = buildSim(shapeRef.current, R, cx0, cy0);
  }, [resetKey, cx0, cy0, R]);

  useEffect(() => {
    let raf: number;
    const step = () => {
      const { nodes, restLen, restArea } = sim.current;
      const { pressure, tension, friction } = phys.current;
      const fs = fingers.current;
      const n = nodes.length;

      // 1) Verlet 적분
      for (let i = 0; i < n; i++) {
        const p = nodes[i];
        const vx = (p.x - p.ox) * friction;
        const vy = (p.y - p.oy) * friction;
        p.ox = p.x;
        p.oy = p.y;
        p.x += vx;
        p.y += vy;
      }

      // 2) 손가락(고체 원) 충돌 — 원 안의 표면점을 밖으로 밀어 눌린 자국을 만든다 (멀티터치).
      //    프레임당 변위를 상한으로 막아 점이 이웃을 관통(자기교차)해 곡선이 깨지는 것을 방지.
      const maxDisp = R * MAX_FINGER_DISP;
      for (let k = 0; k < fs.length; k++) {
        const f = fs[k];
        for (let i = 0; i < n; i++) {
          const p = nodes[i];
          const dx = p.x - f.x;
          const dy = p.y - f.y;
          const d = Math.hypot(dx, dy);
          if (d < fingerR && d > 0.001) {
            const disp = Math.min((fingerR - d) * FINGER_PUSH, maxDisp);
            const s = disp / d;
            p.x += dx * s;
            p.y += dy * s;
          }
        }
      }

      // 3) 막 스프링 이완 (표면장력·매끈함) — 이웃 점을 rest 길이로
      for (let it = 0; it < ITER; it++) {
        for (let i = 0; i < n; i++) {
          const a = nodes[i];
          const b = nodes[(i + 1) % n];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          const diff = ((restLen[i] - d) / d) * 0.5 * tension;
          const ox = dx * diff;
          const oy = dy * diff;
          a.x -= ox;
          a.y -= oy;
          b.x += ox;
          b.y += oy;
        }
      }

      // 4) 부피 보존(가스압) — 변 법선 방향으로 P=nRT/V (Matyka pressurized soft body).
      //    누른 변은 그대로 두고 빈 변들만 법선으로 부풀어 사실적인 옆 bulge가 생긴다.
      let A2 = 0;
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        const b = nodes[(i + 1) % n];
        A2 += a.x * b.y - b.x * a.y;
      }
      const sign = A2 >= 0 ? 1 : -1;
      const invArea = 1 / (Math.abs(A2 * 0.5) || 1);
      const pGas = Math.min(pressure * restArea * invArea, pressure * MAX_PRESS_MULT);
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        const b = nodes[(i + 1) % n];
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        const el = Math.hypot(ex, ey) || 0.0001;
        const nx = (sign * ey) / el; // 외향 법선
        const ny = (-sign * ex) / el;
        const fpush = pGas * el * PRESS_SCALE;
        a.x += nx * fpush;
        a.y += ny * fpush;
        b.x += nx * fpush;
        b.y += ny * fpush;
      }

      // 5) 무게중심을 제자리로 — 떠다니지 않게 약하게 고정
      let cx = 0;
      let cy = 0;
      for (let i = 0; i < n; i++) {
        cx += nodes[i].x;
        cy += nodes[i].y;
      }
      cx /= n;
      cy /= n;
      const ax = (cx0 - cx) * ANCHOR_K;
      const ay = (cy0 - cy) * ANCHOR_K;
      if (ax || ay) {
        for (let i = 0; i < n; i++) {
          nodes[i].x += ax;
          nodes[i].y += ay;
        }
      }

      setTick((t) => (t + 1) % 1000000);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cx0, cy0, R, fingerR]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          fingers.current = readFingers(e);
          onSqueezeStart(e);
        },
        onPanResponderMove: (e, g) => {
          fingers.current = readFingers(e);
          onSqueezeMove(e, g);
        },
        onPanResponderRelease: (e) => {
          fingers.current = readFingers(e); // 남은 손가락 반영(멀티터치)
          if (fingers.current.length === 0) onRelease();
        },
        onPanResponderTerminate: () => {
          fingers.current = [];
          onRelease();
        },
      }),
    [onSqueezeStart, onSqueezeMove, onRelease],
  );

  // 둘레 점으로 매끈한 닫힌 곡선(Catmull-Rom → 큐빅) 생성. 매 프레임 새 SkPath.
  const nodes = sim.current.nodes;
  const n = nodes.length;
  const peri = (i: number) => nodes[((i % n) + n) % n];
  const path = Skia.Path.Make();
  const start = peri(0);
  path.moveTo(start.x, start.y);
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    const a = peri(i - 1);
    const b = peri(i);
    const c = peri(i + 1);
    const d = peri(i + 2);
    path.cubicTo(
      b.x + (c.x - a.x) / 6,
      b.y + (c.y - a.y) / 6,
      c.x - (d.x - b.x) / 6,
      c.y - (d.y - b.y) / 6,
      c.x,
      c.y,
    );
    mx += b.x;
    my += b.y;
  }
  path.close();
  mx /= n;
  my /= n;

  return (
    <View style={{ width: size, height: size }} {...pan.panHandlers}>
      <Canvas style={{ width: size, height: size }} pointerEvents="none">
        <Group>
          <Path path={path}>
            <RadialGradient
              c={vec(mx - R * 0.3, my - R * 0.3)}
              r={R * 1.6}
              colors={[innerColor, outerColor]}
            />
          </Path>
          <Circle cx={mx - R * 0.32} cy={my - R * 0.34} r={R * 0.18} color="rgba(255,255,255,0.5)" />
        </Group>
      </Canvas>
    </View>
  );
}
