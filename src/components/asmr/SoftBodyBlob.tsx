import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
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
// 형태 기억: 압력 모델은 둘레를 원으로 둥글리려 하므로, 정점을 무게중심 기준 rest 위치로
// 약하게 당겨 재질별 실루엣(스퀴클/물방울/타원)을 유지한다. tension에 비례 → 단단한 재질일수록 형태 고수.
const SHAPE_FACTOR = 0.35;

type Props = {
  size: number;
  outerColor: string;
  innerColor: string;
  physics: BlobPhysics;
  shape: BlobShape;
  resetKey: string;
  onSqueezeStart: (x: number, y: number) => void;
  onSqueezeMove: (x: number, y: number, speed: number) => void;
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

type Sim = {
  nodes: Node[];
  restLen: number[];
  restArea: number;
  restOffX: number[]; // 무게중심 기준 rest 위치 오프셋 (형태 기억용)
  restOffY: number[];
};

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
  const restOffX: number[] = [];
  const restOffY: number[] = [];
  for (let i = 0; i < RING; i++) {
    const d = restDir(i, s);
    const ox = d.rx * rr;
    const oy = d.ry * rr;
    restOffX.push(ox);
    restOffY.push(oy);
    nodes.push({ x: cx0 + ox, y: cy0 + oy, ox: cx0 + ox, oy: cy0 + oy });
  }
  const restLen: number[] = [];
  for (let i = 0; i < RING; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % RING];
    restLen.push(Math.hypot(a.x - b.x, a.y - b.y));
  }
  return { nodes, restLen, restArea: Math.abs(polygonArea(nodes)), restOffX, restOffY };
}

