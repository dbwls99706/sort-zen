import React, { Component, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { t } from '../i18n';

// 에러 바운더리는 React에서 클래스 컴포넌트로만 구현 가능하다
// (getDerivedStateFromError/componentDidCatch에 대응하는 훅이 없음).
// 프로젝트 "함수형 컴포넌트만" 규칙의 유일한 정당한 예외.

type Props = { children: ReactNode };
type State = { hasError: boolean };

// 테마 컨텍스트 자체가 깨졌을 수 있으므로 안전한 고정 색상을 사용한다.
const SAFE_BG = '#FFF8F0';
const SAFE_TEXT = '#333333';
const SAFE_ACCENT = '#FF9A76';

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.warn('Render error caught by ErrorBoundary', error);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('error_title')}</Text>
        <Pressable
          style={styles.button}
          onPress={this.handleRetry}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{t('error_retry')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SAFE_BG,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: SAFE_TEXT,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: SAFE_ACCENT,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
