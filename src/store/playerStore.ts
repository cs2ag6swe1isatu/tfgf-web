import { CATEGORIES, Category, DIFFICULTIES, Difficulty, Mode, MODES, Rank } from "../constants";
import { SessionProgressInput } from "../progression/progressionRules";
import type { Player, Achievement, GameSession, PlayData } from "../types/player";
import { defaultGameConfig } from "../config/gameConfig";
import { create } from 'zustand';

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

export interface PlayerState {
  player: Player | null;
  generatePlayer: () => Player;
  getPlayer: () => Player;
  applySessionProgress: (sessionInput: SessionProgressInput) => void;
  saveGameToHistory: (gameData: Omit<GameSession, 'id' | 'date'>) => void;
  resetPlayer: () => void;
  setAvatar: (avatar: string) => void;
  setPlayerName: (name: string) => void;
  updatePlayer: (updates: any) => void;
}

// Storage key for player data
export const PLAYER_STORAGE_KEY = "tfgf-player";

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
  averageTimePerQuestion: 0
});



export const getPlayerStorage = (): Storage | null => {
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

export const trimGameHistory = (history: GameSession[]): GameSession[] => {
  const retainedCounts: Record<Mode, number> = {
    solo: 0,
    multiplayer: 0,
  };

  const trimmedReversed: GameSession[] = [];

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    const mode = entry.mode as Mode;
    const limit = historyLimitByMode[mode];

    if (retainedCounts[mode] >= limit) continue;

    retainedCounts[mode] += 1;
    trimmedReversed.push(entry);
  }

  return trimmedReversed.reverse();
};

// For debugging: use browser localStorage
// TODO: Change to electron/desktop native paths later:
// - Electron: app.getPath('userData') + '/player.json'
// - Desktop: process.env.APPDATA or ~/.config for config files
export const getPlayerFromStorage = (): Player | null => {
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

export const savePlayerToStorage = (player: Player): void => {
  try {
    const storage = getPlayerStorage();
    if (!storage) return;
    storage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  } catch (error) {
    console.warn("Failed to save player to storage:", error);
  }
};
// ─── ZUSTAND STORE CREATION ──────────────────────────────────────────────
/** * Dynamically builds the deep individualStats record required by the Player interface.
 * Structure: Category -> Mode -> Difficulty -> PlayData
 */
const createInitialIndividualStats = (): Record<Category, Record<Mode, Record<Difficulty, PlayData>>> => {
  // Assuming you went with Option 1 in the previous step
  const categories = CATEGORIES; 
  const modes = MODES;
  const difficulties = DIFFICULTIES;

  // We use Partial here so TS doesn't demand all categories instantly
  const stats: Partial<Record<Category, Record<Mode, Record<Difficulty, PlayData>>>> = {};

  categories.forEach((cat) => {
    // Tell TS: "This is a work-in-progress Mode record"
    const modeObj: Partial<Record<Mode, Record<Difficulty, PlayData>>> = {};

    modes.forEach((mode) => {
      // Tell TS: "This is a work-in-progress Difficulty record"
      const diffObj: Partial<Record<Difficulty, PlayData>> = {};

      difficulties.forEach((diff) => {
        diffObj[diff] = createEmptyPlayData();
      });

      // Once diffObj is full, we can safely cast it to the strict Record type
      modeObj[mode] = diffObj as Record<Difficulty, PlayData>;
    });

    // Once modeObj is full, safely cast it to the strict Record type
    stats[cat] = modeObj as Record<Mode, Record<Difficulty, PlayData>>;
  });

  // Finally, cast the completely built object to the required return type
  return stats as Record<Category, Record<Mode, Record<Difficulty, PlayData>>>;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initialize the player directly from storage on load
  player: getPlayerFromStorage(),

 generatePlayer: (): Player => {
    const newPlayer: Player = {
      // Basic Profile
      id: `player_${Date.now()}`,
      name: "PLAYER_01",
      avatar: "Detective 1.png",
      lastActive: new Date(),
      gameHistory: [],

      // Progress & Leveling
      totalXp: 0,
      xpToNextLevel: 100,
      level: 1,
      rank: "NOVICE" as unknown as Rank,
      achievements: [],

      // Total Stats (Root Level)
      totalScore: 0,
      topScore: 0,
      totalTimePlayed: 0,
      soloGamesPlayed: 0,
      multiplayerGamesPlayed: 0,
      gamesMastered: 0,
      gamesWon: 0,
      topThreeFinishes: 0,
      totalQuestionsAnswered: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      averageTimePerQuestion: 0,

      // Data Structures
      playData: createEmptyPlayData(), //
      individualStats: createInitialIndividualStats(), // The deep fix
    };

    savePlayerToStorage(newPlayer); //
    set({ player: newPlayer });
    return newPlayer;
  },

  getPlayer: () => {
    let currentPlayer = get().player;
    if (!currentPlayer) {
      currentPlayer = get().generatePlayer();
    }
    return currentPlayer;
  },

  setAvatar: (avatar: string) => set((state) => {
    if (!state.player) return state;
    const updatedPlayer = { ...state.player, avatar };
    savePlayerToStorage(updatedPlayer);
    return { player: updatedPlayer };
  }),

  setPlayerName: (name: string) => set((state) => {
    if (!state.player) return state;
    const updatedPlayer = { ...state.player, name };
    savePlayerToStorage(updatedPlayer);
    return { player: updatedPlayer };
  }),

  // The new method we needed for the Settings Page!
  updatePlayer: (updates: any) => set((state) => {
    if (!state.player) return state;
    const updatedPlayer = { ...state.player, ...updates };
    savePlayerToStorage(updatedPlayer);
    return { player: updatedPlayer };
  }),

  resetPlayer: () => set(() => {
    const newPlayer = get().generatePlayer();
    return { player: newPlayer };
  }),

  // These are placeholders that map to your progression logic
  applySessionProgress: (sessionInput: SessionProgressInput) => set((state) => {
    // Add your specific progression rules here if needed
    return state;
  }),

  saveGameToHistory: (gameData: Omit<GameSession, 'id' | 'date'>) => set((state) => {
    if (!state.player) return state;
    
    const newSession: GameSession = { 
        ...gameData, 
        id: Date.now().toString(), 
        date: new Date() 
    };
    
    const updatedPlayer = {
      ...state.player,
      gameHistory: trimGameHistory([...(state.player.gameHistory || []), newSession])
    };

    
    
    savePlayerToStorage(updatedPlayer);
    return { player: updatedPlayer };
  }),
}));
