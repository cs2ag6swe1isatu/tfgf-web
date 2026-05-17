import { create } from "zustand";
import type {
  PowerUpId,
  PowerUpInventoryEntry,
  ActivePowerUp,
  PowerUpSessionState,
} from "../types/powerups";

// ─── Streak thresholds that reward a power-up drop ──────────────────────────

const STREAK_DROP_THRESHOLDS = [3, 6, 9]; // every 3rd streak step

interface PowerUpStore extends PowerUpSessionState {
  // ── Session lifecycle ────────────────────────────────────────────────────
  /** Call before a session starts with whatever the player equipped */
  initSession: (inventory: PowerUpInventoryEntry[]) => void;
  /** Call when moving to the next question */
  onNextQuestion: () => void;
  /** Call at session end to reset everything */
  resetSession: () => void;

  // ── Activation ───────────────────────────────────────────────────────────
  /**
   * Attempt to use a power-up on the current question.
   * Returns true if successful, false if not available.
   */
  activatePowerUp: (
    id: PowerUpId,
    questionIndex: number,
    allAnswers: string[],
    correctAnswer: string
  ) => boolean;

  // ── Streak reward ────────────────────────────────────────────────────────
  /**
   * Call after each correct answer with the new streak count.
   * Grants a random power-up on milestone streaks.
   */
  handleStreakDrop: (streak: number) => void;

  // ── Selectors ────────────────────────────────────────────────────────────
  getCount: (id: PowerUpId) => number;
  canUse: (id: PowerUpId, questionIndex: number) => boolean;
  isEliminated: (answerIndex: number) => boolean;
}

const EMPTY_STATE: PowerUpSessionState = {
  sessionInventory: [],
  used: [],
  eliminatedAnswerIndices: [],
  usedThisQuestion: false,
};

// Power-ups that can drop from streaks (excludes bunny_hint — too strong)
const DROPPABLE_POWER_UPS: PowerUpId[] = ["fifty_fifty", "time_freeze", "double_xp"];

export const usePowerUpStore = create<PowerUpStore>((set, get) => ({
  ...EMPTY_STATE,

  // ── Session lifecycle ──────────────────────────────────────────────────

  initSession: (inventory) => {
    set({ ...EMPTY_STATE, sessionInventory: [...inventory] });
  },

  onNextQuestion: () => {
    set({ eliminatedAnswerIndices: [], usedThisQuestion: false });
  },

  resetSession: () => {
    set({ ...EMPTY_STATE });
  },

  // ── Activation ────────────────────────────────────────────────────────

  activatePowerUp: (id, questionIndex, allAnswers, correctAnswer) => {
    const state = get();

    if (!state.canUse(id, questionIndex)) return false;

    // Consume one from inventory
    const updatedInventory = state.sessionInventory.map((entry) =>
      entry.id === id ? { ...entry, count: entry.count - 1 } : entry
    );

    const newUsed: ActivePowerUp = { id, usedOnQuestionIndex: questionIndex };

    // 50/50: pick 2 wrong answers to eliminate
    let newEliminated: number[] = state.eliminatedAnswerIndices;
    if (id === "fifty_fifty") {
      const wrongIndices = allAnswers
        .map((a, i) => ({ answer: a, index: i }))
        .filter(({ answer }) => answer !== correctAnswer)
        .map(({ index }) => index);

      // Shuffle and take 2
      const shuffled = wrongIndices.sort(() => Math.random() - 0.5);
      newEliminated = shuffled.slice(0, 2);
    }

    set({
      sessionInventory: updatedInventory,
      used: [...state.used, newUsed],
      eliminatedAnswerIndices: newEliminated,
      usedThisQuestion: true,
    });

    return true;
  },

  // ── Streak reward ──────────────────────────────────────────────────────

  handleStreakDrop: (streak) => {
    if (!STREAK_DROP_THRESHOLDS.includes(streak)) return;

    const randomId =
      DROPPABLE_POWER_UPS[Math.floor(Math.random() * DROPPABLE_POWER_UPS.length)];

    set((state) => {
      const existing = state.sessionInventory.find((e) => e.id === randomId);
      if (existing && existing.count >= 3) return {}; // already capped

      const updatedInventory = existing
        ? state.sessionInventory.map((e) =>
            e.id === randomId ? { ...e, count: e.count + 1 } : e
          )
        : [...state.sessionInventory, { id: randomId, count: 1 }];

      return { sessionInventory: updatedInventory };
    });
  },

  // ── Selectors ──────────────────────────────────────────────────────────

  getCount: (id) => {
    const entry = get().sessionInventory.find((e) => e.id === id);
    return entry?.count ?? 0;
  },

  canUse: (id, questionIndex) => {
    const state = get();
    // Already used something this question
    if (state.usedThisQuestion) return false;
    // Already used this specific power-up on this question
    if (state.used.some((u) => u.usedOnQuestionIndex === questionIndex && u.id === id))
      return false;
    // No stock
    if (state.getCount(id) <= 0) return false;
    return true;
  },

  isEliminated: (answerIndex) => {
    return get().eliminatedAnswerIndices.includes(answerIndex);
  },
}));
