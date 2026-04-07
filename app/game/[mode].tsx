import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../../src/store/gameStore';
import { useUserStore } from '../../src/store/userStore';
import { useTheme } from '../../src/components/ThemeProvider';
import { TubeComponent } from '../../src/components/Tube';
import { HUD } from '../../src/components/HUD';
import { ClearModal } from '../../src/components/ClearModal';
import { SoundManager } from '../../src/audio/SoundManager';
import { Haptic } from '../../src/utils/haptics';
import { AdManager } from '../../src/ads/AdManager';
import { topColor } from '../../src/core/rules';

type GameMode = 'classic' | 'zen';

export default function GameScreen() {
  const { mode: rawMode } = useLocalSearchParams<{ mode: string }>();
  const mode: GameMode = rawMode === 'zen' ? 'zen' : 'classic';
  const router = useRouter();
  const theme = useTheme();
  const prevMovesLen = useRef(0);

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
    prevMovesLen.current = 0;

    if (mode === 'zen') {
      SoundManager.playBGM('zen');
    } else {
      SoundManager.playBGM('classic');
    }

    return () => {
      SoundManager.stopBGM();
    };
  }, [mode, userLevel, startNewGame]);

  // pour 성공 감지 → 사운드 재생
  useEffect(() => {
    if (moves.length > prevMovesLen.current && moves.length > 0) {
      const lastMove = moves[moves.length - 1];
      SoundManager.playPour(lastMove.colorId);
    }
    prevMovesLen.current = moves.length;
  }, [moves]);

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

  const handleTubePress = (id: number) => {
    if (cleared) return;

    if (selectedTube === null) {
      const tube = tubes.find((t) => t.id === id);
      if (tube && tube.layers.length > 0) {
        SoundManager.play('select');
        Haptic.light();
      }
    } else if (selectedTube === id) {
      SoundManager.play('deselect');
      Haptic.light();
    } else {
      const fromTube = tubes.find((t) => t.id === selectedTube);
      const toTube = tubes.find((t) => t.id === id);
      if (fromTube && toTube && topColor(fromTube) !== null) {
        Haptic.medium();
      }
    }
    selectTube(id);
  };

  const handleUndo = () => {
    SoundManager.play('button_tap');
    Haptic.light();
    undo();
  };

  const handleReset = () => {
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
    prevMovesLen.current = 0;
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
          <TubeComponent
            key={tube.id}
            tube={tube}
            selected={selectedTube === tube.id}
            onPress={() => handleTubePress(tube.id)}
          />
        ))}
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
