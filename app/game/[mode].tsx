import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../../src/store/gameStore';
import { useUserStore } from '../../src/store/userStore';
import { useProgressStore } from '../../src/store/progressStore';
import { useTheme } from '../../src/components/ThemeProvider';
import {
  TubeComponent,
  TUBE_CONTAINER_TOP_GAP,
} from '../../src/components/Tube';
import { TUBE_WIDTH, TUBE_HEIGHT } from '../../src/components/tube/dimensions';
import { computeTubeScale } from '../../src/utils/layout';
import { Background } from '../../src/components/Background';
import { HUD } from '../../src/components/HUD';
import { ClearModal } from '../../src/components/ClearModal';
import { SoundManager } from '../../src/audio/SoundManager';
import { Haptic } from '../../src/utils/haptics';
import { AdManager } from '../../src/ads/AdManager';
import { pour, isTubeComplete } from '../../src/core/rules';
import { hasLegalMove, findSolution } from '../../src/core/solver';
import { HINT_COST } from '../../src/core/constants';
import { StuckModal } from '../../src/components/StuckModal';
import {
  PourAnimation,
  POUR_DURATION_MS,
} from '../../src/components/PourAnimation';

type GameMode = 'classic' | 'zen';

type TubeLayout = { x: number; y: number; width: number; height: number };

type AnimatingPour = {
  fromId: number;
  toId: number;
  color: string;
  colorId: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  translationX: number;
  translationY: number;
  direction: 'left' | 'right';
  onComplete: () => void;
};

