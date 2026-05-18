/**
 * Freeze Bonus Tester - Dev console helpers for testing freeze timer bonus tracking
 * 
 * Usage in console:
 *   freezeBonus.addPoints(500)              // Add 500 freeze bonus points to player
 *   freezeBonus.addUsage(5)                 // Add 5 to freeze usage count
 *   freezeBonus.setPoints(1000)             // Set points to exactly 1000
 *   freezeBonus.setUsage(10)                // Set usage count to exactly 10
 *   freezeBonus.get()                       // Get current freeze bonus stats
 *   freezeBonus.reset()                     // Reset both to 0
 *   freezeBonus.log()                       // Log formatted stats
 */

import { usePlayerStore } from '../store/playerStore';

export interface FreezeBonusStats {
  timeFreezePointsEarned: number;
  timeFreezeUsageCount: number;
}

export function getFreezeBonusStats(): FreezeBonusStats {
  const player = usePlayerStore.getState().getPlayer();
  return {
    timeFreezePointsEarned: player.timeFreezePointsEarned ?? 0,
    timeFreezeUsageCount: player.timeFreezeUsageCount ?? 0,
  };
}

export function addFreezeBonusPoints(amount: number): void {
  if (!Number.isFinite(amount) || amount < 0) {
    console.error(`Invalid freeze bonus amount: ${amount}. Must be a finite number >= 0.`);
    return;
  }
  const player = usePlayerStore.getState().getPlayer();
  const newTotal = (player.timeFreezePointsEarned ?? 0) + amount;
  
  usePlayerStore.getState().updatePlayer({
    timeFreezePointsEarned: newTotal,
  });
  
  console.log(`❄️  Freeze bonus: +${amount} points (total: ${newTotal})`);
}

export function setFreezeBonusPoints(amount: number): void {
  if (!Number.isFinite(amount) || amount < 0) {
    console.error(`Invalid freeze bonus amount: ${amount}. Must be a finite number >= 0.`);
    return;
  }
  usePlayerStore.getState().updatePlayer({
    timeFreezePointsEarned: amount,
  });
  
  console.log(`❄️  Freeze bonus points set to ${amount}`);
}

export function addFreezeBonusUsage(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    console.error(`Invalid freeze usage count: ${count}. Must be a non-negative integer.`);
    return;
  }
  const player = usePlayerStore.getState().getPlayer();
  const newTotal = (player.timeFreezeUsageCount ?? 0) + count;
  
  usePlayerStore.getState().updatePlayer({
    timeFreezeUsageCount: newTotal,
  });
  
  console.log(`❄️  Freeze usage: +${count} (total: ${newTotal} uses)`);
}

export function setFreezeBonusUsage(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    console.error(`Invalid freeze usage count: ${count}. Must be a non-negative integer.`);
    return;
  }
  usePlayerStore.getState().updatePlayer({
    timeFreezeUsageCount: count,
  });
  
  console.log(`❄️  Freeze usage count set to ${count}`);
}

export function resetFreezeBonus(): void {
  usePlayerStore.getState().updatePlayer({
    timeFreezePointsEarned: 0,
    timeFreezeUsageCount: 0,
  });
  
  console.log('❄️  Freeze bonus stats reset to 0');
}

export function logFreezeBonus(): void {
  const stats = getFreezeBonusStats();
  console.log('❄️  Freeze Bonus Stats:');
  console.log(`   Points Earned: ${stats.timeFreezePointsEarned}`);
  console.log(`   Usage Count:   ${stats.timeFreezeUsageCount}`);
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).freezeBonus = {
    addPoints: addFreezeBonusPoints,
    setPoints: setFreezeBonusPoints,
    addUsage: addFreezeBonusUsage,
    setUsage: setFreezeBonusUsage,
    get: getFreezeBonusStats,
    reset: resetFreezeBonus,
    log: logFreezeBonus,
  };
}
