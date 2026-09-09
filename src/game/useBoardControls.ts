import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler } from 'react-native';
import { cancelAnimation, useSharedValue } from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
import { useUserStore } from '../store/userStore';
import { useProgressStore } from '../store/progressStore';
import { useTheme } from '../components/ThemeProvider';
import { getPourGeometry, type TubeLayout } from '../components/tube/pourGeometry';
import { getPourTiming, type PourTiming } from '../components/pourTiming';
import { pour } from '../core/rules';
import { findSolutionAsync } from '../core/solver';
import { HINT_COST } from '../core/constants';
import { SoundManager } from '../audio/SoundManager';
import { AdManager } from '../ads/AdManager';
import { Haptic } from '../utils/haptics';
import { t, type TranslationKey } from '../i18n';
import { TapQueue } from './TapQueue';

type Hint = { from: number; to: number };
export type AnimatingPour = ReturnType<typeof getPourGeometry> & {
  token: number;
  revision: number;
  fromId: number;
  toId: number;
  color: string;
  colorId: number;
  count: number;
  chainCount: number;
  timing: PourTiming;
};
type Props = {
  scale: number;
  layouts: React.MutableRefObject<Record<number, TubeLayout>>;
  onReset: () => void;
  onMenu: () => void;
  onNextLevel: () => void;
};

