import { PowerUpId, PowerUpInventoryEntry } from "src/types/powerups";
import { defaultGameConfig } from "../config/gameConfig";
import { CATEGORIES, Category, DIFFICULTIES, Difficulty, getRankForLevel, MODES, Mode } from "../constants";
import { evaluateUnlocks } from "../progression/achievementRules";
import { buildSessionDelta, levelFromXp, rankFromLevel, SessionProgressInput, xpToNextLevel } from "../progression/progressionRules";
import type { Achievement, GameSession, PlayData, Player } from "../types/player";
import { getAvatarFileName } from "../utils/avatar";
import { createId } from "../utils/uuid";
import { create } from "zustand";

interface PlayerStorageResult {
  success: boolean;
  data?: string;
  error?: string;
}

interface PlayerStorageAPI {
  read: () => Promise<PlayerStorageResult>;
  write: (data: string) => Promise<PlayerStorageResult>;
  delete: () => Promise<PlayerStorageResult>;
}

type PlayerStorageWindow = Window & {
  playerStorage?: PlayerStorageAPI;
};

export interface PlayerState {
  player: Player | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  generatePlayer: () => Player;
  getPlayer: () => Player;
  applySessionProgress: (sessionInput: SessionProgressInput) => Achievement[];
  saveGameToHistory: (gameData: Omit<GameSession, "id" | "date">) => void;
  resetPlayer: () => void;
  setAvatar: (avatar: string) => void;
  setPlayerName: (name: string) => void;
  updatePlayer: (updates: Partial<Player>) => void;
  claimDailyPowerUps: () => boolean;
  spendPowerUp: (id: PowerUpId, count?: number) => void;
  earnPowerUp: (id: PowerUpId, count?: number) => void;

}

export const PLAYER_STORAGE_KEY = "tfgf-player";
const MULTIPLAYER_INSTANCE_STORAGE_KEY = "tfgf-multiplayer-instance-id";

let cachedMultiplayerInstanceId: string | null = null;

const getSessionStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const getMultiplayerInstanceId = (): string => {
  if (cachedMultiplayerInstanceId) return cachedMultiplayerInstanceId;

  const storage = getSessionStorage();
  if (storage) {
    const existing = storage.getItem(MULTIPLAYER_INSTANCE_STORAGE_KEY);
    if (existing) {
      cachedMultiplayerInstanceId = existing;
      return existing;
    }

    const generated = createId();
    storage.setItem(MULTIPLAYER_INSTANCE_STORAGE_KEY, generated);
    cachedMultiplayerInstanceId = generated;
    return generated;
  }

  cachedMultiplayerInstanceId = createId();
  return cachedMultiplayerInstanceId;
};

export const getMultiplayerPlayerId = (playerId: string): string => `${playerId}::${getMultiplayerInstanceId()}`;

export const getMultiplayerPlayer = (player: Player): Player => ({
  ...player,
  id: getMultiplayerPlayerId(player.id),
});



export const createEmptyPlayData = (): PlayData => ({
  xpGained: 0,
  scoreGained: 0,
  gamesPlayed: 0,
  gamesMastered: 0,
  topThreeFinishes: 0,
  gamesWon: 0,
  totalQuestionsAnswered: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  averageTimePerQuestion: 0,
});

export const getPlayerStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;

  const isElectron = typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("electron");

  if (isElectron) return null;
  return window.localStorage;
};

const getPlayerStorageAPI = (): PlayerStorageAPI | null => {
  if (typeof window === "undefined") return null;

  const storageWindow = window as PlayerStorageWindow;
  return storageWindow.playerStorage ?? null;
};

const historyLimitByMode: Record<Mode, number> = {
  solo: defaultGameConfig.recentSessionLimitSolo,
  multiplayer: defaultGameConfig.recentSessionLimitMultiplayer,
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const readNumber = (value: unknown, fallback = 0): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const readDate = (value: unknown, fallback = new Date()): Date => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }
  return fallback;
};

const readOptionalDate = (value: unknown): Date | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  return readDate(value);
};