/** 둘레 좌표를 평탄 배열 [x0,y0,x1,y1,...]로 (공유값 → UI 스레드 렌더용) */
function flattenNodes(nodes: Node[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < nodes.length; i++) {
    out.push(nodes[i].x, nodes[i].y);
  }
  return out;
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

  // 손가락 좌표(멀티터치) — gesture-handler 워클릿(UI 스레드)이 쓰고 물리 루프(JS)가 읽는다.
  const fingersSV = useSharedValue<{ x: number; y: number }[]>([]);
  const prevX = useSharedValue(0);
  const prevY = useSharedValue(0);
  const sim = useRef<Sim>(buildSim(shape, R, cx0, cy0));

  // 둘레 좌표를 평탄 배열로 공유값에 담아 UI 스레드에서 path를 그린다.
  // (매 프레임 setState 리렌더 + 새 SkPath 할당 제거 → JS 스레드 부하·GC 감소)
  const posSV = useSharedValue<number[]>(flattenNodes(sim.current.nodes));

  useEffect(() => {
    sim.current = buildSim(shapeRef.current, R, cx0, cy0);
    posSV.value = flattenNodes(sim.current.nodes);
  }, [resetKey, cx0, cy0, R, posSV]);

  useEffect(() => {
    let raf: number;
    const step = () => {
      const { nodes, restLen, restArea, restOffX, restOffY } = sim.current;
      const { pressure, tension, friction } = phys.current;
      const fs = fingersSV.value;
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
      //    변 법선은 재질별 실루엣(스퀴클/물방울/타원)을 보존한다(정점 법선은 형태를 둥글려 부적합).
      //    부호 있는 면적(sign)으로 오목/꼬임 시 압력 역전을 막고, 면적 하한으로 발산을 막는다.
      let A2 = 0;
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        const b = nodes[(i + 1) % n];
        A2 += a.x * b.y - b.x * a.y;
      }
      const sign = A2 >= 0 ? 1 : -1;
      const area = Math.max(Math.abs(A2 * 0.5), R * R * 0.3); // 납작하게 눌려도 분모 폭주 방지
      const pGas = Math.min((pressure * restArea) / area, pressure * MAX_PRESS_MULT);
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        const b = nodes[(i + 1) % n];
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        const el = Math.hypot(ex, ey) || 0.0001;
        const nx = (sign * ey) / el; // 외향 변 법선
        const ny = (-sign * ex) / el;
        const fpush = pGas * el * PRESS_SCALE;
        a.x += nx * fpush;
        a.y += ny * fpush;
        b.x += nx * fpush;
        b.y += ny * fpush;
      }

      // 5) 무게중심 산출
      let cx = 0;
      let cy = 0;
      for (let i = 0; i < n; i++) {
        cx += nodes[i].x;
        cy += nodes[i].y;
      }
      cx /= n;
      cy /= n;

      // 6) 형태 기억 — 정점을 무게중심 기준 rest 위치로 약하게 당겨 재질 실루엣 유지(tension 비례)
      const shapeK = tension * SHAPE_FACTOR;
      for (let i = 0; i < n; i++) {
        const p = nodes[i];
        p.x += (cx + restOffX[i] - p.x) * shapeK;
        p.y += (cy + restOffY[i] - p.y) * shapeK;
      }

      // 7) 무게중심을 제자리로 — 떠다니지 않게 약하게 고정
      const ax = (cx0 - cx) * ANCHOR_K;
      const ay = (cy0 - cy) * ANCHOR_K;
      if (ax || ay) {
        for (let i = 0; i < n; i++) {
          nodes[i].x += ax;
          nodes[i].y += ay;
        }
      }

      // 새 좌표를 공유값에 반영 → UI 스레드 useDerivedValue가 path를 다시 그린다(리렌더 없음)
      posSV.value = flattenNodes(nodes);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cx0, cy0, R, fingerR, posSV, fingersSV]);

  // UI 스레드에서 재사용 SkPath에 Catmull-Rom 곡선을 매 프레임 갱신 (할당/리렌더 없음)
  const skPath = useMemo(() => Skia.Path.Make(), []);
  const animatedPath = useDerivedValue(() => {
    const a = posSV.value;
    const m = a.length / 2;
    skPath.reset();
    const px = (i: number) => a[(((i % m) + m) % m) * 2];
    const py = (i: number) => a[(((i % m) + m) % m) * 2 + 1];
    skPath.moveTo(px(0), py(0));
    for (let i = 0; i < m; i++) {
      skPath.cubicTo(
        px(i) + (px(i + 1) - px(i - 1)) / 6,
        py(i) + (py(i + 1) - py(i - 1)) / 6,
        px(i + 1) - (px(i + 2) - px(i)) / 6,
        py(i + 1) - (py(i + 2) - py(i)) / 6,
        px(i + 1),
        py(i + 1),
      );
    }
    skPath.close();
    return skPath;
  }, [skPath, posSV]);

  // 블롭 중심(그라디언트·하이라이트용)
  const gradC = useDerivedValue(() => {
    const a = posSV.value;
    const m = a.length / 2;
    let mx = 0;
    let my = 0;
    for (let i = 0; i < m; i++) {
      mx += a[i * 2];
      my += a[i * 2 + 1];
    }
    mx /= m;
    my /= m;
    return vec(mx - R * 0.3, my - R * 0.3);
  }, [posSV, R]);
  const hlX = useDerivedValue(() => gradC.value.x - R * 0.02, [gradC, R]);
  const hlY = useDerivedValue(() => gradC.value.y - R * 0.04, [gradC, R]);

  // gesture-handler 멀티터치 — 모든 손가락(allTouches)을 추적해 엄지 두 개 쭈그리기를 지원한다.
  // PanResponder의 단일 responder 한계(둘째 손가락 grant 누락) 없이 포인터별 좌표를 얻는다.
  const gesture = useMemo(
    () =>
      Gesture.Manual()
        .onTouchesDown((e, manager) => {
          'worklet';
          fingersSV.value = e.allTouches.map((t) => ({ x: t.x, y: t.y }));
          const t0 = e.allTouches[0];
          if (t0) {
            prevX.value = t0.absoluteX;
            prevY.value = t0.absoluteY;
            runOnJS(onSqueezeStart)(t0.absoluteX, t0.absoluteY);
          }
          if (e.numberOfTouches >= 1) manager.activate();
        })
        .onTouchesMove((e) => {
          'worklet';
          fingersSV.value = e.allTouches.map((t) => ({ x: t.x, y: t.y }));
          const t0 = e.allTouches[0];
          if (!t0) return;
          const sp = Math.hypot(t0.absoluteX - prevX.value, t0.absoluteY - prevY.value);
          prevX.value = t0.absoluteX;
          prevY.value = t0.absoluteY;
          runOnJS(onSqueezeMove)(t0.absoluteX, t0.absoluteY, sp);
        })
        .onTouchesUp((e, manager) => {
          'worklet';
          const remaining = e.allTouches.filter(
            (t) => !e.changedTouches.some((c) => c.id === t.id),
          );
          fingersSV.value = remaining.map((t) => ({ x: t.x, y: t.y }));
          if (remaining.length === 0) {
            manager.end();
            runOnJS(onRelease)();
          }
        })
        .onTouchesCancelled((_e, manager) => {
          'worklet';
          fingersSV.value = [];
          manager.end();
          runOnJS(onRelease)();
        }),
    [onSqueezeStart, onSqueezeMove, onRelease, fingersSV, prevX, prevY],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width: size, height: size }}>
        <Canvas style={{ width: size, height: size }} pointerEvents="none">
          <Group>
            <Path path={animatedPath}>
              <RadialGradient c={gradC} r={R * 1.6} colors={[innerColor, outerColor]} />
            </Path>
            <Circle cx={hlX} cy={hlY} r={R * 0.18} color="rgba(255,255,255,0.5)" />
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}
