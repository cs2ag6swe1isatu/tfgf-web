import { create } from 'zustand';
import { Question } from '../types/question';
import { Mode, Difficulty, Category } from '../constants';
import type { GameConfig } from './gameStore';
import { loadQuestions } from '../utils/loadQuestions';

/**
 * Trivia Store - Game Logic and State Management
 * 
 * RESPONSIBILITIES:
 * - Question loading and management
 * - Game phase management (loading, asking, answering, scoring, ranking)
 * - Score tracking and answer processing
 * - Timer management and countdown logic
 * - Game state progression and transitions
 * - Multiplayer vs solo game mode handling
 * 
 * SEPARATION OF CONCERNS:
 * This store handles ALL game-specific logic and state.
 * Navigation and screen management is handled by gameStore.ts.
 * This store coordinates with gameStore for category/difficulty selection.
 * 
 * PHASE RULES:
 * - loading: Fetching questions, show animations or placeholders
 * - asking: Showing question and starting question timer
 * - answering: User is selecting answer, answer timer is running
 * - scoring: Show correct answer and update score, short delay before next question
 * - ranking: Show final results and rankings (for multiplayer)
 * - end: Game over, show summary and options to view profile or return to menu
 */

export type Phase = 'loading' | 'readying' | 'asking' | 'answering' | 'scoring' | 'ranking' | 'end';

export interface TriviaState {
  questions: Question[];
  currentIndex: number;
  selectedAnswer: string;
  timer: number;
  questionTimer: number;
  answerTimer: number;
  score: number;
  phase: Phase;
  mode: Mode | null;
  category: Category | null;
  difficulty: Difficulty | null;
  userAnswers: string[];
}

export interface TriviaActions {
  startGame: (config: GameConfig) => Promise<void>;
  selectAnswer: (answer: string) => void;
  tickTimer: () => void;
  nextPhase: () => void;
  resetGame: () => void;
}

const initialState: TriviaState = {
  questions: [],
  currentIndex: 0,
  selectedAnswer: "",
  timer: 0,
  questionTimer: 10,
  answerTimer: 10,
  score: 0,
  phase: 'loading',
  mode: 'solo',
  category: null,
  difficulty: null,
  userAnswers: [],
};

