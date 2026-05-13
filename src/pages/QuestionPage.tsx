import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useTriviaStore, useMultiplayerStore, useGameStore } from "../store";
import { getMultiplayerPlayerId, usePlayerStore } from "../store/playerStore";
import { Clock } from 'pixelarticons/react';
import type { SessionProgressInput } from "src/progression/progressionRules";
import type { MultiplayerBridge, MultiplayerGameState } from "../types/multiplayer";
import type { TriviaState } from "../store";
import { scoreForCorrectAnswers, scoreIncrementForAnswer } from "../rules";
import { defaultGameConfig } from "../config/gameConfig";
import { styled, keyframes } from "@mui/material/styles";
import { useSoundContext } from "../context/SoundContext";
import {
  useRewardSystem,
  RewardOverlay,
  XPBarAnimate,
} from '../components/rewards/RewardSystem';
import { calculateXP, getLevel } from "../utils/progression";
import type { Achievement } from "../types/player";

// ─── Keyframe Animations ────────────────────────────────────────────────────

const neonFlicker = keyframes`
  0%, 100% { opacity: 1; }
  91%       { opacity: 1; }
  92%       { opacity: 0.7; }
  93%       { opacity: 1; }
  95%       { opacity: 0.8; }
  96%       { opacity: 1; }
`;

const fadeSlideDown = keyframes`
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeSlideUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px #00E5FF55, 0 0 16px #00E5FF33, inset 0 0 8px rgba(0,229,255,0.05); }
  50%       { box-shadow: 0 0 14px #00E5FF88, 0 0 28px #00E5FF44, inset 0 0 12px rgba(0,229,255,0.08); }
`;

const timerPulse = keyframes`
  0%, 100% { color: #E5E5E5; }
  50%       { color: #FF6540; }
`;

const buttonHoverGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px #00E5FF55, 0 0 16px #00E5FF22; }
  50%       { box-shadow: 0 0 16px #00E5FFaa, 0 0 32px #00E5FF44; }
`;

const CLUTCH_MIN_ROUNDS = 3;
const CLUTCH_MIN_LEADER_CORRECT_ANSWERS = 4;
const CLUTCH_MIN_SCORE_GAP_CORRECT_ANSWERS = 2;

// ─── Main Screen Container ──────────────────────────────────────────────────

const GameScreen = styled(Box)({
  width: "100%",
  height: "100%",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flexShrink: 0,
  overflow: "hidden",
});

// ─── Top HUD Bar ──────────────────────────────────────────────────────────────

const HudBar = styled(Box)({
  width: "100%",
  boxSizing: "border-box",
  padding: "30px 50px 0", 
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  zIndex: 10,
});

const ProgressText = styled(Typography)({
  fontFamily: "'Courier New', 'Lucida Console', monospace",
  fontSize: "20px",
  fontWeight: 300,
  color: "#B7B7B7",
  letterSpacing: "1px",
  lineHeight: 1,
});

const CategoryLabel = styled(Typography)({
  fontFamily: "'Press Start 2P', 'Courier New', monospace",
  fontSize: "25px",
  color: "#35E52B",
  textShadow: "0 0 8px #3FFF56, 0 0 16px #35E52B66",
  letterSpacing: "2px",
  textAlign: "center",
  animation: `${neonFlicker} 6s ease-in-out infinite`,
  textTransform: "uppercase",
});

const TimerBox = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "15px",
});

const TimerText = styled(Typography)<{ urgent?: boolean }>(({ urgent }) => ({
  fontFamily: "'Courier New', 'Lucida Console', monospace",
  fontSize: "25px",
  fontWeight: 400,
  color: urgent ? "#FF6540" : "#E5E5E5",
  letterSpacing: "1px",
  lineHeight: 1,
  animation: urgent ? `${timerPulse} 0.6s ease-in-out infinite` : "none",
  transition: "color 0.3s ease",
  minWidth: "40px",
  textAlign: "right",
}));

// ─── Question Panel ───────────────────────────────────────────────────────────

const QuestionPanel = styled(Box)({
  marginTop: "30px",
  width: "calc(100% - 83px)",
  maxWidth: "875px",
  minHeight: "170px",
  borderRadius: "15px",
  border: "1.5px solid #00DFFF",
  boxShadow:
    "0 0 12px #00DFFF44, 0 0 28px #00DFFF22, inset 0 0 20px rgba(0,20,40,0.5)",
  background: "rgba(0,5,15,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "28px 40px",
  position: "relative",
  zIndex: 5,
  animation: `${fadeSlideDown} 0.45s ease 0.1s both, ${pulseGlow} 4s ease-in-out infinite`,

  "&::before, &::after": {
    content: '""',
    position: "absolute",
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#00DFFF",
    boxShadow: "0 0 8px #00DFFF",
  },
  "&::before": { top: "10px", left: "10px" },
  "&::after": { top: "10px", right: "10px" },
});

const QuestionText = styled(Typography)({
  fontFamily: "'Press Start 2P', 'Courier New', monospace",
  fontSize: "20px",
  color: "#35E52B",
  textShadow: "0 0 8px #42FF5C, 0 0 20px #35E52B55",
  textAlign: "center",
  lineHeight: 2,
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  wordBreak: "break-word",
});

// ─── Answer Grid ──────────────────────────────────────────────────────────────

const AnswerGrid = styled(Box)({
  marginTop: "50px",
  width: "calc(100% - 75px)",
  maxWidth: "1000px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "25px",
  position: "relative",
  zIndex: 5,
  animation: `${fadeSlideUp} 0.5s ease 0.2s both`,
  flex: "none",
  height: "250px",
  marginBottom: "300px"
});

const ANSWER_LABELS = ["A", "B", "C", "D"];

const AnswerButton = styled(Button, {
  shouldForwardProp: (prop) =>
    prop !== 'selected' && prop !== 'correct' && prop !== 'incorrect' && prop !== 'revealed',
})<{
  selected?: boolean;
  correct?: boolean;
  incorrect?: boolean;
  revealed?: boolean;
}>(({ selected, correct, incorrect, revealed }) => {
  let borderColor = "#00E5FF";
  let bgColor = "rgba(0,5,15,0.7)";
  let textColor = "#35E52B";
  let glowColor = "#00E5FF55";
  let extraGlow = "";

  if (selected && !revealed) {
    borderColor = "#35E52B";
    bgColor = "rgba(0,30,10,0.8)";
    glowColor = "#35E52B88";
    extraGlow = ", 0 0 30px #35E52B33";
  }
  if (correct) {
    borderColor = "#35E52B";
    bgColor = "rgba(0,40,10,0.85)";
    textColor = "#35E52B";
    glowColor = "#35E52Baa";
    extraGlow = ", 0 0 40px #35E52B44";
  }
  if (incorrect) {
    borderColor = "#E33232";
    bgColor = "rgba(30,0,0,0.85)";
    textColor = "#E33232";
    glowColor = "#E3323288";
    extraGlow = ", 0 0 30px #E3323233";
  }

  return {
    fontFamily: "'Press Start 2P', 'Courier New', monospace",
    fontSize: "20px",
    minHeight: "12px",
    padding: "0 25px",
    letterSpacing: "1px",
    color: textColor,
    textShadow: `0 0 5px ${textColor}88`,
    textTransform: "uppercase",
    lineHeight: 1.6,
    border: `1.5px solid ${borderColor}`,
    borderRadius: "8px",
    background: bgColor,
    boxShadow: `0 0 10px ${glowColor}44`,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "12px",
    transition: "all 0.15s ease",
    position: "relative",
    overflow: "hidden",

    "&::after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: "-100%",
      width: "60%",
      height: "100%",
      background:
        "linear-gradient(90deg, transparent, rgba(0,229,255,0.06), transparent)",
      transition: "left 0.35s ease",
    },

    "&:hover": {
      borderColor: "#35E52B",
      background: "rgba(0,25,10,0.85)",
      boxShadow: `0 0 14px #35E52Baa, 0 0 28px #35E52B44`,
      color: "#35E52B",
      textShadow: "0 0 10px #42FF5C",
      animation: `${buttonHoverGlow} 1.2s ease-in-out infinite`,
      "&::after": { left: "160%" },
    },

    "&:disabled": {
      color: textColor,
      borderColor: borderColor,
      background: bgColor,
      boxShadow: `0 0 8px ${glowColor}${extraGlow}`,
    },
  };
});

