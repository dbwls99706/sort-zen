import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { useGameStore } from '../../src/store/gameStore';
import { useUserStore } from '../../src/store/userStore';
import { useProgressStore } from '../../src/store/progressStore';
import { useTheme } from '../../src/components/ThemeProvider';
import {
  TubeComponent,
  TUBE_CONTAINER_TOP_GAP,
  TUBE_SELECTED_LIFT,
  type TubePourPreview,
} from '../../src/components/Tube';
import { TUBE_HEIGHT, TUBE_WIDTH } from '../../src/components/tube/dimensions';
import { computeTubeScale } from '../../src/utils/layout';
import { Background } from '../../src/components/Background';
import { HUD } from '../../src/components/HUD';
import { ClearModal } from '../../src/components/ClearModal';
import { BoardCelebration } from '../../src/components/BoardCelebration';
import { SoundManager } from '../../src/audio/SoundManager';
import { Haptic } from '../../src/utils/haptics';
import { AdManager } from '../../src/ads/AdManager';
import { GameServicesManager } from '../../src/services/GameServicesManager';
import { isTubeComplete, pour } from '../../src/core/rules';
import { findSolution, hasLegalMove } from '../../src/core/solver';
import { calcStars, clearCoinReward } from '../../src/core/scoring';
import { HINT_COST } from '../../src/core/constants';
import { StuckModal } from '../../src/components/StuckModal';
import { PourAnimation } from '../../src/components/PourAnimation';
import {
  CLEAR_BOARD_CELEBRATION_MS,
  getPourTiming,
  type PourTiming,
} from '../../src/components/pourTiming';

type GameMode = 'classic' | 'zen';
type TubeLayout = { x: number; y: number; width: number; height: number };