const normalizePlayData = (value: unknown): PlayData => {
  const raw = isRecord(value) ? value : {};

  return {
    xpGained: readNumber(raw.xpGained),
    scoreGained: readNumber(raw.scoreGained),
    gamesPlayed: readNumber(raw.gamesPlayed),
    gamesMastered: readNumber(raw.gamesMastered),
    topThreeFinishes: readNumber(raw.topThreeFinishes),
    gamesWon: readNumber(raw.gamesWon),
    totalQuestionsAnswered: readNumber(raw.totalQuestionsAnswered),
    correctAnswers: readNumber(raw.correctAnswers),
    incorrectAnswers: readNumber(raw.incorrectAnswers),
    averageTimePerQuestion: readNumber(raw.averageTimePerQuestion),
  };
};

const createInitialIndividualStats = (): Player["individualStats"] => {
  const stats = {} as Player["individualStats"];

  for (const category of CATEGORIES) {
    stats[category] = {} as Record<Mode, Record<Difficulty, PlayData>>;

    for (const mode of MODES) {
      stats[category][mode] = {} as Record<Difficulty, PlayData>;

      for (const difficulty of DIFFICULTIES) {
        stats[category][mode][difficulty] = createEmptyPlayData();
      }
    }
  }

  return stats;
};

const normalizeIndividualStats = (value: unknown): Player["individualStats"] => {
  const stats = createInitialIndividualStats();
  if (!isRecord(value)) return stats;

  for (const category of CATEGORIES) {
    const categoryStats = value[category];
    if (!isRecord(categoryStats)) continue;

    for (const mode of MODES) {
      const modeStats = categoryStats[mode];
      if (!isRecord(modeStats)) continue;

      for (const difficulty of DIFFICULTIES) {
        stats[category][mode][difficulty] = normalizePlayData(modeStats[difficulty]);
      }
    }
  }

  return stats;
};

const normalizeAchievement = (value: unknown): Achievement => {
  const raw = isRecord(value) ? value : {};

  return {
    id: typeof raw.id === "string" ? raw.id : "",
    name: typeof raw.name === "string" ? raw.name : "",
    description: typeof raw.description === "string" ? raw.description : "",
    icon: typeof raw.icon === "string" ? raw.icon : "",
    progress: readNumber(raw.progress),
    unlockedAt: readDate(raw.unlockedAt, new Date(0)),
  };
};

const normalizeGameSession = (value: unknown): GameSession => {
  const raw = isRecord(value) ? value : {};

  return {
    id: typeof raw.id === "string" ? raw.id : createId(),
    date: readDate(raw.date),
    mode: raw.mode === "multiplayer" ? "multiplayer" : "solo",
    category: typeof raw.category === "string" ? (raw.category as Category) : CATEGORIES[0],
    difficulty: raw.difficulty === "medium" || raw.difficulty === "hard" ? raw.difficulty : "easy",
    totalQuestions: readNumber(raw.totalQuestions),
    correctAnswers: readNumber(raw.correctAnswers),
    questionsAnswered: readNumber(raw.questionsAnswered),
    score: readNumber(raw.score),
    questions: Array.isArray(raw.questions) ? raw.questions : [],
    userAnswers: Array.isArray(raw.userAnswers) ? raw.userAnswers.filter((item): item is string => typeof item === "string") : [],
    timeTaken: readNumber(raw.timeTaken),
    timePerQuestion: Array.isArray(raw.timePerQuestion)
      ? raw.timePerQuestion.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
      : undefined,
    mastered: Boolean(raw.mastered),
    won: Boolean(raw.won),
    topThreeFinish: Boolean(raw.topThreeFinish),
    incorrectAnswers: readNumber(raw.incorrectAnswers),
  };
};

const createDefaultPlayer = (): Player => ({
  id: createId(),
  name: "PLAYER_01",
  avatar: "Detective.png",
  lastActive: new Date(),
  lastPlayedDate: undefined,
  gameHistory: [],
  totalXp: 0,
  xpToNextLevel: 100,
  level: 1,
  rank: getRankForLevel(1),
  achievements: [],
  totalScore: 0,
  topScore: 0,
  soloTopScore: 0,
  multiplayerTopScore: 0,
  totalTimePlayed: 0,
  soloGamesPlayed: 0,
  multiplayerGamesPlayed: 0,
  gamesMastered: 0,
  gamesWon: 0,
  topThreeFinishes: 0,
  leaderboardAppearances: 0,
  lobbiesCreated: 0,
  currentPlayStreak: 0,
  dailyStreak: 0,
  totalQuestionsAnswered: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  averageTimePerQuestion: 0,
  rivalDefeats: 0,
  rivalStats: {},
  individualStats: createInitialIndividualStats(),
  powerUpInventory: [
      { id: "fifty_fifty", count: 2 },
      { id: "time_freeze", count: 1 },
      { id: "double_xp", count: 1 },
    ],

});

