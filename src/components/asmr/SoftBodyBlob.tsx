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
 * 재질별 물리. Verlet 적분 + 거리-제약 이완(relaxation) 소프트바디 모델.
 * (참고: anuraghazra/Verly.js의 "Jelly/Sticky Slime" 기법 — 저강성 제약 + 마찰)
 * 중심 노드는 항상 제자리에 고정(pinned)되어 몸체가 떠다니지 않고 표면만 물컹인다.
 * - stiffness: 스포크(반경) 제약 강도 0~1 (낮을수록 흐물흐물=슬라임, 높을수록 단단=스펀지)
 * - friction:  속도 유지 0.75~0.95 (높을수록 오래 출렁 — 물, 낮으면 빨리 가라앉음)
 * - grabReach: 손가락이 끌어당기는 표면 범위(가우시안 폭, 작을수록 국소적으로만 변형)
 */
export type BlobPhysics = {
  stiffness: number;
  friction: number;
  grabReach: number;
};

/** 정지 상태의 외형 — 재질마다 실루엣을 다르게 한다 */
export type BlobShape = {
  scale: number;
  lobes: number;
  lobeAmp: number;
  aspectX: number;
  aspectY: number;
};

type Node = { x: number; y: number; ox: number; oy: number };
// kind: 0=막(둘레 이웃) 1=스포크(중심) 2=전단
type Stick = { a: number; b: number; len: number; kind: 0 | 1 | 2 };

const RING = 20;
const ITER = 6; // 제약 이완 반복 (많을수록 형태 견고)
const PIN_PULL = 0.42; // 손가락 쪽으로 표면을 당기는 강도 (과하면 점이 교차해 곡선이 깨짐)
// 둘레 막은 강성과 무관하게 항상 팽팽히 유지해 외곽선이 매끈하게(깨짐 방지) 그려지도록 한다.
const MEMBRANE_K = 0.85;
const SHEAR_FACTOR = 0.6;

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

/** 노드/스틱 초기화 (중심 + 둘레 RING개). 모듈 스코프 순수 함수라 훅 의존성에서 자유롭다. */
function buildSim(
  s: BlobShape,
  R: number,
  cx0: number,
  cy0: number,
): { nodes: Node[]; sticks: Stick[] } {
  const rr = R * s.scale;
  const nodes: Node[] = [{ x: cx0, y: cy0, ox: cx0, oy: cy0 }];
  for (let i = 0; i < RING; i++) {
    const d = restDir(i, s);
    const x = cx0 + d.rx * rr;
    const y = cy0 + d.ry * rr;
    nodes.push({ x, y, ox: x, oy: y });
  }
  const sticks: Stick[] = [];
  const dist = (p: Node, q: Node) => Math.hypot(p.x - q.x, p.y - q.y);
  for (let i = 0; i < RING; i++) {
    const cur = i + 1;
    const nxt = ((i + 1) % RING) + 1;
    sticks.push({ a: cur, b: nxt, len: dist(nodes[cur], nodes[nxt]), kind: 0 }); // 막
    sticks.push({ a: 0, b: cur, len: dist(nodes[0], nodes[cur]), kind: 1 }); // 스포크
    const sh = ((i + 2) % RING) + 1;
    sticks.push({ a: cur, b: sh, len: dist(nodes[cur], nodes[sh]), kind: 2 }); // 전단
  }
  return { nodes, sticks };
}

