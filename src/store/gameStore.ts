import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Category, Difficulty, Mode } from "../constants";
import { usePlayerStore } from "./playerStore";
import { Player, Achievement } from "../types/player";
import { defaultGameConfig } from "../config/gameConfig";

type Screen =
  | "home"
  | "mode-select"
  | "category"
  | "difficulty"
  | "question"
  | "result"
  | "achievement-unlock"
  | "profile"
  | "settings"
  | "standing"
  | "powerups"
  | "multiplayer-menu"
  | "multiplayer-lobby"
  | "multiplayer-discovery"
  | "multiplayer-results"
  | "spectator-view";
  

export interface GameConfig {
  mode: Mode | null;
  category: Category | null;
  difficulty: Difficulty | null;
  questionLimit: number | null;
  questionTimer: number | null;
  answerTimer: number | null;
  recentSessionLimitSolo: number;
  recentSessionLimitMultiplayer: number;
  seed?: number;
  questionPort?: number;
  autoJoinLan: boolean;
}

export interface Settings {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  volume: number;
  useCase: boolean;
  useScanlines: boolean;
  useFlicker: boolean;
}

type WithSettings = { settings: Settings };
type WithGameConfig = { gameConfig: GameConfig };
type WithAchievementQueue = {
  achievementUnlockQueue: Achievement[];
  postUnlockScreen: Screen | null;
};

// ─── Level-up session state (NOT persisted — lives only for this session) ────
export interface LevelUpSession {
  /** Player level at the START of the match (captured before applySessionProgress) */
  sessionStartLevel: number;
  /** Player level at the END of the match (captured after applySessionProgress) */
  sessionEndLevel: number;
  /** Whether the popup should be shown on the result screen */
  showLevelUpPopup: boolean;
}

interface GameState {
  screen: Screen;
  modalScreen: Screen | null;
  resolution: { width: number; height: number; label: string };
  settings: Settings;
  gameConfig: GameConfig;
  achievementUnlockQueue: Achievement[];
  postUnlockScreen: Screen | null;

  // ── Deferred level-up popup state ──────────────────────────────────────────
  levelUpSession: LevelUpSession;

  // ── Credits BGM flag (NOT persisted) ───────────────────────────────────────
  // True while the Credits tab BGM is playing; App.tsx uses this to pause
  // the global BGM so the two tracks never overlap.
  creditsBgmActive: boolean;

  // ── Global notification overlay (survives page transitions) ────────────────
  notification: { message: string; type: "info" | "error" | "warning" | "success"; durationMs: number } | null;
  showNotification: (message: string, type: "info" | "error" | "warning" | "success", durationMs?: number) => void;
  clearNotification: () => void;

  getPlayer: () => Player;

  setScreen: (screen: Screen) => void;
  setModalScreen: (screen: Screen | null) => void;
  setResolution: (width: number, height: number, label: string) => void;
  toggleSetting: (key: keyof Settings) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setGameConfig: (config: Partial<GameConfig>) => void;
  queueAchievementUnlocks: (achievements: Achievement[], postUnlockScreen: Screen) => void;
  dismissCurrentAchievementUnlock: () => void;
  clearAchievementUnlocks: () => void;

  /**
   * Call this BEFORE applySessionProgress at the start of a match.
   * Records the player's current level as the session-start baseline.
   */
  recordSessionStartLevel: () => void;

  /**
   * Call this AFTER applySessionProgress when the game ends.
   * Compares end level to start level and arms the popup if the player levelled up.
   */
  recordSessionEndLevel: () => void;

  /**
   * Dismiss the popup and reset the session tracking state.
   * Call from LevelUpPopup's onClose / CONTINUE button.
   */
  clearLevelUpSession: () => void;

  setCreditsBgmActive: (v: boolean) => void;
  resetSettingsToDefaults: () => void;
  clearAllData: () => void;

  setMode: (mode: Mode) => void;
  setCategory: (category: Category) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setQuestionLimit: (limit: number) => void;
  setQuestionTimer: (seconds: number) => void;
  setAnswerTimer: (seconds: number) => void;
  setAutoJoinLan: (enabled: boolean) => void;
  resetGameConfig: () => void;
}

