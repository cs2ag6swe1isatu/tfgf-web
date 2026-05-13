import { Difficulty, getRankForLevel } from "../constants";

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

export const DEFAULT_TOTAL_TIME = 15;

export function calculateScore(
  difficulty: Difficulty,
  remainingTime: number,
  totalTime = DEFAULT_TOTAL_TIME,
): number {
  const basePoints = 10 * DIFFICULTY_MULTIPLIER[difficulty];
  const maxBonus = basePoints;
  const speedBonus = Math.round((remainingTime / totalTime) * maxBonus);
  return basePoints + speedBonus;
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 10) return 2.0;
  if (streak >= 5) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
}

export function calculateXP(finalScore: number, streak: number): number {
  return Math.round(finalScore * 1.5 * getStreakMultiplier(streak));
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
