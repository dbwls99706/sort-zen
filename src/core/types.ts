export type ColorId = number;

export type Tube = {
  id: number;
  capacity: number;
  layers: ColorId[];
  /**
   * 바닥부터 색이 가려진(미공개) 레이어 수 — 회색+물음표로 표시(클래식 고레벨).
   * 맨 위 레이어는 항상 보이므로 항상 layers.length-1 이하. 생략 시 0(전부 공개).
   * 맨 위가 빠져 노출되면 자동 공개되며(단조 감소), 한 번 공개되면 다시 가려지지 않는다.
   */
  hiddenCount?: number;
};

export type Move = {
  from: number;
  to: number;
  count: number;
  colorId: ColorId;
};

export type GameState = {
  tubes: Tube[];
  moves: Move[];
  level: number;
  seed: string;
  startedAt: number;
};
