import { Text, TextInput, type TextStyle } from 'react-native';
import JuaRegular from '../../assets/fonts/Jua-Regular.ttf';

/**
 * 앱 전역 한글 폰트.
 *
 * '주아체(Jua)'는 둥글고 친근한 캐주얼 손글씨 폰트로 Sort ZEN의 힐링/ASMR
 * 컨셉에 맞춘다. expo-font의 useFonts로 이 키('Jua')에 등록한 뒤 모든 Text/
 * TextInput의 기본 폰트로 적용한다(아래 applyGlobalFont).
 */
export const FONT_FAMILY = 'Jua';

/** useFonts에 넘기는 폰트 맵 — 키를 FONT_FAMILY와 일치시켜 플랫폼 무관하게 참조한다. */
export const FONT_ASSETS = {
  [FONT_FAMILY]: JuaRegular,
};

type Defaultable = { defaultProps?: { style?: TextStyle | TextStyle[] } };

/**
 * Text/TextInput의 기본 style에 fontFamily를 주입해 전역 폰트를 한 번에 적용한다.
 * 우리 폰트를 앞에 두어 컴포넌트가 명시한 style이 항상 우선되도록 한다(색/크기 등).
 * 폰트 로드 완료 후 1회만 호출한다(중복 호출 시 배열 중첩 방지를 위해 가드).
 */
let applied = false;
export function applyGlobalFont(): void {
  if (applied) return;
  applied = true;
  const targets: Defaultable[] = [
    Text as unknown as Defaultable,
    TextInput as unknown as Defaultable,
  ];
  for (const target of targets) {
    const prev = target.defaultProps?.style;
    target.defaultProps = {
      ...target.defaultProps,
      style: prev ? [{ fontFamily: FONT_FAMILY }, prev].flat() : { fontFamily: FONT_FAMILY },
    };
  }
}
