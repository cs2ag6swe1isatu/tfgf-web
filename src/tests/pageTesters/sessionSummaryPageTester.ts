import { evaluateUnlocks } from "../../progression/achievementRules";
import { buildSessionDelta, levelFromXp, rankFromLevel, xpToNextLevel } from "../../progression/progressionRules";
import { PlayerState, getPlayerFromStorage, savePlayerToStorage, trimGameHistory, createEmptyPlayData, getPlayerStorage, PLAYER_STORAGE_KEY } from "../../store/playerStore";
import { createId } from "../../utils/uuid";
import { create } from "zustand";
import { CATEGORIES, Category, DIFFICULTIES, Difficulty, getRankForLevel, Mode, MODES } from "../../constants";
import { useGameStore, useMultiplayerStore, useTriviaStore } from "../../store";
import type { Achievement, GameSession, PlayData, Player } from "../../types/player";

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
    correctAnswers: 10,
    score: 180,
    questions: [],
    userAnswers: [],
    timeTaken: 95,
    mastered: false,
    won: true,
    topThreeFinish: true,
    questionsAnswered: 0,
    incorrectAnswers: 0
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
export const usePlayerStore = create<PlayerState>((set, get) => ({
  player: null,

  generatePlayer: () => {
    // Try to load existing player from storage
    const existingPlayer = getPlayerFromStorage();
    if (existingPlayer) {
      set({ player: existingPlayer });
      return existingPlayer;
    }

    // Create new player if none exists
    const newPlayer: Player = {
      id: createId(),
      name: "Player 1",
      avatar: "",
      totalXp: 0,
      xpToNextLevel: 100,
      gameHistory: [],
      achievements: [],
      level: 1,
      rank: getRankForLevel(1),
      totalScore: 0,
      topScore: 0,
      soloGamesPlayed: 0,
      multiplayerGamesPlayed: 0,
      gamesMastered: 0,
      gamesWon: 0,
      topThreeFinishes: 0,
      totalQuestionsAnswered: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      lastActive: new Date(),
      individualStats: Object.values(CATEGORIES).reduce((acc, category) => {
        acc[category] = Object.values(MODES).reduce((acc2, mode) => {
          acc2[mode] = Object.values(DIFFICULTIES).reduce((acc3, difficulty) => {
            acc3[difficulty] = {
              xpGained: 0,
              scoreGained: 0,
              gamesPlayed: 0,
              gamesMastered: 0,
              topThreeFinishes: 0,
              gamesWon: 0,
              totalQuestionsAnswered: 0,
              correctAnswers: 0,
              incorrectAnswers: 0,
              averageTimePerQuestion: 0,
            };
            return acc3;
          }, {} as Record<Difficulty, PlayData>);
          return acc2;
        }, {} as Record<Mode, Record<Difficulty, PlayData>>);
        return acc;
      }, {} as Record<Category, Record<Mode, Record<Difficulty, PlayData>>>),
      totalTimePlayed: 0,
      averageTimePerQuestion: 0,
      playData: createEmptyPlayData()
    };

    // Save to storage
    savePlayerToStorage(newPlayer);
    set({ player: newPlayer });
    return newPlayer;
  },

  getPlayer: () => {
    const currentPlayer = get().player;
    if (currentPlayer) return currentPlayer;

    // Try to load from storage first, then generate if needed
    const storedPlayer = getPlayerFromStorage();
    if (storedPlayer) {
      set({ player: storedPlayer });
      return storedPlayer;
    }

    return get().generatePlayer();
  },
  saveGameToHistory: (gameData) => {
    const player = get().getPlayer();

    const newEntry: GameSession = {
      id: createId(),
      date: new Date(),
      ...gameData,
    };

    const nextGameHistory = trimGameHistory([...player.gameHistory, newEntry]);

    const updatedPlayer: Player = {
      ...player,
      gameHistory: nextGameHistory,
      lastActive: new Date(),
    };

    savePlayerToStorage(updatedPlayer);
    set({ player: updatedPlayer });
  },
  applySessionProgress: (sessionInput) => {
    const player = get().getPlayer();
    const delta = buildSessionDelta(sessionInput);

    const nextTotalXp = player.totalXp + delta.xpGained;
    const nextLevel = levelFromXp(nextTotalXp);
    const nextRank = rankFromLevel(nextLevel);

    const categoryStats = player.individualStats?.[sessionInput.category];
    const modeStats = categoryStats?.[sessionInput.mode];
    const currentIndividualStats = modeStats?.[sessionInput.difficulty] ?? createEmptyPlayData();
    const nextIndividualStats: PlayData = {
      ...currentIndividualStats,
      xpGained: currentIndividualStats.xpGained + delta.xpGained,
      scoreGained: currentIndividualStats.scoreGained + delta.scoreGained,
      gamesPlayed: currentIndividualStats.gamesPlayed + delta.gamesPlayed,
      gamesMastered: currentIndividualStats.gamesMastered + delta.gamesMastered,
      topThreeFinishes: currentIndividualStats.topThreeFinishes + delta.topThreeFinishes,
      gamesWon: currentIndividualStats.gamesWon + delta.gamesWon,
      totalQuestionsAnswered: currentIndividualStats.totalQuestionsAnswered + delta.totalQuestionsAnswered,
      correctAnswers: currentIndividualStats.correctAnswers + delta.correctAnswers,
      incorrectAnswers: currentIndividualStats.incorrectAnswers + delta.incorrectAnswers,
    };

    const nextTotalQuestionsAnswered = player.totalQuestionsAnswered + delta.totalQuestionsAnswered;
    const previousTotalAnswerTime = (player.averageTimePerQuestion ?? 0) * player.totalQuestionsAnswered;
    const sessionAverageTime = delta.averageTimePerQuestion ??
      (sessionInput.totalQuestions > 0 ? sessionInput.timeTaken / sessionInput.totalQuestions : undefined);
    const sessionTotalAnswerTime = (sessionAverageTime ?? 0) * delta.totalQuestionsAnswered;
    const nextAverageTimePerQuestion = nextTotalQuestionsAnswered > 0
      ? (previousTotalAnswerTime + sessionTotalAnswerTime) / nextTotalQuestionsAnswered
      : undefined;

    const newHistoryEntry: GameSession = {
      id: createId(),
      date: new Date(),
      mode: sessionInput.mode,
      category: sessionInput.category,
      difficulty: sessionInput.difficulty,
      totalQuestions: sessionInput.totalQuestions,
      correctAnswers: sessionInput.correctAnswers,
      score: sessionInput.score,
      questions: sessionInput.questions,
      userAnswers: sessionInput.userAnswers,
      timeTaken: sessionInput.timeTaken,
      timePerQuestion: sessionInput.timePerQuestion,
      mastered: sessionInput.mastered,
      won: sessionInput.won,
      topThreeFinish: sessionInput.topThreeFinish,
      questionsAnswered: 0,
      incorrectAnswers: 0
    };

    const nextGameHistory = trimGameHistory([...player.gameHistory, newHistoryEntry]);

    const updatedPlayer: Player = {
      ...player,
      totalXp: nextTotalXp,
      xpToNextLevel: xpToNextLevel(nextTotalXp),
      level: nextLevel,
      rank: nextRank,
      totalScore: player.totalScore + delta.scoreGained,
      topScore: Math.max(player.topScore, sessionInput.score),
      soloGamesPlayed: player.soloGamesPlayed + (sessionInput.mode === 'solo' ? delta.gamesPlayed : 0),
      multiplayerGamesPlayed: player.multiplayerGamesPlayed + (sessionInput.mode === 'multiplayer' ? delta.gamesPlayed : 0),
      gamesMastered: player.gamesMastered + delta.gamesMastered,
      gamesWon: player.gamesWon + delta.gamesWon,
      topThreeFinishes: player.topThreeFinishes + delta.topThreeFinishes,
      totalQuestionsAnswered: nextTotalQuestionsAnswered,
      correctAnswers: player.correctAnswers + delta.correctAnswers,
      incorrectAnswers: player.incorrectAnswers + delta.incorrectAnswers,
      averageTimePerQuestion: nextAverageTimePerQuestion ?? 0,
      lastActive: new Date(),
      gameHistory: nextGameHistory,
      individualStats: {
        ...player.individualStats,
        [sessionInput.category]: {
          ...categoryStats,
          [sessionInput.mode]: {
            ...modeStats,
            [sessionInput.difficulty]: nextIndividualStats,
          },
        },
      },
    };

    const unlocks = evaluateUnlocks(updatedPlayer, sessionInput);
    // Only add fully unlocked achievements (progress === 100) to the player's achievements list.
    const newlyUnlocked = unlocks.filter((u) => u.progress === 100);
    const achievements = [...updatedPlayer.achievements, ...newlyUnlocked].filter((item): item is Achievement => item !== null && item !== undefined);

    const finalPlayer = { ...updatedPlayer, achievements };

    savePlayerToStorage(finalPlayer);
    set({ player: finalPlayer });
  },
  setAvatar: (avatar: string) => {
    try {
      const player = get().getPlayer();
      const updatedPlayer: Player = { ...player, avatar, lastActive: new Date() };
      savePlayerToStorage(updatedPlayer);
      set({ player: updatedPlayer });
    } catch (error) {
      console.warn("Failed to set avatar:", error);
    }
  },

  setPlayerName: (name: string) => {
    try {
      const player = get().getPlayer();
      const updatedPlayer: Player = { ...player, name, lastActive: new Date() };
      savePlayerToStorage(updatedPlayer);
      set({ player: updatedPlayer });
    } catch (error) {
      console.warn("Failed to set player name:", error);
    }
  },

  resetPlayer: () => {
    try {
      const storage = getPlayerStorage();
      storage?.removeItem(PLAYER_STORAGE_KEY);
      set({ player: null });
    } catch (error) {
      console.warn("Failed to reset player:", error);
    }
  }
  // Inside your playerStore.ts create() function:
  ,

  // Inside your playerStore.ts create() function:
  updatePlayer: (updates) => set((state) => ({
    player: {
      ...state.player, // Keep the old data
      ...updates // Overwrite with the new data (like the new avatar)
    }
  })),
}));
