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

export function unlockAllAchievements(): void {
  const store = usePlayerStore.getState();
  const player = store.getPlayer();
  
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
  const store = usePlayerStore.getState();
  const player = store.getPlayer();
  const rivalStats = { ...player.rivalStats };
  
  // Create a mock rival if we need to increment defeats
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
  const totalDefeats = Object.values(player.rivalStats).reduce((a, b) => a + b, 0) + incrementCount;
  
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
  (window as any).achievementTester = {
    unlock: unlockAchievement,
    lock: lockAchievement,
    unlockAll: unlockAllAchievements,
    lockAll: lockAllAchievements,
    list: listAchievements,
    status: getAchievementStatus,
    setRivalDefeats,
    addRivalWin
  };
}
