import { getPourGeometry, POUR_TILT_DEGREES, TubeLayout } from '../tube/pourGeometry';
import {
  TUBE_CONTAINER_TOP_GAP,
  TUBE_HEIGHT,
  TUBE_SELECTED_LIFT,
  TUBE_WIDTH,
} from '../tube/dimensions';

function layout(x: number, y: number, scale: number): TubeLayout {
  return {
    x,
    y,
    width: TUBE_WIDTH * scale,
    height: (TUBE_HEIGHT + TUBE_CONTAINER_TOP_GAP) * scale,
  };
}

describe('pour geometry', () => {
  it.each([0.8, 1, 1.3])(
    'places the transformed source lip directly above the receiver at scale %s',
    (scale) => {
      const scenarios = [
        [0, 0, 210, 0],
        [210, 0, 0, 0],
        [0, 210, 0, 0],
        [210, 0, 210, 210],
      ];
      for (const [fromX, fromY, toX, toY] of scenarios) {
        const source = layout(fromX * scale, fromY * scale, scale);
        const target = layout(toX * scale, toY * scale, scale);
        const result = getPourGeometry(source, target, scale);
        const sign = result.direction === 'right' ? 1 : -1;
        const radians = (sign * POUR_TILT_DEGREES * Math.PI) / 180;
        const lipX = sign * (TUBE_WIDTH / 2 - 4);
        const lipY = TUBE_CONTAINER_TOP_GAP + 8 - source.height / scale / 2;
        const actualX =
          source.x +
          source.width / 2 +
          result.translationX * scale +
          (lipX * Math.cos(radians) - lipY * Math.sin(radians)) * scale;
        const actualY =
          source.y +
          source.height / 2 +
          (result.translationY - TUBE_SELECTED_LIFT) * scale +
          (lipX * Math.sin(radians) + lipY * Math.cos(radians)) * scale;
        expect(actualX).toBeCloseTo(result.fromX);
        expect(actualY).toBeCloseTo(result.fromY);
        expect(result.fromX).toBeCloseTo(result.toX);
        expect(result.fromY).toBeLessThan(result.toY);
        expect(result.toY).toBeCloseTo(target.y + (TUBE_CONTAINER_TOP_GAP + 8) * scale);
      }
    },
  );

  it('keeps the tilted body towards the board for same-column edge moves', () => {
    expect(getPourGeometry(layout(0, 210, 1), layout(0, 0, 1), 1).direction).toBe('left');
    expect(getPourGeometry(layout(260, 210, 1), layout(260, 0, 1), 1).direction).toBe('right');
  });
});
