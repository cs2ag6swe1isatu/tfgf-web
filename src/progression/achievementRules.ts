import { SessionProgressInput } from "./progressionRules";
import { Achievement, Player } from "../types/player";
import { Category, CATEGORIES, DIFFICULTIES, Difficulty, MODES, Mode } from "../constants";

/**
 * Achievements list:
 * first blood
 * git gud
 * pogchamp
 * playing favorites
 * speedrunner (solo)
 * smurfing
 * smooth start (easy solo)
 * solid performance (medium solo)
 * true expert (hard solo)
 * champion (multiplayer)
 * flawless victory (solo)
 * point hoarder (solo)
 * mastermind (solo)
 * jack of all trades (solo)
 * lone wolf (solo)
 * built different (solo)
 * daily grind (solo)
 * clutch king (multiplayer)
 * party up (multiplayer)
 * crowd controller (multiplayer)
 * podium finish (multiplayer)
 * untouchable (multiplayer)
 * fast hands (multiplayer)
 * hall of fame (multiplayer)
 * host with the most (multiplayer)
 * apex predator (multiplayer)
 * nemesis (multiplayer)
 */

export type AchievementScope = "all" | "solo" | "multiplayer";

export type AchievementCategory =
  | "Getting Started"
  | "Perfect Scores"
  | "Grind"
  | "Skill"
  | "Multiplayer";

const achievementIconPath = (fileName: string): string => `/img/achievements/${encodeURIComponent(fileName)}`;
const lockedAchievementIconPath = achievementIconPath("Locked icon.png");

// Aggregates played games across optional filters.
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

// Aggregates wins across optional filters.
function countWins(player: Player, filters: { category?: Category; mode?: Mode; difficulty?: Difficulty }): number {
  const stats = player.individualStats;
  if (!stats) return 0;

  const cats = filters.category ? [filters.category] : Object.values(CATEGORIES);
  const modes = filters.mode ? [filters.mode] : Object.values(MODES);
  const diffs = filters.difficulty ? [filters.difficulty] : Object.values(DIFFICULTIES);

  return cats.reduce((cAcc, c) =>
    cAcc + modes.reduce((mAcc, m) =>
      mAcc + diffs.reduce((dAcc, d) =>
        dAcc + (stats[c]?.[m]?.[d]?.gamesWon ?? 0)
      , 0)
    , 0)
  , 0);
}

// Counts categories where the player has at least one played game.
function countCategoriesWithGames(player: Player, filters: { mode?: Mode; difficulty?: Difficulty }): number {
  const stats = player.individualStats;
  if (!stats) return 0;

  const categories = Object.values(CATEGORIES);
  const modes = filters.mode ? [filters.mode] : Object.values(MODES);
  const diffs = filters.difficulty ? [filters.difficulty] : Object.values(DIFFICULTIES);

  return categories.filter((cat) =>
    modes.some((m) =>
      diffs.some((d) => (stats[cat]?.[m]?.[d]?.gamesPlayed ?? 0) > 0)
    )
  ).length;
}

// Counts unique categories with at least one perfect game.
function countUniqueCategoriesWithMastery(player: Player, filters: { mode?: Mode }): number {
  const stats = player.individualStats;
  if (!stats) return 0;

  const categories = Object.values(CATEGORIES);
  const modes = filters.mode ? [filters.mode] : Object.values(MODES);

  return categories.filter((cat) =>
    modes.some((m) =>
      Object.values(DIFFICULTIES).some((d) => (stats[cat]?.[m]?.[d]?.gamesMastered ?? 0) > 0)
    )
  ).length;
}

export interface AchievementRule {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  scope: AchievementScope;
  check: (player: Player, sessionInput: SessionProgressInput) => boolean;
  progress?: (player: Player, sessionInput: SessionProgressInput) => number;
}

