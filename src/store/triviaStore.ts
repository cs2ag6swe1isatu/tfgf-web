import { create } from 'zustand';
import { Question } from '../types/question';
import { Mode, Difficulty, Category } from '../constants';
import type { GameConfig } from './gameStore';
import { loadQuestions } from '../utils/loadQuestions';
import { getMultiplayerPlayer, getMultiplayerPlayerId, usePlayerStore } from "./playerStore";
import { useMultiplayerStore } from './multiplayerStore';
import type { MultiplayerBridge } from '../types/multiplayer';
import { defaultGameConfig } from '../config/gameConfig';
import { applyRoundScores, scoreIncrementForAnswer, PlayerRoundAnswer } from '../rules';

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
 * - readying: Show "Get Ready" screen, short countdown before first question
 * - asking: Showing question and starting question timer
 * - answering: User is selecting answer, answer timer is running
 * - scoring: Show correct answer and update score, short delay before next question
 * - ranking: Show final results and rankings (for multiplayer)
 * - end: Game over, show summary and options to view profile or return to menu
 */

export type Phase = 'loading' | 'readying' | 'asking' | 'answering' | 'scoring' | 'ranking' | 'end';

export interface PlayerRanking {
  playerId: string;
  name: string;
  score: number;
  rank: number;
}

export interface TriviaState {
  questions: Question[];
  currentIndex: number;
  selectedAnswer: string;
  selectedAnswerRemainingTime: number;
  timer: number;
  questionTimer: number;
  answerTimer: number;
  score: number;
  phase: Phase;
  mode: Mode | null;
  category: Category | null;
  difficulty: Difficulty | null;
  userAnswers: string[];
  questionLimit: number;
  seed?: number;
  playerScores: Record<string, number>;
  playerAnswers: Record<string, PlayerRoundAnswer[]>;
  currentStreak: number;
  maxStreak: number;
  rankings: PlayerRanking[];
  avgTime: number;
}

export interface TriviaActions {
  startGame: (config: GameConfig) => Promise<void>;
  selectAnswer: (answer: string) => void;
  tickTimer: () => void;
  nextPhase: () => void;
  resetGame: () => void;
  submitAnswer: (answer: string) => void;
  receiveRemoteAnswer: (playerId: string, questionIndex: number, answer: string, remainingTime?: number) => void;
  scoreCurrentQuestion: () => void;
  finalizeRankings: () => void;
}

const readyTimer = defaultGameConfig.readyTimer; // Seconds to show "Get Ready" before asking first question 
const soloScoringDelay = defaultGameConfig.scoringDelay;

// test values change later
const initialState: TriviaState = {
  questions: [],
  currentIndex: 0,
  selectedAnswer: "",
  timer: 0,
  questionTimer: defaultGameConfig.questionTimer,
  answerTimer: defaultGameConfig.answerTimer,
  score: 0,
  phase: 'loading',
  mode: 'solo',
  category: null,
  difficulty: null,
  userAnswers: [],
  questionLimit: defaultGameConfig.questionLimit,
  seed: undefined,
  playerScores: {},
  playerAnswers: {},
  currentStreak: 0,
  maxStreak: 0,
  selectedAnswerRemainingTime: 0,
  rankings: [],
  avgTime: 0,
};

