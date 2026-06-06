import { Skia, SkPath } from '@shopify/react-native-skia';
import { DEFAULT_CAPACITY } from '../../core/constants';

export const TUBE_WIDTH = 52;
export const TUBE_HEIGHT = 160;
export const LAYER_HEIGHT = TUBE_HEIGHT / DEFAULT_CAPACITY;
export const BORDER_RADIUS = 12;

// 선택 시 위로 떠오르는 높이 + 컨테이너 상단 여백(떠오를 공간) — 붓기 연출 좌표 계산에 재사용
export const TUBE_SELECTED_LIFT = 20;
export const TUBE_CONTAINER_TOP_GAP = TUBE_SELECTED_LIFT + 4;

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