export const useTriviaStore = create<TriviaState & TriviaActions>((set, get) => ({
  ...initialState,

  /* ---------- Game setup ---------- */
  startGame: async (cfg) => {
    // Accept a snapshot config from the caller (separates UI store from session store)
    const mode = cfg.mode ?? 'solo';
    const questionTimer = cfg.questionTimer ?? get().questionTimer;
    const answerTimer = cfg.answerTimer ?? get().answerTimer;
    const category = cfg.category;
    const difficulty = cfg.difficulty;
    const questionLimit = cfg.questionLimit ?? 10;

    // Input validation
    if (!category || !difficulty || !mode) {
      console.error("Invalid game parameters:", { category, difficulty, mode });
      set({ phase: 'end' });
      return;
    }
    if (questionLimit <= 0 || questionTimer <= 0 || answerTimer <= 0) {
      console.error("Invalid game parameters: limit and timers must be positive");
      set({ phase: 'end' });
      return;
    }

    set({ phase: 'loading', category, difficulty });

    try {
      const questions = await loadQuestions(category, difficulty, questionLimit);

      if (questions.length === 0) {
        console.warn(`No questions found for category: ${category}, difficulty: ${difficulty}`);
        get().resetGame();
        return;
      }

      set({ 
        questions,
        timer: mode === 'multiplayer' ? questionTimer : answerTimer,
        questionTimer,
        answerTimer,
        mode,
        phase: mode === 'multiplayer' ? 'asking' : 'answering',
        currentIndex: 0,
        selectedAnswer: "",
        score: 0,
      });

      console.log(`Successfully loaded ${questions.length} questions for: ${category} (${difficulty})`);
    } catch (error) {
      console.error("Failed to load questions:", error);
      set({ 
        phase: 'end',
        questions: [],
        currentIndex: 0,
        selectedAnswer: "",
        score: 0,
      });
    }
  },

  /* ---------- Answer handling ---------- */
  selectAnswer: (answer) => {
    const { questions, currentIndex, mode, phase, score, userAnswers } = get();
    
    // Validate phase and game state
    if (phase !== 'answering') return;
    if (!questions || questions.length === 0) return;
    if (currentIndex < 0 || currentIndex >= questions.length) return;
    
    const currentQuestion = questions[currentIndex];
    
    // Validate answer is one of the available options
    if (!currentQuestion.allAnswers.includes(answer)) {
      console.warn(`Invalid answer selected: ${answer}`);
      return;
    }
    
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    // Track user answer
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentIndex] = answer;
    
    const answerTimer = get().answerTimer;

    if (mode === 'solo') {
      // Update score immediately
      const newScore = isCorrect ? score + 1 : score;
      
      // Determine next phase
      const isLastQuestion = currentIndex + 1 >= questions.length;
      
      set({
        selectedAnswer: answer,
        score: newScore,
        phase: isLastQuestion ? 'end' : 'scoring',
        timer: isLastQuestion ? 0 : answerTimer,
        userAnswers: newUserAnswers,
      });
    } else if (mode === 'multiplayer') {
      // Multiplayer logic to be implemented
      set({
        selectedAnswer: answer,
        phase: 'scoring',
        timer: answerTimer,
        userAnswers: newUserAnswers,
      });
    }
  },

  /* ---------- Timer ---------- */
  tickTimer: () => {
    const { timer, phase, selectedAnswer, questions, currentIndex, mode } = get();

    if (phase !== 'readying' && phase !== 'answering' && phase !== 'asking' && phase !== 'scoring') return;

    if (timer > 1) {
      set({ timer: timer - 1 });
      return;
    }

    // Timer expired, advance phase
    if (phase === 'readying') {
      const questionTimer = get().questionTimer;
      set({ phase: 'asking', timer: questionTimer });
      return;
    }

    if (phase === 'asking') {
      const answerTimer = get().answerTimer;
      set({ phase: 'answering', timer: answerTimer });
      return;
    }

    if (phase === 'answering') {
      if (selectedAnswer) {
        set({ timer: 0 });
        get().selectAnswer(selectedAnswer);
        return;
      }

      const answerTimer = get().answerTimer;
      const isLastQuestion = currentIndex + 1 >= questions.length;
      set({
        phase: isLastQuestion ? 'ranking' : 'scoring',
        timer: isLastQuestion ? 0 : answerTimer,
      });
      return;
    }

    if (currentIndex + 1 < questions.length) {
      if (mode === 'multiplayer') {
        const questionTimer = get().questionTimer;
        set({
          phase: 'asking',
          currentIndex: currentIndex + 1,
          selectedAnswer: '',
          timer: questionTimer,
        });
      } else {
        const answerTimer = get().answerTimer;
        set({
          phase: 'answering',
          currentIndex: currentIndex + 1,
          selectedAnswer: '',
          timer: answerTimer,
        });
      }
      return;
    }

    set({ phase: 'ranking', timer: 0 });
  },

  /* ---------- Phase machine ---------- */
  nextPhase: () => {
    const { phase, currentIndex, questions, timer } = get();

    switch (phase) {
      case 'loading':
        // Only transition to asking if we have questions or mode is multiplayer
        if (questions.length > 0) {
          if(get().mode === "multiplayer"){
            set({ phase: 'readying' });
          } else if(get().mode === "solo"){
            set({ phase: 'loading' });
          }
        } else {
          set({ phase: 'end' });
        }
        break;

      case 'readying':
        set({ phase: 'asking', timer: get().questionTimer });
        break;

      case 'asking':
        {
          const answerTimer = get().answerTimer;
          set({ phase: 'answering', timer: answerTimer });
        }
        break;

      case 'answering':
        if (timer > 0) {
          return;
        }
        
        // Timer expired, advance to scoring
        if (currentIndex + 1 < questions.length) {
          const answerTimer = get().answerTimer;
          set({
            phase: 'scoring',
            timer: answerTimer,
          });
        } else {
          set({ phase: 'ranking' });
        }
        break;

      case 'scoring':
        // After scoring delay, move to next question or end
        if (currentIndex + 1 < questions.length) {
          const mode = get().mode;
          if (mode === 'multiplayer') {
            const questionTimer = get().questionTimer;
            set({
              phase: 'asking',
              currentIndex: currentIndex + 1,
              selectedAnswer: '',
              timer: questionTimer,
            });
          } else {
            const answerTimer = get().answerTimer;
            set({
              phase: 'answering',
              currentIndex: currentIndex + 1,
              selectedAnswer: '',
              timer: answerTimer,
            });
          }
        } else {
          set({ phase: 'ranking' });
        }
        break;

      case 'ranking':
        set({ phase: 'end' });
        break;

      case 'end':
        // Stay at end, user must navigate away
        break;

      default:
        console.warn(`Unknown phase: ${phase}`);
        break;
    }
  },

  /* ---------- Reset ---------- */
  resetGame: () => set(initialState),
}));