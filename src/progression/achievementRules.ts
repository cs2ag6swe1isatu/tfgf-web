import { SessionProgressInput } from "./progressionRules";
import { Achievement, Player } from "../types/player";
import { Category, CATEGORIES, DIFFICULTIES, Difficulty, MODES, Mode } from "../constants";

function countGames(player: Player, filters: { category?: Category; mode?: Mode; difficulty?: Difficulty }): number {
  const stats = player.individualStats;
  if (!stats) return 0;

  const cats = filters.category ? [filters.category] : Object.values(CATEGORIES);
  const modes = filters.mode ? [filters.mode] : Object.values(MODES);
  const diffs = filters.difficulty ? [filters.difficulty] : Object.values(DIFFICULTIES);

  return cats.reduce((cAcc, c) =>
    cAcc + modes.reduce((mAcc, m) =>
      mAcc + diffs.reduce((dAcc, d) =>
        dAcc + (stats[c]?.[m]?.[d]?.gamesPlayed ?? 0)
      , 0)
    , 0)
  , 0);
}

export interface AchievementRule {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (player: Player, sessionInput: SessionProgressInput) => boolean;
  progress?: (player: Player, sessionInput: SessionProgressInput) => number;
}

const ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    id: "first_game",
    name: "First Blood!",
    description: "Play your first game.",
    icon: "[first_game.todo]",
    check: (player) => player.soloGamesPlayed >= 1 || player.multiplayerGamesPlayed >= 1,
  },
  {
    id: "first_win",
    name: "Git Gud",
    description: "Win your first game.",
    icon: "[first_win.todo]",
    check: (player, sessionInput) => sessionInput.won,
  },
  {
    id: "perfect_score",
    name: "PogChamp",
    description: "Answer all questions correctly in a game.",
    icon: "[perfect_score.todo]",
    check: (player, sessionInput) => sessionInput.mastered,
  },
  {
    id: "10_games_category",
    name: "Playing Favorites",
    description: "Play 10 games in the same category.",
    icon: "[10_games_category.todo]",
    check: (player, sessionInput) => {
      return countGames(player, { category: sessionInput.category }) >= 10;
    },
    progress: (player, sessionInput) => {
      const gamesPlayedInCategory = countGames(player, { category: sessionInput.category });
      const percent = (gamesPlayedInCategory / 10) * 100;
      return Math.min(100, Math.max(0, Math.round(percent)));
    },
  },
  {
    id: "fast_game_solo",
    name: "Speedrunner",
    description: "Finish a solo game in under 25 seconds.",
    icon: "[fast_game_solo.todo]",
    check: (player, sessionInput) => sessionInput.mode === "solo" && sessionInput.timeTaken <= 25,
  },
  {
    id: "first_time_category_perfect",
    name: "Smurfing",
    description: "Get a perfect score the first time you play a category.",
    icon: "[first_time_category_perfect.todo]",
    check: (player, sessionInput) => {
      const gamesPlayedInCategory = countGames(player, { category: sessionInput.category });
      return gamesPlayedInCategory === 1 && sessionInput.mastered;
    },
  }
];

export function getAchievementDefinition(id: string): Achievement | undefined {
  const rule = ACHIEVEMENT_RULES.find((rule) => rule.id === id);
  if (!rule) return undefined;
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    icon: rule.icon,
    unlockedAt: new Date(0),
    progress: 0,
  };
}

export function evaluateUnlocks(player: Player, sessionInput: SessionProgressInput): Achievement[] {
  const unlocked: Achievement[] = [];

  ACHIEVEMENT_RULES.forEach((rule) => {
    const alreadyUnlocked = player.achievements.some((a) => a.id === rule.id);
    if (alreadyUnlocked) return;

    if (rule.check(player, sessionInput)) {
      unlocked.push({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        icon: rule.icon,
        unlockedAt: new Date(),
        progress: 100,
      });
      return;
    }

    if (rule.progress) {
      const progressValue = Math.min(100, Math.max(0, rule.progress(player, sessionInput)));
      if (progressValue > 0) {
        unlocked.push({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          icon: rule.icon,
          unlockedAt: new Date(0),
          progress: progressValue,
        });
      }
    }
  });

  return unlocked;
}