export const ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    id: "leaderboard_takeover",
    name: "Apex Predator",
    description: "Reach #1 on the multiplayer leaderboard 5 times.",
    icon: achievementIconPath("Apex Predator.png"),
    category: "Multiplayer",
    scope: "multiplayer",
    check: (player) => {
      const multiplayerWins = countWins(player, { mode: "multiplayer" });
      return multiplayerWins >= 5;
    },
    progress: (player) => {
      const multiplayerWins = countWins(player, { mode: "multiplayer" });
      const percent = (multiplayerWins / 5) * 100;
      return Math.min(100, Math.max(0, Math.round(percent)));
    },
  },
  {
    id: "hardmode_winner",
    name: "Built Different",
    description: "Win 10 games in hard mode.",
    icon: achievementIconPath("Built Different.png"),
    category: "Skill",
    scope: "solo",
    check: (player) => {
      const hardModeWins = countWins(player, { mode: "solo", difficulty: "hard" });
      return hardModeWins >= 10;
    },
    progress: (player) => {
      const hardModeWins = countWins(player, { mode: "solo", difficulty: "hard" });
      const percent = (hardModeWins / 10) * 100;
      return Math.min(100, Math.max(0, Math.round(percent)));
    },
  },
  {
    id: "top_one_leaderboard",
    name: "Champion",
    description: "Finish a multiplayer game placing top 1 in ranking.",
    icon: achievementIconPath("Champion.png"),
    category: "Multiplayer",
    scope: "multiplayer",
    check: (player, sessionInput) => sessionInput.mode === "multiplayer" && sessionInput.won === true,
  },
  {
    id: "comeback_win",
    name: "Clutch King",
    description: "Win a game after being behind in score.",
    icon: achievementIconPath("Clutch King.png"),
    category: "Skill",
    scope: "multiplayer",
    // Raw comeback detection is computed in QuestionPage and stored on session input.
    // It already includes anti-noise guards (minimum rounds, minimum leader score, and minimum gap).
    check: (_player, sessionInput) =>
      sessionInput.mode === "multiplayer" &&
      sessionInput.won &&
      sessionInput.fellBehindByHalfAndWon === true,
  },
  {
    id: "multiplayer_master",
    name: "Crowd Controller",
    description: "Win 10 multiplayer games.",
    icon: achievementIconPath("Crowd Controller.png"),
    category: "Multiplayer",
    scope: "multiplayer",
    check: (player) => {
      const multiplayerWins = countWins(player, { mode: "multiplayer" });
      return multiplayerWins >= 10;
    },
    progress: (player) => {
      const multiplayerWins = countWins(player, { mode: "multiplayer" });
      const percent = (multiplayerWins / 10) * 100;
      return Math.min(100, Math.max(0, Math.round(percent)));
    },
  },
  {
    id: "daily_player",
    name: "Daily Grind",
    description: "Play the game 7 days in a row.",
    icon: achievementIconPath("Daily Grind.png"),
    category: "Grind",
    scope: "solo",
    check: (player) => player.currentPlayStreak >= 7,
    progress: (player) => {
      const percent = (player.currentPlayStreak / 7) * 100;
      return Math.min(100, Math.max(0, Math.round(percent)));
    },
  },
  {
    id: "multiplayer_speedrun",
    name: "Fast Hands",
    description: "Finish a multiplayer game in under 20 seconds.",
    icon: achievementIconPath("Fast Hands.png"),
    category: "Skill",
    scope: "multiplayer",
    check: (player, sessionInput) => sessionInput.mode === "multiplayer" && sessionInput.timeTaken < 20,
  },
  {
    id: "first_game",
    name: "First Blood!",
    description: "Play your first game.",
    icon: achievementIconPath("First Blood.png"),
    category: "Getting Started",
    scope: "all",
    check: (player) => player.soloGamesPlayed >= 1 || player.multiplayerGamesPlayed >= 1,
  },
  {
    id: "no_mistakes",
    name: "Flawless Victory",
    description: "Finish a game without answering incorrectly.",
    icon: achievementIconPath("Flawless Victory.png"),
    category: "Perfect Scores",
    scope: "solo",
    check: (player, sessionInput) => sessionInput.mode === "solo" && sessionInput.correctAnswers === sessionInput.totalQuestions,
  },
  {
    id: "first_win",
    name: "Git Gud",
    description: "Win your first game.",
    icon: achievementIconPath("Git Gud.png"),
    category: "Getting Started",
    scope: "all",
    check: (player, sessionInput) => sessionInput.won,
  },
  {
    id: "leaderboard_regular",
    name: "Hall of Fame",
    description: "Reach the leaderboard 10 times.",
    icon: achievementIconPath("Hall of Fame.png"),
    category: "Multiplayer",
    scope: "multiplayer",
    check: (player) => player.leaderboardAppearances >= 10,
    progress: (player) => {
      const percent = (player.leaderboardAppearances / 10) * 100;
      return Math.min(100, Math.max(0, Math.round(percent)));
    },
  },
  {
    id: "lobby_creator",
    name: "Host with the Most",
    description: "Create your first multiplayer lobby.",
    icon: achievementIconPath("Host With The Most.png"),
    category: "Multiplayer",
    scope: "multiplayer",
    check: (player) => player.lobbiesCreated >= 1,
  },
  {
    id: "category_explorer",
    name: "Jack of All Trades",
    description: "Play at least one game in every category.",
    icon: achievementIconPath("Jack of All Trades.png"),
    category: "Grind",
    scope: "solo",
    check: (player) => {
      const categoriesWithGames = countCategoriesWithGames(player, { mode: "solo" });
      return categoriesWithGames === CATEGORIES.length;
    },
    progress: (player) => {
      const categoriesWithGames = countCategoriesWithGames(player, { mode: "solo" });
      const percent = (categoriesWithGames / CATEGORIES.length) * 100;
      return Math.min(100, Math.max(0, Math.round(percent)));
    },
  },
  {
    id: "solo_master",
    name: "Lone Wolf",
    description: "Play 25 solo games.",
    icon: achievementIconPath("Lone Wolf.png"),
    category: "Grind",
    scope: "solo",
    check: (player) => player.soloGamesPlayed >= 25,
    progress: (player) => {
      const percent = (player.soloGamesPlayed / 25) * 100;
      return Math.min(100, Math.max(0, Math.round(percent)));
    },
  },
  {
    id: "category_master",
    name: "Mastermind",
    description: "Get a perfect score in 5 different categories.",
    icon: achievementIconPath("Mastermind.png"),
    category: "Skill",
    scope: "solo",
    check: (player) => {
      const categoriesWithMastery = countUniqueCategoriesWithMastery(player, { mode: "solo" });
      return categoriesWithMastery >= 5;
    },
    progress: (player) => {
      const categoriesWithMastery = countUniqueCategoriesWithMastery(player, { mode: "solo" });
      const percent = (categoriesWithMastery / 5) * 100;
      return Math.min(100, Math.max(0, Math.round(percent)));
    },
  },
  {
    id: "rival_crusher",
    name: "Nemesis",
    description: "Defeat the same player 5 times.",
    icon: achievementIconPath("Nemesis.png"),
    category: "Multiplayer",
    scope: "multiplayer",
    check: (player) => player.rivalDefeats >= 5,
    progress: (player) => {
      const percent = (player.rivalDefeats / 5) * 100;
      return Math.min(100, Math.max(0, Math.round(percent)));
    },
  },
  {
    id: "multiplayer_rookie",
    name: "Party Up",
    description: "Play your first multiplayer game.",
    icon: achievementIconPath("Party Up.png"),
    category: "Multiplayer",
    scope: "multiplayer",
    check: (player) => player.multiplayerGamesPlayed >= 1,
  },
  {
    id: "perfect_score",
    name: "PogChamp",
    description: "Answer all questions correctly in a game.",
    icon: achievementIconPath("Pog Champ.png"),
    category: "Perfect Scores",
    scope: "all",
    check: (player, sessionInput) => sessionInput.mastered,
  },
  {
    id: "10_games_category",
    name: "Playing Favorites",
    description: "Play 10 games in the same category.",
    icon: achievementIconPath("Playing Favorites.png"),
    category: "Grind",
    scope: "all",
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
    id: "thousand_points",
    name: "Point Hoarder",
    description: "Earn a total of 1,000 points.",
    icon: achievementIconPath("Point Hoarder.png"),
    category: "Grind",
    scope: "solo",
    check: (player) => player.totalScore >= 1000,
    progress: (player) => {
      const percent = (player.totalScore / 1000) * 100;
      return Math.min(100, Math.max(0, Math.round(percent)));
    },
  },
  {
    id: "top_three_finish",
    name: "Podium Finish",
    description: "Finish in the top 3 in a multiplayer match.",
    icon: achievementIconPath("Podium Finish.png"),
    category: "Multiplayer",
    scope: "multiplayer",
    check: (player, sessionInput) => sessionInput.mode === "multiplayer" && sessionInput.topThreeFinish === true,
  },
  {
    id: "first_time_category_perfect",
    name: "Smurfing",
    description: "Get a perfect score the first time you play a category.",
    icon: achievementIconPath("Smurfing.png"),
    category: "Perfect Scores",
    scope: "all",
    check: (player, sessionInput) => {
      const gamesPlayedInCategory = countGames(player, { category: sessionInput.category });
      return gamesPlayedInCategory === 1 && sessionInput.mastered;
    },
  },
  {
    id: "first_easy_perfect",
    name: "Smooth Start",
    description: "Get a perfect score the first time you play in easy mode solo.",
    icon: achievementIconPath("Smooth Start.png"),
    category: "Perfect Scores",
    scope: "solo",
    check: (player, sessionInput) => sessionInput.difficulty === "easy" && sessionInput.mastered && sessionInput.mode === "solo" && countGames(player, { mode: "solo", difficulty: "easy" }) === 1,
  },
  {
    id: "first_medium_perfect",
    name: "Solid Performance",
    description: "Get a perfect score the first time you play in medium mode solo.",
    icon: achievementIconPath("Solid Performance.png"),
    category: "Perfect Scores",
    scope: "solo",
    check: (player, sessionInput) => sessionInput.difficulty === "medium" && sessionInput.mastered && sessionInput.mode === "solo" && countGames(player, { mode: "solo", difficulty: "medium" }) === 1,
  },
  {
    id: "fast_game_solo",
    name: "Speedrunner",
    description: "Finish a solo game in under 25 seconds.",
    icon: achievementIconPath("SpeedRunner.png"),
    category: "Skill",
    scope: "solo",
    check: (player, sessionInput) => sessionInput.mode === "solo" && sessionInput.timeTaken <= 25,
  },
  {
    id: "first_hard_perfect",
    name: "True Expert",
    description: "Get a perfect score the first time you play in hard mode solo.",
    icon: achievementIconPath("True Expert.png"),
    category: "Perfect Scores",
    scope: "solo",
    check: (player, sessionInput) => sessionInput.difficulty === "hard" && sessionInput.mastered && sessionInput.mode === "solo" && countGames(player, { mode: "solo", difficulty: "hard" }) === 1,
  },
  {
    id: "undefeated_lobby",
    name: "Untouchable",
    description: "Win a multiplayer game without making a mistake.",
    icon: achievementIconPath("Untouchable.png"),
    category: "Multiplayer",
    scope: "multiplayer",
    check: (player, sessionInput) => sessionInput.mode === "multiplayer" && sessionInput.won === true && sessionInput.correctAnswers === sessionInput.totalQuestions,
  },
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

    // Full unlock takes priority over partial progress snapshots.
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

    // For progress-based achievements, report non-zero progress so UI can show advancement.
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