const AnswerLabel = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'correct' && prop !== 'incorrect',
})<{ correct?: boolean; incorrect?: boolean }>(
  ({ correct, incorrect }) => ({
    fontFamily: "'Press Start 2P', 'Courier New', monospace",
    fontSize: "20px",
    color: correct ? "#35E52B" : incorrect ? "#E33232" : "#00E5FF",
    textShadow: correct
      ? "0 0 8px #35E52B"
      : incorrect
      ? "0 0 8px #E33232"
      : "0 0 8px #00E5FF",
    minWidth: "18px",
    flexShrink: 0,
  })
);

// ─── Bottom Spacer / Phase Hint ───────────────────────────────────────────────

const PhaseBar = styled(Box)({
  width: "100%",
  padding: "0 40px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  zIndex: 5,
  marginTop: "auto",
});

const PhaseHint = styled(Typography)({
  fontFamily: "'Press Start 2P', 'Courier New', monospace",
  fontSize: "20px",
  color: "#35E52B66",
  letterSpacing: "3px",
  textAlign: "center",
  animation: `${neonFlicker} 3s ease-in-out infinite`,
});

// ─── Divider Line ─────────────────────────────────────────────────────────────

const NeonDivider = styled(Box)({
  width: "calc(100% - 80px)",
  height: "1px",
  background:
    "linear-gradient(90deg, transparent, #00E5FF66 20%, #00E5FF 50%, #00E5FF66 80%, transparent)",
  boxShadow: "0 0 6px #00E5FF44",
  margin: "20px 0 0",
  position: "relative",
  zIndex: 5,
});

// ─── Main Component ───────────────────────────────────────────────────────────