/**
 * Skia Verlet 소프트바디 블롭.
 * 노드[0]=중심, [1..RING]=둘레. 둘레는 막(이웃 거리제약)으로, 중심과는 스포크로 묶고
 * 매 프레임 Verlet 적분 후 제약을 ITER회 이완한다. 손가락은 가까운 표면을 끌어당기고
 * 중심은 약한 복귀 스프링으로 제자리로 돌아오며 마찰만큼 출렁인다.
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

  const finger = useRef<{ x: number; y: number } | null>(null);

  const sim = useRef(buildSim(shape, R, cx0, cy0));
  const [, setTick] = useState(0);

  // 재질(=resetKey) 변경 시 정지 외형으로 재구성
  useEffect(() => {
    sim.current = buildSim(shapeRef.current, R, cx0, cy0);
  }, [resetKey, cx0, cy0, R]);

  useEffect(() => {
    let raf: number;
    const step = () => {
      const { nodes, sticks } = sim.current;
      const { stiffness, friction, grabReach } = phys.current;
      const f = finger.current;

      // 0) 중심 노드는 항상 제자리에 고정 — 몸체가 떠다니지 않게 한다.
      const c = nodes[0];
      c.x = cx0;
      c.y = cy0;
      c.ox = cx0;
      c.oy = cy0;

      // 1) 둘레 노드만 Verlet 적분 (관성 = 위치차 × 마찰)
      for (let i = 1; i < nodes.length; i++) {
        const p = nodes[i];
        const vx = (p.x - p.ox) * friction;
        const vy = (p.y - p.oy) * friction;
        p.ox = p.x;
        p.oy = p.y;
        p.x += vx;
        p.y += vy;
      }

      // 2) 손가락이 가까운 둘레 표면을 국소적으로 끌어당김 (물컹 변형)
      if (f) {
        for (let i = 1; i <= RING; i++) {
          const p = nodes[i];
          const dx = f.x - p.x;
          const dy = f.y - p.y;
          const d2 = dx * dx + dy * dy;
          const infl = Math.exp(-d2 / (R * R * grabReach));
          p.x += dx * infl * PIN_PULL;
          p.y += dy * infl * PIN_PULL;
        }
      }

      // 3) 거리 제약 이완. 막은 항상 단단(매끈한 외곽선=깨짐 방지),
      //    스포크는 재질 강성(=물컹함), 전단은 그 사이.
      for (let k = 0; k < ITER; k++) {
        for (let s = 0; s < sticks.length; s++) {
          const st = sticks[s];
          const a = nodes[st.a];
          const b = nodes[st.b];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          const eff =
            st.kind === 0 ? MEMBRANE_K : st.kind === 1 ? stiffness : stiffness * SHEAR_FACTOR;
          const ratio = ((st.len - d) / d) * eff;
          // 중심(인덱스 0)은 고정 — 스포크 보정은 둘레 쪽이 전부 흡수
          if (st.a === 0) {
            b.x += dx * ratio;
            b.y += dy * ratio;
          } else {
            const ox = dx * ratio * 0.5;
            const oy = dy * ratio * 0.5;
            a.x -= ox;
            a.y -= oy;
            b.x += ox;
            b.y += oy;
          }
        }
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
          finger.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          onSqueezeStart(e);
        },
        onPanResponderMove: (e, g) => {
          finger.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
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

  // 둘레 노드로 매끈한 닫힌 곡선(Catmull-Rom → 큐빅) 생성. 매 프레임 새 SkPath.
  const nodes = sim.current.nodes;
  const path = Skia.Path.Make();
  const peri = (i: number) => nodes[(((i % RING) + RING) % RING) + 1];
  const p0start = peri(0);
  path.moveTo(p0start.x, p0start.y);
  for (let i = 0; i < RING; i++) {
    const a = peri(i - 1);
    const b = peri(i);
    const c2 = peri(i + 1);
    const d = peri(i + 2);
    path.cubicTo(
      b.x + (c2.x - a.x) / 6,
      b.y + (c2.y - a.y) / 6,
      c2.x - (d.x - b.x) / 6,
      c2.y - (d.y - b.y) / 6,
      c2.x,
      c2.y,
    );
  }
  path.close();

  const c = nodes[0];

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
          <Circle cx={c.x - R * 0.32} cy={c.y - R * 0.34} r={R * 0.18} color="rgba(255,255,255,0.5)" />
        </Group>
      </Canvas>
    </View>
  );
}
