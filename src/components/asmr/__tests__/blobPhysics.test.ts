import {
  buildSim,
  flattenNodes,
  stepSimulation,
  type BlobPhysics,
  type BlobShape,
} from '../blobPhysics';

const SHAPE: BlobShape = { scale: 1, lobes: 0, lobeAmp: 0, aspectX: 1, aspectY: 1 };
const MATERIALS: BlobPhysics[] = [
  { pressure: 0.3, tension: 0.08, friction: 0.86 },
  { pressure: 0.45, tension: 0.2, friction: 0.78 },
  { pressure: 0.72, tension: 0.2, friction: 0.86 },
  { pressure: 0.85, tension: 0.65, friction: 0.7 },
  { pressure: 1, tension: 0.4, friction: 0.93 },
];
const SIZE = 320;

function height(sim: ReturnType<typeof buildSim>): number {
  const ys = sim.nodes.map((node) => node.y);
  return Math.max(...ys) - Math.min(...ys);
}

describe('ASMR soft-body interaction', () => {
  test.each(MATERIALS)(
    'responds to a center press without needing an edge collision (%o)',
    (physics) => {
      const idle = buildSim(SHAPE, SIZE * 0.3, SIZE / 2, SIZE / 2);
      const pressed = buildSim(SHAPE, SIZE * 0.3, SIZE / 2, SIZE / 2);
      for (let frame = 0; frame < 30; frame++) {
        stepSimulation(idle, physics, [], SIZE);
        stepSimulation(pressed, physics, [{ x: SIZE / 2, y: SIZE / 2 }], SIZE);
      }
      expect(height(pressed)).toBeLessThan(height(idle) - 5);
    },
  );

  test.each(MATERIALS)(
    'remains finite after rapid two-finger changes and settles on release (%o)',
    (physics) => {
      const sim = buildSim(SHAPE, SIZE * 0.3, SIZE / 2, SIZE / 2);
      for (let frame = 0; frame < 240; frame++) {
        const angle = frame * 0.21;
        stepSimulation(
          sim,
          physics,
          [
            { x: SIZE / 2 + Math.cos(angle) * 120, y: SIZE / 2 + Math.sin(angle) * 120 },
            { x: SIZE / 2 - Math.cos(angle) * 70, y: SIZE / 2 - Math.sin(angle) * 70 },
          ],
          SIZE,
        );
        for (const value of flattenNodes(sim.nodes)) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(SIZE);
        }
      }
      let motion = Infinity;
      for (let frame = 0; frame < 360; frame++) motion = stepSimulation(sim, physics, [], SIZE);
      expect(motion).toBeLessThan(0.045);
      const x = sim.nodes.reduce((sum, node) => sum + node.x, 0) / sim.nodes.length;
      const y = sim.nodes.reduce((sum, node) => sum + node.y, 0) / sim.nodes.length;
      expect(Math.hypot(x - SIZE / 2, y - SIZE / 2)).toBeLessThan(2);
    },
  );
});
