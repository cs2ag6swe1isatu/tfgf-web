import { create } from 'zustand';
import { Question } from '../types/question';
import { Mode, Difficulty, Category } from '../constants';
import type { GameConfig } from './gameStore';
import { loadQuestions } from '../utils/loadQuestions';
import { usePlayerStore } from './playerStore';
import { useMultiplayerStore } from './multiplayerStore';
import type { MultiplayerBridge } from '../types/multiplayer';
import { defaultGameConfig } from '../config/gameConfig';
import { applyRoundScores, scoreIncrementForAnswer } from '../rules';

/**
 * Trivia Store - Game Logic and State Management
 * * RESPONSIBILITIES:
 * - Question loading and management
 * - Game phase management (loading, asking, answering, scoring, ranking)
 * - Score tracking and answer processing
 * - Timer management and countdown logic
 * - Game state progression and transitions
 * - Multiplayer vs solo game mode handling
 * - Screen Navigation
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
  playerAnswers: Record<string, string[]>;
  rankings: PlayerRanking[];
  currentScreen: string; // ✅ ADDED: The screen state
}

export interface TriviaActions {
  startGame: (config: GameConfig) => Promise<void>;
  selectAnswer: (answer: string) => void;
  tickTimer: () => void;
  nextPhase: () => void;
  resetGame: () => void;
  submitAnswer: (answer: string) => void;
  receiveRemoteAnswer: (playerId: string, questionIndex: number, answer: string) => void;
  scoreCurrentQuestion: () => void;
  finalizeRankings: () => void;
  setScreen: (screen: string) => void; // ✅ ADDED: The screen action
}

const readyTimer = defaultGameConfig.readyTimer;
const soloScoringDelay = defaultGameConfig.scoringDelay;

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
  rankings: [],
  currentScreen: 'HomePage', // ✅ ADDED: The default starting screen
};

export const useTriviaStore = create<TriviaState & TriviaActions>((set, get) => ({
  ...initialState,

  /* ---------- Game setup ---------- */
  startGame: async (cfg) => {
    const mode = cfg.mode ?? get().mode;
    const questionTimer = cfg.questionTimer ?? get().questionTimer;
    const answerTimer = cfg.answerTimer ?? get().answerTimer;
    const category = cfg.category ?? get().category;
    const difficulty = cfg.difficulty ?? get().difficulty;
    const questionLimit = cfg.questionLimit ?? get().questionLimit;
    const seed = cfg.seed ?? get().seed;

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
        score: 0,
        userAnswers: [],
        playerScores: {},
        playerAnswers: {},
        rankings: [],
        seed,
      });
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
    const { questions, currentIndex, mode, phase, score, userAnswers, answerTimer } = get();
    
    if (phase !== 'answering') return;
    if (!questions || questions.length === 0) return;
    if (currentIndex < 0 || currentIndex >= questions.length) return;
    
    const currentQuestion = questions[currentIndex];
    
    if (!currentQuestion.allAnswers.includes(answer)) {
      console.warn(`Invalid answer selected: ${answer}`);
      return;
    }
    
    const isCorrect = answer === currentQuestion.correctAnswer;
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentIndex] = answer;
    
    if (mode === 'solo') {
      const newScore = score + scoreIncrementForAnswer(isCorrect);
      const isLastQuestion = currentIndex + 1 >= questions.length;
      
      set({
        selectedAnswer: answer,
        score: newScore,
        phase: isLastQuestion ? 'end' : 'scoring',
        timer: isLastQuestion ? 0 : soloScoringDelay,
        userAnswers: newUserAnswers,
      });
    } else if (mode === 'multiplayer') {
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

    if (timer > 0) {
      set({ timer: timer - 1 });
      return;
    }

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

      const scoringDelay = mode === 'solo' ? soloScoringDelay : get().answerTimer;
      set({
        phase: 'scoring',
        timer: scoringDelay,
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
          set({ timer: 0 });
        }
        
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
        break;

      default:
        console.warn(`Unknown phase: ${phase}`);
        break;
    }
  },

  submitAnswer: (answer: string) => {
    const { currentIndex, userAnswers, mode } = get();

    if (mode === 'solo') {
      get().selectAnswer(answer);
      return;
    }

    const nextAnswers = [...userAnswers];
    nextAnswers[currentIndex] = answer;
    set({ selectedAnswer: answer, userAnswers: nextAnswers });
    
    if (mode === "multiplayer" && useMultiplayerStore.getState().lobbyRole === "client") {
      const bridge: MultiplayerBridge | undefined = window.multiplayer;
      const lobbyId = useMultiplayerStore.getState().lobbyId;
      const hostAddress = useMultiplayerStore.getState().hostAddress;
      const playerId = usePlayerStore.getState().getPlayer().id;
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
      });
    }
  },

  receiveRemoteAnswer: (playerId: string, questionIndex: number, answer: string) => {
    const answers = { ...get().playerAnswers };
    const playerAnswerList = [...(answers[playerId] ?? [])];
    playerAnswerList[questionIndex] = answer;
    answers[playerId] = playerAnswerList;
    set({ playerAnswers: answers });
  },

  scoreCurrentQuestion: () => {
    const state = get();
    const question = state.questions[state.currentIndex];
    if(!question) return;
    const hostId = usePlayerStore.getState().getPlayer().id;

    const nextScores = applyRoundScores({
      currentScores: state.playerScores,
      hostPlayerId: hostId,
      hostAnswer: state.selectedAnswer,
      playerAnswers: state.playerAnswers,
      questionIndex: state.currentIndex,
      correctAnswer: question.correctAnswer,
    });
    set({ playerScores: nextScores });
  },

  finalizeRankings: () => {
    const players = useMultiplayerStore.getState().players;
    const hostPlayer = usePlayerStore.getState().getPlayer();
    const scors = get().playerScores;

    const rankingMap = new Map<string, { playerId: string; name: string; score: number }>();

    rankingMap.set(hostPlayer.id, {
      playerId: hostPlayer.id,
      name: hostPlayer.name,
      score: scors[hostPlayer.id] ?? 0,
    });

    players.forEach((p) => {
      rankingMap.set(p.id, {
        playerId: p.id,
        name: p.name,
        score: scors[p.id] ?? 0,
      });
    });

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

  /* ---------- Navigation Action ---------- */
  setScreen: (screen: string) => set({ currentScreen: screen }), // ✅ ADDED: The screen function implementation

  /* ---------- Reset ---------- */
  resetGame: () => set(initialState),
}));