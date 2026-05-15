/**
 * Shared number formatting utilities for result displays.
 *
 * RULES:
 * - Scores must be whole numbers (no decimals).
 * - XP must be whole numbers (no decimals).
 * - Accuracy is the ONLY value that shows 2 decimal places with a % sign.
 */

export function formatScore(value: number): number {
  return Math.round(value);
}

export function formatXP(value: number): number {
  return Math.round(value);
}

export function formatAccuracy(value: number): string {
  return value.toFixed(2) + '%';
}