type AnimatingPour = {
  fromId: number;
  toId: number;
  color: string;
  colorId: number;
  count: number;
  chainCount: number;
  timing: PourTiming;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  translationX: number;
  translationY: number;
  direction: 'left' | 'right';
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
  const extraTubeUsed = useGameStore((s) => s.extraTubeUsed);
  const addExtraTube = useGameStore((s) => s.addExtraTube);
  const optimalMoves = useGameStore((s) => s.optimalMoves);

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
  const activePour = useRef<AnimatingPour | null>(null);
  const pourChain = useRef<{ colorId: number; count: number } | null>(null);
  const stopFlowHaptic = useRef<(() => void) | null>(null);
  const pourSafetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearModalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardedClear = useRef(false);
  const pourProgress = useSharedValue(0);

  const [animatingPour, setAnimatingPour] = useState<AnimatingPour | null>(null);
  const [hint, setHint] = useState<{ from: number; to: number } | null>(null);
  const [boardCelebrating, setBoardCelebrating] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const stuck = useMemo(
    () =>
      tubes.length > 0 &&
      !cleared &&
      !animatingPour &&
      !hasLegalMove(tubes),
    [tubes, cleared, animatingPour],
  );

  const scale = useMemo(
    () => computeTubeScale(tubes.length, winW - 32, winH * 0.6),
    [tubes.length, winW, winH],
  );

  const clearPourRuntime = useCallback(() => {
    stopFlowHaptic.current?.();
    stopFlowHaptic.current = null;
    if (pourSafetyTimer.current) {
      clearTimeout(pourSafetyTimer.current);
      pourSafetyTimer.current = null;
    }
  }, []);

  const clearCelebrationRuntime = useCallback(() => {
    if (clearModalTimer.current) {
      clearTimeout(clearModalTimer.current);
      clearModalTimer.current = null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearPourRuntime();
      clearCelebrationRuntime();
    };
  }, [clearPourRuntime, clearCelebrationRuntime]);

  useEffect(() => {
    // 사용자 레벨은 화면 진입 시에만 읽는다. 클리어 보상으로 userLevel이 증가해도
    // 이 효과가 재실행되어 결과 연출 전에 새 보드가 생성되지 않는다.
    const levelAtEntry =
      mode === 'classic' ? useUserStore.getState().level : undefined;
    startNewGame(mode, levelAtEntry);
    prevCompleted.current = new Set();
    pourChain.current = null;
    rewardedClear.current = false;
    setAnimatingPour(null);
    setHint(null);
    setBoardCelebrating(false);
    setShowClearModal(false);

    SoundManager.playBGM(mode === 'zen' ? 'zen' : 'classic');
    return () => {
      SoundManager.stopBGM();
    };
  }, [mode, startNewGame]);

  const stars = useMemo(
    () => calcStars(moves.length, optimalMoves),
    [moves.length, optimalMoves],
  );
  const coinReward = clearCoinReward(stars);

  useEffect(() => {
    if (!cleared || rewardedClear.current) return;
    rewardedClear.current = true;
    clearPourRuntime();
    setBoardCelebrating(true);
    setShowClearModal(false);

    SoundManager.play('level_clear');
    Haptic.success();
    incrementCleared();
    addCoins(coinReward);
    recordClear({ mode, moveCount: moves.length });

    if (mode === 'classic') {
      incrementLevel();
      GameServicesManager.submitBestScore();
    }

    clearCelebrationRuntime();
    clearModalTimer.current = setTimeout(() => {
      if (!mounted.current) return;
      setBoardCelebrating(false);
      setShowClearModal(true);
      clearModalTimer.current = null;
    }, CLEAR_BOARD_CELEBRATION_MS);
  }, [
    cleared,
    mode,
    moves.length,
    coinReward,
    incrementCleared,
    addCoins,
    recordClear,
    incrementLevel,
    clearPourRuntime,
    clearCelebrationRuntime,
  ]);

  useEffect(() => {
    const nowComplete = new Set<number>();
    let hasNew = false;
    for (const tube of tubes) {
      if (isTubeComplete(tube)) {
        nowComplete.add(tube.id);
        if (!prevCompleted.current.has(tube.id)) hasNew = true;
      }
    }
    if (hasNew && !cleared) {
      SoundManager.play('complete_tube');
      Haptic.medium();
    }
    prevCompleted.current = nowComplete;
  }, [tubes, cleared]);

  const handleTubeLayout = (id: number) => (event: LayoutChangeEvent) => {
    tubeLayouts.current[id] = event.nativeEvent.layout;
  };

  const registerPour = (colorId: number): number => {
    const chainCount =
      pourChain.current?.colorId === colorId
        ? pourChain.current.count + 1
        : 0;
    pourChain.current = { colorId, count: chainCount };
    recordPour();
    setHint(null);
    return chainCount;
  };

  const handlePourStreamStart = useCallback(() => {
    const active = activePour.current;
    if (!active || !mounted.current) return;
    SoundManager.playPour(active.colorId, active.chainCount, active.count);
    Haptic.medium();
    stopFlowHaptic.current?.();
    stopFlowHaptic.current = Haptic.flow(active.timing.streamMs);
  }, []);

  const handlePourImpact = useCallback(() => {
    if (!activePour.current || !mounted.current) return;
    Haptic.light();
  }, []);

  const handlePourLand = useCallback(() => {
    clearPourRuntime();
    const active = activePour.current;
    activePour.current = null;
    if (!active || !mounted.current) return;
    selectTube(active.toId);
    setAnimatingPour(null);
  }, [selectTube, clearPourRuntime]);

  const handleTubePress = (id: number) => {
    if (cleared || boardCelebrating || animatingPour) return;

    if (selectedTube === null) {
      const tube = tubes.find((item) => item.id === id);
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

    const fromTube = tubes.find((tube) => tube.id === selectedTube);
    const toTube = tubes.find((tube) => tube.id === id);
    const result = fromTube && toTube ? pour(fromTube, toTube) : null;

    if (!result) {
      Haptic.light();
      selectTube(id);
      return;
    }

    const chainCount = registerPour(result.move.colorId);
    const from = tubeLayouts.current[selectedTube];
    const to = tubeLayouts.current[id];

    if (!from || !to) {
      SoundManager.playPour(
        result.move.colorId,
        chainCount,
        result.move.count,
      );
      Haptic.medium();
      selectTube(id);
      return;
    }

    const colorId = result.move.colorId;
    const color = theme.colors[colorId % theme.colors.length];
    const direction = to.x > from.x ? 'right' : 'left';
    const directionSign = direction === 'right' ? 1 : -1;
    const pourLift = 120;
    const translationX =
      (to.x - from.x) / scale + (direction === 'right' ? -15 : 15);
    const translationY = (to.y - from.y) / scale - pourLift;

    const pivotX = from.x + from.width / 2 + translationX * scale;
    const pivotY =
      from.y +
      from.height / 2 +
      (translationY - TUBE_SELECTED_LIFT) * scale;
    const rimY = (TUBE_CONTAINER_TOP_GAP - TUBE_HEIGHT) / 2;
    const lipX = directionSign * TUBE_WIDTH * 0.35;
    const radians = (directionSign * 70 * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const fromX = pivotX + (lipX * cos - rimY * sin) * scale;
    const fromY = pivotY + (lipX * sin + rimY * cos) * scale;
    const toX = to.x + to.width / 2;
    const toY = to.y + 10 * scale;
    const timing = getPourTiming(result.move.count);

    const nextPour: AnimatingPour = {
      fromId: selectedTube,
      toId: id,
      color,
      colorId,
      count: result.move.count,
      chainCount,
      timing,
      fromX,
      fromY,
      toX,
      toY,
      translationX,
      translationY,
      direction,
    };

    clearPourRuntime();
    pourProgress.value = 0;
    activePour.current = nextPour;
    setAnimatingPour(nextPour);
    pourSafetyTimer.current = setTimeout(
      handlePourLand,
      timing.totalMs + 400,
    );
  };

  const handleHint = () => {
    if (cleared || boardCelebrating || animatingPour || hint) return;
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

  const handleAddTube = () => {
    SoundManager.play('button_tap');
    Haptic.light();
    AdManager.showRewarded(() => {
      if (mounted.current) addExtraTube();
    });
  };

  const handleUndo = () => {
    if (cleared || boardCelebrating || animatingPour) return;
    SoundManager.play('button_tap');
    Haptic.light();
    pourChain.current = null;
    setHint(null);
    undo();
  };

  const handleReset = () => {
    if (cleared || boardCelebrating || animatingPour) return;
    SoundManager.play('button_tap');
    Haptic.light();
    prevCompleted.current = new Set();
    pourChain.current = null;
    rewardedClear.current = false;
    setHint(null);
    setBoardCelebrating(false);
    setShowClearModal(false);
    reset();
  };

  const handlePause = () => {
    if (animatingPour) return;
    SoundManager.play('button_tap');
    Haptic.light();
    router.back();
  };

  const handleNextLevel = useCallback(() => {
    SoundManager.play('button_tap');
    Haptic.light();
    clearPourRuntime();
    clearCelebrationRuntime();
    setBoardCelebrating(false);
    setShowClearModal(false);
    rewardedClear.current = false;

    if (mode === 'classic') {
      startNewGame('classic', userLevel);
      AdManager.maybeShowInterstitial('classic');
    } else {
      startNewGame('zen');
    }

    prevCompleted.current = new Set();
    pourChain.current = null;
    activePour.current = null;
    setHint(null);
    setAnimatingPour(null);
  }, [
    mode,
    userLevel,
    startNewGame,
    clearPourRuntime,
    clearCelebrationRuntime,
  ]);

  const handleMenu = useCallback(() => {
    SoundManager.play('button_tap');
    Haptic.light();
    clearPourRuntime();
    clearCelebrationRuntime();
    router.back();
  }, [router, clearPourRuntime, clearCelebrationRuntime]);

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
          {tubes.map((tube, index) => {
            const isFrom = animatingPour?.fromId === tube.id;
            const isTo = animatingPour?.toId === tube.id;
            let pourPreview: TubePourPreview | undefined;
            if (animatingPour && (isFrom || isTo)) {
              pourPreview = {
                role: isFrom ? 'source' : 'target',
                color: animatingPour.color,
                count: animatingPour.count,
                progress: pourProgress,
                streamStartRatio: animatingPour.timing.streamStartRatio,
                streamEndRatio: animatingPour.timing.streamEndRatio,
              };
            }

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
                    celebrating={boardCelebrating}
                    celebrationDelayMs={index * 65}
                    pourPreview={pourPreview}
                    onPress={() => handleTubePress(tube.id)}
                    tiltAngle={
                      isFrom
                        ? animatingPour.direction === 'right'
                          ? 70
                          : -70
                        : 0
                    }
                    translationX={
                      isFrom ? animatingPour.translationX : 0
                    }
                    translationY={
                      isFrom ? animatingPour.translationY : 0
                    }
                  />
                </View>
              </View>
            );
          })}

          {animatingPour && (
            <PourAnimation
              fromX={animatingPour.fromX}
              fromY={animatingPour.fromY}
              toX={animatingPour.toX}
              toY={animatingPour.toY}
              color={animatingPour.color}
              layerCount={animatingPour.count}
              progress={pourProgress}
              scale={scale}
              onStreamStart={handlePourStreamStart}
              onImpact={handlePourImpact}
              onComplete={handlePourLand}
            />
          )}
        </View>

        <BoardCelebration
          visible={boardCelebrating}
          colors={theme.colors}
          seed={level + moves.length * 17}
        />
      </View>

      <StuckModal
        visible={stuck}
        canUndo={moves.length > 0}
        onUndo={handleUndo}
        onNewBoard={handleReset}
        onAddTube={
          mode === 'classic' && !extraTubeUsed ? handleAddTube : undefined
        }
      />

      <ClearModal
        visible={showClearModal}
        level={level}
        moveCount={moves.length}
        mode={mode}
        stars={stars}
        coinReward={coinReward}
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
