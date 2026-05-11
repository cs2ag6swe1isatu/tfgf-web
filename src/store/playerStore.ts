import { create } from "zustand";
import { Category, CATEGORIES, Difficulty, DIFFICULTIES, Mode, MODES, getRankForLevel } from "../constants";
import { buildSessionDelta, levelFromXp, rankFromLevel, SessionProgressInput, xpToNextLevel } from "../progression/progressionRules";
import { evaluateUnlocks } from "../progression/achievementRules";
import type { Player, Achievement, GameSession, PlayData } from "../types/player";
import { createId } from "../utils/uuid";
import { defaultGameConfig } from "../config/gameConfig";

// Type definition for playerStorage API exposed via preload
interface PlayerStorageAPI {
  read: () => Promise<{ success: boolean; data: string | null; error?: string }>;
  write: (data: string) => Promise<{ success: boolean; error?: string }>;
  delete: () => Promise<{ success: boolean; error?: string }>;
}

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
  isLoading: boolean;
  initialize: () => Promise<void>;
  generatePlayer: () => Player;
  getPlayer: () => Player;
  applySessionProgress: (sessionInput: SessionProgressInput) => void;
  saveGameToHistory: (gameData: Omit<GameSession, 'id' | 'date'>) => void;
  resetPlayer: () => void;
  setAvatar: (avatar: string) => void;
  setPlayerName: (name: string) => void;
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
  if (isElectron) {
    // In Electron, we use file-based storage via IPC, not browser storage
    return null;
  }
  if (isDev) {
    return window.sessionStorage;
  }
  return window.localStorage;
};

const hasPlayerStorageAPI = (): boolean => {
  return typeof window !== "undefined" && (window as unknown as Record<string, unknown>).playerStorage !== undefined;
};

