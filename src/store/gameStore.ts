import { create } from "zustand";
import { Category, Difficulty, Mode } from "../constants";
import { usePlayerStore, Player } from "./playerStore";
/**
 * Game Store - Navigation and Session Setup
 * 
 * RESPONSIBILITIES:
 * - Application navigation between screens/pages
 * - Game mode selection (solo/multiplayer)
 * - Category and difficulty selection for game configuration
 * - Multiplayer lobby state management
 * - Basic session setup state management
 * 
 * SEPARATION OF CONCERNS:
 * This store handles ONLY navigation and game configuration.
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
  mode?: Mode;
  category?: Category;
  difficulty?: Difficulty;
  questionLimit?: number;
  questionTimer?: number;
  answerTimer?: number;
}

interface GameState {
  screen: Screen;
  gameConfig: GameConfig;

  // Load Player Data
  getPlayer: () => Player;

  // Game Actions
  setScreen: (screen: Screen) => void;
  setGameConfig: (config: Partial<GameConfig>) => void;

  // Game configuration actions
  setMode: (mode: Mode) => void;
  setCategory: (category: Category) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setQuestionLimit: (limit: number) => void;
  setQuestionTimer: (seconds: number) => void;
  setAnswerTimer: (seconds: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Basic navigation state
  screen: "home",

  // Game configuration state
  gameConfig: {
    mode: null,
    category: null,
    difficulty: null,
    questionLimit: null,
    questionTimer: null,
    answerTimer: null,
  },

  // Actions
  getPlayer: () => usePlayerStore.getState().getPlayer(),
  setScreen: (screen) => set({ screen }),
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
}));