const normalizePlayer = (value: unknown): Player | null => {
  if (!isRecord(value)) return null;

  const level = readNumber(value.level, 1);
  const totalXp = readNumber(value.totalXp, 0);
  const soloTopScore = readNumber(value.soloTopScore, readNumber(value.topScore, 0));
  const multiplayerTopScore = readNumber(value.multiplayerTopScore, 0);
  const topScore = readNumber(value.topScore, Math.max(soloTopScore, multiplayerTopScore));
  

  return {
    ...createDefaultPlayer(),
    id: typeof value.id === "string" ? value.id : createId(),
    name: typeof value.name === "string" ? value.name : "PLAYER_01",
    avatar: typeof value.avatar === "string" && value.avatar.trim() !== "" ? getAvatarFileName(value.avatar) : "Detective.png",
    lastActive: readDate(value.lastActive),
    lastPlayedDate: readOptionalDate(value.lastPlayedDate),
    gameHistory: Array.isArray(value.gameHistory) ? trimGameHistory(value.gameHistory.map((entry) => normalizeGameSession(entry))) : [],
    totalXp,
    xpToNextLevel: readNumber(value.xpToNextLevel, xpToNextLevel(totalXp)),
    level,
    rank: isRecord(value.rank) ? (value.rank as unknown as Player["rank"]) : getRankForLevel(level),
    achievements: Array.isArray(value.achievements) ? value.achievements.map((entry) => normalizeAchievement(entry)) : [],
    totalScore: readNumber(value.totalScore, 0),
    topScore,
    soloTopScore,
    multiplayerTopScore,
    totalTimePlayed: readNumber(value.totalTimePlayed, 0),
    soloGamesPlayed: readNumber(value.soloGamesPlayed, 0),
    multiplayerGamesPlayed: readNumber(value.multiplayerGamesPlayed, 0),
    gamesMastered: readNumber(value.gamesMastered, 0),
    gamesWon: readNumber(value.gamesWon, 0),
    topThreeFinishes: readNumber(value.topThreeFinishes, 0),
    leaderboardAppearances: readNumber(value.leaderboardAppearances, 0),
    lobbiesCreated: readNumber(value.lobbiesCreated, 0),
    currentPlayStreak: readNumber(value.currentPlayStreak, 0),
    dailyStreak: readNumber(value.dailyStreak, 0),
    totalQuestionsAnswered: readNumber(value.totalQuestionsAnswered, 0),
    correctAnswers: readNumber(value.correctAnswers, 0),
    incorrectAnswers: readNumber(value.incorrectAnswers, 0),
    averageTimePerQuestion: readNumber(value.averageTimePerQuestion, 0),
    rivalDefeats: readNumber(value.rivalDefeats, 0),
    rivalStats: isRecord(value.rivalStats) ? Object.fromEntries(Object.entries(value.rivalStats).map(([k, v]) => [k, readNumber(v, 0)])) : {},
    individualStats: normalizeIndividualStats(value.individualStats),
    powerUpInventory: Array.isArray(value.powerUpInventory)
    ? value.powerUpInventory
    : createDefaultPlayer().powerUpInventory,
    

  };
};

const MAX_POWERUP_STACK = 9;

const mergeInventory = (
  existing: PowerUpInventoryEntry[],
  additions: PowerUpInventoryEntry[]
): PowerUpInventoryEntry[] => {
  const map = new Map(existing.map((e) => [e.id, e.count]));
  for (const { id, count } of additions) {
    map.set(id, Math.min(MAX_POWERUP_STACK, (map.get(id) ?? 0) + count));
  }
  return Array.from(map.entries()).map(
    ([id, count]) => ({ id, count } as PowerUpInventoryEntry)
  );
};

export const trimGameHistory = (history: GameSession[]): GameSession[] => {
  const retainedCounts: Record<Mode, number> = { solo: 0, multiplayer: 0 };
  const trimmedReversed: GameSession[] = [];

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    const mode = entry.mode;
    const limit = historyLimitByMode[mode];

    if (retainedCounts[mode] >= limit) continue;

    retainedCounts[mode] += 1;
    trimmedReversed.push(entry);
  }

  return trimmedReversed.reverse();
};

