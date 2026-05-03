import { create } from "zustand";
import { Category, CATEGORIES, Difficulty, DIFFICULTIES, Mode, MODES, getRankForLevel } from "../constants";
import { buildSessionDelta, levelFromXp, rankFromLevel, SessionProgressInput, xpToNextLevel } from "../progression/progressionRules";
import { evaluateUnlocks } from "../progression/achievementRules";
import type { Player, Achievement, GameSession, PlayData } from "../types/player";
import { createId } from "../utils/uuid";
import { defaultGameConfig } from "../config/gameConfig";

/** Player Store - User Profile and Progress Management
  * 
  * RESPONSIBILITIES:
  * - Managing user profile information
  * - Tracking player progress and achievements
  * 
  * SEPARATION OF CONCERNS:
  * This store is solely responsible for player data management.
  * It does NOT handle any game logic, navigation, or UI state.
  * 
 **/

interface PlayerState {
  player: Player | null;
  generatePlayer: () => Player;
  getPlayer: () => Player;
  applySessionProgress: (sessionInput: SessionProgressInput) => void;
  saveGameToHistory: (gameData: Omit<GameSession, 'id' | 'date'>) => void;
  resetPlayer: () => void;
}

// Storage key for player data
const PLAYER_STORAGE_KEY = "tfgf-player";

const createEmptyPlayData = (): PlayData => ({
  xpGained: 0,
  scoreGained: 0,
  gamesPlayed: 0,
  gamesMastered: 0,
  topThreeFinishes: 0,
  gamesWon: 0,
  totalQuestionsAnswered: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
});

const getPlayerStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  const isElectron =
    typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("electron");
  const isDev = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true;
  if (isDev && !isElectron) {
    return window.sessionStorage;
  }
  return window.localStorage;
};

const historyLimitByMode: Record<Mode, number> = {
  solo: defaultGameConfig.recentSessionLimitSolo,
  multiplayer: defaultGameConfig.recentSessionLimitMultiplayer,
};

const trimGameHistory = (history: GameSession[]): GameSession[] => {
  const retainedCounts: Record<Mode, number> = {
    solo: 0,
    multiplayer: 0,
  };

  const trimmedReversed: GameSession[] = [];

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    const limit = historyLimitByMode[entry.mode];

    if (retainedCounts[entry.mode] >= limit) continue;

    retainedCounts[entry.mode] += 1;
    trimmedReversed.push(entry);
  }

  return trimmedReversed.reverse();
};

// For debugging: use browser localStorage
// TODO: Change to electron/desktop native paths later:
// - Electron: app.getPath('userData') + '/player.json'
// - Desktop: process.env.APPDATA or ~/.config for config files
const getPlayerFromStorage = (): Player | null => {
  try {
    const storage = getPlayerStorage();
    if (!storage) return null;
    const existing = storage.getItem(PLAYER_STORAGE_KEY);
    if (existing) {
      type SerializedAchievement = Omit<Achievement, "unlockedAt"> & { unlockedAt: string };
      type SerializedGameSession = Omit<GameSession, "date"> & { date: string };
      type SerializedPlayer = Omit<Player, "lastActive" | "achievements" | "gameHistory"> & {
        lastActive: string;
        achievements?: SerializedAchievement[];
        gameHistory?: SerializedGameSession[];
      };

      const parsed = JSON.parse(existing) as SerializedPlayer;
      const gameHistory = trimGameHistory((parsed.gameHistory ?? []).map((session) => ({ ...session, date: new Date(session.date) })));
      return {
        ...parsed,
        lastActive: new Date(parsed.lastActive),
        achievements: (parsed.achievements ?? []).map((a) => ({ ...a, unlockedAt: new Date(a.unlockedAt) })),
        gameHistory,
      };
    }
  } catch (error) {
    console.warn("Failed to load player from storage:", error);
  }
  return null;
};