/** Input reads the current store, independently of React render or visual motion. */
export function useBoardControls({ scale, layouts, onReset, onMenu, onNextLevel }: Props) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const [animatingPour, setAnimatingPour] = useState<AnimatingPour | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [dialog, setDialog] = useState<'pause' | 'reset' | 'hint' | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const mounted = useRef(true);
  const blocked = useRef(false);
  const adPending = useRef(false);
  const active = useRef<AnimatingPour | null>(null);
  const chain = useRef<{ colorId: number; count: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopHaptic = useRef<(() => void) | null>(null);
  const hintRequest = useRef<AbortController | null>(null);
  const offeredHint = useRef<{ hint: Hint; revision: number } | null>(null);
  const shownHint = useRef(false);
  const deliver = useRef<(id: number) => void>(() => undefined);
  const [queue] = useState(() => new TapQueue((id) => deliver.current(id)));

  const stopPour = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    stopHaptic.current?.();
    stopHaptic.current = null;
  }, []);
  const cancelHint = useCallback(() => {
    hintRequest.current?.abort();
    hintRequest.current = null;
    offeredHint.current = null;
    shownHint.current = false;
    setHintBusy(false);
    setHint(null);
  }, []);

  const finishPour = useCallback(
    (token: number) => {
      const move = active.current;
      if (!mounted.current || !move || move.token !== token) return;
      active.current = null;
      stopPour();
      setAnimatingPour(null);
      const applied = useGameStore.getState().applyMove(move.fromId, move.toId, move.revision);
      if (applied) useProgressStore.getState().recordPour();
      if (!applied || blocked.current || useGameStore.getState().cleared) queue.clear();
      else queue.finish(token);
    },
    [queue, stopPour],
  );

  const clear = useCallback(() => {
    queue.clear();
    active.current = null;
    cancelAnimation(progress);
    stopPour();
    cancelHint();
    chain.current = null;
    setAnimatingPour(null);
    setNotice(null);
  }, [queue, progress, stopPour, cancelHint]);

  const deliverTap = useCallback(
    (id: number) => {
      const state = useGameStore.getState();
      if (blocked.current || state.cleared || !mounted.current) return;
      cancelHint();
      setNotice(null);
      const from = state.tubes.find((tube) => tube.id === state.selectedTube);
      const to = state.tubes.find((tube) => tube.id === id);
      if (!to) return;
      if (!from || state.selectedTube === id) {
        SoundManager.play(state.selectedTube === id ? 'deselect' : 'select');
        Haptic.light();
        state.selectTube(id);
        return;
      }
      const result = pour(from, to);
      if (!result) {
        Haptic.light();
        state.selectTube(id);
        setNotice('board_invalid');
        return;
      }
      const previous = chain.current;
      const chainCount = previous?.colorId === result.move.colorId ? previous.count + 1 : 0;
      chain.current = { colorId: result.move.colorId, count: chainCount };
      const fromLayout = layouts.current[from.id];
      const toLayout = layouts.current[to.id];
      if (!fromLayout || !toLayout) {
        if (state.applyMove(from.id, to.id, state.boardRevision)) {
          useProgressStore.getState().recordPour();
          SoundManager.playPour(result.move.colorId, chainCount, result.move.count);
          Haptic.medium();
        }
        return;
      }
      const token = queue.begin();
      const timing = getPourTiming(result.move.count);
      const next: AnimatingPour = {
        ...getPourGeometry(fromLayout, toLayout, scale),
        token,
        timing,
        revision: state.boardRevision,
        fromId: from.id,
        toId: to.id,
        colorId: result.move.colorId,
        color: theme.colors[result.move.colorId % theme.colors.length],
        count: result.move.count,
        chainCount,
      };
      active.current = next;
      progress.value = 0;
      setAnimatingPour(next);
      timer.current = setTimeout(() => finishPour(token), timing.totalMs + 350);
    },
    [cancelHint, layouts, scale, queue, theme.colors, progress, finishPour],
  );

  useEffect(() => {
    deliver.current = deliverTap;
  }, [deliverTap]);
  const handleTubePress = useCallback(
    (id: number) => {
      if (!blocked.current && !useGameStore.getState().cleared) queue.press(id);
    },
    [queue],
  );

  const openDialog = useCallback(
    (kind: 'pause' | 'reset') => {
      if (adPending.current || useGameStore.getState().cleared) return;
      blocked.current = true;
      queue.clear();
      cancelHint();
      const token = active.current?.token;
      if (token !== undefined) {
        cancelAnimation(progress);
        finishPour(token);
      }
      if (useGameStore.getState().cleared) {
        blocked.current = false;
        return;
      }
      setDialog(kind);
      SoundManager.stopBGM();
    },
    [queue, cancelHint, progress, finishPour],
  );
  const resume = useCallback(() => {
    blocked.current = false;
    offeredHint.current = null;
    setDialog(null);
  }, []);
  const reset = useCallback(() => {
    clear();
    useGameStore.getState().reset();
    onReset();
    resume();
  }, [clear, onReset, resume]);
  const requestReset = useCallback(() => {
    openDialog('reset');
  }, [openDialog]);
  const pause = useCallback(() => openDialog('pause'), [openDialog]);
  const menu = useCallback(() => {
    if (adPending.current) return;
    blocked.current = true;
    clear();
    onMenu();
  }, [clear, onMenu]);
  const undo = useCallback(() => {
    if (blocked.current || useGameStore.getState().cleared) return;
    queue.clear();
    const token = active.current?.token;
    if (token !== undefined) {
      cancelAnimation(progress);
      finishPour(token);
    }
    clear();
    useGameStore.getState().undo();
    SoundManager.play('button_tap');
    Haptic.light();
  }, [queue, progress, finishPour, clear]);

  const requestHint = useCallback(async () => {
    const state = useGameStore.getState();
    if (
      active.current ||
      blocked.current ||
      state.cleared ||
      hintRequest.current ||
      shownHint.current
    )
      return;
    const request = new AbortController();
    hintRequest.current = request;
    const revision = state.boardRevision;
    setHintBusy(true);
    setNotice(null);
    try {
      const solution = await findSolutionAsync(state.tubes, { signal: request.signal });
      if (
        request.signal.aborted ||
        !mounted.current ||
        revision !== useGameStore.getState().boardRevision
      )
        return;
      if (!solution?.length) {
        setNotice('hint_unavailable');
        return;
      }
      const next = { from: solution[0].from, to: solution[0].to };
      if (useUserStore.getState().spendCoins(HINT_COST)) {
        shownHint.current = true;
        setHint(next);
      } else {
        offeredHint.current = { hint: next, revision };
        blocked.current = true;
        setDialog('hint');
      }
    } catch {
      if (!request.signal.aborted && mounted.current) setNotice('hint_unavailable');
    } finally {
      if (hintRequest.current === request) {
        hintRequest.current = null;
        if (mounted.current) setHintBusy(false);
      }
    }
  }, []);

  const finishAd = useCallback(() => {
    adPending.current = false;
    blocked.current =
      AppState.currentState === 'background' || AppState.currentState === 'inactive';
    if (mounted.current) {
      setAdBusy(false);
      if (blocked.current && !useGameStore.getState().cleared) setDialog('pause');
    }
  }, []);

  const nextLevel = useCallback(async () => {
    const state = useGameStore.getState();
    if (!mounted.current || adPending.current || !state.cleared) return;
    adPending.current = true;
    blocked.current = true;
    setAdBusy(true);
    clear();
    try {
      await AdManager.maybeShowInterstitial(state.mode);
    } finally {
      if (mounted.current && useGameStore.getState().boardRevision === state.boardRevision)
        onNextLevel();
      finishAd();
    }
  }, [clear, onNextLevel, finishAd]);

  const watchHintAd = useCallback(async () => {
    const offer = offeredHint.current;
    if (!offer || adPending.current) return;
    adPending.current = true;
    setAdBusy(true);
    resume();
    blocked.current = true;
    try {
      const earned = await AdManager.showRewarded(() => {
        if (mounted.current && useGameStore.getState().boardRevision === offer.revision) {
          shownHint.current = true;
          setHint(offer.hint);
        }
      });
      if (!earned && mounted.current) setNotice('ad_not_ready');
    } finally {
      finishAd();
    }
  }, [resume, finishAd]);
  const addTube = useCallback(async () => {
    const revision = useGameStore.getState().boardRevision;
    if (adPending.current || active.current) return;
    adPending.current = true;
    blocked.current = true;
    setAdBusy(true);
    try {
      const earned = await AdManager.showRewarded(() => {
        if (mounted.current && useGameStore.getState().boardRevision === revision)
          useGameStore.getState().addExtraTube();
      });
      if (!earned && mounted.current) setNotice('ad_not_ready');
    } finally {
      finishAd();
    }
  }, [finishAd]);

  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!useGameStore.getState().cleared) pause();
      else menu();
      return true;
    });
    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active') pause();
    });
    return () => {
      back.remove();
      app.remove();
    };
  }, [pause, menu]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queue.clear();
      active.current = null;
      cancelAnimation(progress);
      stopPour();
      hintRequest.current?.abort();
    };
  }, [queue, progress, stopPour]);

  const streamStart = useCallback(() => {
    const move = active.current;
    if (!move) return;
    SoundManager.playPour(move.colorId, move.chainCount, move.count);
    Haptic.medium();
    stopHaptic.current = Haptic.flow(move.timing.streamMs);
  }, []);
  const impact = useCallback(() => {
    if (active.current) Haptic.light();
  }, []);
  const token = animatingPour?.token;
  const complete = useCallback(() => {
    if (token !== undefined) finishPour(token);
  }, [token, finishPour]);
  const settle = useCallback(() => {
    queue.clear();
    const currentToken = active.current?.token;
    if (currentToken !== undefined) {
      cancelAnimation(progress);
      finishPour(currentToken);
    }
  }, [queue, progress, finishPour]);
  return {
    animatingPour,
    progress,
    hint,
    hintBusy,
    adBusy,
    dialog,
    notice: notice ? t(notice) : null,
    handleTubePress,
    streamStart,
    impact,
    complete,
    pause,
    resume,
    reset,
    requestReset,
    menu,
    undo,
    requestHint,
    watchHintAd,
    addTube,
    nextLevel,
    clear,
    settle,
  };
}
