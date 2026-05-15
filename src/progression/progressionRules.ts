import { Mode, Category, Difficulty, getRankForLevel } from "../constants";
import type { Question } from "../types/question";
import { calculateSoloXP, calculateMultiplayerXP } from "../utils/progression";
import { getXpMultiplier } from "../tests/xpMultiplierTester";

/** Progression Rules – Game Progression and Player Advancement Logic
 *
 * RESPONSIBILITIES:
 * - Calculate XP gains and score increases based on game performance
 * - Provide level / rank derivation functions
 * - Keep all formula implementations in utils/progression.ts
 *
 * IMPORTANT: _lastXpGained has been REMOVED.
 * The XP gained for a session is now part of SessionDelta.xpGained and is
 * stored directly in gameStore.lastSessionXpGained so it survives navigation.
 */

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface SessionProgressInput {
  mode: Mode;
  category: Category;
  difficulty: Difficulty;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  /** The player's final placement in a multiplayer game (1-indexed). Solo: omit. */
  placement?: number;
  maxStreak?: number;
  questions: Question[];
  userAnswers: string[];
  timeTaken: number; // seconds
  timePerQuestion?: number[];
  mastered: boolean;
  won: boolean;
  topThreeFinish: boolean;
  hostedLobby?: boolean;
  fellBehindByHalfAndWon?: boolean;
}

export interface SessionDelta {
  xpGained: number;
  scoreGained: number;
  gamesPlayed: number;
  gamesMastered: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTimePerQuestion?: number; // seconds
  topThreeFinishes: number;
  gamesWon: number;
}

// ─── Session delta builder ────────────────────────────────────────────────────

export function buildSessionDelta(input: SessionProgressInput): SessionDelta {
  let rawXp: number;

  if (input.mode === "multiplayer" && input.placement !== undefined) {
    // Multiplayer: XP = (Score + Placement Bonus + Win Bonus) × Streak Multiplier
    rawXp = calculateMultiplayerXP(
      input.score,
      input.placement,
      input.maxStreak ?? 0,
    );
  } else {
    // Solo: XP = Score × 1.5 × Streak Multiplier
    rawXp = calculateSoloXP(input.score, input.maxStreak ?? 0);
  }

  const finalXp = Math.round(rawXp * getXpMultiplier());

  const avgTime: number | undefined =
    input.timePerQuestion && input.timePerQuestion.length > 0
      ? input.timePerQuestion.reduce((a, b) => a + b, 0) / input.timePerQuestion.length
      : undefined;

  return {
    xpGained:               finalXp,
    scoreGained:            input.score,
    gamesPlayed:            1,
    gamesMastered:          input.mastered ? 1 : 0,
    totalQuestionsAnswered: input.totalQuestions,
    correctAnswers:         input.correctAnswers,
    incorrectAnswers:       input.totalQuestions - input.correctAnswers,
    averageTimePerQuestion: avgTime,
    topThreeFinishes:       input.topThreeFinish ? 1 : 0,
    gamesWon:               input.won ? 1 : 0,
  };
}

// ─── Level / rank helpers ─────────────────────────────────────────────────────

export function levelFromXp(totalXp: number): number {
  return Math.floor(Math.max(0, totalXp) / 1000) + 1;
}

export function xpToNextLevel(totalXp: number): number {
  return 1000 - (Math.max(0, totalXp) % 1000);
}

export function rankFromLevel(level: number) {
  return getRankForLevel(level);
}