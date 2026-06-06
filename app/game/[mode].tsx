import React, { useEffect, useCallback, useState, useRef } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../../src/store/gameStore';
import { useUserStore } from '../../src/store/userStore';
import { useTheme } from '../../src/components/ThemeProvider';
import {
  TubeComponent,
  TUBE_CONTAINER_TOP_GAP,
  TUBE_SELECTED_LIFT,
} from '../../src/components/Tube';
import { PourStream } from '../../src/components/PourAnimation';
import { Background } from '../../src/components/Background';
import { HUD } from '../../src/components/HUD';
import { ClearModal } from '../../src/components/ClearModal';
import { SoundManager } from '../../src/audio/SoundManager';
import { Haptic } from '../../src/utils/haptics';
import { AdManager } from '../../src/ads/AdManager';
import { pour, isTubeComplete } from '../../src/core/rules';

type GameMode = 'classic' | 'zen';

type TubeLayout = { x: number; y: number; width: number; height: number };

type PourAnim = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  toId: number;
  colorId: number;
};

export default function GameScreen() {
  const { mode: rawMode } = useLocalSearchParams<{ mode: string }>();
  const mode: GameMode = rawMode === 'zen' ? 'zen' : 'classic';
  const router = useRouter();
  const theme = useTheme();

  const tubeLayouts = useRef<Record<number, TubeLayout>>({});
  const prevCompleted = useRef<Set<number>>(new Set());
  const [pourAnim, setPourAnim] = useState<PourAnim | null>(null);

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
  const incrementLevel = useUserStore((s) => s.incrementLevel);
  const incrementCleared = useUserStore((s) => s.incrementCleared);
  const addCoins = useUserStore((s) => s.addCoins);

  useEffect(() => {
    const lvl = mode === 'classic' ? userLevel : undefined;
    startNewGame(mode, lvl);
    prevCompleted.current = new Set();

    if (mode === 'zen') {
      SoundManager.playBGM('zen');
    } else {
      SoundManager.playBGM('classic');
    }

    return () => {
      SoundManager.stopBGM();
    };
  }, [mode, userLevel, startNewGame]);

  // 클리어 감지 → 보상 + 사운드
  useEffect(() => {
    if (cleared) {
      SoundManager.play('level_clear');
      Haptic.success();
      incrementCleared();
      addCoins(10);
      SoundManager.play('coin');

      if (mode === 'classic') {
        incrementLevel();
        AdManager.maybeShowInterstitial(mode);
      }
    }
  }, [cleared, mode, incrementCleared, addCoins, incrementLevel]);

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

  // 붓기 스트림 착지 → store 커밋 + 사운드 동기화
  const handlePourLand = useCallback(() => {
    if (!pourAnim) return;
    selectTube(pourAnim.toId); // selectedTube(=소스)가 살아있으므로 여기서 실제 붓기 실행
    SoundManager.playPour(pourAnim.colorId);
    setPourAnim(null);
  }, [pourAnim, selectTube]);

  const handleTubePress = (id: number) => {
    if (cleared || pourAnim) return;

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
        Haptic.medium();
        setPourAnim({
          fromX: from.x + from.width / 2,
          fromY: from.y + TUBE_CONTAINER_TOP_GAP - TUBE_SELECTED_LIFT,
          toX: to.x + to.width / 2,
          toY: to.y + TUBE_CONTAINER_TOP_GAP,
          color: theme.colors[colorId % theme.colors.length],
          toId: id,
          colorId,
        });
        return;
      }
      // 레이아웃 미측정 시 즉시 커밋(폴백)
      Haptic.medium();
      selectTube(id);
      SoundManager.playPour(result.move.colorId);
      return;
    }

    // 부을 수 없으면 대상으로 선택 전환
    selectTube(id);
  };

  const handleUndo = () => {
    if (pourAnim) return;
    SoundManager.play('button_tap');
    Haptic.light();
    undo();
  };

  const handleReset = () => {
    if (pourAnim) return;
    SoundManager.play('button_tap');
    Haptic.light();
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
    setPourAnim(null);
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
      <Background />
      <HUD
        level={level}
        coins={coins}
        mode={mode}
        moveCount={moves.length}
        onUndo={handleUndo}
        onReset={handleReset}
        onPause={handlePause}
      />

      <View style={styles.tubeGrid}>
        {tubes.map((tube) => (
          <View key={tube.id} onLayout={handleTubeLayout(tube.id)}>
            <TubeComponent
              tube={tube}
              selected={selectedTube === tube.id}
              completed={isTubeComplete(tube)}
              onPress={() => handleTubePress(tube.id)}
            />
          </View>
        ))}

        {pourAnim && (
          <PourStream
            fromX={pourAnim.fromX}
            fromY={pourAnim.fromY}
            toX={pourAnim.toX}
            toY={pourAnim.toY}
            color={pourAnim.color}
            onComplete={handlePourLand}
          />
        )}
      </View>

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
  tubeGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
});