const DEFAULT_LEVEL_UP_SESSION: LevelUpSession = {
  sessionStartLevel: 1,
  sessionEndLevel: 1,
  showLevelUpPopup: false,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      screen: "home",
      modalScreen: null,
      achievementUnlockQueue: [],
      postUnlockScreen: null,
      resolution: { width: 1024, height: 768, label: "XGA" },

      // Not persisted — always starts clean
      levelUpSession: DEFAULT_LEVEL_UP_SESSION,

      // Not persisted — resets to false on every page load
      creditsBgmActive: false,

      settings: {
        bgmEnabled: true,
        sfxEnabled: true,
        volume: 5,
        useCase: false,
        useScanlines: false,
        useFlicker: false,
      },

      gameConfig: {
        ...defaultGameConfig,
        autoJoinLan: false,
      },

      getPlayer: (): Player => usePlayerStore.getState().getPlayer(),

      setScreen: (screen: Screen) => set({ screen }),
      setModalScreen: (modalScreen: Screen | null) => set({ modalScreen }),

      setResolution: (width: number, height: number, label: string) =>
        set({ resolution: { width, height, label } }),

      toggleSetting: (key: keyof Settings) =>
        set((state: WithSettings) => ({
          settings: { ...state.settings, [key]: !state.settings[key] },
        })),

      updateSettings: (patch: Partial<Settings>) =>
        set((state: WithSettings) => ({
          settings: { ...state.settings, ...patch },
        })),

      setGameConfig: (config: Partial<GameConfig>) =>
        set((state: WithGameConfig) => ({
          gameConfig: { ...state.gameConfig, ...config },
        })),

      queueAchievementUnlocks: (achievements: Achievement[], postUnlockScreen: Screen) =>
        set((state: WithAchievementQueue) => ({
          achievementUnlockQueue: [...state.achievementUnlockQueue, ...achievements],
          postUnlockScreen,
        })),

      dismissCurrentAchievementUnlock: () =>
        set((state: WithAchievementQueue) => {
          const remainingQueue = state.achievementUnlockQueue.slice(1);
          return {
            achievementUnlockQueue: remainingQueue,
            postUnlockScreen: remainingQueue.length > 0 ? state.postUnlockScreen : null,
          };
        }),

      clearAchievementUnlocks: () =>
        set({ achievementUnlockQueue: [], postUnlockScreen: null }),

      // ── Level-up deferred popup actions ──────────────────────────────────

      recordSessionStartLevel: () => {
        const currentLevel = usePlayerStore.getState().getPlayer().level;
        set({
          levelUpSession: {
            sessionStartLevel: currentLevel,
            sessionEndLevel: currentLevel,
            showLevelUpPopup: false,
          },
        });
      },

      recordSessionEndLevel: () => {
        const endLevel = usePlayerStore.getState().getPlayer().level;
        const startLevel = get().levelUpSession.sessionStartLevel;
        set({
          levelUpSession: {
            sessionStartLevel: startLevel,
            sessionEndLevel: endLevel,
            // Only show the popup when the player actually gained at least one level
            showLevelUpPopup: endLevel > startLevel,
          },
        });
      },

      clearLevelUpSession: () =>
        set({ levelUpSession: DEFAULT_LEVEL_UP_SESSION, modalScreen: null }),

      // Set by SettingsPage when Credits tab is entered/exited
      setCreditsBgmActive: (v: boolean) => set({ creditsBgmActive: v }),

      // ── Convenience config setters (unchanged) ────────────────────────────

      setMode: (mode: Mode) =>
        set((s: WithGameConfig) => ({ gameConfig: { ...s.gameConfig, mode } })),
      setCategory: (category: Category) =>
        set((s: WithGameConfig) => ({ gameConfig: { ...s.gameConfig, category } })),
      setDifficulty: (difficulty: Difficulty) =>
        set((s: WithGameConfig) => ({ gameConfig: { ...s.gameConfig, difficulty } })),
      setQuestionLimit: (limit: number) =>
        set((s: WithGameConfig) => ({ gameConfig: { ...s.gameConfig, questionLimit: limit } })),
      setQuestionTimer: (seconds: number) =>
        set((s: WithGameConfig) => ({ gameConfig: { ...s.gameConfig, questionTimer: seconds } })),
      setAnswerTimer: (seconds: number) =>
        set((s: WithGameConfig) => ({ gameConfig: { ...s.gameConfig, answerTimer: seconds } })),
  setAutoJoinLan: (enabled: boolean) =>
    set((s: WithGameConfig) => ({ gameConfig: { ...s.gameConfig, autoJoinLan: enabled } })),

  /**
   * Reset gameConfig to default values (preserves autoJoinLan if explicitly set).
   * Call when exiting a multiplayer session or game to prevent stale config leaking.
   */
  resetGameConfig: () =>
    set({
      gameConfig: { ...defaultGameConfig, autoJoinLan: get().gameConfig.autoJoinLan },
    }),

  resetSettingsToDefaults: () => {
        set({
          settings: {
            bgmEnabled: true,
            sfxEnabled: true,
            volume: 5,
            useCase: false,
            useScanlines: false,
            useFlicker: false,
          },
          resolution: { width: 1024, height: 768, label: "XGA" },
        });
      },

      // Permanently clear all persisted data (game store + player) and reset in-memory state
      notification: null,

  showNotification: (message, type, durationMs = 4000) => {
    set({ notification: { message, type, durationMs } });
    // Auto-clear after duration
    setTimeout(() => {
      const current = get().notification;
      if (current && current.message === message) {
        set({ notification: null });
      }
    }, durationMs);
  },

  clearNotification: () => set({ notification: null }),

  clearAllData: () => {
        try {
          const storage = typeof window !== "undefined" ? window.localStorage : null;
          if (storage) storage.removeItem("game-store");
        } catch (e) {
          console.warn("Failed to clear game store persistence:", e);
        }

        try {
          // Delegate player reset to the player store implementation which handles its own persistence
          usePlayerStore.getState().resetPlayer();
        } catch (e) {
          console.warn("Failed to reset player from clearAllData:", e);
        }

        // Reset in-memory values to defaults
        set({
          settings: {
            bgmEnabled: true,
            sfxEnabled: true,
            volume: 5,
            useCase: false,
            useScanlines: false,
            useFlicker: false,
          },
          resolution: { width: 1024, height: 768, label: "XGA" },
          gameConfig: { ...defaultGameConfig, autoJoinLan: false },
        });
      },
    }),
    {
      name: "game-store",
      // levelUpSession and creditsBgmActive are intentionally excluded — must not survive a page reload
      partialize: (state: GameState) => ({
        settings: state.settings,
        resolution: state.resolution,
        gameConfig: state.gameConfig,
      }),
    }
  )
);
