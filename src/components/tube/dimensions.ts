import { DEFAULT_CAPACITY } from '../../core/constants';

// Skia 비의존 순수 치수 상수 (테스트/레이아웃 계산에서 안전하게 import 가능)
export const TUBE_WIDTH = 52;
export const TUBE_HEIGHT = 160;
export const LAYER_HEIGHT = TUBE_HEIGHT / DEFAULT_CAPACITY;
export const BORDER_RADIUS = 12;

// 선택 시 위로 떠오르는 높이 + 컨테이너 상단 여백(떠오를 공간) — 붓기 연출 좌표 계산에 재사용
export const TUBE_SELECTED_LIFT = 20;
export const TUBE_CONTAINER_TOP_GAP = TUBE_SELECTED_LIFT + 4;
