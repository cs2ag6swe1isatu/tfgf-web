/**
 * progression.ts — Single source of truth for all scoring, XP, and level formulas.
 *
 * RULES:
 * - All formula logic lives here. Pages and stores only call these functions.
 * - No formula is duplicated anywhere else in the codebase.
 * - Streak multiplier applies to the UPDATED streak value (post-increment).
 */

import { Difficulty, getRankForLevel } from "../constants";

// ─── Constants ────────────────────────────────────────────────────────────────

export const TOTAL_TIME = 15; // seconds per question

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

/**
 * Placement bonuses applied in multiplayer XP calculation.
 * 4th place and beyond all receive PLACEMENT_BONUS_DEFAULT.
 */
const PLACEMENT_BONUS: Record<1 | 2 | 3, number> = {
  1: 100,
  2: 60,
  3: 40,
};
const PLACEMENT_BONUS_DEFAULT = 10; // 4th place and beyond

/** Only 1st place receives this additional bonus. */
const WIN_BONUS = 50;

/** XP required to advance one level. */
const XP_PER_LEVEL = 1000;

/** Solo XP base multiplier applied to score before streak. */
const SOLO_XP_MULTIPLIER = 1.5;

// ─── Score ────────────────────────────────────────────────────────────────────

/**
 * Calculates the score for a single correct answer.
 *
 * Formula:
 *   Base Score  = 10 × difficultyMultiplier
 *   Speed Bonus = (remainingTime / totalTime) × Base Score
 *   Final Score = Base Score + Speed Bonus
 *
 * Returns 0 for incorrect answers — callers are responsible for
 * only calling this when the answer is correct.
 */
export function calculateScore(
  difficulty: Difficulty,
  remainingTime: number,
  totalTime = TOTAL_TIME,
): number {
  const base = 10 * DIFFICULTY_MULTIPLIER[difficulty];
  const speedBonus = Math.round((remainingTime / totalTime) * base);
  return base + speedBonus;
}

// ─── Streak ───────────────────────────────────────────────────────────────────

/**
 * Returns the streak multiplier for a given streak count.
 *
 * Tiers (based on UPDATED streak, after incrementing):
 *   1        → ×1.0  (no bonus)
 *   2–4      → ×2.0  (activates immediately on 2nd consecutive correct)
 *   5–9      → ×2.5
 *   10+      → ×3.0
 *
 * IMPORTANT: Always pass the already-incremented streak value.
 * Passing the pre-increment value causes the off-by-one bug where
 * ×2.0 activates on the 3rd answer instead of the 2nd.
 *
 * @example
 *   // Correct usage in QuestionPage:
 *   const newStreak = isCorrect ? streak + 1 : 0;
 *   setStreak(newStreak);                        // update state
 *   const xp = calculateSoloXP(score, newStreak); // use new value
 */
export function getStreakMultiplier(streak: number): number {
  if (streak >= 10) return 3.0;
  if (streak >= 5)  return 2.5;
  if (streak >= 2)  return 2.0;
  return 1.0;
}

// ─── Solo XP ──────────────────────────────────────────────────────────────────

/**
 * Calculates XP earned for a solo game answer.
 *
 * Formula:
 *   XP = score × 1.5 × streakMultiplier
 *
 * @param score       Final score for the answer (from calculateScore).
 * @param streak      The UPDATED streak count (post-increment).
 */
export function calculateSoloXP(score: number, streak: number): number {
  return Math.round(score * SOLO_XP_MULTIPLIER * getStreakMultiplier(streak));
}

// ─── Multiplayer XP ───────────────────────────────────────────────────────────

/**
 * Returns the placement bonus XP for a given finishing position.
 *
 * 1st = +100 XP, 2nd = +60 XP, 3rd = +40 XP, 4th+ = +10 XP
 */
export function getPlacementBonus(placement: number): number {
  if (placement === 1 || placement === 2 || placement === 3) {
    return PLACEMENT_BONUS[placement];
  }
  return PLACEMENT_BONUS_DEFAULT;
}

/**
 * Returns the win bonus XP. Only 1st place receives this.
 */
export function getWinBonus(placement: number): number {
  return placement === 1 ? WIN_BONUS : 0;
}

/**
 * Calculates total XP earned at the end of a multiplayer session.
 *
 * Formula:
 *   XP = (score + placementBonus + winBonus) × streakMultiplier
 *
 * Note: The ×1.5 solo multiplier is NOT applied in multiplayer.
 * Streak multiplier is based on the player's best streak in the session.
 *
 * @param score        Cumulative session score.
 * @param placement    Final finishing position (1-indexed).
 * @param maxStreak    Highest streak the player achieved during the session.
 */
export function calculateMultiplayerXP(
  score: number,
  placement: number,
  maxStreak: number,
): number {
  const placementBonus = getPlacementBonus(placement);
  const winBonus = getWinBonus(placement);
  return Math.round(
    (score + placementBonus + winBonus) * getStreakMultiplier(maxStreak),
  );
}

// ─── Level & Progress ─────────────────────────────────────────────────────────

/**
 * Returns the player's current level from their total XP.
 *
 * Formula: floor(totalXP / 1000) + 1
 * Level 1 starts at 0 XP. Level 2 starts at 1000 XP, etc.
 */
export function getLevel(totalXP: number): number {
  return Math.floor(totalXP / XP_PER_LEVEL) + 1;
}

/**
 * Returns the XP earned within the current level (resets each level).
 *
 * Example: 2500 XP → level 3, 500 XP into that level.
 */
export function getXpIntoLevel(totalXP: number): number {
  return totalXP % XP_PER_LEVEL;
}

/**
 * Returns the XP still needed to reach the next level.
 *
 * Example: 2500 XP → 500 XP remaining to level 4.
 */
export function getXpToNextLevel(totalXP: number): number {
  return XP_PER_LEVEL - getXpIntoLevel(totalXP);
}

/**
 * Returns the XP bar fill percentage for the current level (0–100).
 *
 * Uses (xp % 1000) so the bar resets correctly after each level up
 * and never overflows past 100%.
 *
 * Example: 1500 XP → 50%
 */
export function getLevelProgressPercent(totalXP: number): number {
  return Math.round((getXpIntoLevel(totalXP) / XP_PER_LEVEL) * 100);
}

// ─── Rank ─────────────────────────────────────────────────────────────────────

/**
 * Returns the rank title string for a given level.
 * Delegates to the constants layer — no rank logic lives here.
 */
export function getRankTitle(level: number): string {
  return getRankForLevel(level).name;
}