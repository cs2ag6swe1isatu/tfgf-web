import { useCallback, useEffect, useRef } from "react";
import { usePowerUpStore } from "../store/powerUpStore";
import { useSoundContext } from "../context/SoundContext";
import { POWER_UP_CATALOGUE } from "../types/powerups";
import type { PowerUpId, PowerUpInventoryEntry } from "../types/powerups";
import type { BunnyState } from "../components/bunny/bunnyStates";

interface UsePowerUpsOptions {
  questionIndex: number;
  allAnswers: string[];
  correctAnswer: string;
  isAnswered: boolean;
  currentStreak: number;
  /** Called when a power-up changes the bunny state temporarily */
  onBunnyReaction?: (state: BunnyState, durationMs?: number) => void;
  /** Called when 50/50 fires — lets QuestionPage know which answers are gone */
  onEliminatedChange?: (indices: number[]) => void;
  /** Called with the earned power-up id after a streak drop */
  onPowerUpEarned?: (id: PowerUpId) => void;
}

interface UsePowerUpsReturn {
  activatePowerUp: (id: PowerUpId) => boolean;
  isEliminated: (answerIndex: number) => boolean;
  canUse: (id: PowerUpId) => boolean;
}

/**
 * Core hook for power-up logic in QuestionPage.
 * Handles activation, streak drops, sound, and bunny reactions.
 */
export const usePowerUps = ({
  questionIndex,
  allAnswers,
  correctAnswer,
  isAnswered,
  currentStreak,
  onBunnyReaction,
  onEliminatedChange,
  onPowerUpEarned,
}: UsePowerUpsOptions): UsePowerUpsReturn => {
  const { playSound } = useSoundContext();
  const store = usePowerUpStore();

  const prevStreakRef = useRef(currentStreak);
  const prevQuestionIndexRef = useRef(questionIndex);

  // ── Reset eliminated answers between questions ──────────────────────────
  useEffect(() => {
    if (questionIndex !== prevQuestionIndexRef.current) {
      prevQuestionIndexRef.current = questionIndex;
      store.onNextQuestion();
      onEliminatedChange?.([]);
    }
  }, [questionIndex, store, onEliminatedChange]);

  // ── Streak-based power-up drops ────────────────────────────────────────
  useEffect(() => {
    if (currentStreak > prevStreakRef.current) {
      const prevInventory = store.sessionInventory.map((e) => ({ ...e }));
      store.handleStreakDrop(currentStreak);
      const nextInventory = usePowerUpStore.getState().sessionInventory;

      // Detect what was added
      for (const next of nextInventory) {
        const prev = prevInventory.find((e) => e.id === next.id);
        if (!prev || next.count > prev.count) {
          onPowerUpEarned?.(next.id);
          break;
        }
      }
    }
    prevStreakRef.current = currentStreak;
  }, [currentStreak, store, onPowerUpEarned]);

  // ── Activation ─────────────────────────────────────────────────────────
  const activatePowerUp = useCallback(
  (id: PowerUpId): boolean => {
    if (isAnswered) return false;

    const success = store.activatePowerUp(id, questionIndex, allAnswers, correctAnswer);
    if (!success) return false;

      const def = POWER_UP_CATALOGUE[id];

      // Sound
      playSound(def.activationSound);

      // Bunny reaction (reset to derived state after 2s)
      onBunnyReaction?.(def.bunnyReaction, 2000);

      // Notify QuestionPage of new eliminated indices (50/50)
      if (id === "fifty_fifty") {
        const eliminated = usePowerUpStore.getState().eliminatedAnswerIndices;
        onEliminatedChange?.(eliminated);
      }
      return true;
    },
    [
      isAnswered,
      store,
      questionIndex,
      allAnswers,
      correctAnswer,
      playSound,
      onBunnyReaction,
      onEliminatedChange,
    ]
  );

  const isEliminated = useCallback(
    (answerIndex: number) => store.isEliminated(answerIndex),
    [store]
  );

  const canUse = useCallback(
    (id: PowerUpId) => store.canUse(id, questionIndex),
    [store, questionIndex]
  );

  return { activatePowerUp, isEliminated, canUse };
};

// ─── Helper: build a starter session inventory ──────────────────────────────

/**
 * Returns a default starter pack for solo/multiplayer sessions.
 * Swap this for real player inventory data once the loadout screen exists.
 */
export const getStarterInventory = (): PowerUpInventoryEntry[] => [
  { id: "fifty_fifty", count: 2 },
  { id: "time_freeze", count: 1 },
  { id: "double_xp", count: 1 },
];
