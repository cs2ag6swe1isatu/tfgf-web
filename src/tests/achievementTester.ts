import { usePlayerStore } from "../store/playerStore";
import { ACHIEVEMENT_RULES } from "../progression/achievementRules";
import type { Achievement } from "../types/player";

export function unlockAchievement(achievementId: string): void {
  const rule = ACHIEVEMENT_RULES.find(r => r.id === achievementId);
  if (!rule) {
    console.error(`Achievement "${achievementId}" not found`);
    return;
  }
  
  const store = usePlayerStore.getState();
  const player = store.getPlayer();
  
  // Remove if exists, then add unlocked version
  const filtered = player.achievements.filter(a => a.id !== achievementId);
  const newAchievement: Achievement = {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    icon: rule.icon,
    unlockedAt: new Date(),
    progress: 100
  };
  
  store.updatePlayer({
    achievements: [...filtered, newAchievement]
  });
  
  console.log(`✓ Unlocked achievement: ${rule.name}`);
}

export function lockAchievement(achievementId: string): void {
  const rule = ACHIEVEMENT_RULES.find(r => r.id === achievementId);
  if (!rule) {
    console.error(`Achievement "${achievementId}" not found`);
    return;
  }
  
  const store = usePlayerStore.getState();
  const player = store.getPlayer();
  const filtered = player.achievements.filter(a => a.id !== achievementId);
  store.updatePlayer({ achievements: filtered });
  
  console.log(`✗ Locked achievement: ${rule.name}`);
}

export function unlockAchievements(ids: string[]): void {
  ids.forEach(unlockAchievement);
}

export function lockAchievements(ids: string[]): void {
  ids.forEach(lockAchievement);
}

export function unlockAllAchievements(): void {
  const store = usePlayerStore.getState();
  
  const unlockedAll = ACHIEVEMENT_RULES.map(rule => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    icon: rule.icon,
    unlockedAt: new Date(),
    progress: 100
  }));
  
  store.updatePlayer({ achievements: unlockedAll });
  console.log(`✓ Unlocked all ${ACHIEVEMENT_RULES.length} achievements`);
}

export function lockAllAchievements(): void {
  const store = usePlayerStore.getState();
  store.updatePlayer({ achievements: [] });
  console.log(`✗ Locked all achievements`);
}

export function listAchievements(): void {
  console.table(
    ACHIEVEMENT_RULES.map(rule => ({
      id: rule.id,
      name: rule.name,
      category: rule.category,
      scope: rule.scope
    }))
  );
}

export function getAchievementStatus(): void {
  const store = usePlayerStore.getState();
  const player = store.getPlayer();
  console.log(`Unlocked: ${player.achievements.length}/${ACHIEVEMENT_RULES.length}`);
  console.table(
    player.achievements.map(a => ({
      id: a.id,
      name: a.name,
      unlockedAt: a.unlockedAt
    }))
  );
}

export function setRivalDefeats(count: number): void {
  // If called from console as a direct global, 'count' might be the event/window if invoked weirdly
  // but usually it's just the first arg.
  const store = usePlayerStore.getState();
  const player = store.getPlayer();
  const rivalStats = { ...player.rivalStats };
  
  const rivalId = "rival-1";
  rivalStats[rivalId] = count;
  
  store.updatePlayer({
    rivalDefeats: count,
    rivalStats
  });
  
  console.log(`✓ Set rival defeats to ${count}`);
}

export function addRivalWin(opponentId: string, incrementCount: number = 1): void {
  const store = usePlayerStore.getState();
  const player = store.getPlayer();
  
  const newCount = (player.rivalStats[opponentId] || 0) + incrementCount;
  const totalDefeats = Object.values(player.rivalStats).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0) + incrementCount;
  
  store.updatePlayer({
    rivalDefeats: totalDefeats,
    rivalStats: {
      ...player.rivalStats,
      [opponentId]: newCount
    }
  });
  
  console.log(`✓ Added win vs opponent "${opponentId}". Total defeats: ${totalDefeats}`);
}

// Expose to window for console access
if (typeof window !== "undefined") {
  const tester = {
    unlock: unlockAchievement,
    lock: lockAchievement,
    unlockAchievements: unlockAchievements,
    lockAchievements: lockAchievements,
    unlockAll: unlockAllAchievements,
    lockAll: lockAllAchievements,
    list: listAchievements,
    status: getAchievementStatus,
    setRivalDefeats,
    addRivalWin
  };

  (window as any).achievementTester = tester;

  // Also expose flat versions for convenience
  (window as any).unlockAchievement = unlockAchievement;
  (window as any).lockAchievement = lockAchievement;
  (window as any).unlockAchievements = unlockAchievements;
  (window as any).lockAchievements = lockAchievements;
  (window as any).unlockAllAchievements = unlockAllAchievements;
  (window as any).lockAllAchievements = lockAllAchievements;
  (window as any).listAchievements = listAchievements;
  (window as any).getAchievementStatus = getAchievementStatus;
  (window as any).setRivalDefeats = setRivalDefeats;
  (window as any).addRivalWin = addRivalWin;

  console.log("%c ACHIEVEMENT TESTER LOADED ", "background: #111; color: #35E52B; font-weight: bold; border: 1px solid #35E52B;");
  console.log("Usage: achievementTester.unlock('id'), unlockAllAchievements(), listAchievements()");
}
