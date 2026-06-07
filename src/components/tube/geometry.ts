import { Skia, SkPath } from '@shopify/react-native-skia';
import { TUBE_WIDTH, TUBE_HEIGHT, BORDER_RADIUS } from './dimensions';

export * from './dimensions';

/** 액체가 담기는 내부 영역 클립 패스 (바닥은 둥글게, 위는 열림) */
export function makeClipPath(): SkPath {
  const path = Skia.Path.Make();
  const left = 6;
  const right = TUBE_WIDTH - 6;
  const bottom = TUBE_HEIGHT - 6;
  const top = 6;
  const r = BORDER_RADIUS - 3;

  path.moveTo(left, top);
  path.lineTo(left, bottom - r);
  path.quadTo(left, bottom, left + r, bottom);
  path.lineTo(right - r, bottom);
  path.quadTo(right, bottom, right, bottom - r);
  path.lineTo(right, top);
  path.close();
  return path;
}

/** 유리관 외곽선 (U자 형태) */
export function makeOutlinePath(): SkPath {
  const path = Skia.Path.Make();
  path.moveTo(4, 8);
  path.lineTo(4, TUBE_HEIGHT - BORDER_RADIUS);
  path.quadTo(4, TUBE_HEIGHT - 4, BORDER_RADIUS, TUBE_HEIGHT - 4);
  path.lineTo(TUBE_WIDTH - BORDER_RADIUS, TUBE_HEIGHT - 4);
  path.quadTo(
    TUBE_WIDTH - 4,
    TUBE_HEIGHT - 4,
    TUBE_WIDTH - 4,
    TUBE_HEIGHT - BORDER_RADIUS,
  );
  path.lineTo(TUBE_WIDTH - 4, 8);
  return path;
}
