import { Difficulty, getRankForLevel } from "../constants";

// ─── Difficulty multipliers ───────────────────────────────────────────────────

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy:   1.0,
  medium: 1.5,
  hard:   2.0,
};

export const DEFAULT_TOTAL_TIME = 15;

// ─── Placement bonuses (multiplayer) ─────────────────────────────────────────
//   1st = +100 (placement) + +50 (win bonus) = +150 combined
//   2nd = +60, 3rd = +40, 4th+ = +10
const PLACEMENT_BONUS: Record<1 | 2 | 3, number> = { 1: 100, 2: 60, 3: 40 };
const PLACEMENT_BONUS_DEFAULT = 10;
const WIN_BONUS = 50;

export function getPlacementBonus(placement: number): number {
  if (placement === 1 || placement === 2 || placement === 3) {
    return PLACEMENT_BONUS[placement];
  }
  return PLACEMENT_BONUS_DEFAULT;
}

export function getWinBonus(placement: number): number {
  return placement === 1 ? WIN_BONUS : 0;
}

export function calculateMultiplayerXP(score: number, placement: number, streak: number): number {
  const safeScore     = Number.isFinite(score)     ? Math.max(0, score)     : 0;
  const safePlacement = Number.isFinite(placement) ? Math.max(1, placement) : 4;
  const safeStreak    = Number.isFinite(streak)    ? Math.max(0, streak)    : 0;
  const bonus = getPlacementBonus(safePlacement) + getWinBonus(safePlacement);
  return Math.round((safeScore + bonus) * getStreakMultiplier(safeStreak));
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE
// Base Score  = 10 × Difficulty Multiplier
// Speed Bonus = (Remaining Time / Total Time) × Base Score
// Final Score = Base Score + Speed Bonus
// ─────────────────────────────────────────────────────────────────────────────

export function calculateScore(
  difficulty: Difficulty,
  remainingTime: number,
  totalTime: number = DEFAULT_TOTAL_TIME,
): number {
  const mult       = DIFFICULTY_MULTIPLIER[difficulty] ?? 1.0;
  const safeTime   = Number.isFinite(remainingTime) ? Math.max(0, remainingTime) : 0;
  const safePeriod = totalTime > 0 ? totalTime : DEFAULT_TOTAL_TIME;
  const base       = 10 * mult;
  const speedBonus = (safeTime / safePeriod) * base;
  return Math.round(base + speedBonus);
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAK MULTIPLIER
//   1  correct answer           = ×1.0
//   2–4 consecutive correct     = ×2.0   (activates on 2nd correct answer)
//   5–9 consecutive correct     = ×2.5
//   10+ consecutive correct     = ×3.0
// ─────────────────────────────────────────────────────────────────────────────

export function getStreakMultiplier(streak: number): number {
  const s = Number.isFinite(streak) ? Math.max(0, streak) : 0;
  if (s >= 10) return 3.0;
  if (s >= 5)  return 2.5;
  if (s >= 2)  return 2.0;
  return 1.0;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOLO XP
//   XP = Score × 1.5 × Streak Multiplier
// ─────────────────────────────────────────────────────────────────────────────

export function calculateSoloXP(score: number, streak: number): number {
  const safeScore  = Number.isFinite(score)  ? Math.max(0, score)  : 0;
  const safeStreak = Number.isFinite(streak) ? Math.max(0, streak) : 0;
  return Math.round(safeScore * 1.5 * getStreakMultiplier(safeStreak));
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL PROGRESSION
//   Level = floor(totalXP / 1000) + 1
//   Every 1000 XP = 1 Level
// ─────────────────────────────────────────────────────────────────────────────

export function getLevel(totalXP: number): number {
  const safe = Number.isFinite(totalXP) ? Math.max(0, totalXP) : 0;
  return Math.floor(safe / 1000) + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// XP BAR
//   Progress = (Total XP % 1000) / 1000
//   Clamped to [0, 1] — never overflows past 100%
// ─────────────────────────────────────────────────────────────────────────────

export function getXpIntoLevel(totalXP: number): number {
  const safe = Number.isFinite(totalXP) ? Math.max(0, totalXP) : 0;
  return safe % 1000;
}

export function getLevelProgressPercent(totalXP: number): number {
  return Math.min(100, Math.round((getXpIntoLevel(totalXP) / 1000) * 100));
}

export function getXpToNextLevel(totalXp: number): number {
  const safe = Number.isFinite(totalXp) ? Math.max(0, totalXp) : 0;
  return 1000 - (safe % 1000);
}

// ─── Rank helpers (thin wrappers — keep import surface small in consumers) ───

export function getRankTitle(level: number): string {
  return getRankForLevel(level).name;
}