import { usePlayerStore } from "../store/playerStore";

/**
 * Dev tools for manipulating the daily streak counter.
 * Attached to window.streakTester in the console.
 */

export function getDailyStreak(): number {
  const player = usePlayerStore.getState().getPlayer();
  return player.dailyStreak ?? 0;
}

export function setDailyStreak(count: number): void {
  const store = usePlayerStore.getState();
  const player = store.getPlayer();
  store.updatePlayer({ dailyStreak: Math.max(0, Math.round(count)) });
  console.log(`✓ Daily streak set to ${count}`);
}

export function resetDailyStreak(): void {
  setDailyStreak(0);
}

export function addDailyStreakDay(): void {
  const current = getDailyStreak();
  setDailyStreak(current + 1);
}

export function listStreakInfo(): void {
  const player = usePlayerStore.getState().getPlayer();
  console.log('[Streak Info]', {
    dailyStreak: player.dailyStreak ?? 0,
    lastPlayedDate: player.lastPlayedDate?.toISOString() ?? 'never',
    currentPlayStreak: player.currentPlayStreak,
  });
}

// Attach to window for console access
if (typeof window !== 'undefined') {
  (window as any).streakTester = {
    get: getDailyStreak,
    set: setDailyStreak,
    reset: resetDailyStreak,
    addDay: addDailyStreakDay,
    info: listStreakInfo,
  };
  console.log('[streakTester] Daily streak dev tools loaded');
  console.log('[streakTester] Usage: window.streakTester.get(), .set(n), .reset(), .addDay(), .info()');
}