export const getPlayerFromStorage = (): Player | null => {
  try {
    const storage = getPlayerStorage();
    if (!storage) return null;

    const existing = storage.getItem(PLAYER_STORAGE_KEY);
    if (!existing) return null;

    return normalizePlayer(JSON.parse(existing));
  } catch (error) {
    console.warn("Failed to load player from browser storage:", error);
    return null;
  }
};

const loadPlayerFromStorage = async (): Promise<Player | null> => {
  try {
    const playerStorageAPI = getPlayerStorageAPI();
    if (playerStorageAPI) {
      const result = await playerStorageAPI.read();
      if (result.success && result.data) {
        const player = normalizePlayer(JSON.parse(result.data));
        if (player) return player;
      }
    }

    return getPlayerFromStorage();
  } catch (error) {
    console.warn("Failed to load player from storage:", error);
    return null;
  }
};

export const savePlayerToStorage = async (player: Player): Promise<void> => {
  try {
    const serialized = JSON.stringify(player);
    const playerStorageAPI = getPlayerStorageAPI();

    if (playerStorageAPI) {
      const result = await playerStorageAPI.write(serialized);
      if (!result.success) {
        console.warn("Failed to save player to Electron storage:", result.error);
      }
      return;
    }

    const storage = getPlayerStorage();
    if (!storage) return;
    storage.setItem(PLAYER_STORAGE_KEY, serialized);
  } catch (error) {
    console.warn("Failed to save player to storage:", error);
  }
};