export default function GameScreen() {
  const { mode: rawMode } = useLocalSearchParams<{ mode: string }>();
  const mode: GameMode = rawMode === 'zen' ? 'zen' : 'classic';
  const router = useRouter();
  const theme = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();

  const tubes = useGameStore((s) => s.tubes);
  const moves = useGameStore((s) => s.moves);
  const selectedTube = useGameStore((s) => s.selectedTube);
  const level = useGameStore((s) => s.level);
  const cleared = useGameStore((s) => s.cleared);
  const selectTube = useGameStore((s) => s.selectTube);
  const undo = useGameStore((s) => s.undo);
  const reset = useGameStore((s) => s.reset);
  const startNewGame = useGameStore((s) => s.startNewGame);

  const coins = useUserStore((s) => s.coins);
  const userLevel = useUserStore((s) => s.level);
  const spendCoins = useUserStore((s) => s.spendCoins);
  const incrementLevel = useUserStore((s) => s.incrementLevel);
  const incrementCleared = useUserStore((s) => s.incrementCleared);
  const addCoins = useUserStore((s) => s.addCoins);
  const recordPour = useProgressStore((s) => s.recordPour);
  const recordClear = useProgressStore((s) => s.recordClear);

  const tubeLayouts = useRef<Record<number, TubeLayout>>({});
  const prevCompleted = useRef<Set<number>>(new Set());
  const mounted = useRef(true);
  const pourChain = useRef<{ colorId: number; count: number } | null>(null);
  const stopFlowHaptic = useRef<(() => void) | null>(null);
  const [animatingPour, setAnimatingPour] = useState<AnimatingPour | null>(null);
  // 힌트는 보드를 바꾸는 모든 이벤트(붓기/되돌리기/새 보드)에서 해제한다
  const [hint, setHint] = useState<{ from: number; to: number } | null>(null);

  // 막힘 감지 (T142): 합법 수 0 && 미완성이면 탈출 경로 안내
  const stuck = useMemo(
    () =>
      tubes.length > 0 &&
      !cleared &&
      !animatingPour &&
      !hasLegalMove(tubes),
    [tubes, cleared, animatingPour],
  );

  // 튜브 수/화면에 맞춘 반응형 스케일 (오버플로 방지)
  const scale = useMemo(
    () => computeTubeScale(tubes.length, winW - 32, winH * 0.6),
    [tubes.length, winW, winH],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopFlowHaptic.current?.();
    };
  }, []);

  useEffect(() => {
    const lvl = mode === 'classic' ? userLevel : undefined;
    startNewGame(mode, lvl);
    prevCompleted.current = new Set();
    pourChain.current = null;

    if (mode === 'zen') {
      SoundManager.playBGM('zen');
    } else {
      SoundManager.playBGM('classic');
    }

    return () => {
      SoundManager.stopBGM();
    };
  }, [mode, userLevel, startNewGame]);

  // 클리어 감지 -> 보상 + 사운드
  useEffect(() => {
    if (cleared) {
      SoundManager.play('level_clear');
      Haptic.success();
      incrementCleared();
      addCoins(10);
      recordClear({ mode, moveCount: moves.length });
      SoundManager.play('coin');

      if (mode === 'classic') {
        incrementLevel();
        AdManager.maybeShowInterstitial(mode);
      }
    }
  }, [cleared, mode, incrementCleared, addCoins, incrementLevel, recordClear, moves.length]);

  // 튜브 단색 완성 감지 → 미세 보상 사운드 + 햅틱 (클리어 순간은 level_clear에 양보)
  useEffect(() => {
    const nowComplete = new Set<number>();
    let hasNew = false;
    for (const t of tubes) {
      if (isTubeComplete(t)) {
        nowComplete.add(t.id);
        if (!prevCompleted.current.has(t.id)) hasNew = true;
      }
    }
    if (hasNew && !cleared) {
      SoundManager.play('complete_tube');
      Haptic.medium();
    }
    prevCompleted.current = nowComplete;
  }, [tubes, cleared]);

  const handleTubeLayout = (id: number) => (e: LayoutChangeEvent) => {
    tubeLayouts.current[id] = e.nativeEvent.layout;
  };

  // 붓기 피드백: 같은 색 연속 붓기는 음이 살짝 올라간다 (docs/02-audio.md)
  const playPourFeedback = (colorId: number) => {
    const chain =
      pourChain.current?.colorId === colorId ? pourChain.current.count + 1 : 0;
    pourChain.current = { colorId, count: chain };
    Haptic.medium();
    SoundManager.playPour(colorId, chain);
    recordPour();
    setHint(null);
  };

  const handlePourLand = useCallback(() => {
    stopFlowHaptic.current?.();
    stopFlowHaptic.current = null;
    if (!animatingPour || !mounted.current) return;
    selectTube(animatingPour.toId);
    setAnimatingPour(null);
  }, [animatingPour, selectTube]);

  const handleTubePress = (id: number) => {
    if (cleared || animatingPour) return;

    if (selectedTube === null) {
      const tube = tubes.find((t) => t.id === id);
      if (tube && tube.layers.length > 0) {
        SoundManager.play('select');
        Haptic.light();
        selectTube(id);
      }
      return;
    }

    if (selectedTube === id) {
      SoundManager.play('deselect');
      Haptic.light();
      selectTube(id);
      return;
    }

    const fromTube = tubes.find((t) => t.id === selectedTube);
    const toTube = tubes.find((t) => t.id === id);
    const result = fromTube && toTube ? pour(fromTube, toTube) : null;

    if (result) {
      const from = tubeLayouts.current[selectedTube];
      const to = tubeLayouts.current[id];
      
      if (from && to) {
        const colorId = result.move.colorId;
        const color = theme.colors[colorId % theme.colors.length];
        const direction = to.x > from.x ? 'right' : 'left';

        // Floating translation coordinates (place source mouth above target mouth)
        // Scaled inverse to match the Transform Scale of TubeComponent
        const translationX = (to.x - from.x) / scale + (direction === 'right' ? -15 : 15);
        const translationY = (to.y - from.y) / scale - 120;

        // Droplet stream coordinates relative to boardContainer
        const fromX = to.x + to.width / 2 + (direction === 'right' ? -15 : 15) * scale;
        const fromY = to.y - 30 * scale;
        const toX = to.x + to.width / 2;
        const toY = to.y + 10 * scale;

        playPourFeedback(colorId);
        stopFlowHaptic.current?.();
        stopFlowHaptic.current = Haptic.flow(POUR_DURATION_MS);

        setAnimatingPour({
          fromId: selectedTube,
          toId: id,
          color,
          colorId,
          fromX,
          fromY,
          toX,
          toY,
          translationX,
          translationY,
          direction,
          onComplete: handlePourLand
        });
        return;
      }
      // 레이아웃 미측정 시 즉시 커밋(폴백)
      playPourFeedback(result.move.colorId);
      selectTube(id);
      return;
    }

    // 부을 수 없으면 가벼운 피드백 후 대상으로 선택 전환 (docs/02-audio.md)
    Haptic.light();
    selectTube(id);
  };

  // 힌트 (T143): 솔버의 다음 1수를 하이라이트. 코인 부족 시 리워드 광고로 대체
  const handleHint = () => {
    if (cleared || animatingPour || hint) return;
    SoundManager.play('button_tap');
    Haptic.light();

    const solution = findSolution(tubes);
    if (!solution || solution.length === 0) return;
    const next = { from: solution[0].from, to: solution[0].to };

    if (spendCoins(HINT_COST)) {
      setHint(next);
      return;
    }
    AdManager.showRewarded(() => {
      if (mounted.current) setHint(next);
    });
  };

  const handleUndo = () => {
    if (animatingPour) return;
    SoundManager.play('button_tap');
    Haptic.light();
    pourChain.current = null;
    setHint(null);
    undo();
  };

  const handleReset = () => {
    if (animatingPour) return;
    SoundManager.play('button_tap');
    Haptic.light();
    prevCompleted.current = new Set();
    pourChain.current = null;
    setHint(null);
    reset();
  };

  const handlePause = () => {
    SoundManager.play('button_tap');
    Haptic.light();
    router.back();
  };

  const handleNextLevel = useCallback(() => {
    SoundManager.play('button_tap');
    Haptic.light();
    if (mode === 'classic') {
      startNewGame('classic', userLevel);
    } else {
      startNewGame('zen');
    }
    prevCompleted.current = new Set();
    pourChain.current = null;
    setHint(null);
    setAnimatingPour(null);
  }, [mode, userLevel, startNewGame]);

  const handleMenu = useCallback(() => {
    SoundManager.play('button_tap');
    Haptic.light();
    router.back();
  }, [router]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Background animated={false} />
      <HUD
        level={level}
        coins={coins}
        mode={mode}
        moveCount={moves.length}
        onHint={handleHint}
        onUndo={handleUndo}
        onReset={handleReset}
        onPause={handlePause}
      />

      <View style={styles.boardContainer}>
        <View style={styles.tubeGrid}>
          {tubes.map((tube) => {
            const isFrom = animatingPour?.fromId === tube.id;
            return (
              <View
                key={tube.id}
                onLayout={handleTubeLayout(tube.id)}
                style={{
                  width: TUBE_WIDTH * scale,
                  height: (TUBE_HEIGHT + TUBE_CONTAINER_TOP_GAP) * scale,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ transform: [{ scale }] }}>
                  <TubeComponent
                    tube={tube}
                    selected={selectedTube === tube.id}
                    completed={isTubeComplete(tube)}
                    hinted={hint?.from === tube.id || hint?.to === tube.id}
                    onPress={() => handleTubePress(tube.id)}
                    tiltAngle={isFrom ? (animatingPour.direction === 'right' ? 70 : -70) : 0}
                    translationX={isFrom ? animatingPour.translationX : 0}
                    translationY={isFrom ? animatingPour.translationY : 0}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {animatingPour && (
          <PourAnimation
            fromX={animatingPour.fromX}
            fromY={animatingPour.fromY}
            toX={animatingPour.toX}
            toY={animatingPour.toY}
            color={animatingPour.color}
            onComplete={animatingPour.onComplete}
          />
        )}
      </View>

      <StuckModal
        visible={stuck}
        canUndo={moves.length > 0}
        onUndo={handleUndo}
        onNewBoard={handleReset}
      />

      <ClearModal
        visible={cleared}
        level={level}
        moveCount={moves.length}
        mode={mode}
        onNextLevel={handleNextLevel}
        onMenu={handleMenu}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  boardContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  tubeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
});
