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
 * PHASE RULES:
 * - loading:   Fetching questions
 * - readying:  "Get Ready" countdown before first question
 * - asking:    Question visible, answer timer not yet started
 * - answering: User is selecting answer, answer timer running
 * - scoring:   Show correct answer, short delay before next question
 * - ranking:   Show final results/rankings (multiplayer)
 * - end:       Game over — QuestionPage applies session progress then navigates away
 *
 * FIX (BUG 5): selectAnswer previously set phase directly to "end" on the last
 * question, skipping the scoring delay. This caused the end-of-game handler in
 * QuestionPage to fire before the user could see whether their last answer was
 * correct. Now the last question always goes through "scoring" → tickTimer →
 * "ranking" → nextPhase() → "end", identical to every other question.
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

const readyTimer       = defaultGameConfig.readyTimer;
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

    // Input validation ...
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
          // Host: Load locally and then start HTTP server to share
          questions = await loadQuestions(category, difficulty, questionLimit, seed);
          if (bridge?.startHttpServer) {
            console.log('[TriviaStore] Host starting HTTP server for questions');
            bridge.startHttpServer(JSON.stringify(questions));
          }
        } else {
          // Client: Try to fetch from host via HTTP with retry logic
          const hostAddress = multiplayerStore.hostAddress;
          if (hostAddress && questionPort) {
            const fetchUrl = `http://${hostAddress}:${questionPort}/questions`;
            console.log(`[TriviaStore] Client attempting to fetch questions from host: ${hostAddress}:${questionPort}`);
            
            let lastError: Error | null = null;
            const maxRetries = 3;
            const retryDelayMs = 500;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per attempt
                const startTime = Date.now();
                
                const response = await fetch(fetchUrl, { signal: controller.signal });
                const fetchDurationMs = Date.now() - startTime;
                clearTimeout(timeoutId);
                
                if (response.ok) {
                  questions = await response.json();
                  console.log(`[TriviaStore] Successfully fetched ${questions.length} questions from host (attempt ${attempt}, ${fetchDurationMs}ms)`);
                  lastError = null;
                  break;
                } else {
                  lastError = new Error(`HTTP error! status: ${response.status}`);
                  console.warn(`[TriviaStore] HTTP fetch attempt ${attempt} failed: ${response.status}`);
                  if (attempt < maxRetries) {
                    console.log(`[TriviaStore] Retrying in ${retryDelayMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                  }
                }
              } catch (e) {
                lastError = e instanceof Error ? e : new Error(String(e));
                console.warn(`[TriviaStore] HTTP fetch attempt ${attempt} error:`, lastError.message);
                if (attempt < maxRetries) {
                  console.log(`[TriviaStore] Retrying in ${retryDelayMs}ms...`);
                  await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                }
              }
            }
            
            if (lastError || questions.length === 0) {
              console.warn('[TriviaStore] Failed to fetch questions from host after all retries, falling back to local load', lastError);
              questions = await loadQuestions(category, difficulty, questionLimit, seed);
            }
          } else {
            // Fallback for missing address/port
            console.log('[TriviaStore] Missing hostAddress or questionPort, falling back to local load');
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

    const isCorrect         = answer === currentQuestion.correctAnswer;
    const answerRemainingTime = mode === 'multiplayer'
      ? get().selectedAnswerRemainingTime || timer
      : timer;
    const nextStreak    = isCorrect ? currentStreak + 1 : 0;
    const nextMaxStreak = isCorrect ? Math.max(maxStreak, nextStreak) : maxStreak;

    const newUserAnswers       = [...userAnswers];
    newUserAnswers[currentIndex] = answer;

    if (mode === 'solo') {
      const newScore = score + scoreIncrementForAnswer(
        isCorrect, difficulty ?? 'easy', answerRemainingTime, answerTimer,
      );

      // FIX (BUG 5): Always go to 'scoring' (never jump straight to 'end').
      // The scoring → tickTimer → ranking → nextPhase() chain reaches 'end'
      // correctly for both mid-game and last questions. This ensures the user
      // always sees the correct-answer reveal on the final question AND that the
      // QuestionPage end-handler fires only after the scoring delay completes.
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

    if (
      phase !== 'readying' &&
      phase !== 'answering' &&
      phase !== 'asking'   &&
      phase !== 'scoring'
    ) return;

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
      // Time expired with no answer — reset streak, go to scoring
      const scoringDelay = mode === 'solo' ? soloScoringDelay : get().answerTimer;
      set({ phase: 'scoring', timer: scoringDelay, currentStreak: 0 });
      set({
        phase: 'scoring',
        timer: scoringDelay,
      });
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

    // Last question scored — go to ranking, then nextPhase() → end
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
        // Stay at end — QuestionPage navigates away via setScreen()
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

    if (!currentQuestion || !currentQuestion.allAnswers.includes(answer)) {
      console.warn(`[TriviaStore] Invalid answer selected: ${answer}`);
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
      // No phase change — timer controls when scoring starts
    });

    // ── Check if all players have answered → immediately advance to scoring ──
    if (useMultiplayerStore.getState().lobbyRole === 'host') {
      const state = get();
      const players = useMultiplayerStore.getState().players;
      if (players.length > 0 ) {
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
    const answers           = { ...get().playerAnswers };
    const playerAnswerList  = [...(answers[playerId] ?? [])];
    playerAnswerList[questionIndex] = {
      answer,
      remainingTime: remainingTime ?? get().timer,
    };
    answers[playerId] = playerAnswerList;
    set({ playerAnswers: answers });

    // ── Check if all players have answered → immediately advance to scoring ──
    const state = get();
   if (state.mode === 'multiplayer') {
  const players = useMultiplayerStore.getState().players;
  if (players.length > 0) {
    const allAnswered = players.every((player) => {
      if (player.isHost) {
        return !!state.selectedAnswer;
      }
      const playerAns = answers[player.id]; // use the updated answers, not state.playerAnswers
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
    const state    = get();
    const question = state.questions[state.currentIndex];
    if (!question) return;

    const hostId = getMultiplayerPlayerId(usePlayerStore.getState().getPlayer().id);
    const nextScores = applyRoundScores({
      currentScores:        state.playerScores,
      hostPlayerId:         hostId,
      hostAnswer:           state.selectedAnswer,
      hostRemainingTime:    state.selectedAnswerRemainingTime,
      playerAnswers:        state.playerAnswers,
      questionIndex:        state.currentIndex,
      correctAnswer:        question.correctAnswer,
      difficulty:           state.difficulty ?? 'easy',
      totalTime:            state.answerTimer,
    });
    set({ playerScores: nextScores });
  },

  finalizeRankings: () => {
    const players    = useMultiplayerStore.getState().players;
    const hostPlayer = getMultiplayerPlayer(usePlayerStore.getState().getPlayer());
    const scores     = get().playerScores;

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
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    set({ rankings: sorted });
  },

  /* ---------- Reset ---------- */
  resetGame: () => set(initialState),
}));