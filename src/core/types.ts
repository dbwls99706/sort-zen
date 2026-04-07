export type ColorId = number;

export type Tube = {
  id: number;
  capacity: number;
  layers: ColorId[];
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
