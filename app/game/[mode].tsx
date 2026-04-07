import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../../src/store/gameStore';
import { useUserStore } from '../../src/store/userStore';
import { useTheme } from '../../src/components/ThemeProvider';
import { TubeComponent } from '../../src/components/Tube';
import { HUD } from '../../src/components/HUD';
import { SoundManager } from '../../src/audio/SoundManager';
import { Haptic } from '../../src/utils/haptics';

type GameMode = 'classic' | 'zen';

export default function GameScreen() {
  const { mode: rawMode } = useLocalSearchParams<{ mode: string }>();
  const mode: GameMode = rawMode === 'zen' ? 'zen' : 'classic';
  const theme = useTheme();

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

  useEffect(() => {
    const lvl = mode === 'classic' ? userLevel : undefined;
    startNewGame(mode, lvl);

    if (mode === 'zen') {
      SoundManager.playBGM('zen');
    } else {
      SoundManager.playBGM('classic');
    }

    return () => {
      SoundManager.stopBGM();
    };
  }, [mode, userLevel, startNewGame]);

  useEffect(() => {
    if (cleared) {
      SoundManager.play('level_clear');
      Haptic.success();
    }
  }, [cleared]);

  const handleTubePress = (id: number) => {
    if (selectedTube === null) {
      SoundManager.play('select');
      Haptic.light();
    } else if (selectedTube === id) {
      SoundManager.play('deselect');
      Haptic.light();
    } else {
      Haptic.medium();
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
  };

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
