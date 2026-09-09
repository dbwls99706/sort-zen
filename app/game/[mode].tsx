import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../../src/store/gameStore';
import { useUserStore } from '../../src/store/userStore';
import { useProgressStore } from '../../src/store/progressStore';
import { useTheme } from '../../src/components/ThemeProvider';
import {
  TubeComponent,
  TUBE_CONTAINER_TOP_GAP,
  type TubePourPreview,
} from '../../src/components/Tube';
import { TUBE_HEIGHT } from '../../src/components/tube/dimensions';
import { POUR_TILT_DEGREES, type TubeLayout } from '../../src/components/tube/pourGeometry';
import { computeBoardLayout, TUBE_GRID_GAP } from '../../src/utils/layout';
import { Background } from '../../src/components/Background';
import { HUD, GameToolbar } from '../../src/components/HUD';
import { ClearModal } from '../../src/components/ClearModal';
import { BoardCelebration } from '../../src/components/BoardCelebration';
import { GameDialog } from '../../src/components/GameDialog';
import { StuckModal } from '../../src/components/StuckModal';
import { PourAnimation } from '../../src/components/PourAnimation';
import { SoundManager } from '../../src/audio/SoundManager';
import { Haptic } from '../../src/utils/haptics';
import { GameServicesManager } from '../../src/services/GameServicesManager';
import { isTubeComplete } from '../../src/core/rules';
import { hasLegalMove } from '../../src/core/solver';
import { calcStars, clearCoinReward } from '../../src/core/scoring';
import { CLEAR_BOARD_CELEBRATION_MS } from '../../src/components/pourTiming';
import { useBoardControls } from '../../src/game/useBoardControls';
import { useTranslation } from '../../src/i18n';

type GameMode = 'classic' | 'zen';
const BOARD_VERTICAL_SPACE = 84;