const savePlayerToStorage = (player: Player): void => {
  try {
    const storage = getPlayerStorage();
    if (!storage) return;
    storage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  } catch (error) {
    console.warn("Failed to save player to storage:", error);
  }
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  player: null,

  generatePlayer: () => {
    // Try to load existing player from storage
    const existingPlayer = getPlayerFromStorage();
    if (existingPlayer) {
      set({ player: existingPlayer });
      return existingPlayer;
    }
    
    // Create new player if none exists
    const newPlayer: Player = {
      id: createId(),
      name: "Player 1",
      avatar: "",
      totalXp: 0,
      xpToNextLevel: 100,
      gameHistory: [],
      achievements: [],
      level: 1,
      rank: getRankForLevel(1),
      totalScore: 0,
      topScore: 0,
      soloGamesPlayed: 0,
      multiplayerGamesPlayed: 0,
      gamesMastered: 0,
      gamesWon: 0,
      topThreeFinishes: 0,
      totalQuestionsAnswered: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      lastActive: new Date(),
      individualStats: Object.values(CATEGORIES).reduce((acc, category) => {
        acc[category] = Object.values(MODES).reduce((acc2, mode) => {
          acc2[mode] = Object.values(DIFFICULTIES).reduce((acc3, difficulty) => {
            acc3[difficulty] = {
              xpGained: 0,
              scoreGained: 0,
              gamesPlayed: 0,
              gamesMastered: 0,
              topThreeFinishes: 0,
              gamesWon: 0,
              totalQuestionsAnswered: 0,
              correctAnswers: 0,
              incorrectAnswers: 0,
            };
            return acc3;
          }, {} as Record<Difficulty, PlayData>);
          return acc2;
        }, {} as Record<Mode, Record<Difficulty, PlayData>>);
        return acc;
      }, {} as Record<Category, Record<Mode, Record<Difficulty, PlayData>>>),
    };
    
    // Save to storage
    savePlayerToStorage(newPlayer);
    set({ player: newPlayer });
    return newPlayer;
  },
  
  getPlayer: () => {
    const currentPlayer = get().player;
    if (currentPlayer) return currentPlayer;
    
    // Try to load from storage first, then generate if needed
    const storedPlayer = getPlayerFromStorage();
    if (storedPlayer) {
      set({ player: storedPlayer });
      return storedPlayer;
    }
    
    return get().generatePlayer();
  },
  saveGameToHistory: (gameData) => {
    const player = get().getPlayer();

    const newEntry: GameSession = {
      id: createId(),
      date: new Date(),
      ...gameData,
    };

    const nextGameHistory = trimGameHistory([...player.gameHistory, newEntry]);

    const updatedPlayer: Player = {
      ...player,
      gameHistory: nextGameHistory,
      lastActive: new Date(),
    };

    savePlayerToStorage(updatedPlayer);
    set({ player: updatedPlayer });
  },
  applySessionProgress: (sessionInput) => {
    const player = get().getPlayer();
    const delta = buildSessionDelta(sessionInput);

    const nextTotalXp = player.totalXp + delta.xpGained;
    const nextLevel = levelFromXp(nextTotalXp);
    const nextRank = rankFromLevel(nextLevel);

    const categoryStats = player.individualStats?.[sessionInput.category];
    const modeStats = categoryStats?.[sessionInput.mode];
    const currentIndividualStats = modeStats?.[sessionInput.difficulty] ?? createEmptyPlayData();
    const nextIndividualStats: PlayData = {
      ...currentIndividualStats,
      xpGained: currentIndividualStats.xpGained + delta.xpGained,
      scoreGained: currentIndividualStats.scoreGained + delta.scoreGained,
      gamesPlayed: currentIndividualStats.gamesPlayed + delta.gamesPlayed,
      gamesMastered: currentIndividualStats.gamesMastered + delta.gamesMastered,
      topThreeFinishes: currentIndividualStats.topThreeFinishes + delta.topThreeFinishes,
      gamesWon: currentIndividualStats.gamesWon + delta.gamesWon,
      totalQuestionsAnswered: currentIndividualStats.totalQuestionsAnswered + delta.totalQuestionsAnswered,
      correctAnswers: currentIndividualStats.correctAnswers + delta.correctAnswers,
      incorrectAnswers: currentIndividualStats.incorrectAnswers + delta.incorrectAnswers,
    };

    const nextTotalQuestionsAnswered = player.totalQuestionsAnswered + delta.totalQuestionsAnswered;
    const previousTotalAnswerTime = (player.averageTimePerQuestion ?? 0) * player.totalQuestionsAnswered;
    const sessionAverageTime =
      delta.averageTimePerQuestion ??
      (sessionInput.totalQuestions > 0 ? sessionInput.timeTaken / sessionInput.totalQuestions : undefined);
    const sessionTotalAnswerTime = (sessionAverageTime ?? 0) * delta.totalQuestionsAnswered;
    const nextAverageTimePerQuestion =
      nextTotalQuestionsAnswered > 0
        ? (previousTotalAnswerTime + sessionTotalAnswerTime) / nextTotalQuestionsAnswered
        : undefined;

    const newHistoryEntry: GameSession = {
      id: createId(),
      date: new Date(),
      mode: sessionInput.mode,
      category: sessionInput.category,
      difficulty: sessionInput.difficulty,
      totalQuestions: sessionInput.totalQuestions,
      correctAnswers: sessionInput.correctAnswers,
      score: sessionInput.score,
      questions: sessionInput.questions,
      userAnswers: sessionInput.userAnswers,
      timeTaken: sessionInput.timeTaken,
      timePerQuestion: sessionInput.timePerQuestion,
      mastered: sessionInput.mastered,
      won: sessionInput.won,
      topThreeFinish: sessionInput.topThreeFinish,
    };

    const nextGameHistory = trimGameHistory([...player.gameHistory, newHistoryEntry]);

    const updatedPlayer: Player = {
      ...player,
      totalXp: nextTotalXp,
      xpToNextLevel: xpToNextLevel(nextTotalXp),
      level: nextLevel,
      rank: nextRank,
      totalScore: player.totalScore + delta.scoreGained,
      topScore: Math.max(player.topScore, sessionInput.score),
      soloGamesPlayed: player.soloGamesPlayed + (sessionInput.mode === 'solo' ? delta.gamesPlayed : 0),
      multiplayerGamesPlayed: player.multiplayerGamesPlayed + (sessionInput.mode === 'multiplayer' ? delta.gamesPlayed : 0),
      gamesMastered: player.gamesMastered + delta.gamesMastered,
      gamesWon: player.gamesWon + delta.gamesWon,
      topThreeFinishes: player.topThreeFinishes + delta.topThreeFinishes,
      totalQuestionsAnswered: nextTotalQuestionsAnswered,
      correctAnswers: player.correctAnswers + delta.correctAnswers,
      incorrectAnswers: player.incorrectAnswers + delta.incorrectAnswers,
      averageTimePerQuestion: nextAverageTimePerQuestion,
      lastActive: new Date(),
      gameHistory: nextGameHistory,
      individualStats: {
        ...player.individualStats,
        [sessionInput.category]: {
          ...categoryStats,
          [sessionInput.mode]: {
            ...modeStats,
            [sessionInput.difficulty]: nextIndividualStats,
          },
        },
      },
    };

    const unlocks = evaluateUnlocks(updatedPlayer, sessionInput);
    // Only add fully unlocked achievements (progress === 100) to the player's achievements list.
    const newlyUnlocked = unlocks.filter((u) => u.progress === 100);
    const achievements = [...updatedPlayer.achievements, ...newlyUnlocked].filter((item): item is Achievement => item !== null && item !== undefined);

    const finalPlayer = { ...updatedPlayer, achievements };

    savePlayerToStorage(finalPlayer);
    set({ player: finalPlayer });
  },
  resetPlayer: () => {
    try {
      const storage = getPlayerStorage();
      storage?.removeItem(PLAYER_STORAGE_KEY);
      set({ player: null });
    } catch (error) {
      console.warn("Failed to reset player:", error);
    }
  }
  
}));
