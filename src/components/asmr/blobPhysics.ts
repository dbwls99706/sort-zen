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
const FINGER_R_FACTOR = 0.66; // 손끝(고체 원) 반경 = R * 이 값
const FINGER_PUSH = 0.92; // 손끝 밖으로 표면을 밀어내는 비율 (깊고 또렷한 눌림)
const MAX_FINGER_DISP = 0.2; // 프레임당 손가락 변위 상한 (R 대비) — 점 관통/곡선 깨짐 방지
const PRESS_SCALE = 0.02; // 가스압 → 변 법선 힘 스케일
const MAX_PRESS_MULT = 3; // 가스압 폭주 클램프 (압축 시 발산 방지)
// 형태 기억: 압력 모델은 둘레를 원으로 둥글리려 하므로, 정점을 무게중심 기준 rest 위치로
// 약하게 당겨 재질별 실루엣(스퀴클/물방울/타원)을 유지한다. tension에 비례 → 단단한 재질일수록 형태 고수.
const SHAPE_FACTOR = 0.35;
const CENTER_TOUCH_RADIUS = 0.85;
const CENTER_SQUEEZE_X = 0.14;
const CENTER_SQUEEZE_Y = 0.28;
const CENTER_SQUEEZE_STIFFNESS = 0.1;
const SURFACE_PADDING = 4;

export function restDir(i: number, shape: BlobShape): { rx: number; ry: number } {
  'worklet';
  const a = (i / RING) * Math.PI * 2;
  const lobe = 1 + shape.lobeAmp * Math.cos(shape.lobes * a);
  return {
    rx: Math.cos(a) * shape.aspectX * lobe,
    ry: Math.sin(a) * shape.aspectY * lobe,
  };
}

export type Sim = {
  nodes: Node[];
  restLen: number[];
  restArea: number;
  restOffX: number[]; // 무게중심 기준 rest 위치 오프셋 (형태 기억용)
  restOffY: number[];
};

export function polygonArea(nodes: Node[]): number {
  'worklet';
  let a = 0;
  for (let i = 0; i < nodes.length; i++) {
    const p = nodes[i];
    const q = nodes[(i + 1) % nodes.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a * 0.5;
}

export function buildSim(s: BlobShape, R: number, cx0: number, cy0: number): Sim {
  'worklet';
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
export function flattenNodes(nodes: Node[]): number[] {
  'worklet';
  const out: number[] = [];
  for (let i = 0; i < nodes.length; i++) {
    out.push(nodes[i].x, nodes[i].y);
  }
  return out;
}

export type Finger = { x: number; y: number };

/** One fixed 60 Hz physics step. Runs on the UI thread without JS frame traffic. */
export function stepSimulation(sim: Sim, physics: BlobPhysics, fs: Finger[], size: number): number {
  'worklet';
  const { nodes, restLen, restArea, restOffX, restOffY } = sim;
  const { pressure, tension, friction } = physics;
  const R = size * 0.3;
  const cx0 = size / 2;
  const cy0 = size / 2;
  const fingerR = R * FINGER_R_FACTOR;
  const n = nodes.length;
  // A touch inside the membrane must respond too, even without edge collision.
  let centerSqueeze = 0;
  for (const finger of fs) {
    centerSqueeze = Math.max(
      centerSqueeze,
      Math.max(0, 1 - Math.hypot(finger.x - cx0, finger.y - cy0) / (R * CENTER_TOUCH_RADIUS)),
    );
  }
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
  const shapeK = tension * SHAPE_FACTOR + centerSqueeze * CENTER_SQUEEZE_STIFFNESS;
  for (let i = 0; i < n; i++) {
    const p = nodes[i];
    p.x += (cx + restOffX[i] * (1 + centerSqueeze * CENTER_SQUEEZE_X) - p.x) * shapeK;
    p.y += (cy + restOffY[i] * (1 - centerSqueeze * CENTER_SQUEEZE_Y) - p.y) * shapeK;
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
  let motion = 0;
  const padding = Math.min(SURFACE_PADDING, size * 0.04);
  for (const node of nodes) {
    // Keep even vigorous multi-touch squeezes inside the interaction surface.
    const x = Math.max(padding, Math.min(size - padding, node.x));
    const y = Math.max(padding, Math.min(size - padding, node.y));
    if (x !== node.x) node.ox = x;
    if (y !== node.y) node.oy = y;
    node.x = x;
    node.y = y;
    motion = Math.max(motion, Math.hypot(node.x - node.ox, node.y - node.oy));
  }
  return motion;
}