export const useTriviaStore = create<TriviaState & TriviaActions>((set, get) => ({
  ...initialState,

  /* ---------- Game setup ---------- */
  startGame: async (cfg) => {
    // Accept a snapshot config from the caller (separates UI store from session store)
    const mode = cfg.mode ?? get().mode;
    const questionTimer = cfg.questionTimer ?? get().questionTimer;
    const answerTimer = cfg.answerTimer ?? get().answerTimer;
    const category = cfg.category ?? get().category;
    const difficulty = cfg.difficulty ?? get().difficulty;
    const questionLimit = cfg.questionLimit ?? get().questionLimit;
    const seed = cfg.seed ?? get().seed;

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

    try {
      const questions = await loadQuestions(category, difficulty, questionLimit, seed);

      if (questions.length === 0) {
        console.warn(`No questions found for category: ${category}, difficulty: ${difficulty}`);
        get().resetGame();
        return;
      }

      set({ 
        questions,
        timer: mode === 'multiplayer' ? readyTimer : answerTimer,
        questionTimer,
        answerTimer,
        mode,
        phase: mode === 'multiplayer' ? 'readying' : 'answering',
        currentIndex: 0,
        selectedAnswer: "",
        selectedAnswerRemainingTime: 0,
        score: 0,
        userAnswers: [],
        questionLimit,
        playerScores: {},
        playerAnswers: {},
        currentStreak: 0,
        maxStreak: 0,
        rankings: [],
        seed,
      });

      // console.log(`Successfully loaded ${questions.length} questions for: ${category} (${difficulty})`);
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
    const { questions, currentIndex, mode, phase, score, userAnswers, answerTimer, currentStreak, maxStreak, timer, difficulty } = get();
    
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
    const answerRemainingTime = mode === 'multiplayer' ? get().selectedAnswerRemainingTime || timer : timer;
    const nextStreak = isCorrect ? currentStreak : 0;
    const nextMaxStreak = isCorrect ? Math.max(maxStreak, nextStreak) : maxStreak;
    
    // Track user answer
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentIndex] = answer;
    
    if (mode === 'solo') {
      const newScore = score + scoreIncrementForAnswer(isCorrect, difficulty ?? 'easy', answerRemainingTime, answerTimer);
      
      const isLastQuestion = currentIndex + 1 >= questions.length;
      
      set({
        selectedAnswer: answer,
        selectedAnswerRemainingTime: answerRemainingTime,
        score: newScore,
        phase: isLastQuestion ? 'end' : 'scoring',
        timer: isLastQuestion ? 0 : soloScoringDelay,
        userAnswers: newUserAnswers,
        currentStreak: nextStreak,
        maxStreak: nextMaxStreak,
      });
    } else if (mode === 'multiplayer') {
      // In multiplayer, don't change phase immediately — timer controls when scoring starts
      set({
        selectedAnswer: answer,
        selectedAnswerRemainingTime: answerRemainingTime,
        userAnswers: newUserAnswers,
        currentStreak: nextStreak,
        maxStreak: nextMaxStreak,
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
      const answerTimer = get().answerTimer;
      set({ phase: 'answering', timer: answerTimer });
      return;
    }

    if (phase === 'answering') {
      if (selectedAnswer) {
        if (mode === 'solo') {
          set({ timer: 0 });
          get().selectAnswer(selectedAnswer);
          return;
        }
        // In multiplayer, host still needs to advance phase when timer expires
        if (mode === 'multiplayer') {
          set({
            // Missed answer resets streak and moves to scoring.
            phase: 'scoring',
            timer: soloScoringDelay,
            currentStreak: 0,
          });
          return;
        }
      }

      const scoringDelay = mode === 'solo' ? soloScoringDelay : get().answerTimer;
      set({
        phase: 'scoring',
        timer: scoringDelay,
      });
      return;
    }

    if (currentIndex + 1 < questions.length) {
      const answerTimer = get().answerTimer;
      set({
        phase: 'answering',
        currentIndex: currentIndex + 1,
        selectedAnswer: '',
        timer: answerTimer,
      });
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
        set({ phase: 'answering', timer: get().answerTimer });
        break;

      case 'answering':
        if (timer > 0) {
          set({ timer: 0 });
        }
        
        // Timer expired, advance to scoring
        if (currentIndex + 1 < questions.length) {
          const scoringDelay = get().mode === 'solo' ? soloScoringDelay : get().answerTimer;
          set({
            phase: 'scoring',
            timer: scoringDelay,
          });
        } else {
          set({ phase: 'ranking' });
        }
        break;

      case 'scoring':
        // After scoring delay, move to next question or end
        if (currentIndex + 1 < questions.length) {
          const answerTimer = get().answerTimer;
          set({
            phase: 'answering',
            currentIndex: currentIndex + 1,
            selectedAnswer: '',
            timer: answerTimer,
          });
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

  // Solo, prioritize responsive play; Multiplayer, send answer to host immediately but wait for host to trigger scoring phase
  submitAnswer: (answer: string) => {
    const { currentIndex, userAnswers, mode, questions, currentStreak, maxStreak, timer } = get();
    const currentQuestion = questions[currentIndex];

    if (mode === 'solo') {
      get().selectAnswer(answer);
      return;
    }

    if (!currentQuestion || !currentQuestion.allAnswers.includes(answer)) {
      console.warn(`Invalid answer selected: ${answer}`);
      return;
    }

    const isCorrect = answer === currentQuestion.correctAnswer;
    const nextStreak = isCorrect ? currentStreak + 1 : 0;
    const nextMaxStreak = isCorrect ? Math.max(maxStreak, nextStreak) : maxStreak;
    const nextAnswers = [...userAnswers];
    nextAnswers[currentIndex] = answer;

    set({
      selectedAnswer: answer,
      selectedAnswerRemainingTime: timer,
      userAnswers: nextAnswers,
      currentStreak: nextStreak,
      maxStreak: nextMaxStreak,
      // No phase change — timer controls when scoring starts
    });

    // ── Check if all players have answered → immediately advance to scoring ──
    if (useMultiplayerStore.getState().lobbyRole === 'host') {
      const state = get();
      const players = useMultiplayerStore.getState().players;
      if (players.length > 0 && state.selectedAnswer) {
        const allAnswered = players.every((player) => {
          if (player.isHost) {
            // Host: check via selectedAnswer (already set above)
            return !!state.selectedAnswer;
          }
          // Client player: check via playerAnswers
          const answers = state.playerAnswers[player.id];
          return answers && !!answers[state.currentIndex];
        });

        if (allAnswered) {
          set({
            phase: 'scoring',
            timer: soloScoringDelay,
          });
          return;
        }
      }
    }
    
    if (mode === "multiplayer" && useMultiplayerStore.getState().lobbyRole === "client") {
      const bridge: MultiplayerBridge | undefined = window.multiplayer;
      const lobbyId = useMultiplayerStore.getState().lobbyId;
      const hostAddress = useMultiplayerStore.getState().hostAddress;
      const playerId = getMultiplayerPlayerId(usePlayerStore.getState().getPlayer().id);
      if (!bridge || !lobbyId || !hostAddress) {
        console.warn("Missing multiplayer routing data for answer submission", { lobbyId, hostAddress });
        return;
      }
      bridge.sendAnswerSubmission({
        lobbyId,
        hostAddress,
        playerId,
        questionIndex: currentIndex,
        answer,
        remainingTime: timer,
      });
    }
  },
  receiveRemoteAnswer: (playerId: string, questionIndex: number, answer: string, remainingTime?: number) => {
    const answers = { ...get().playerAnswers };
    const playerAnswerList = [...(answers[playerId] ?? [])];
    playerAnswerList[questionIndex] = {
      answer,
      remainingTime: remainingTime ?? get().timer,
    };
    answers[playerId] = playerAnswerList;
    set({ playerAnswers: answers });

    // ── Check if all players have answered → immediately advance to scoring ──
    const state = get();
    if (state.mode === 'multiplayer' && state.selectedAnswer) {
      const players = useMultiplayerStore.getState().players;
      if (players.length > 0) {
        const allAnswered = players.every((player) => {
          if (player.isHost) {
            return !!state.selectedAnswer;
          }
          const playerAns = state.playerAnswers[player.id];
          return playerAns && !!playerAns[state.currentIndex];
        });

        if (allAnswered) {
          set({
            phase: 'scoring',
            timer: soloScoringDelay,
          });
        }
      }
    }
  },
  scoreCurrentQuestion: () => {
    const state = get();
    const question = state.questions[state.currentIndex];
    if(!question) return;
    const hostId = getMultiplayerPlayerId(usePlayerStore.getState().getPlayer().id);

    const nextScores = applyRoundScores({
      currentScores: state.playerScores,
      hostPlayerId: hostId,
      hostAnswer: state.selectedAnswer,
      hostRemainingTime: state.selectedAnswerRemainingTime,
      playerAnswers: state.playerAnswers,
      questionIndex: state.currentIndex,
      correctAnswer: question.correctAnswer,
      difficulty: state.difficulty ?? 'easy',
      totalTime: state.answerTimer,
    });
    set({ playerScores: nextScores });
  },
  finalizeRankings: () => {
    const players = useMultiplayerStore.getState().players;
    const hostPlayer = getMultiplayerPlayer(usePlayerStore.getState().getPlayer());
    const scors = get().playerScores;

    // Use a Map for better unique player management by ID
    const rankingMap = new Map<string, { playerId: string; name: string; score: number }>();

    // Add host
    rankingMap.set(hostPlayer.id, {
      playerId: hostPlayer.id,
      name: hostPlayer.name,
      score: scors[hostPlayer.id] ?? 0,
    });

    // Add other players from the lobby
    players.forEach((p) => {
      rankingMap.set(p.id, {
        playerId: p.id,
        name: p.name,
        score: scors[p.id] ?? 0,
      });
    });

    // Add any players who have scores but might not be in the players list for some reason
    Object.keys(scors).forEach((playerId) => {
      if (!rankingMap.has(playerId)) {
        rankingMap.set(playerId, {
          playerId: playerId,
          name: "Unknown Player",
          score: scors[playerId] ?? 0,
        });
      }
    });

    const rankingList = Array.from(rankingMap.values());
    const sorted = Object.values(rankingList)
      .sort((a,b) => b.score - a.score)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    set({ rankings: sorted });
  },

  /* ---------- Reset ---------- */
  resetGame: () => set(initialState),
}));