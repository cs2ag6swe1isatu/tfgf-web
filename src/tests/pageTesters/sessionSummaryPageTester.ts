import { CATEGORIES, DIFFICULTIES } from "../../constants";
import { useGameStore, useMultiplayerStore, usePlayerStore, useTriviaStore } from "../../store";
import type { GameSession } from "../../types/player";

const TESTER_ID = "session-summary";

const shouldRunSessionSummaryTester = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("tester") === TESTER_ID;
};

const upsertSessionInHistory = (history: GameSession[], mockSession: GameSession) => {
  const withoutExisting = history.filter((entry) => entry.id !== mockSession.id);
  return [...withoutExisting, mockSession];
};

export const runSessionSummaryPageTester = () => {
  if (!shouldRunSessionSummaryTester()) return;

  const category = CATEGORIES[0];
  const difficulty = DIFFICULTIES[1] ?? DIFFICULTIES[0];

  const playerStore = usePlayerStore.getState();
  const localPlayer = playerStore.getPlayer();

  const mockSession: GameSession = {
    id: "mock-session-summary-multiplayer",
    date: new Date(),
    mode: "multiplayer",
    category,
    difficulty,
    totalQuestions: 10,
    correctAnswers: 7,
    score: 180,
    questions: [],
    userAnswers: [],
    timeTaken: 95,
    mastered: false,
    won: true,
    topThreeFinish: true,
  };

  usePlayerStore.setState({
    player: {
      ...localPlayer,
      totalXp: Math.max(localPlayer.totalXp, 620),
      gameHistory: upsertSessionInHistory(localPlayer.gameHistory, mockSession),
      lastActive: new Date(),
    },
  });

  useMultiplayerStore.setState({
    lobbyRole: "host",
    lobbyId: "mock-lobby",
    hostId: localPlayer.id,
    hostAddress: "127.0.0.1",
    players: [
      {
        id: "player-2",
        name: "Ada",
        avatar: "",
        level: 12,
        rank: localPlayer.rank,
        isReady: true,
        isHost: false,
      },
      {
        id: "player-3",
        name: "Turing",
        avatar: "",
        level: 18,
        rank: localPlayer.rank,
        isReady: true,
        isHost: false,
      },
      {
        id: "player-4",
        name: "Lovelace",
        avatar: "",
        level: 9,
        rank: localPlayer.rank,
        isReady: true,
        isHost: false,
      },
      {
        id: "player-5",
        name: "Shannon",
        avatar: "",
        level: 15,
        rank: localPlayer.rank,
        isReady: true,
        isHost: false,
      },
    ],
    currentPlayerId: localPlayer.id,
  });

  useTriviaStore.setState({
    rankings: [
      { playerId: localPlayer.id, name: localPlayer.name, score: 180, rank: 1 },
      { playerId: "player-2", name: "Ada", score: 140, rank: 2 },
      { playerId: "player-3", name: "Turing", score: 120, rank: 3 },
      { playerId: "player-4", name: "Lovelace", score: 100, rank: 4 },
      { playerId: "player-5", name: "Shannon", score: 90, rank: 5 },
    ],
    playerScores: {
      [localPlayer.id]: 180,
      "player-2": 140,
      "player-3": 120,
      "player-4": 100,
      "player-5": 90,
    },
    score: 180,
    questions: [],
    userAnswers: [],
  });

  useGameStore.setState((state) => ({
    screen: "result",
    gameConfig: {
      ...state.gameConfig,
      mode: "multiplayer",
      category,
      difficulty,
      questionLimit: 10,
      questionTimer: 10,
      answerTimer: 10,
    },
  }));

  console.info("[PageTester] Session Summary tester loaded.");
};
