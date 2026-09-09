import type { AsmrMaterial } from '../../audio/asmrPools';
import type { BlobPhysics, BlobShape } from './blobPhysics';

export type ASMRMaterial = {
  id: string;
  name: string;
  nameKo: string;
  labelKo: string;
  labelEn: string;
  material: AsmrMaterial;
  colors: string[];
  particleColors: string[];
  descKo: string;
  descEn: string;
  blob: BlobPhysics;
  blobShape: BlobShape;
  particleSpeed: number;
  particleGravity: number;
  particleShape: 'circle' | 'cloud' | 'square' | 'droplet';
};

export const MATERIALS: ASMRMaterial[] = [
  {
    id: 'slime',
    name: 'Gooey Slime',
    nameKo: '말랑 슬라임',
    labelKo: '슬라임',
    labelEn: 'Slime',
    material: 'slime',
    colors: ['#96E6A1', '#D4FC79'],
    particleColors: ['#E3FFB2', '#A1E8AF', '#7CE0A6'],
    descKo: '쫀득하고 말랑한 슬라임입니다. 쭉 늘리며 만져보세요.',
    descEn: 'Squeeze and stretch the gooey slime to relax.',
    blob: { pressure: 0.3, tension: 0.08, friction: 0.86 },
    blobShape: {
      scale: 1,
      lobes: 0,
      lobeAmp: 0,
      aspectX: 0.94,
      aspectY: 1.1,
    },
    particleSpeed: 3.5,
    particleGravity: 0.1,
    particleShape: 'circle',
  },
  {
    id: 'shaving_cream',
    name: 'Shaving Cream',
    nameKo: '쉐이빙 크림',
    labelKo: '쉐이빙',
    labelEn: 'Foam',
    material: 'shaving',
    colors: ['#80DEEA', '#E0F7FA'],
    particleColors: ['#FFFFFF', '#E0F7FA', '#B2EBF2'],
    descKo: '몽글몽글하고 푹신한 크림입니다. 만지면 부풀어 오릅니다.',
    descEn: 'Squish and spread the fluffy shaving cream.',
    blob: { pressure: 0.45, tension: 0.2, friction: 0.78 },
    blobShape: {
      scale: 1.12,
      lobes: 8,
      lobeAmp: 0.07,
      aspectX: 1,
      aspectY: 1,
    },
    particleSpeed: 1.8,
    particleGravity: 0.05,
    particleShape: 'cloud',
  },
  {
    id: 'handcream',
    name: 'Soft Lotion',
    nameKo: '촉촉 핸드크림',
    labelKo: '로션',
    labelEn: 'Lotion',
    material: 'handcream',
    colors: ['#F48FB1', '#F8BBD0'],
    particleColors: ['#FFF0F5', '#F8BBD0', '#F1A7C4'],
    descKo: '부드럽고 매끄러운 로션입니다. 화면 전체를 미끄러지듯 문지르세요.',
    descEn: 'Rub the silky smooth lotion for calming sounds.',
    blob: { pressure: 0.72, tension: 0.2, friction: 0.86 },
    blobShape: {
      scale: 1.14,
      lobes: 0,
      lobeAmp: 0,
      aspectX: 1.12,
      aspectY: 0.93,
    },
    particleSpeed: 4.5,
    particleGravity: 0.16,
    particleShape: 'droplet',
  },
  {
    id: 'sponge',
    name: 'Sensory Sponge',
    nameKo: '구멍 숑숑 스펀지',
    labelKo: '스펀지',
    labelEn: 'Sponge',
    material: 'sponge',
    colors: ['#FFF176', '#FFF59D'],
    particleColors: ['#FFF9C4', '#FFF59D', '#FBC02D'],
    descKo: '폭신한 스펀지입니다. 꽉 쥐어 짜면 강하게 수축했다가 튕겨납니다.',
    descEn: 'Squeeze the porous sponge and enjoy the crackles.',
    blob: { pressure: 0.85, tension: 0.65, friction: 0.7 },
    blobShape: {
      scale: 0.96,
      lobes: 4,
      lobeAmp: 0.14,
      aspectX: 1,
      aspectY: 1,
    },
    particleSpeed: 7,
    particleGravity: 0.32,
    particleShape: 'square',
  },
  {
    id: 'water',
    name: 'Water Splash',
    nameKo: '찰랑찰랑 물',
    labelKo: '물',
    labelEn: 'Water',
    material: 'water',
    colors: ['#4FC3F7', '#B3E5FC'],
    particleColors: ['#E1F5FE', '#B3E5FC', '#0288D1'],
    descKo: '시원한 물입니다. 찰랑거리는 파도와 함께 물을 튀겨보세요.',
    descEn: 'Stir and splash clear water for bubbling ASMR.',
    blob: { pressure: 1, tension: 0.4, friction: 0.93 },
    blobShape: {
      scale: 1.14,
      lobes: 0,
      lobeAmp: 0,
      aspectX: 1.16,
      aspectY: 0.88,
    },
    particleSpeed: 10.5,
    particleGravity: 0.45,
    particleShape: 'droplet',
  },
];
