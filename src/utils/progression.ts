import { Difficulty, getRankForLevel } from "../constants";

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

export const DEFAULT_TOTAL_TIME = 15;
export const FREEZE_TIMER_BONUS_SECONDS = 5;

/**
 * Apply freeze power-up bonus to remaining time.
 * Time freeze adds 5 seconds to the remaining time (capped at totalTime).
 */
export function applyFreezeBonus(
  remainingTime: number,
  totalTime = DEFAULT_TOTAL_TIME,
  timeFreezeUsed: boolean = false,
): number {
  if (!timeFreezeUsed) return remainingTime;
  return Math.min(totalTime, remainingTime + FREEZE_TIMER_BONUS_SECONDS);
}

/**
 * Calculate score for a single correct answer.
 *
 * Base Score = 30 × Difficulty Multiplier
 * Speed Bonus = (Remaining Time / Total Time) × 20
 *
 * Final Score = (30 × difficultyMultiplier) + speedBonus
 *
 * Max possible: (30 × 2.0) + 20 = 80 → 100 (Hard, full 15s remaining)
 * With freeze: Can reach up to (30 × 2.0) + 20 = 100 even on slower answers
 */
export function calculateScore(
  difficulty: Difficulty,
  remainingTime: number,
  totalTime = DEFAULT_TOTAL_TIME,
): number {
  const basePoints = 30 * DIFFICULTY_MULTIPLIER[difficulty];
  const maxSpeedBonus = 20;
  const speedBonus = Math.round((remainingTime / totalTime) * maxSpeedBonus);
  return basePoints + speedBonus;
}

/**
 * Streak multiplier — activated on the 2nd consecutive correct answer.
 *
 * - 1st consecutive correct  → ×1.0
 * - 2nd consecutive correct  → ×2.0
 * - 5+ streak               → ×2.5
 * - 10+ streak              → ×3.0
 *
 * Streak affects XP ONLY. It NEVER modifies displayed score.
 */
export function getStreakMultiplier(streak: number): number {
  if (streak >= 10) return 3.0;
  if (streak >= 5) return 2.5;
  if (streak >= 2) return 2.0;
  return 1.0;
}

/**
 * Solo XP formula.
 * Solo XP = Score × 1.5 × Streak Multiplier
 */
export function calculateXP(finalScore: number, streak: number): number {
  return Math.round(finalScore * 1.5 * getStreakMultiplier(streak));
}

/**
 * Multiplayer XP formula.
 * xpEarned = (score × streakMultiplier) + placementBonus + winBonus
 *
 * Placement bonuses: 1st=+100, 2nd=+50, 3rd=+25, others=0
 * Win bonus (1st): +50
 */
export function calculateMultiplayerXP(
  score: number,
  streak: number,
  rank: number,
): number {
  const streakMult = getStreakMultiplier(streak);
  const baseXp = Math.round(score * streakMult);

  let placementBonus = 0;
  if (rank === 1) placementBonus = 100;
  else if (rank === 2) placementBonus = 50;
  else if (rank === 3) placementBonus = 25;

  const winBonus = rank === 1 ? 50 : 0;

  return baseXp + placementBonus + winBonus;
}

export function getLevel(totalXP: number): number {
  return Math.floor(totalXP / 1000) + 1;
}

export function getXpIntoLevel(totalXP: number): number {
  return totalXP % 1000;
}

export function getLevelProgressPercent(totalXP: number): number {
  return Math.round((getXpIntoLevel(totalXP) / 1000) * 100);
}

export function getRankTitle(level: number): string {
  return getRankForLevel(level).name;
}