const QuestionPage = () => {

  const { playSound } = useSoundContext();
  const {
    questions,
    currentIndex,
    phase,
    selectedAnswer,
    timer,
    answerTimer,
    playerScores,
    rankings,
    questionLimit,
    submitAnswer,
    receiveRemoteAnswer,
    scoreCurrentQuestion,
    finalizeRankings,
    nextPhase,
  } = useTriviaStore();

  const { applySessionProgress } = usePlayerStore();
  const localPlayer = usePlayerStore((state) => state.getPlayer());
  const { lobbyRole, players } = useMultiplayerStore();
  const { setScreen } = useGameStore();
  const mode = useGameStore((state) => state.gameConfig.mode);
  const category = useGameStore((state) => state.gameConfig.category);
  const localPlayerId = mode === "multiplayer" ? getMultiplayerPlayerId(localPlayer.id) : localPlayer.id;

  const multiplayerBridge: MultiplayerBridge | undefined = window.multiplayer;

  // ── Reward System hooks ────────────────────────────────────────────────────
  // FIX 1: Destructure handleLevelUpDone from the hook — do NOT redeclare it below.
  const {
    state: rewardState,
    trigger: triggerReward,
    handleLevelUpDone,
  } = useRewardSystem();
  const answerButtonRef = useRef<HTMLElement>(null);

  // ── Level-up tracking refs ──────────────────────────────────────────────────
  const didLevelUpThisSessionRef = useRef<boolean>(false);
  const levelAfterSessionRef     = useRef<number>(0);

  // ── End-game deferred data (level-up before achievements) ─────────────────
  const endDataRef = useRef<{
  achievements: Achievement[];
  postUnlockScreen: "result" | "multiplayer-results";
} | null>(null);

  // ── Game timer tracking ─────────────────────────────────────────────────────
  const gameStartTimeRef = useRef<number | null>(null);
  const gameElapsedTimeRef = useRef<number>(0);
  const totalSessionTimeRef = useRef<number>(0);
  const totalAnsweredRef = useRef<number>(0);

  useEffect(() => {
    if (phase === 'answering' || phase === 'asking') {
      if (gameStartTimeRef.current === null) {
        gameStartTimeRef.current = Date.now();
      }
    }
  }, [phase]);

  // ── Broadcast helper ────────────────────────────────────────────────────────

  const broadcastMultiplayerState = useCallback(() => {
    if (mode !== "multiplayer" || lobbyRole !== "host") return;
    const state = useTriviaStore.getState();
    multiplayerBridge?.broadcastGameState?.({
      phase: state.phase,
      timer: state.timer,
      currentIndex: state.currentIndex,
      seed: state.seed,
      category: state.category ?? undefined,
      difficulty: state.difficulty ?? undefined,
      questionLimit: state.questionLimit,
      questionTimer: state.questionTimer,
      answerTimer: state.answerTimer,
      playerScores: state.playerScores,
      rankings: state.rankings,
    });
  }, [mode, lobbyRole, multiplayerBridge]);

  // ── Answer handler ──────────────────────────────────────────────────────────

  const handleAnswerClick = useCallback(
    (answer: string) => {
      submitAnswer(answer);

      const currentQuestion = questions[currentIndex];
      if (!currentQuestion) return;

      const isCorrect = answer === currentQuestion.correctAnswer;
      if (!isCorrect) return;

      const timeTaken = 15 - (timer ?? 0);
      totalSessionTimeRef.current += timeTaken;
      totalAnsweredRef.current += 1;

      const finalScore = scoreIncrementForAnswer(
        true,
        useGameStore.getState().gameConfig.difficulty ?? 'easy',
        timer ?? 0,
        answerTimer,
      );
      const xpEarned = calculateXP(finalScore, currentQuestion ? useTriviaStore.getState().currentStreak : 1);
      const oldXP = localPlayer.totalXp;
      const newXP = oldXP + xpEarned;
      const currentOldLevel = localPlayer.level;
      const currentNewLevel = getLevel(newXP);

      // Suppress level-up modal during gameplay by passing the same level for both
      triggerReward({
        score: finalScore,
        xp: xpEarned,
        streak: useTriviaStore.getState().currentStreak,
        oldXP,
        newXP,
        oldLevel: currentNewLevel,
        newLevel: currentNewLevel,
        xpPerLevel: XP_PER_LEVEL,
        buttonRef: answerButtonRef,
      });

      // Track actual level-up in refs for end-of-game handling
      if (currentNewLevel > currentOldLevel) {
        didLevelUpThisSessionRef.current = true;
        levelAfterSessionRef.current     = currentNewLevel;
      }
    },
    [submitAnswer, questions, currentIndex, timer, answerTimer, localPlayer, triggerReward]
  );

  // ── Timer tick ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      phase !== "readying" &&
      phase !== "answering" &&
      phase !== "scoring"
    )
      return;

    if (phase === "answering" && selectedAnswer && mode === "solo") return;

    let timerInterval: number;
    
    const timerTickIntervalMs = 1000;

    if (mode === "solo" || lobbyRole === "host") {
      timerInterval = window.setInterval(() => {
        useTriviaStore.getState().tickTimer();
        if (mode === "multiplayer" && lobbyRole === "host") {
          broadcastMultiplayerState();
        }
      }, timerTickIntervalMs);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [phase, mode, lobbyRole, broadcastMultiplayerState]);

  // ── Multiplayer: receive remote answers ─────────────────────────────────────

  useEffect(() => {
    if (mode !== "multiplayer" || lobbyRole !== "host" || !multiplayerBridge)
      return;

    const handleAnswerSubmission = (payload: {
      lobbyId: string;
      playerId: string;
      questionIndex: number;
      answer: string;
      remainingTime?: number;
    }) => {
      if (payload.questionIndex !== currentIndex) return;
      receiveRemoteAnswer(payload.playerId, payload.questionIndex, payload.answer, payload.remainingTime);
    };

    multiplayerBridge.onAnswerSubmission?.("QuestionPage", handleAnswerSubmission);
    return () => {
      multiplayerBridge.offAnswerSubmission?.("QuestionPage");
    };
  }, [mode, lobbyRole, multiplayerBridge, currentIndex, receiveRemoteAnswer]);

  // ── Multiplayer: score current question (host) ──────────────────────────────

  const hasScoredRef = useRef(false);

  useEffect(() => {
    if (hasScoredRef.current) return;
    if (phase === "scoring" && mode === "multiplayer" && lobbyRole === "host") {
      hasScoredRef.current = true;
      scoreCurrentQuestion();
      finalizeRankings();
      broadcastMultiplayerState();
    }
  }, [phase, mode, lobbyRole, multiplayerBridge, scoreCurrentQuestion, finalizeRankings, broadcastMultiplayerState]);

  useEffect(() => {
    if (phase !== "scoring") hasScoredRef.current = false;
  }, [phase]);

  // ── Multiplayer: broadcast on state changes ─────────────────────────────────

  useEffect(() => {
    if (mode !== "multiplayer" || lobbyRole !== "host") return;
    broadcastMultiplayerState();
  }, [mode, lobbyRole, phase, timer, currentIndex, playerScores, rankings, broadcastMultiplayerState]);

  // ── Multiplayer: sync state (client) ───────────────────────────────────────

  useEffect(() => {
    if (mode !== "multiplayer" || lobbyRole !== "client" || !multiplayerBridge)
      return;

    const handleGameStateSync = (payload: MultiplayerGameState) => {
      const currentState = useTriviaStore.getState();
      const shouldResetSelectedAnswer =
        payload.currentIndex !== currentState.currentIndex;

      const nextState: Partial<TriviaState> = {
        phase: payload.phase,
        timer: payload.timer,
        currentIndex: payload.currentIndex,
        ...(payload.seed !== undefined ? { seed: payload.seed } : {}),
        ...(payload.category !== undefined ? { category: payload.category ?? undefined } : {}),
        ...(payload.difficulty !== undefined ? { difficulty: payload.difficulty ?? undefined } : {}),
        ...(payload.questionLimit !== undefined ? { questionLimit: payload.questionLimit } : {}),
        ...(payload.questionTimer !== undefined ? { questionTimer: payload.questionTimer } : {}),
        ...(payload.answerTimer !== undefined ? { answerTimer: payload.answerTimer } : {}),
        ...(payload.playerScores !== undefined ? { playerScores: payload.playerScores } : {}),
        ...(payload.rankings !== undefined ? { rankings: payload.rankings } : {}),
      };

      if (shouldResetSelectedAnswer) nextState.selectedAnswer = "";
      useTriviaStore.setState(nextState);
    };

    multiplayerBridge.onGameStateSync("QuestionPage", handleGameStateSync);
    return () => {
      multiplayerBridge.offGameStateSync?.("QuestionPage");
    };
  }, [mode, lobbyRole, multiplayerBridge]);

  // ── Phase transitions ───────────────────────────────────────────────────────

  useEffect(() => {
    if (phase === "ranking") {
      nextPhase();
    }
  }, [phase, nextPhase]);

  // ── Apply session progress at end ──────────────────────────────────────────

  const endProgressAppliedRef = useRef(false);
  const fellBehindByHalfRef = useRef(false);

  useEffect(() => {
    if (phase === "readying" && currentIndex === 0) {
      fellBehindByHalfRef.current = false;
      totalSessionTimeRef.current = 0;
      totalAnsweredRef.current = 0;
      didLevelUpThisSessionRef.current = false;
      levelAfterSessionRef.current     = 0;
    }
  }, [phase, currentIndex]);

  useEffect(() => {
    if (mode !== "multiplayer") return;

    if (currentIndex < CLUTCH_MIN_ROUNDS) return;

    const scoreValues = Object.values(playerScores);
    if (scoreValues.length === 0) return;

    const highestScore = Math.max(...scoreValues);
    if (highestScore <= 0) return;

    const localScore = playerScores[localPlayerId] ?? 0;
    const baseScore = defaultGameConfig.baseScore;
    const minLeaderScore = CLUTCH_MIN_LEADER_CORRECT_ANSWERS * baseScore;
    const minScoreGap = CLUTCH_MIN_SCORE_GAP_CORRECT_ANSWERS * baseScore;
    const scoreGap = highestScore - localScore;

    if (
      highestScore >= minLeaderScore &&
      scoreGap >= minScoreGap &&
      localScore <= highestScore * 0.5
    ) {
      fellBehindByHalfRef.current = true;
    }
  }, [mode, playerScores, localPlayerId, currentIndex]);

  // ── Step 1: Process game end data (XP, achievements) ───────────────────────
 useEffect(() => {
   if (phase !== "end" || endProgressAppliedRef.current) return;
endProgressAppliedRef.current = true;

const gameConfig = useGameStore.getState().gameConfig;
const { mode, category, difficulty } = gameConfig || {};
if (!mode || !category || !difficulty) return;

if (mode === "multiplayer") {
  finalizeRankings(); // ensures clients have rankings before reading them below
}

const triviaState = useTriviaStore.getState();
const userAnswers = triviaState.userAnswers;
const questionsState = triviaState.questions;
    const correctAnswersCount = questionsState.filter(
      (q, index) => q.correctAnswer === userAnswers[index]
    ).length;

    const fallbackScore = scoreForCorrectAnswers(correctAnswersCount);
    const rankingEntry = triviaState.rankings.find(
      (entry) => entry.playerId === localPlayerId
    );
    const triviaPlayerScores = triviaState.playerScores;
    const currentPlayerScore =
      mode === "multiplayer"
        ? rankingEntry?.score ?? triviaPlayerScores[localPlayerId] ?? fallbackScore
        : fallbackScore;

    const playerRank =
      mode === "multiplayer"
        ? rankingEntry?.rank ??
          1 + Object.values(triviaPlayerScores).filter((s) => s > currentPlayerScore).length
        : 0;

    const elapsedMs = gameStartTimeRef.current 
      ? Date.now() - gameStartTimeRef.current 
      : 0;
    const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));
    gameElapsedTimeRef.current = elapsedSeconds;

    const avgTime =
      totalAnsweredRef.current > 0
        ? Math.round(
            (totalSessionTimeRef.current /
             totalAnsweredRef.current) * 10
          ) / 10
        : 0.0;
    useTriviaStore.setState({ avgTime });

    const postUnlockScreen: "result" | "multiplayer-results" = mode === "multiplayer" ? "multiplayer-results" : "result";

    const progressionInput: SessionProgressInput = {
      mode,
      category,
      difficulty,
      totalQuestions: questionsState.length,
      correctAnswers: correctAnswersCount,
      score: currentPlayerScore,
      maxStreak: triviaState.maxStreak,
      questions: questionsState,
      userAnswers,
      timeTaken: elapsedSeconds,
      mastered: correctAnswersCount === questionsState.length,
      won: mode === "multiplayer" ? playerRank === 1 : false,
      topThreeFinish: mode === "multiplayer" ? playerRank <= 3 : false,
      hostedLobby: mode === "multiplayer" && lobbyRole === "host",
      fellBehindByHalfAndWon: mode === "multiplayer" && playerRank === 1 && fellBehindByHalfRef.current,
    };

    const newlyUnlockedAchievements = applySessionProgress(progressionInput);

    if (didLevelUpThisSessionRef.current) {
      // Level-up happened — show it first, queue achievements for after
      endDataRef.current = {
        achievements: newlyUnlockedAchievements,
        postUnlockScreen,
      };

      triggerReward({
        score: 0,
        xp: 0,
        streak: 0,
        oldXP: 0,
        newXP: 0,
        oldLevel: levelAfterSessionRef.current - 1,
        newLevel: levelAfterSessionRef.current,
        xpPerLevel: XP_PER_LEVEL,
      });
      // handleLevelUpDone (from the hook) handles the post-level-up flow
    } else if (newlyUnlockedAchievements.length > 0) {
      const gameState = useGameStore.getState();
      gameState.queueAchievementUnlocks(newlyUnlockedAchievements, postUnlockScreen);
      gameState.setScreen("achievement-unlock");
    } else {
      setScreen(postUnlockScreen);
    }
  }, [phase, applySessionProgress, localPlayerId, lobbyRole, setScreen, triggerReward, finalizeRankings]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const currentQuestion = questions[currentIndex];
  const previousXP = localPlayer.totalXp;
  const xpEarned = rewardState.data?.xp ?? 0;
  const currentLevel = localPlayer.level;

  // NOTE: displayedRankings is kept for potential future use but the overlay
  // has been removed per requirements (no ranking shown after each question).
  const displayedRankings = useMemo(() => {
    const byPlayerId = new Map<string, { playerId: string; name: string; score: number }>();

    rankings.forEach((entry) => {
      byPlayerId.set(entry.playerId, { playerId: entry.playerId, name: entry.name, score: entry.score });
    });
    players.forEach((player) => {
      if (!byPlayerId.has(player.id)) {
        byPlayerId.set(player.id, { playerId: player.id, name: player.name, score: playerScores[player.id] ?? 0 });
      }
    });
    if (!byPlayerId.has(localPlayer.id)) {
      byPlayerId.set(localPlayer.id, { playerId: localPlayer.id, name: localPlayer.name, score: playerScores[localPlayer.id] ?? 0 });
    }

    return Array.from(byPlayerId.values())
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [rankings, players, playerScores, localPlayer.id, localPlayer.name]);

  // ── Answer state helpers ────────────────────────────────────────────────────

  const isRevealed = phase === "scoring";
  const correctAnswer = currentQuestion?.correctAnswer;

  const getAnswerState = (answer: string) => {
    const isSelected = selectedAnswer === answer;
    const isCorrect = isRevealed && answer === correctAnswer;
    const isIncorrect = isRevealed && isSelected && answer !== correctAnswer;
    return { isSelected, isCorrect, isIncorrect };
  };

  const isAnswered = !!selectedAnswer || phase === "scoring";
  const isUrgent = timer !== undefined && timer <= 5;
  const currentHint =
    phase === "readying"
      ? "Get ready..."
      : phase === "answering" || phase === "asking"
      ? !selectedAnswer
        ? "Choose your answer"
        : "Answer submitted"
      : phase === "scoring"
      ? "Reviewing results"
      : undefined;

  // ─────────────────────────────────────────────────────────────────────────────

  if (!currentQuestion) {
    return (
      <GameScreen>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            zIndex: 5,
          }}
        >
          <Typography
            sx={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "20px",
              color: "#35E52B",
              textShadow: "0 0 8px #42FF5C",
              letterSpacing: "3px",
            }}
          >
            LOADING...
          </Typography>
        </Box>
      </GameScreen>
    );
  }

  return (
    <GameScreen>
      {/* ── TOP HUD ──────────────────────────────────────────────────────── */}
      <HudBar>
        {/* Progress: 1/15 */}
        <ProgressText>
          {currentIndex + 1}/{questionLimit}
        </ProgressText>

        {/* Category */}
        <CategoryLabel>
          {category ?? "TRIVIA"}
        </CategoryLabel>

        {/* Timer */}
        <TimerBox>
          <Clock
            style={{
              width: 16,
              height: 16,
              color: "#DADADA",
              flexShrink: 0,
            }}
          />
          <TimerText urgent={isUrgent}>
            {phase === 'asking' || phase === 'readying' 
              ? "--" 
              : timer !== undefined ? `${Math.ceil(timer)}s` : "--"}
          </TimerText>
        </TimerBox>
      </HudBar>

      {/* ── XP BAR ──────────────────────────────────────────────────────── */}
      <Box sx={{ width: 'calc(100% - 100px)', px: 6, py: 1 }}>
        <XPBarAnimate
          oldXP={previousXP}
          newXP={previousXP + xpEarned}
          xpPerLevel={1000}
          level={currentLevel}
          animate={rewardState.showXPBar}
        />
      </Box>

      {/* Divider */}
      <NeonDivider />

      {/* ── QUESTION PANEL ────────────────────────────────────────────────── */}
      <QuestionPanel>
        <QuestionText>{currentQuestion.text}</QuestionText>
      </QuestionPanel>

      {phase === 'readying' && (
        <Box sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)',
        }}>
          <Typography sx={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '40px',
            color: '#35E52B',
            textShadow: '0 0 16px #42FF5C',
            marginBottom: '24px',
          }}>
            GET READY
          </Typography>
          <Typography sx={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '80px',
            color: '#00E5FF',
            textShadow: '0 0 24px #00E5FF',
          }}>
            {Math.ceil(timer)}
          </Typography>
        </Box>
      )}

      {/* ── ANSWER GRID ───────────────────────────────────────────────────── */}
      <AnswerGrid>
        {currentQuestion.allAnswers.map((answer: string, idx: number) => {
          const { isSelected, isCorrect, isIncorrect } = getAnswerState(answer);
          return (
            <AnswerButton
              key={answer}
              ref={isSelected ? (answerButtonRef as any) : undefined}
              onClick={() => { if (!isAnswered) { handleAnswerClick(answer); playSound("select"); } }}
              onMouseEnter={() => { if (!isAnswered) playSound("hover"); }}
              disabled={isAnswered}
              selected={isSelected && !isRevealed}
              correct={isCorrect}
              incorrect={isIncorrect}
              disableRipple={false}
            >
              <AnswerLabel correct={isCorrect} incorrect={isIncorrect}>
                {ANSWER_LABELS[idx]}.
              </AnswerLabel>
              {answer}
            </AnswerButton>
          );
        })}
      </AnswerGrid>

      <PhaseBar>
        {currentHint && <PhaseHint>{currentHint}</PhaseHint>}
      </PhaseBar>

      {/* ── REWARD OVERLAY ───────────────────────────────────────────────── */}
      <RewardOverlay
        rewardState={rewardState}
        onLevelUpDone={handleLevelUpDone}
        xpPerLevel={1000}
      />
    </GameScreen>
  );
};

export default QuestionPage;
