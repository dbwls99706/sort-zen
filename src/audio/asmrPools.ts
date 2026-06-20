/**
 * ASMR 감각 방 재질별 사운드 풀.
 *
 * 탭 임팩트와 접촉 루프 모두 풀에서 매번 랜덤으로 뽑아 재생한다 — 실제 폴리처럼
 * 만질 때마다 미세하게 다른 소리가 나도록(반복 지루함 제거).
 *
 * 라이선스: 전부 CC0(출처표기 불필요).
 *  - water/slime 임팩트·물 루프: OpenGameArt "40 CC0 water/splash/slime SFX"
 *  - handcream 임팩트: OpenGameArt "8 wet squish/slurp impacts"
 *  - shaving(폼) 임팩트·루프: Freesound CC0 "shaving foam spray"
 *  - sponge 임팩트/루프, slime·handcream 루프: 절차적 합성 자산(전용 CC0 부재) 유지.
 */
export type AsmrMaterial = 'water' | 'handcream' | 'slime' | 'shaving' | 'sponge';

type Pool = { impacts: number[]; loops: number[] };

/* eslint-disable @typescript-eslint/no-require-imports */
export const ASMR_POOLS: Record<AsmrMaterial, Pool> = {
  water: {
    impacts: [
      require('./assets/cc0/water_imp_01.mp3'),
      require('./assets/cc0/water_imp_02.mp3'),
      require('./assets/cc0/water_imp_03.mp3'),
      require('./assets/cc0/water_imp_04.mp3'),
      require('./assets/cc0/water_imp_05.mp3'),
      require('./assets/cc0/water_imp_06.mp3'),
      require('./assets/cc0/water_imp_07.mp3'),
      require('./assets/cc0/water_imp_08.mp3'),
      require('./assets/cc0/water_imp_09.mp3'),
      require('./assets/cc0/water_imp_10.mp3'),
      require('./assets/cc0/water_imp_11.mp3'),
      require('./assets/cc0/water_imp_12.mp3'),
      require('./assets/cc0/water_imp_13.mp3'),
      require('./assets/cc0/water_imp_14.mp3'),
      require('./assets/cc0/water_imp_15.mp3'),
    ],
    loops: [
      require('./assets/cc0/water_loop_01.mp3'),
      require('./assets/cc0/water_loop_02.mp3'),
      require('./assets/cc0/water_loop_03.mp3'),
    ],
  },
  handcream: {
    impacts: [
      require('./assets/cc0/cream_imp_01.mp3'),
      require('./assets/cc0/cream_imp_02.mp3'),
      require('./assets/cc0/cream_imp_03.mp3'),
      require('./assets/cc0/cream_imp_04.mp3'),
      require('./assets/cc0/cream_imp_05.mp3'),
      require('./assets/cc0/cream_imp_06.mp3'),
      require('./assets/cc0/cream_imp_07.mp3'),
      require('./assets/cc0/cream_imp_08.mp3'),
    ],
    loops: [require('./assets/handcream.mp3')],
  },
  slime: {
    impacts: [
      require('./assets/cc0/slime_imp_01.mp3'),
      require('./assets/cc0/slime_imp_02.mp3'),
      require('./assets/cc0/slime_imp_03.mp3'),
      require('./assets/cc0/slime_imp_04.mp3'),
      require('./assets/cc0/slime_imp_05.mp3'),
      require('./assets/cc0/slime_imp_06.mp3'),
      require('./assets/cc0/slime_imp_07.mp3'),
      require('./assets/cc0/slime_imp_08.mp3'),
      require('./assets/cc0/slime_imp_09.mp3'),
      require('./assets/cc0/slime_imp_10.mp3'),
      require('./assets/cc0/slime_imp_11.mp3'),
      require('./assets/cc0/slime_imp_12.mp3'),
      require('./assets/cc0/slime_imp_13.mp3'),
      require('./assets/cc0/slime_imp_14.mp3'),
      require('./assets/cc0/slime_imp_15.mp3'),
      require('./assets/cc0/slime_imp_16.mp3'),
    ],
    loops: [require('./assets/slime.mp3')],
  },
  shaving: {
    impacts: [
      require('./assets/cc0/foam_imp_01.mp3'),
      require('./assets/cc0/foam_imp_02.mp3'),
      require('./assets/cc0/foam_imp_03.mp3'),
      require('./assets/cc0/foam_imp_04.mp3'),
    ],
    loops: [require('./assets/cc0/foam_loop_01.mp3')],
  },
  sponge: {
    impacts: [require('./assets/impact_sponge.wav')],
    loops: [require('./assets/sponge.mp3')],
  },
};
/* eslint-enable @typescript-eslint/no-require-imports */