const persistPlayer = (player: Player): void => {
  void savePlayerToStorage(player);
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  player: null,
  isLoading: true,

  initialize: async () => {
    set({ isLoading: true });

    if (get().player) {
      set({ isLoading: false });
      return;
    }

    const loadedPlayer = await loadPlayerFromStorage();
    if (get().player) {
      set({ isLoading: false });
      return;
    }

    if (loadedPlayer) {
      set({ player: loadedPlayer, isLoading: false });
      return;
    }

    const newPlayer = createDefaultPlayer();
    persistPlayer(newPlayer);
    set({ player: newPlayer, isLoading: false });
  },

  generatePlayer: () => {
    const newPlayer = createDefaultPlayer();
    persistPlayer(newPlayer);
    set({ player: newPlayer });
    return newPlayer;
  },

  getPlayer: () => {
    const currentPlayer = get().player;
    if (currentPlayer) return currentPlayer;

    const storedPlayer = getPlayerFromStorage();
    if (storedPlayer) {
      set({ player: storedPlayer });
      return storedPlayer;
    }

    return get().generatePlayer();
  },

  applySessionProgress: (sessionInput) => {
    const player = get().player ?? createDefaultPlayer();
    const delta = buildSessionDelta(sessionInput);
    const nextTotalXp = player.totalXp + delta.xpGained;
    const nextLevel = levelFromXp(nextTotalXp);
    const nextRank = rankFromLevel(nextLevel);

    const currentCategoryStats = player.individualStats[sessionInput.category];
    const currentModeStats = currentCategoryStats[sessionInput.mode];
    const currentDifficultyStats = currentModeStats[sessionInput.difficulty] ?? createEmptyPlayData();
    const nextDifficultyStats: PlayData = {
      ...currentDifficultyStats,
      xpGained: currentDifficultyStats.xpGained + delta.xpGained,
      scoreGained: currentDifficultyStats.scoreGained + delta.scoreGained,
      gamesPlayed: currentDifficultyStats.gamesPlayed + delta.gamesPlayed,
      gamesMastered: currentDifficultyStats.gamesMastered + delta.gamesMastered,
      topThreeFinishes: currentDifficultyStats.topThreeFinishes + delta.topThreeFinishes,
      gamesWon: currentDifficultyStats.gamesWon + delta.gamesWon,
      totalQuestionsAnswered: currentDifficultyStats.totalQuestionsAnswered + delta.totalQuestionsAnswered,
      correctAnswers: currentDifficultyStats.correctAnswers + delta.correctAnswers,
      incorrectAnswers: currentDifficultyStats.incorrectAnswers + delta.incorrectAnswers,
      averageTimePerQuestion: delta.averageTimePerQuestion ?? currentDifficultyStats.averageTimePerQuestion,
    };

    const nextTotalQuestionsAnswered = player.totalQuestionsAnswered + delta.totalQuestionsAnswered;
    const previousTotalAnswerTime = player.averageTimePerQuestion * player.totalQuestionsAnswered;
    const sessionAverageTime = delta.averageTimePerQuestion ?? (sessionInput.totalQuestions > 0 ? sessionInput.timeTaken / sessionInput.totalQuestions : undefined);
    const sessionTotalAnswerTime = (sessionAverageTime ?? 0) * delta.totalQuestionsAnswered;
    const nextAverageTimePerQuestion = nextTotalQuestionsAnswered > 0
      ? (previousTotalAnswerTime + sessionTotalAnswerTime) / nextTotalQuestionsAnswered
      : 0;

    const newHistoryEntry: GameSession = {
      id: createId(),
      date: new Date(),
      mode: sessionInput.mode,
      category: sessionInput.category,
      difficulty: sessionInput.difficulty,
      totalQuestions: sessionInput.totalQuestions,
      correctAnswers: sessionInput.correctAnswers,
      questionsAnswered: delta.totalQuestionsAnswered,
      score: sessionInput.score,
      questions: sessionInput.questions,
      userAnswers: sessionInput.userAnswers,
      timeTaken: sessionInput.timeTaken,
      timePerQuestion: sessionInput.timePerQuestion,
      mastered: sessionInput.mastered,
      won: sessionInput.won,
      topThreeFinish: sessionInput.topThreeFinish,
      incorrectAnswers: delta.incorrectAnswers,
    };

    // ── Daily streak logic ────────────────────────────────────────────────
    const now = new Date();
    const lastPlayed = player.lastPlayedDate;
    let nextDailyStreak = player.dailyStreak ?? 0;

    if (lastPlayed) {
      const sameDay =
        lastPlayed.getFullYear() === now.getFullYear() &&
        lastPlayed.getMonth() === now.getMonth() &&
        lastPlayed.getDate() === now.getDate();
      if (!sameDay) {
        // Consecutive day? Check if last played was yesterday.
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const wasYesterday =
          lastPlayed.getFullYear() === yesterday.getFullYear() &&
          lastPlayed.getMonth() === yesterday.getMonth() &&
          lastPlayed.getDate() === yesterday.getDate();
        nextDailyStreak = wasYesterday ? nextDailyStreak + 1 : 1;
      }
    } else {
      // First game ever
      nextDailyStreak = 1;
    }

    const nextGameHistory = trimGameHistory([...player.gameHistory, newHistoryEntry]);

    const updatedPlayer: Player = {
      ...player,
      dailyStreak: nextDailyStreak,
      totalXp: nextTotalXp,
      xpToNextLevel: xpToNextLevel(nextTotalXp),
      level: nextLevel,
      rank: nextRank,
      totalScore: player.totalScore + delta.scoreGained,
      topScore: Math.max(player.topScore, sessionInput.score),
      soloTopScore: sessionInput.mode === "solo" ? Math.max(player.soloTopScore, sessionInput.score) : player.soloTopScore,
      multiplayerTopScore: sessionInput.mode === "multiplayer" ? Math.max(player.multiplayerTopScore, sessionInput.score) : player.multiplayerTopScore,
      totalTimePlayed: player.totalTimePlayed + sessionInput.timeTaken,
      soloGamesPlayed: player.soloGamesPlayed + (sessionInput.mode === "solo" ? delta.gamesPlayed : 0),
      multiplayerGamesPlayed: player.multiplayerGamesPlayed + (sessionInput.mode === "multiplayer" ? delta.gamesPlayed : 0),
      gamesMastered: player.gamesMastered + delta.gamesMastered,
      gamesWon: player.gamesWon + delta.gamesWon,
      topThreeFinishes: player.topThreeFinishes + delta.topThreeFinishes,
      totalQuestionsAnswered: nextTotalQuestionsAnswered,
      correctAnswers: player.correctAnswers + delta.correctAnswers,
      incorrectAnswers: player.incorrectAnswers + delta.incorrectAnswers,
      averageTimePerQuestion: nextAverageTimePerQuestion,
      lastActive: new Date(),
      lastPlayedDate: new Date(),
      gameHistory: nextGameHistory,
      individualStats: {
        ...player.individualStats,
        [sessionInput.category]: {
          ...currentCategoryStats,
          [sessionInput.mode]: {
            ...currentModeStats,
            [sessionInput.difficulty]: nextDifficultyStats,
          },
        },
      },
    };

    const unlocks = evaluateUnlocks(updatedPlayer, sessionInput);
    const newlyUnlocked = unlocks.filter((achievement) => achievement.progress === 100);
    const achievements = [...updatedPlayer.achievements, ...newlyUnlocked].filter((achievement): achievement is Achievement => achievement !== null && achievement !== undefined);
    const finalPlayer = { ...updatedPlayer, achievements };

    persistPlayer(finalPlayer);
    set({ player: finalPlayer });

    return newlyUnlocked;
  },

  saveGameToHistory: (gameData) => set((state) => {
    const player = state.player ?? createDefaultPlayer();
    const newSession: GameSession = {
      ...gameData,
      id: createId(),
      date: new Date(),
    };

    const updatedPlayer: Player = {
      ...player,
      gameHistory: trimGameHistory([...player.gameHistory, newSession]),
      lastActive: new Date(),
      lastPlayedDate: new Date(),
    };

    persistPlayer(updatedPlayer);
    return { player: updatedPlayer };
  }),

  resetPlayer: () => {
    try {
      const storage = getPlayerStorage();
      storage?.removeItem(PLAYER_STORAGE_KEY);
      void getPlayerStorageAPI()?.delete();
    } catch (error) {
      console.warn("Failed to clear player storage:", error);
    }

    const newPlayer = createDefaultPlayer();
    persistPlayer(newPlayer);
    set({ player: newPlayer });
  },

  setAvatar: (avatar: string) => set((state) => {
    if (!state.player) return {};

    const updatedPlayer = {
      ...state.player,
      avatar,
      lastActive: new Date(),
    };

    persistPlayer(updatedPlayer);
    return { player: updatedPlayer };
  }),

  setPlayerName: (name: string) => set((state) => {
    if (!state.player) return {};

    const updatedPlayer = {
      ...state.player,
      name,
      lastActive: new Date(),
    };

    persistPlayer(updatedPlayer);
    return { player: updatedPlayer };
  }),

  updatePlayer: (updates: Partial<Player>) => set((state) => {
    if (!state.player) return {};

    const updatedPlayer = {
      ...state.player,
      ...updates,
      lastActive: new Date(),
    };

    persistPlayer(updatedPlayer);
    return { player: updatedPlayer };
  }),

   // ── Power-up actions ────────────────────────────────────────────────────
  claimDailyPowerUps: () => {
    const player = get().player ?? createDefaultPlayer();
    const now = new Date();
    const lastClaim = player.lastPlayedDate;
    if (lastClaim) {
      const sameDay =
        lastClaim.getFullYear() === now.getFullYear() &&
        lastClaim.getMonth() === now.getMonth() &&
        lastClaim.getDate() === now.getDate();
      if (sameDay) return false;
    }
    const bonus: PowerUpInventoryEntry[] = [
      { id: "fifty_fifty", count: 1 },
      { id: Math.random() > 0.5 ? "time_freeze" : "double_xp", count: 1 },
    ];
    const updatedInventory = mergeInventory(player.powerUpInventory ?? [], bonus);
    const updatedPlayer: Player = {
      ...player,
      powerUpInventory: updatedInventory,
      lastPlayedDate: now,
      lastActive: now,
    };
    persistPlayer(updatedPlayer);
    set({ player: updatedPlayer });
    return true;
  },

  earnPowerUp: (id, count = 1) => {
    const player = get().player ?? createDefaultPlayer();
    const updatedInventory = mergeInventory(player.powerUpInventory ?? [], [{ id, count }]);
    const updatedPlayer = { ...player, powerUpInventory: updatedInventory };
    persistPlayer(updatedPlayer);
    set({ player: updatedPlayer });
  },

  spendPowerUp: (id, count = 1) => {
    const player = get().player ?? createDefaultPlayer();
    const updatedInventory = (player.powerUpInventory ?? []).map((entry) =>
      entry.id === id
        ? { ...entry, count: Math.max(0, entry.count - count) }
        : entry
    );
    const updatedPlayer = { ...player, powerUpInventory: updatedInventory };
    persistPlayer(updatedPlayer);
    set({ player: updatedPlayer });
  },
}));
