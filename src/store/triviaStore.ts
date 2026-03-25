import { create } from 'zustand';
import { Question } from '../types/question';
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
 */

export type Phase = 'loading' | 'asking' | 'answering' | 'scoring' | 'ranking' | 'end';
export type GameMode = 'solo' | 'multi';

export interface TriviaState {
  questions: Question[];
  currentIndex: number;
  selectedAnswer: string;
  timer: number;
  score: number;
  phase: Phase;
  mode: GameMode;
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  userAnswers: string[];
}

export interface TriviaActions {
  startGame: (category: string, difficulty: 'easy' | 'medium' | 'hard', limit: number, timer: number, mode: GameMode) => Promise<void>;
  selectAnswer: (answer: string) => void;
  tickTimer: () => void;
  nextPhase: () => void;
  resetGame: () => void;
}

const initialState: TriviaState = {
  questions: [],
  currentIndex: 0,
  selectedAnswer: "",
  timer: 15,
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
  startGame: async (category, difficulty, limit, timer, mode) => {
    // Input validation
    if (!category || !difficulty || !mode) {
      console.error("Invalid game parameters:", { category, difficulty, mode });
      set({ phase: 'end' });
      return;
    }
    
    if (limit <= 0 || timer <= 0) {
      console.error("Invalid game parameters: limit and timer must be positive");
      set({ phase: 'end' });
      return;
    }
    
    set({ phase: 'loading', category, difficulty });
    
    try {
      const questions = await loadQuestions(category, difficulty, mode, limit);
      
      if (questions.length === 0) {
        console.warn(`No questions found for category: ${category}, difficulty: ${difficulty}`);
        set({ 
          phase: 'end',
          questions: [],
          currentIndex: 0,
          selectedAnswer: "",
          score: 0,
        });
        return;
      }
      
      set({ 
        questions, 
        timer: timer, 
        mode: mode,
        phase: 'asking',
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
    
    if (mode === 'solo') {
      // Update score immediately
      const newScore = isCorrect ? score + 1 : score;
      
      // Determine next phase
      const isLastQuestion = currentIndex + 1 >= questions.length;
      
      set({
        selectedAnswer: answer,
        score: newScore,
        phase: isLastQuestion ? 'ranking' : 'scoring',
        timer: isLastQuestion ? 0 : 5,
        userAnswers: newUserAnswers,
      });
    } else if (mode === 'multi') {
      // Multiplayer logic to be implemented
      set({
        selectedAnswer: answer,
        phase: 'scoring',
        timer: 5,
        userAnswers: newUserAnswers,
      });
    }
  },

  /* ---------- Timer ---------- */
  tickTimer: () => {
    const { timer, phase, selectedAnswer, questions, currentIndex } = get();
    
    if (phase === 'answering' || phase === 'asking') {
      if (timer > 0) {
        set({ timer: timer - 1 });
      } else {
        // Timer expired - handle timeout explicitly
        if (phase === 'answering') {
          // If no answer was selected when timer runs out, treat as timeout (no points)
          if (!selectedAnswer) {
            // Set timer to 0 to prevent multiple submissions
            set({ timer: 0 });
            
            // Move to scoring phase with no answer selected (will show as wrong)
            const isLastQuestion = currentIndex + 1 >= questions.length;
            set({
              phase: isLastQuestion ? 'ranking' : 'scoring',
              timer: isLastQuestion ? 0 : 5,
            });
          } else {
            // Answer was selected, submit it normally
            set({ timer: 0 });
            get().selectAnswer(selectedAnswer);
          }
        }
      }
    }
  },

  /* ---------- Phase machine ---------- */
  nextPhase: () => {
    const { phase, currentIndex, questions, timer } = get();

    switch (phase) {
      case 'loading':
        // Only transition to asking if we have questions
        if (questions.length > 0) {
          set({ phase: 'asking' });
        } else {
          set({ phase: 'end' });
        }
        break;

      case 'asking':
        // Start answering phase with full timer
        set({ phase: 'answering', timer: 15 });
        break;

      case 'answering':
        // This should only be called manually, not automatically
        // The timer should handle the auto-advance
        if (timer > 0) {
          // If timer is still running, don't advance
          return;
        }
        
        // Timer expired, advance to scoring
        if (currentIndex + 1 < questions.length) {
          set({
            phase: 'scoring',
            timer: 5,
          });
        } else {
          set({ phase: 'ranking' });
        }
        break;

      case 'scoring':
        // After scoring delay, move to next question or end
        if (currentIndex + 1 < questions.length) {
          set({
            phase: 'asking',
            currentIndex: currentIndex + 1,
            selectedAnswer: '',
            timer: 15,
          });
        } else {
          set({ phase: 'ranking' });
        }
        break;

      case 'ranking':
        set({ phase: 'end' });
        break;

      case 'end':
        // Stay at end, user must reset or navigate away
        break;

      default:
        console.warn(`Unknown phase: ${phase}`);
        break;
    }
  },

  /* ---------- Reset ---------- */
  resetGame: () => set(initialState),
}));