export default function GameScreen() {
  const { mode: rawMode } = useLocalSearchParams<{ mode: string }>();
  const mode: GameMode = rawMode === 'zen' ? 'zen' : 'classic';
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const tubes = useGameStore((s) => s.tubes);
  const moves = useGameStore((s) => s.moves);
  const selectedTube = useGameStore((s) => s.selectedTube);
  const level = useGameStore((s) => s.level);
  const cleared = useGameStore((s) => s.cleared);
  const boardRevision = useGameStore((s) => s.boardRevision);
  const extraTubeUsed = useGameStore((s) => s.extraTubeUsed);
  const optimalMoves = useGameStore((s) => s.optimalMoves);
  const coins = useUserStore((s) => s.coins);
  const layouts = useRef<Record<number, TubeLayout>>({});
  const rewarded = useRef(false);
  const prevCompleted = useRef(new Set<number>());
  const [boardSize, setBoardSize] = useState({ width: 360, height: 450 });
  const [celebrating, setCelebrating] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layout = useMemo(
    () =>
      computeBoardLayout(
        tubes.length,
        boardSize.width - 32,
        boardSize.height - BOARD_VERTICAL_SPACE,
      ),
    [tubes.length, boardSize],
  );
  const { scale } = layout;
  const resetCelebration = useCallback(() => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = null;
    rewarded.current = false;
    prevCompleted.current = new Set();
    setCelebrating(false);
    setShowClear(false);
  }, []);
  const goMenu = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);
  const startNextLevel = useCallback(() => {
    resetCelebration();
    // Unchanged slots do not emit onLayout again on native. Keep their measurements.
    useGameStore
      .getState()
      .startNewGame(mode, mode === 'classic' ? useUserStore.getState().level : undefined);
  }, [mode, resetCelebration]);
  const controls = useBoardControls({
    scale,
    layouts,
    onReset: resetCelebration,
    onMenu: goMenu,
    onNextLevel: startNextLevel,
  });
  const { animatingPour, progress, dialog, settle } = controls;
  const stars = calcStars(moves.length, optimalMoves);
  const reward = clearCoinReward(stars);
  const completeCount = useMemo(() => tubes.filter(isTubeComplete).length, [tubes]);
  const colorCount = useMemo(() => new Set(tubes.flatMap((tube) => tube.layers)).size, [tubes]);
  const stuck = useMemo(
    () => tubes.length > 0 && !cleared && !animatingPour && !hasLegalMove(tubes),
    [tubes, cleared, animatingPour],
  );

  useEffect(() => {
    resetCelebration();
    const game = useGameStore.getState();
    // Leaving for the menu preserves this session; returning does not replace the puzzle.
    if (game.mode !== mode || game.tubes.length === 0 || game.cleared) {
      game.startNewGame(mode, mode === 'classic' ? useUserStore.getState().level : undefined);
    } else if (game.selectedTube !== null) game.selectTube(game.selectedTube);
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, [mode, resetCelebration]);
  useEffect(() => {
    if (dialog || controls.adBusy) return;
    SoundManager.playBGM(mode);
    return () => {
      SoundManager.stopBGM();
    };
  }, [mode, dialog, controls.adBusy]);
  useEffect(() => {
    const current = useGameStore.getState();
    if (!cleared || !current.cleared || current.boardRevision !== boardRevision || rewarded.current)
      return;
    rewarded.current = true;
    setCelebrating(true);
    SoundManager.play('level_clear');
    Haptic.success();
    const user = useUserStore.getState();
    user.incrementCleared();
    user.addCoins(reward);
    useProgressStore.getState().recordClear({ mode, moveCount: moves.length });
    if (mode === 'classic') {
      user.incrementLevel();
      GameServicesManager.submitBestScore();
    }
    clearTimer.current = setTimeout(() => {
      setCelebrating(false);
      setShowClear(true);
      clearTimer.current = null;
    }, CLEAR_BOARD_CELEBRATION_MS);
  }, [cleared, boardRevision, mode, reward, moves.length]);
  useEffect(() => {
    const completed = new Set(tubes.filter(isTubeComplete).map((tube) => tube.id));
    if (
      !cleared &&
      moves.length > 0 &&
      [...completed].some((id) => !prevCompleted.current.has(id))
    ) {
      SoundManager.play('complete_tube');
      Haptic.medium();
    }
    prevCompleted.current = completed;
  }, [tubes, cleared, moves.length]);

  const handleBoardLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (width !== boardSize.width || height !== boardSize.height) settle();
      setBoardSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    },
    [boardSize.width, boardSize.height, settle],
  );
  const instruction = controls.hintBusy
    ? t('hint_searching')
    : (controls.notice ??
      t(
        animatingPour
          ? 'board_pouring'
          : selectedTube !== null
            ? 'board_destination'
            : 'board_instruction',
      ));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Background animated={false} />
      <HUD
        level={level}
        coins={coins}
        mode={mode}
        moveCount={moves.length}
        onHint={controls.requestHint}
        onUndo={controls.undo}
        onReset={controls.requestReset}
        onPause={controls.pause}
        toolbar={false}
      />
      <View style={styles.boardStatus}>
        <Text style={[styles.progressText, { color: theme.accentInk }]}>
          {t('board_sorted', { n: completeCount, total: colorCount })}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.accent,
                width: `${colorCount > 0 ? (completeCount / colorCount) * 100 : 0}%`,
              },
            ]}
          />
        </View>
      </View>
      <View style={styles.boardContainer} onLayout={handleBoardLayout}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={layout.scrolls}
          scrollEnabled={layout.scrolls && !animatingPour}
          style={styles.boardScroll}
          contentContainerStyle={[styles.boardContent, { minHeight: boardSize.height }]}
        >
          <View style={[styles.tubeGrid, { width: layout.width }]}>
            {tubes.map((tube, index) => {
              const isFrom = animatingPour?.fromId === tube.id;
              const isTo = animatingPour?.toId === tube.id;
              const preview: TubePourPreview | undefined =
                animatingPour && (isFrom || isTo)
                  ? {
                      role: isFrom ? 'source' : 'target',
                      color: animatingPour.color,
                      count: animatingPour.count,
                      progress,
                      streamStartRatio: animatingPour.timing.streamStartRatio,
                      streamEndRatio: animatingPour.timing.streamEndRatio,
                    }
                  : undefined;
              const complete = isTubeComplete(tube);
              return (
                <View
                  key={tube.id}
                  onLayout={(event) => {
                    layouts.current[tube.id] = event.nativeEvent.layout;
                  }}
                  style={[
                    styles.tubeSlot,
                    {
                      width: layout.cellWidth,
                      height: (TUBE_HEIGHT + TUBE_CONTAINER_TOP_GAP) * scale,
                      zIndex: isFrom ? 10 : 0,
                    },
                  ]}
                >
                  <View style={{ transform: [{ scale }] }}>
                    <TubeComponent
                      tube={tube}
                      selected={selectedTube === tube.id}
                      completed={complete}
                      hinted={controls.hint?.from === tube.id || controls.hint?.to === tube.id}
                      celebrating={celebrating}
                      celebrationDelayMs={index * 40}
                      pourPreview={preview}
                      onPress={controls.handleTubePress}
                      accessibilityLabel={`${t('tube_label', { n: index + 1, count: tube.layers.length, capacity: tube.capacity })}${complete ? `, ${t('tube_complete')}` : tube.layers.length === 0 ? `, ${t('tube_empty')}` : ''}`}
                      tiltAngle={
                        isFrom
                          ? animatingPour.direction === 'right'
                            ? POUR_TILT_DEGREES
                            : -POUR_TILT_DEGREES
                          : 0
                      }
                      translationX={isFrom ? animatingPour.translationX : 0}
                      translationY={isFrom ? animatingPour.translationY : 0}
                    />
                  </View>
                </View>
              );
            })}
            {animatingPour && (
              <PourAnimation
                key={animatingPour.token}
                fromX={animatingPour.fromX}
                fromY={animatingPour.fromY}
                toX={animatingPour.toX}
                toY={animatingPour.toY}
                color={animatingPour.color}
                layerCount={animatingPour.count}
                progress={progress}
                scale={scale}
                onStreamStart={controls.streamStart}
                onImpact={controls.impact}
                onComplete={controls.complete}
              />
            )}
          </View>
        </ScrollView>
        <BoardCelebration
          visible={celebrating}
          colors={theme.colors}
          seed={level + moves.length * 17}
        />
      </View>
      <Text
        style={[styles.instruction, { color: theme.textSecondary }]}
        accessibilityLiveRegion="polite"
      >
        {instruction}
      </Text>
      <GameToolbar
        onHint={controls.requestHint}
        onUndo={controls.undo}
        onReset={controls.requestReset}
        canUndo={moves.length > 0 || !!animatingPour}
        disabled={cleared || !!dialog || controls.adBusy}
      />
      <StuckModal
        visible={stuck && !dialog && !controls.adBusy}
        canUndo={moves.length > 0}
        onUndo={controls.undo}
        onNewBoard={controls.reset}
        onAddTube={mode === 'classic' && !extraTubeUsed ? controls.addTube : undefined}
        onMenu={controls.menu}
        notice={controls.notice}
      />
      <GameDialog
        kind={dialog}
        onResume={controls.resume}
        onReset={dialog === 'reset' ? controls.reset : controls.requestReset}
        onMenu={controls.menu}
        onRewardHint={controls.watchHintAd}
      />
      <ClearModal
        visible={showClear}
        level={level}
        moveCount={moves.length}
        mode={mode}
        stars={stars}
        coinReward={reward}
        busy={controls.adBusy}
        onNextLevel={controls.nextLevel}
        onMenu={controls.menu}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  boardStatus: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 24, gap: 8 },
  progressText: { fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 4, width: 100, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  boardContainer: { flex: 1, minHeight: 100 },
  boardScroll: { flex: 1 },
  boardContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: BOARD_VERTICAL_SPACE / 2,
  },
  tubeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: TUBE_GRID_GAP,
    position: 'relative',
  },
  tubeSlot: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  instruction: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 24,
    paddingTop: 8,
    minHeight: 28,
  },
});
