import { create } from "zustand";

type Screen =
  | "home"
  | "solo-menu"
  | "category"
  | "difficulty"
  | "question"
  | "result"
  | "profile"
  | "multiplayer-menu"
  | "multiplayer-lobby";

type Mode = "solo" | "multiplayer" | null;
type Difficulty = "easy" | "medium" | "hard" | null;

interface GameState {
  screen: Screen;
  mode: Mode;
  category: string | null;
  difficulty: Difficulty;

  currentQuestionIndex: number;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  sessionFinished: boolean;

  setScreen: (screen: Screen) => void;
  setMode: (mode: Mode) => void;
  setCategory: (category: string) => void;
  setDifficulty: (difficulty: Difficulty) => void;

  startSession: () => void;
  addCorrectAnswer: (points: number) => void;
  nextQuestion: () => void;
  finishSession: () => void;
  resetSession: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  screen: "home",
  mode: null,
  category: null,
  difficulty: null,

  currentQuestionIndex: 0,
  score: 0,
  correctAnswers: 0,
  totalQuestions: 15,
  sessionFinished: false,

  setScreen: (screen) => set({ screen }),
  setMode: (mode) => set({ mode }),
  setCategory: (category) => set({ category }),
  setDifficulty: (difficulty) => set({ difficulty }),

  startSession: () =>
    set({
      currentQuestionIndex: 0,
      score: 0,
      correctAnswers: 0,
      sessionFinished: false,
      screen: "question",
    }),

  addCorrectAnswer: (points) =>
    set((state) => ({
      score: state.score + points,
      correctAnswers: state.correctAnswers + 1,
    })),

  nextQuestion: () =>
    set((state) => ({
      currentQuestionIndex: state.currentQuestionIndex + 1,
    })),

  finishSession: () =>
    set({
      sessionFinished: true,
      screen: "result",
    }),

  resetSession: () =>
    set({
      currentQuestionIndex: 0,
      score: 0,
      correctAnswers: 0,
      sessionFinished: false,
    }),
}));