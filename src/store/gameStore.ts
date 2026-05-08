import { create } from "zustand";
import { Category, Difficulty, Mode } from "../constants";
import { usePlayerStore } from "./playerStore";
import { Player } from "../types/player";
import { defaultGameConfig } from "../config/gameConfig";
/**
 * Game Store - Navigation and Session Setup
 * 
 * RESPONSIBILITIES:
 * - Application navigation between screens/pages
 * - Game mode selection (solo/multiplayer)
 * - Game settings configuration
 * - Category and difficulty selection for game configuration
 * - Multiplayer lobby state management
 * - Basic session setup state management
 * - Player data access
 * 
 * SEPARATION OF CONCERNS:
 * This store handles ONLY navigation, game configuration, and player data.
 * All game-specific logic (questions, scoring, timers, phases) 
 * is managed by triviaStore.ts.
 */

type Screen =
  | "home"
  | "mode-select"
  | "category"
  | "difficulty"
  | "question"
  | "result"
  | "profile"
  | "settings"
  | "standing"
  | "multiplayer-menu"
  | "multiplayer-lobby"
  | "multiplayer-discovery";

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
  useCase: boolean;
  useScanlines: boolean;
  useFlicker: boolean;
}

interface GameState {
  screen: Screen;
  modalScreen: Screen | null;
  resolution: { width: number, height: number, label: string };
  settings: Settings;
  gameConfig: GameConfig;

  // Load Player Data
  getPlayer: () => Player;

  // Game Actions
  setScreen: (screen: Screen) => void;
  setModalScreen: (screen: Screen | null) => void;
  setResolution: (width: number, height: number, label: string) => void;
  toggleSetting: (key: keyof Settings) => void;
  setGameConfig: (config: Partial<GameConfig>) => void;

  // Game configuration actions
  setMode: (mode: Mode) => void;
  setCategory: (category: Category) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setQuestionLimit: (limit: number) => void;
  setQuestionTimer: (seconds: number) => void;
  setAnswerTimer: (seconds: number) => void;
  setAutoJoinLan: (enabled: boolean) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Basic navigation state
  screen: "home",
  modalScreen: null,

  // Display settings
  resolution: { width: 1024, height: 768, label: 'XGA (Default)' },
  settings: {
    useCase: false,
    useScanlines: false,
    useFlicker: false,
  },

  // Game configuration state
  gameConfig: {
    ...defaultGameConfig,
    autoJoinLan: false
  },

  

  // Actions
  getPlayer: () => usePlayerStore.getState().getPlayer(),
  setScreen: (screen) => set({ screen }),
  setModalScreen: (modalScreen) => set({ modalScreen }),
  setResolution: (width, height, label) => {
    set({ resolution: { width, height, label } });
  },
  toggleSetting: (key) => set((state) => ({
    settings: {
      ...state.settings,
      [key]: !state.settings[key]
    }
  })),

  setGameConfig: (config) => {
    const currentConfig = get().gameConfig;
    set({ 
      gameConfig: { 
        ...currentConfig, 
        ...config 
      } 
    });
  },
  // Convenience setters for individual config properties
  setMode: (mode) => set((s) => ({ gameConfig: { ...s.gameConfig, mode } })),
  setCategory: (category) => set((s) => ({ gameConfig: { ...s.gameConfig, category } })),
  setDifficulty: (difficulty) => set((s) => ({ gameConfig: { ...s.gameConfig, difficulty } })),
  setQuestionLimit: (limit) => set((s) => ({ gameConfig: { ...s.gameConfig, questionLimit: limit } })),
  setQuestionTimer: (seconds) => set((s) => ({ gameConfig: { ...s.gameConfig, questionTimer: seconds } })),
  setAnswerTimer: (seconds) => set((s) => ({ gameConfig: { ...s.gameConfig, answerTimer: seconds } })),
  setAutoJoinLan: (enabled) => set((s) => ({ gameConfig: { ...s.gameConfig, autoJoinLan: enabled } })),
}));
