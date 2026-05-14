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
  | "multiplayer-menu"
  | "multiplayer-lobby"
  | "multiplayer-discovery"
  | "multiplayer-results";

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

interface GameState {
  screen: Screen;
  modalScreen: Screen | null;
  resolution: { width: number; height: number; label: string };
  settings: Settings;
  gameConfig: GameConfig;
  achievementUnlockQueue: Achievement[];
  postUnlockScreen: Screen | null;

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

  setMode: (mode: Mode) => void;
  setCategory: (category: Category) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setQuestionLimit: (limit: number) => void;
  setQuestionTimer: (seconds: number) => void;
  setAnswerTimer: (seconds: number) => void;
  setAutoJoinLan: (enabled: boolean) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      screen: "home",
      modalScreen: null,
      achievementUnlockQueue: [],
      postUnlockScreen: null,

      resolution: { width: 1024, height: 768, label: "XGA" },

      // ── Proper defaults so nothing is ever undefined ──
      settings: {
        bgmEnabled:  true,
        sfxEnabled:  true,
        volume:      5,
        useCase:     false,
        useScanlines: false,
        useFlicker:  false,
      },

      gameConfig: {
        ...defaultGameConfig,
        autoJoinLan: false,
      },

      getPlayer: () => usePlayerStore.getState().getPlayer(),

      setScreen:      (screen)      => set({ screen }),
      setModalScreen: (modalScreen) => set({ modalScreen }),

      setResolution: (width, height, label) =>
        set({ resolution: { width, height, label } }),

      toggleSetting: (key) =>
        set((state: Pick<GameState, "settings">) => ({
          settings: { ...state.settings, [key]: !state.settings[key] },
        })),

      // Merge a partial settings patch — used by the Save button
      updateSettings: (patch) =>
        set((state: Pick<GameState, "settings">) => ({
          settings: { ...state.settings, ...patch },
        })),

      setGameConfig: (config) =>
        set((state: { gameConfig: any; }) => ({
          gameConfig: { ...state.gameConfig, ...config },
        })),

      queueAchievementUnlocks: (achievements, postUnlockScreen) =>
        set((state: Pick<GameState, "achievementUnlockQueue" | "postUnlockScreen">) => ({
          achievementUnlockQueue: [...state.achievementUnlockQueue, ...achievements],
          postUnlockScreen,
        })),

      dismissCurrentAchievementUnlock: () =>
        set((state: Pick<GameState, "achievementUnlockQueue" | "postUnlockScreen">) => {
          const remainingQueue = state.achievementUnlockQueue.slice(1);
          return {
            achievementUnlockQueue: remainingQueue,
            postUnlockScreen: remainingQueue.length > 0 ? state.postUnlockScreen : null,
          };
        }),

      clearAchievementUnlocks: () =>
        set({ achievementUnlockQueue: [], postUnlockScreen: null }),

      setMode:          (mode)       => set((s: { gameConfig: any; }) => ({ gameConfig: { ...s.gameConfig, mode } })),
      setCategory:      (category)   => set((s: { gameConfig: any; }) => ({ gameConfig: { ...s.gameConfig, category } })),
      setDifficulty:    (difficulty) => set((s: { gameConfig: any; }) => ({ gameConfig: { ...s.gameConfig, difficulty } })),
      setQuestionLimit: (limit)      => set((s: { gameConfig: any; }) => ({ gameConfig: { ...s.gameConfig, questionLimit: limit } })),
      setQuestionTimer: (seconds)    => set((s: { gameConfig: any; }) => ({ gameConfig: { ...s.gameConfig, questionTimer: seconds } })),
      setAnswerTimer:   (seconds)    => set((s: { gameConfig: any; }) => ({ gameConfig: { ...s.gameConfig, answerTimer: seconds } })),
      setAutoJoinLan:   (enabled)    => set((s: { gameConfig: any; }) => ({ gameConfig: { ...s.gameConfig, autoJoinLan: enabled } })),
    }),
    {
      name: "game-store", // localStorage key
      // Only persist settings and resolution — not transient nav state
      partialize: (state:any) => ({
        settings:   state.settings,
        resolution: state.resolution,
        gameConfig: state.gameConfig,
      }),
    }
  )
);
