import React, { memo, useCallback, useEffect, useId, useMemo, useRef } from 'react';
import {
  buildSim,
  stepSimulation,
  type BlobPhysics,
  type BlobShape,
  type Finger,
  type Sim,
} from './blobPhysics';

export type { BlobPhysics, BlobShape } from './blobPhysics';

type Props = {
  size: number;
  outerColor: string;
  innerColor: string;
  physics: BlobPhysics;
  shape: BlobShape;
  resetKey: string;
  enabled?: boolean;
  accessibilityLabel?: string;
  onSqueezeStart: (x: number, y: number) => void;
  onSqueezeMove: (x: number, y: number, speed: number) => void;
  onRelease: () => void;
};

const STEP_MS = 1000 / 60;
const FEEDBACK_MS = 64;
const STABLE_MOTION = 0.045;
const STABLE_FRAMES = 18;
const MAX_SETTLE_FRAMES = 360;

function outline(sim: Sim): string {
  const nodes = sim.nodes;
  const point = (index: number) => nodes[(index + nodes.length) % nodes.length];
  let path = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let index = 0; index < nodes.length; index++) {
    const before = point(index - 1);
    const current = point(index);
    const next = point(index + 1);
    const after = point(index + 2);
    path += ` C ${current.x + (next.x - before.x) / 6} ${current.y + (next.y - before.y) / 6}, ${next.x - (after.x - current.x) / 6} ${next.y - (after.y - current.y) / 6}, ${next.x} ${next.y}`;
  }
  return `${path} Z`;
}

/** SVG uses the same physics as native without requiring a CanvasKit download. */
export const SoftBodyBlob = memo(function SoftBodyBlob({
  size,
  outerColor,
  innerColor,
  physics,
  shape,
  resetKey,
  enabled = true,
  accessibilityLabel,
  onSqueezeStart,
  onSqueezeMove,
  onRelease,
}: Props) {
  const initial = useMemo(() => buildSim(shape, size * 0.3, size / 2, size / 2), [shape, size]);
  const simulation = useRef(initial);
  const settings = useRef({ physics, size });
  settings.current = { physics, size };
  const path = useRef<SVGPathElement>(null);
  const fingers = useRef(new Map<number, Finger>());
  const frame = useRef<number | null>(null);
  const lastFrame = useRef(0);
  const accumulator = useRef(0);
  const stable = useRef(0);
  const settling = useRef(0);
  const feedback = useRef({ x: 0, y: 0, time: 0 });
  const gradientId = `asmr-${useId().replace(/:/g, '')}`;

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const wasTouching = fingers.current.size > 0;
    fingers.current.clear();
    if (wasTouching) onRelease();
  }, [onRelease]);

  const wake = useCallback(() => {
    stable.current = 0;
    settling.current = 0;
    if (frame.current !== null) return;
    lastFrame.current = 0;
    accumulator.current = 0;
    const update = (timestamp: number) => {
      accumulator.current = Math.min(
        accumulator.current + (lastFrame.current ? timestamp - lastFrame.current : STEP_MS),
        STEP_MS * 2,
      );
      lastFrame.current = timestamp;
      let changed = false;
      let motion = 0;
      while (accumulator.current >= STEP_MS) {
        motion = stepSimulation(
          simulation.current,
          settings.current.physics,
          [...fingers.current.values()],
          settings.current.size,
        );
        accumulator.current -= STEP_MS;
        changed = true;
      }
      if (changed) {
        path.current?.setAttribute('d', outline(simulation.current));
        if (fingers.current.size === 0) {
          settling.current++;
          stable.current = motion < STABLE_MOTION ? stable.current + 1 : 0;
        }
      }
      if (
        fingers.current.size === 0 &&
        (stable.current >= STABLE_FRAMES || settling.current >= MAX_SETTLE_FRAMES)
      ) {
        frame.current = null;
        return;
      }
      frame.current = requestAnimationFrame(update);
    };
    frame.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    stop();
    simulation.current = buildSim(shape, size * 0.3, size / 2, size / 2);
    path.current?.setAttribute('d', outline(simulation.current));
    if (enabled) wake();
    return stop;
  }, [shape, size, resetKey, enabled, stop, wake]);

  const localPoint = (event: React.PointerEvent<SVGSVGElement>): Finger => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) * size) / Math.max(1, bounds.width),
      y: ((event.clientY - bounds.top) * size) / Math.max(1, bounds.height),
    };
  };
  const releasePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!fingers.current.delete(event.pointerId)) return;
    const remaining = fingers.current.values().next().value as Finger | undefined;
    if (!remaining) {
      onRelease();
      wake();
    } else {
      feedback.current = { ...remaining, time: Date.now() };
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={accessibilityLabel}
      style={{ display: 'block', touchAction: 'none', userSelect: 'none' }}
      onPointerDown={(event) => {
        if (!enabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = localPoint(event);
        const first = fingers.current.size === 0;
        fingers.current.set(event.pointerId, point);
        if (first) {
          feedback.current = { ...point, time: Date.now() };
          onSqueezeStart(point.x, point.y);
        }
        wake();
      }}
      onPointerMove={(event) => {
        if (!enabled || !fingers.current.has(event.pointerId)) return;
        const point = localPoint(event);
        fingers.current.set(event.pointerId, point);
        if (fingers.current.keys().next().value !== event.pointerId) return;
        const now = Date.now();
        const elapsed = now - feedback.current.time;
        if (elapsed < FEEDBACK_MS) return;
        const speed =
          (Math.hypot(point.x - feedback.current.x, point.y - feedback.current.y) * STEP_MS) /
          elapsed;
        feedback.current = { ...point, time: now };
        onSqueezeMove(point.x, point.y, speed);
      }}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onLostPointerCapture={releasePointer}
    >
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={innerColor} />
          <stop offset="100%" stopColor={outerColor} />
        </radialGradient>
      </defs>
      <path ref={path} d={outline(initial)} fill={`url(#${gradientId})`} />
      <circle
        cx={size * 0.404}
        cy={size * 0.398}
        r={size * 0.054}
        fill="rgba(255,255,255,0.5)"
        pointerEvents="none"
      />
    </svg>
  );
});
