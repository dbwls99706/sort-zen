import type { SharedValue } from 'react-native-reanimated';
import type { Tube } from '../../core/types';

export type TubePourPreview = {
  role: 'source' | 'target';
  color: string;
  count: number;
  progress: SharedValue<number>;
  streamStartRatio: number;
  streamEndRatio: number;
};

export type TubeProps = {
  tube: Tube;
  selected: boolean;
  completed: boolean;
  hinted?: boolean;
  celebrating?: boolean;
  celebrationDelayMs?: number;
  pourPreview?: TubePourPreview;
  onPress: (id: number) => void;
  accessibilityLabel?: string;
  tiltAngle?: number;
  translationX?: number;
  translationY?: number;
};
