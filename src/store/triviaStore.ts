import { create } from 'zustand';
import { Question } from '../types/question';
import { Mode, Difficulty, Category } from '../constants';
import type { GameConfig } from './gameStore';
import { loadQuestions } from '../utils/loadQuestions';
import { getMultiplayerPlayer, getMultiplayerPlayerId, usePlayerStore } from "./playerStore";
import { useMultiplayerStore } from './multiplayerStore';
import { usePowerUpStore } from './powerUpStore';
import type { MultiplayerBridge } from '../types/multiplayer';
import { defaultGameConfig } from '../config/gameConfig';
import { applyRoundScores, scoreIncrementForAnswer, PlayerRoundAnswer } from '../rules';
import { calculateMultiplayerXP, applyFreezeBonus } from '../utils/progression';

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
  correctCount?: number;
  questionsAnswered?: number;
  accuracy?: number;
  avgTime?: number;
  xp: number;
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

const readyTimer       = defaultGameConfig.readyTimer;
const soloScoringDelay = defaultGameConfig.scoringDelay;

const multiplayerCheckingDelay = 3;

const shouldEnterCheckingPhase = (state: TriviaState): boolean => {
  if (state.mode !== 'multiplayer') return false;
  if (useMultiplayerStore.getState().lobbyRole !== 'host') return false;

  const players = useMultiplayerStore.getState().players;
  if (players.length === 0) return false;

  // Only wait for active (non-disconnected) players.
  // Disconnected players will never submit answers, so excluding them
  // prevents the scoring phase from being blocked indefinitely.
  const activePlayers = players.filter(p => p.connectionState !== 'disconnected');
  if (activePlayers.length === 0) return false;

  return activePlayers.every((player) => {
    if (player.isHost) {
      return !!state.selectedAnswer;
    }

    const answers = state.playerAnswers[player.id];
    return !!answers && !!answers[state.currentIndex];
  });
};

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
    const mode          = cfg.mode          ?? get().mode;
    const questionTimer = cfg.questionTimer ?? get().questionTimer;
    const answerTimer   = cfg.answerTimer   ?? get().answerTimer;
    const category      = cfg.category      ?? get().category;
    const difficulty    = cfg.difficulty    ?? get().difficulty;
    const questionLimit = cfg.questionLimit ?? get().questionLimit;
    const seed = cfg.seed ?? get().seed;
    const questionPort = cfg.questionPort;

    if (!category || !difficulty || !mode) {
      console.error("Invalid game parameters:", { category, difficulty, mode });
      set({ phase: 'end' });
      return;
    }

    try {
      let questions: Question[] = [];
      const multiplayerStore = useMultiplayerStore.getState();
      const bridge: MultiplayerBridge | undefined = window.multiplayer;

      if (mode === 'multiplayer') {
        if (multiplayerStore.lobbyRole === 'host') {
          questions = await loadQuestions(category, difficulty, questionLimit, seed);
          if (bridge?.startHttpServer) {
            bridge.startHttpServer(JSON.stringify(questions));
          }
        } else {
          const hostAddress = multiplayerStore.hostAddress;
          if (hostAddress && questionPort) {
            const fetchUrl = `http://${hostAddress}:${questionPort}/questions`;

            let lastError: Error | null = null;
            const maxRetries = 3;
            const retryDelayMs = 500;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const startTime = Date.now();

                const response = await fetch(fetchUrl, { signal: controller.signal });
                const fetchDurationMs = Date.now() - startTime;
                clearTimeout(timeoutId);

                if (response.ok) {
                  questions = await response.json();
                  lastError = null;
                  break;
                } else {
                  lastError = new Error(`HTTP error! status: ${response.status}`);
                  console.warn(`[TriviaStore] HTTP fetch attempt ${attempt} failed: ${response.status}`);
                  if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                  }
                }
              } catch (e) {
                lastError = e instanceof Error ? e : new Error(String(e));
                console.warn(`[TriviaStore] HTTP fetch attempt ${attempt} error:`, lastError.message);
                if (attempt < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                }
              }
            }

            if (lastError || questions.length === 0) {
              console.warn('[TriviaStore] Failed to fetch questions from host after all retries, falling back to local load', lastError);
              questions = await loadQuestions(category, difficulty, questionLimit, seed);
            }
          } else {
            questions = await loadQuestions(category, difficulty, questionLimit, seed);
          }
        }
      } else {
        questions = await loadQuestions(category, difficulty, questionLimit, seed);
      }

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
    if (!answer) {
      set({ currentStreak: 0 });
      return;
    }

    const {
      questions, currentIndex, mode, phase, score,
      userAnswers, answerTimer, currentStreak, maxStreak, timer, difficulty,
    } = get();

    if (phase !== 'answering') return;
    if (!questions || questions.length === 0) return;
    if (currentIndex < 0 || currentIndex >= questions.length) return;

    const currentQuestion = questions[currentIndex];

    if (!currentQuestion.allAnswers.includes(answer)) {
      console.warn(`Invalid answer selected: ${answer}`);
      return;
    }

    const isCorrect           = answer === currentQuestion.correctAnswer;
    const answerRemainingTime = mode === 'multiplayer'
      ? get().selectedAnswerRemainingTime || timer
      : timer;
    const nextStreak    = isCorrect ? currentStreak + 1 : 0;
    const nextMaxStreak = isCorrect ? Math.max(maxStreak, nextStreak) : maxStreak;

    const newUserAnswers         = [...userAnswers];
    newUserAnswers[currentIndex] = answer;

    if (mode === 'solo') {
      // Check if time_freeze power-up was used on this question
      const powerUpState = usePowerUpStore.getState();
      const timeFreezeUsed = powerUpState.used.some(
        (u) => u.id === 'time_freeze' && u.usedOnQuestionIndex === currentIndex
      );
      // Apply freeze bonus to remaining time before calculating score
      const effectiveRemainingTime = applyFreezeBonus(answerRemainingTime, answerTimer, timeFreezeUsed);
      
      const newScore = score + scoreIncrementForAnswer(
        isCorrect, difficulty ?? 'easy', effectiveRemainingTime, answerTimer,
      );

      set({
        selectedAnswer: answer,
        selectedAnswerRemainingTime: answerRemainingTime,
        score: newScore,
        phase: 'scoring',
        timer: soloScoringDelay,
        userAnswers: newUserAnswers,
        currentStreak: nextStreak,
        maxStreak: nextMaxStreak,
      });
    } else if (mode === 'multiplayer') {
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
    const state = get();
    const { timer, phase, selectedAnswer, questions, currentIndex, mode } = state;

    if (
      phase !== 'readying' &&
      phase !== 'answering' &&
      phase !== 'asking'   &&
      phase !== 'scoring'
    ) return;

    if (phase === 'answering' && shouldEnterCheckingPhase(state)) {
      set({ phase: 'scoring', timer: multiplayerCheckingDelay });
      return;
    }

    if (timer > 1) {
      set({ timer: timer - 1 });
      return;
    }

    // Timer expired — advance phase
    if (phase === 'readying') {
      set({ phase: 'answering', timer: get().answerTimer });
      return;
    }

    if (phase === 'answering') {
      if (selectedAnswer) {
        if (mode === 'solo') {
          set({ timer: 0 });
          get().selectAnswer(selectedAnswer);
          return;
        }
        // ── FIX: score before entering checking phase (timer-expiry + answered path) ──
        if (mode === 'multiplayer') {
          set({ phase: 'scoring', timer: multiplayerCheckingDelay, currentStreak: 0 });
          return;
        }
      }

      // Timer expired, no answer selected
      const scoringDelay = soloScoringDelay;
      set({ phase: 'scoring', timer: scoringDelay, currentStreak: 0 });
      return;
    }

    // phase === 'scoring' or 'asking' — move to next question or end
    if (currentIndex + 1 < questions.length) {
      set({
        phase: 'answering',
        currentIndex: currentIndex + 1,
        selectedAnswer: '',
        timer: get().answerTimer,
      });
      return;
    }

    // ── FIX: last question scored — finalize rankings before entering ranking phase ──
    get().finalizeRankings();
    set({ phase: 'ranking', timer: 0 });
  },

  /* ---------- Phase machine ---------- */
  nextPhase: () => {
    const { phase, currentIndex, questions, timer } = get();

    switch (phase) {
      case 'loading':
        if (questions.length > 0) {
          if (get().mode === "multiplayer") set({ phase: 'readying' });
          else set({ phase: 'loading' });
        } else {
          set({ phase: 'end' });
        }
        break;

      case 'readying':
        set({ phase: 'answering', timer: get().answerTimer });
        break;

      case 'answering':
        if (timer > 0) set({ timer: 0 });
        if (currentIndex + 1 < questions.length) {
          set({ phase: 'scoring', timer: get().mode === 'solo' ? soloScoringDelay : get().answerTimer });
        } else {
          set({ phase: 'ranking' });
        }
        break;

      case 'scoring':
        if (currentIndex + 1 < questions.length) {
          set({
            phase: 'answering',
            currentIndex: currentIndex + 1,
            selectedAnswer: '',
            timer: get().answerTimer,
          });
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
        console.warn(`[TriviaStore] Unknown phase: ${phase}`);
        break;
    }
  },

  /* ---------- Submit answer (mode-aware entry point) ---------- */
  submitAnswer: (answer: string) => {
    const { currentIndex, userAnswers, mode, questions, currentStreak, maxStreak, timer } = get();
    const currentQuestion = questions[currentIndex];

    if (mode === 'solo') {
      get().selectAnswer(answer);
      return;
    }

    if (!answer || !currentQuestion || !currentQuestion.allAnswers.includes(answer)) {
      if (!answer) {
        set({ selectedAnswerRemainingTime: timer, currentStreak: 0 });
        console.warn(`[TriviaStore] Empty/missed answer submitted`);
      }
      return;
    }

    const isCorrect     = answer === currentQuestion.correctAnswer;
    const nextStreak    = isCorrect ? currentStreak + 1 : 0;
    const nextMaxStreak = isCorrect ? Math.max(maxStreak, nextStreak) : maxStreak;
    const nextAnswers   = [...userAnswers];
    nextAnswers[currentIndex] = answer;

    set({
      selectedAnswer: answer,
      selectedAnswerRemainingTime: timer,
      userAnswers: nextAnswers,
      currentStreak: nextStreak,
      maxStreak: nextMaxStreak,
    });

    if (mode === 'multiplayer' && useMultiplayerStore.getState().lobbyRole === 'host') {
      const hostId = getMultiplayerPlayerId(usePlayerStore.getState().getPlayer().id);
      const hostAnswers = [...(get().playerAnswers[hostId] ?? [])];
      hostAnswers[currentIndex] = {
        answer,
        remainingTime: timer,
      };
      set({
        playerAnswers: {
          ...get().playerAnswers,
          [hostId]: hostAnswers,
        },
      });
    }

    if (shouldEnterCheckingPhase(get())) {
      set({ phase: 'scoring', timer: multiplayerCheckingDelay });
      return;
    }

    if (mode === "multiplayer" && useMultiplayerStore.getState().lobbyRole === "client") {
      const bridge: MultiplayerBridge | undefined = window.multiplayer;
      const lobbyId     = useMultiplayerStore.getState().lobbyId;
      const hostAddress = useMultiplayerStore.getState().hostAddress;
      const playerId    = getMultiplayerPlayerId(usePlayerStore.getState().getPlayer().id);

      if (!bridge || !lobbyId || !hostAddress) {
        console.warn("[TriviaStore] Missing multiplayer routing data for answer submission", { lobbyId, hostAddress });
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

  receiveRemoteAnswer: (playerId, questionIndex, answer, remainingTime?) => {
    const answers          = { ...get().playerAnswers };
    const playerAnswerList = [...(answers[playerId] ?? [])];
    const prevAnswer = playerAnswerList[questionIndex];

    playerAnswerList[questionIndex] = {
      answer,
      remainingTime: remainingTime ?? get().timer,
    };
    answers[playerId] = playerAnswerList;
    set({ playerAnswers: answers });

    const state = get();
    console.log(`[TriviaStore] Answer received: playerId=${playerId.slice(0, 8)}, Q${questionIndex}, answer=${answer}, overwriting=${!!prevAnswer}, phase=${state.phase}`);

    // ── FIX: score before entering checking phase (last remote answer arrives) ──
    if (shouldEnterCheckingPhase(get())) {
      console.log('[TriviaStore] All players answered, entering checking phase');
      set({ phase: 'scoring', timer: multiplayerCheckingDelay });
    }
  },

  scoreCurrentQuestion: () => {
    const state    = get();
    const question = state.questions[state.currentIndex];
    if (!question) return;

    const hostId     = getMultiplayerPlayerId(usePlayerStore.getState().getPlayer().id);
    
    // Check if time_freeze power-up was used on this question
    const powerUpState = usePowerUpStore.getState();
    const timeFreezeUsed = powerUpState.used.some(
      (u) => u.id === 'time_freeze' && u.usedOnQuestionIndex === state.currentIndex
    );
    
    // Apply freeze bonus to host remaining time
    const hostRemainingTimeWithBonus = applyFreezeBonus(
      state.selectedAnswerRemainingTime,
      state.answerTimer,
      timeFreezeUsed
    );
    
    // Apply freeze bonus to all player answer times
    const playerAnswersWithBonus = Object.entries(state.playerAnswers).reduce(
      (acc, [playerId, answers]) => {
        acc[playerId] = answers.map((answer, index) => {
          if (index === state.currentIndex && answer) {
            return {
              ...answer,
              remainingTime: applyFreezeBonus(answer.remainingTime, state.answerTimer, timeFreezeUsed),
            };
          }
          return answer;
        });
        return acc;
      },
      {} as typeof state.playerAnswers
    );

    const nextScores = applyRoundScores({
      currentScores:         state.playerScores,
      hostPlayerId:          hostId,
      hostAnswer:            state.selectedAnswer,
      hostRemainingTime:     hostRemainingTimeWithBonus,
      playerAnswers:         playerAnswersWithBonus,
      questionIndex:         state.currentIndex,
      correctAnswer:         question.correctAnswer,
      difficulty:            state.difficulty ?? 'easy',
      totalTime:             state.answerTimer,
    });

    const playersWithAnswers = Object.entries(state.playerAnswers)
      .filter(([_, answers]) => answers && answers[state.currentIndex])
      .map(([playerId]) => playerId.slice(0, 8));
    console.log(`[TriviaStore] scoreCurrentQuestion Q${state.currentIndex}: players with answers=${playersWithAnswers.join(',')}, scores=${JSON.stringify(nextScores)}`);

    set({ playerScores: nextScores });
  },

  finalizeRankings: () => {
    const players    = useMultiplayerStore.getState().players;
    const hostPlayer = getMultiplayerPlayer(usePlayerStore.getState().getPlayer());
    const scores     = get().playerScores;
    const state      = get();
    const questions  = state.questions;
    const answerTimer = state.answerTimer;

    const summarizePlayer = (playerId: string) => {
      const answers = state.playerAnswers[playerId] ?? [];
      type AnswerEntry = { entry: PlayerRoundAnswer; index: number };
      const answeredEntries = answers
        .map((entry, index): AnswerEntry | null => (entry ? { entry, index } : null))
        .filter((item): item is AnswerEntry => item !== null);

      const questionsAnswered = answeredEntries.length;
      let maxStreak = 0;
      let currentStreak = 0;
      const correctCount = answeredEntries.reduce((count, { entry, index }) => {
        const question  = questions[index];
        const isCorrect = question && entry.answer === question.correctAnswer;
        if (isCorrect) {
          currentStreak++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
        return count + (isCorrect ? 1 : 0);
      }, 0);

      const accuracy = questions.length > 0
        ? Math.round((correctCount / questions.length) * 100)
        : 0;

      const avgTime = questionsAnswered > 0
        ? Math.round(
            (
              answeredEntries.reduce((sum, { entry }) => {
                const remaining = typeof entry.remainingTime === 'number' ? entry.remainingTime : answerTimer;
                return sum + Math.max(0, answerTimer - remaining);
              }, 0) / questionsAnswered
            ) * 10
          ) / 10
        : 0;

      const hasAnswers = answeredEntries.length > 0;
      if (!hasAnswers) {
        console.warn(`[TriviaStore] Player ${playerId.slice(0, 8)}: NO ANSWERS FOUND! questionsAnswered=0, score=${scores[playerId] ?? 0}`);
      } else if (correctCount === 0 && scores[playerId] && scores[playerId] > 0) {
        console.warn(`[TriviaStore] Player ${playerId.slice(0, 8)}: Mismatch! correctCount=0 but score=${scores[playerId]}`);
      }

      return { correctCount, maxStreak, questionsAnswered, accuracy, avgTime };
    };

    const rankingMap = new Map<string, { playerId: string; name: string; score: number }>();

    rankingMap.set(hostPlayer.id, {
      playerId: hostPlayer.id,
      name:     hostPlayer.name,
      score:    scores[hostPlayer.id] ?? 0,
    });

    players.forEach((p) => {
      rankingMap.set(p.id, { playerId: p.id, name: p.name, score: scores[p.id] ?? 0 });
    });

    Object.keys(scores).forEach((playerId) => {
      if (!rankingMap.has(playerId)) {
        rankingMap.set(playerId, { playerId, name: "Unknown Player", score: scores[playerId] ?? 0 });
      }
    });

    const sorted = Array.from(rankingMap.values())
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => {
        const summary     = summarizePlayer(entry.playerId);
        const playerScore = entry.score;
        const xp          = calculateMultiplayerXP(playerScore, summary.maxStreak, index + 1);
        return {
          ...entry,
          rank: index + 1,
          ...summary,
          xp,
        };
      });

    console.log('[TriviaStore] finalizeRankings complete:', sorted.map(r =>
      `${r.name.slice(0, 8)}(score=${r.score},correct=${r.correctCount}/${r.questionsAnswered},acc=${r.accuracy}%,xp=${r.xp})`
    ).join(' | '));

    set({ rankings: sorted });
  },

  /* ---------- Reset ---------- */
  resetGame: () => set(initialState),
}));