const getPlayerStorageAPI = (): PlayerStorageAPI | null => {
  if (!hasPlayerStorageAPI()) return null;
  return (window as unknown as Record<string, unknown>).playerStorage as PlayerStorageAPI;
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

const getDayKey = (date: Date): number =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const dayDiff = (from: Date, to: Date): number => Math.round((getDayKey(to) - getDayKey(from)) / 86400000);

const deserializePlayer = (existing: string): Player => {
  type SerializedAchievement = Omit<Achievement, "unlockedAt"> & { unlockedAt: string };
  type SerializedGameSession = Omit<GameSession, "date"> & { date: string };
  type SerializedPlayer = Omit<Player, "lastActive" | "achievements" | "gameHistory"> & {
    lastActive: string;
    lastPlayedDate?: string;
    achievements?: SerializedAchievement[];
    gameHistory?: SerializedGameSession[];
    topScore?: number;
  };

  const parsed = JSON.parse(existing) as SerializedPlayer;
  const gameHistory = trimGameHistory((parsed.gameHistory ?? []).map((session) => ({ ...session, date: new Date(session.date) })));
  return {
    ...parsed,
    lastActive: new Date(parsed.lastActive),
    lastPlayedDate: parsed.lastPlayedDate ? new Date(parsed.lastPlayedDate) : undefined,
    leaderboardAppearances: parsed.leaderboardAppearances ?? 0,
    lobbiesCreated: parsed.lobbiesCreated ?? 0,
    currentPlayStreak: parsed.currentPlayStreak ?? 0,
    soloTopScore: parsed.soloTopScore ?? parsed.topScore ?? 0,
    multiplayerTopScore: parsed.multiplayerTopScore ?? 0,
    achievements: (parsed.achievements ?? []).map((a) => ({ ...a, unlockedAt: new Date(a.unlockedAt) })),
    gameHistory,
  };
};

// For debugging: use browser localStorage or electron file storage
// Electron: app.getPath('userData') + '/player.json' (via IPC)
// Browser: localStorage or sessionStorage
const loadPlayerFromStorage = async (): Promise<Player | null> => {
  try {
    // 1. Try Electron File Storage
    const playerStorageAPI = getPlayerStorageAPI();
    if (playerStorageAPI) {
      const result = await playerStorageAPI.read();
      if (result.success && result.data) {
        return deserializePlayer(result.data);
      }
    }

    // 2. Try Browser Storage
    const storage = getPlayerStorage();
    if (storage) {
      const existing = storage.getItem(PLAYER_STORAGE_KEY);
      if (existing) {
        return deserializePlayer(existing);
      }
    }
  } catch (error) {
    console.warn("Failed to load player from storage:", error);
  }
  return null;
};

const savePlayerToStorage = async (player: Player): Promise<void> => {
  try {
    // If we have the playerStorage API (Electron), use it
    const playerStorageAPI = getPlayerStorageAPI();
    if (playerStorageAPI) {
      const result = await playerStorageAPI.write(JSON.stringify(player));
      if (!result.success) {
        console.warn("Failed to save player to Electron storage:", result.error);
      }
      return;
    }
    // Fall back to browser storage
    const storage = getPlayerStorage();
    if (!storage) return;
    storage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  } catch (error) {
    console.warn("Failed to save player to storage:", error);
  }
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  player: null,
  isLoading: true,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const player = await loadPlayerFromStorage();
      if (player) {
        set({ player, isLoading: false });
      } else {
        // If no player exists, generate one
        get().generatePlayer();
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("Player store initialization failed:", error);
      set({ isLoading: false });
    }
  },

  generatePlayer: () => {
    // Note: This is now intended for first-time setup or reset.
    // Regular loads should happen via initialize().
    
    // Create new player
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
      soloTopScore: 0,
      multiplayerTopScore: 0,
      soloGamesPlayed: 0,
      multiplayerGamesPlayed: 0,
      gamesMastered: 0,
      gamesWon: 0,
      topThreeFinishes: 0,
      leaderboardAppearances: 0,
      lobbiesCreated: 0,
      totalQuestionsAnswered: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      lastActive: new Date(),
      currentPlayStreak: 0,
      lastPlayedDate: undefined,
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
    
    // Save to storage (async, don't block)
    savePlayerToStorage(newPlayer).catch((error) => {
      console.warn("Failed to save new player to storage:", error);
    });
    set({ player: newPlayer });
    return newPlayer;
  },
  
  getPlayer: () => {
    const currentPlayer = get().player;
    if (currentPlayer) return currentPlayer;
    
    // Fallback: This might return a blank player if called before initialize() completes.
    // The UI should ideally wait for isLoading === false.
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

    savePlayerToStorage(updatedPlayer).catch((error) => {
      console.warn("Failed to save game to history:", error);
    });
    set({ player: updatedPlayer });
  },
  applySessionProgress: (sessionInput) => {
    const player = get().getPlayer();
    const delta = buildSessionDelta(sessionInput);
    const now = new Date();
    const previousLastPlayedDate = player.lastPlayedDate;

    let nextPlayStreak = 1;
    if (previousLastPlayedDate) {
      const diff = dayDiff(previousLastPlayedDate, now);
      if (diff === 0) {
        nextPlayStreak = player.currentPlayStreak;
      } else if (diff === 1) {
        nextPlayStreak = player.currentPlayStreak + 1;
      }
    }

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
      date: now,
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
      hostedLobby: sessionInput.hostedLobby,
      fellBehindByHalfAndWon: sessionInput.fellBehindByHalfAndWon,
    };

    const nextGameHistory = trimGameHistory([...player.gameHistory, newHistoryEntry]);

    const updatedPlayer: Player = {
      ...player,
      totalXp: nextTotalXp,
      xpToNextLevel: xpToNextLevel(nextTotalXp),
      level: nextLevel,
      rank: nextRank,
      totalScore: player.totalScore + delta.scoreGained,
      soloTopScore:
        sessionInput.mode === "solo"
          ? Math.max(player.soloTopScore ?? 0, sessionInput.score)
          : player.soloTopScore ?? 0,
      multiplayerTopScore:
        sessionInput.mode === "multiplayer"
          ? Math.max(player.multiplayerTopScore ?? 0, sessionInput.score)
          : player.multiplayerTopScore ?? 0,
      soloGamesPlayed: player.soloGamesPlayed + (sessionInput.mode === 'solo' ? delta.gamesPlayed : 0),
      multiplayerGamesPlayed: player.multiplayerGamesPlayed + (sessionInput.mode === 'multiplayer' ? delta.gamesPlayed : 0),
      gamesMastered: player.gamesMastered + delta.gamesMastered,
      gamesWon: player.gamesWon + delta.gamesWon,
      topThreeFinishes: player.topThreeFinishes + delta.topThreeFinishes,
      leaderboardAppearances: player.leaderboardAppearances + (sessionInput.mode === "multiplayer" && sessionInput.topThreeFinish ? 1 : 0),
      lobbiesCreated: player.lobbiesCreated + (sessionInput.mode === "multiplayer" && sessionInput.hostedLobby ? 1 : 0),
      totalQuestionsAnswered: nextTotalQuestionsAnswered,
      correctAnswers: player.correctAnswers + delta.correctAnswers,
      incorrectAnswers: player.incorrectAnswers + delta.incorrectAnswers,
      averageTimePerQuestion: nextAverageTimePerQuestion,
      lastActive: now,
      lastPlayedDate: now,
      currentPlayStreak: nextPlayStreak,
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

    savePlayerToStorage(finalPlayer).catch((error) => {
      console.warn("Failed to save session progress:", error);
    });
    set({ player: finalPlayer });
  },
    setAvatar: (avatar: string) => {
      try {
        const player = get().getPlayer();
        const updatedPlayer: Player = { ...player, avatar, lastActive: new Date() };
        savePlayerToStorage(updatedPlayer).catch((error) => {
          console.warn("Failed to set avatar:", error);
        });
        set({ player: updatedPlayer });
      } catch (error) {
        console.warn("Failed to set avatar:", error);
      }
    },

    setPlayerName: (name: string) => {
      try {
        const player = get().getPlayer();
        const updatedPlayer: Player = { ...player, name, lastActive: new Date() };
        savePlayerToStorage(updatedPlayer).catch((error) => {
          console.warn("Failed to set player name:", error);
        });
        set({ player: updatedPlayer });
      } catch (error) {
        console.warn("Failed to set player name:", error);
      }
    },

    resetPlayer: () => {
    try {
      // Delete from Electron file storage if available
      const playerStorageAPI = getPlayerStorageAPI();
      if (playerStorageAPI) {
        playerStorageAPI.delete().catch((error: unknown) => {
          console.warn("Failed to delete player data from Electron storage:", error);
        });
      } else {
        // Otherwise delete from browser storage
        const storage = getPlayerStorage();
        storage?.removeItem(PLAYER_STORAGE_KEY);
      }
      set({ player: null });
    } catch (error) {
      console.warn("Failed to reset player:", error);
    }
  }
  
}));
