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

// ─── Responsive Scale Wrapper ─────────────────────────────────────────────────

const ScaleWrapper = styled(Box)({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  background: "#000",
});

// ─── Main Screen Container ──────────────────────────────────────────────────

const GameScreen = styled(Box)({
  width: "100%",
  height: "100%",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flexShrink: 0,
  transformOrigin: "center center",
  margin: "auto",

  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    background:
      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
    pointerEvents: "none",
    zIndex: 20,
  },

  "&::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    height: "80px",
    background:
      "linear-gradient(transparent, rgba(0,229,255,0.025) 50%, transparent)",
    animation: `${fadeSlideDown} 8s linear infinite`,
    pointerEvents: "none",
    zIndex: 21,
  },

  "& > .vignette": {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.7) 100%)",
    pointerEvents: "none",
    zIndex: 19,
  },
  overflow: "hidden",
});

// ─── Top HUD Bar ──────────────────────────────────────────────────────────────

const HudBar = styled(Box)({
  width: "100%",
  boxSizing: "border-box",
  padding: "16px 50px 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  zIndex: 10,
});

const ProgressText = styled(Typography)({
  fontFamily: "'Courier New', 'Lucida Console', monospace",
  fontSize: "16px",
  fontWeight: 300,
  color: "#B7B7B7",
  letterSpacing: "1px",
  lineHeight: 1,
});

const CategoryLabel = styled(Typography)({
  fontFamily: "'Press Start 2P', 'Courier New', monospace",
  fontSize: "16px",
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
  gap: "10px",
});

const TimerText = styled(Typography)<{ urgent?: boolean }>(({ urgent }) => ({
  fontFamily: "'Courier New', 'Lucida Console', monospace",
  fontSize: "18px",
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
  marginTop: "16px",
  width: "calc(100% - 83px)",
  maxWidth: "875px",
  height: "140px",
  borderRadius: "15px",
  border: "1.5px solid #00DFFF",
  boxShadow:
    "0 0 12px #00DFFF44, 0 0 28px #00DFFF22, inset 0 0 20px rgba(0,20,40,0.5)",
  background: "rgba(0,5,15,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px 32px",
  boxSizing: "border-box",
  position: "relative",
  zIndex: 5,
  animation: `${fadeSlideDown} 0.45s ease 0.1s both, ${pulseGlow} 4s ease-in-out infinite`,
  overflowY: "auto",

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
  fontSize: "15px",
  color: "#35E52B",
  textShadow: "0 0 8px #42FF5C, 0 0 20px #35E52B55",
  textAlign: "center",
  lineHeight: 1.8,
  letterSpacing: "1px",
  textTransform: "uppercase",
  wordBreak: "break-word",
});

// ─── Answer Grid ──────────────────────────────────────────────────────────────

const AnswerGrid = styled(Box)({
  marginTop: "20px",
  width: "calc(100% - 75px)",
  maxWidth: "1000px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gridTemplateRows: "1fr 1fr",
  gap: "16px",
  position: "relative",
  zIndex: 5,
  animation: `${fadeSlideUp} 0.5s ease 0.2s both`,
  flex: 1,
  minHeight: 0,
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
}>(({ selected, correct, incorrect }) => {
  let borderColor = "#00E5FF";
  let bgColor = "rgba(0,5,15,0.7)";
  let textColor = "#35E52B";
  let glowColor = "#00E5FF55";
  let extraGlow = "";

  if (selected && !correct && !incorrect) {
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
    fontSize: "15px",
    width: "100%",
    height: "100%",
    padding: "0 20px",
    letterSpacing: "1px",
    color: textColor,
    textShadow: `0 0 5px ${textColor}88`,
    textTransform: "uppercase",
    lineHeight: 1.5,
    border: `1.5px solid ${borderColor}`,
    borderRadius: "8px",
    background: bgColor,
    boxShadow: `0 0 10px ${glowColor}44${extraGlow}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "12px",
    transition: "all 0.15s ease",
    position: "relative",
    overflow: "hidden",
    whiteSpace: "normal",
    wordBreak: "break-word",

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
    fontSize: "15px",
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

// ─── Ranking Overlay ──────────────────────────────────────────────────────────

const RankingOverlay = styled(Box)({
  position: "absolute",
  inset: 0,
  zIndex: 30,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(1,7,7,0.92)",
  animation: `${fadeIn} 0.3s ease both`,
});

const RankingPanel = styled(Box)({
  width: "560px",
  border: "1.5px solid #00DFFF",
  borderRadius: "12px",
  background: "rgba(0,5,20,0.95)",
  boxShadow: "0 0 24px #00DFFF44, 0 0 48px #00DFFF22",
  padding: "28px 32px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
});

const RankingTitle = styled(Typography)({
  fontFamily: "'Press Start 2P', 'Courier New', monospace",
  fontSize: "25px",
  color: "#35E52B",
  textShadow: "0 0 8px #42FF5C",
  textAlign: "center",
  marginBottom: "8px",
  letterSpacing: "3px",
});

const RankingRow = styled(Box)<{ isLocal?: boolean }>(({ isLocal }) => ({
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "10px 14px",
  borderRadius: "6px",
  background: isLocal ? "rgba(0,229,255,0.08)" : "transparent",
  border: isLocal ? "1px solid #00E5FF44" : "1px solid transparent",
}));

const RankNumber = styled(Typography)({
  fontFamily: "'Press Start 2P', 'Courier New', monospace",
  fontSize: "25px",
  color: "#00E5FF",
  textShadow: "0 0 6px #00E5FF",
  minWidth: "24px",
  textAlign: "center",
});

const RankName = styled(Typography)({
  fontFamily: "'Courier New', monospace",
  fontSize: "25px",
  color: "#DADADA",
  flex: 1,
  letterSpacing: "1px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const RankScore = styled(Typography)({
  fontFamily: "'Press Start 2P', 'Courier New', monospace",
  fontSize: "25px",
  color: "#35E52B",
  textShadow: "0 0 6px #35E52B",
});

// ─── Bottom Phase Bar ─────────────────────────────────────────────────────────

const PhaseBar = styled(Box)({
  width: "100%",
  padding: "10px 40px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  zIndex: 5,
  flexShrink: 0,
});

const PhaseHint = styled(Typography)({
  fontFamily: "'Press Start 2P', 'Courier New', monospace",
  fontSize: "11px",
  color: "#35E52B66",
  letterSpacing: "3px",
  textAlign: "center",
  animation: `${neonFlicker} 3s ease-in-out infinite`,
});

// ─── Divider ──────────────────────────────────────────────────────────────────

const NeonDivider = styled(Box)({
  width: "calc(100% - 80px)",
  height: "1px",
  background:
    "linear-gradient(90deg, transparent, #00E5FF66 20%, #00E5FF 50%, #00E5FF66 80%, transparent)",
  boxShadow: "0 0 6px #00E5FF44",
  margin: "12px 0 0",
  position: "relative",
  zIndex: 5,
  flexShrink: 0,
});

// ─── Responsive scale helper ──────────────────────────────────────────────────

function useResponsiveScale(): string {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const targetW = 1024;
      const targetH = 768;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const scaleX = winW / targetW;
      const scaleY = winH / targetH;
      const factor = Math.min(scaleX, scaleY) * 0.94;
      setScale(factor);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return `scale(${scale})`;
}

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
  const { setScreen, recordSessionStartLevel, recordSessionEndLevel, queueAchievementUnlocks } = useGameStore();
  const mode = useGameStore((state) => state.gameConfig.mode);
  const category = useGameStore((state) => state.gameConfig.category);
  const localPlayerId = mode === "multiplayer" ? getMultiplayerPlayerId(localPlayer.id) : localPlayer.id;

  const multiplayerBridge: MultiplayerBridge | undefined = window.multiplayer;

  // ── Reward System hooks ────────────────────────────────────────────────────
  const {
    state: rewardState,
    trigger: triggerReward,
    handleLevelUpDone,
  } = useRewardSystem();
  const answerButtonRef = useRef<HTMLElement>(null);

  // ── Session XP accumulator (ref — does not trigger re-renders) ────────────
  const sessionXpRef = useRef(0);
  // ── Level-up tracking refs ──────────────────────────────────────────────────
  const didLevelUpThisSessionRef = useRef<boolean>(false);
  const levelAfterSessionRef     = useRef<number>(0);

  // ── End-game deferred data (level-up before achievements) ─────────────────
  const endDataRef = useRef<{
    achievements: Achievement[];
    postUnlockScreen: "result" | "multiplayer-results";
  } | null>(null);

  // ── Game timer tracking ────────────────────────────────────────────────────
  const gameStartTimeRef = useRef<number | null>(null);
  const totalSessionTimeRef = useRef<number>(0);
  const totalAnsweredRef = useRef<number>(0);

  // ── Guard: prevents the end-of-game handler running more than once ─────────
  const endProgressAppliedRef = useRef(false);

  const fellBehindByHalfRef = useRef(false);

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

      const streakAfterThisAnswer = useTriviaStore.getState().currentStreak + 1;
      const xpEarned = calculateXP(finalScore, streakAfterThisAnswer);

      sessionXpRef.current += xpEarned;

      const persistedTotalXp = usePlayerStore.getState().getPlayer().totalXp;
      const oldXP = persistedTotalXp + (sessionXpRef.current - xpEarned);
      const newXP = persistedTotalXp + sessionXpRef.current;

      const visualLevel = getLevel(newXP);

      triggerReward({
        score: finalScore,
        xp: xpEarned,
        streak: streakAfterThisAnswer,
        oldXP,
        newXP,
        oldLevel: visualLevel,
        newLevel: visualLevel,
        xpPerLevel: 1000,
        buttonRef: answerButtonRef,
      });
    },
    [submitAnswer, questions, currentIndex, timer, answerTimer, triggerReward]
  );

  // ── Timer tick ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      phase !== "readying" &&
      phase !== "answering" &&
      phase !== "scoring"
    )
      return;

    if (phase === "answering" && mode === "solo" && selectedAnswer) return;
    

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

  // ── Multiplayer: auto-advance when all players have answered ────────────────
useEffect(() => {
  if (mode !== "multiplayer" || lobbyRole !== "host") return;
  if (phase !== "answering") return;

  const totalPlayers = players.length;
  if (totalPlayers === 0) return;

  const state = useTriviaStore.getState();
  const answersForQuestion = state.playerScores?.[currentIndex] ?? {};
  const remoteAnswerCount = Object.keys(answersForQuestion).length;

  // Count local player's answer too
  const localHasAnswered = !!selectedAnswer;
  const totalAnswered = remoteAnswerCount + (localHasAnswered ? 1 : 0);

  if (totalAnswered >= totalPlayers) {
    // Everyone answered — skip remaining timer and go to scoring
    nextPhase();
    broadcastMultiplayerState();
  }
}, [mode, lobbyRole, phase, players.length, selectedAnswer, currentIndex,
    nextPhase, broadcastMultiplayerState]);

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

  // ── Reset all session refs at game start ────────────────────────────────────

  useEffect(() => {
    if (phase === "readying" && currentIndex === 0) {
      fellBehindByHalfRef.current = false;
      totalSessionTimeRef.current = 0;
      totalAnsweredRef.current = 0;
      sessionXpRef.current = 0;
      endProgressAppliedRef.current = false;
      gameStartTimeRef.current = null;

      recordSessionStartLevel();
      didLevelUpThisSessionRef.current = false;
      levelAfterSessionRef.current     = 0;
    }
  }, [phase, currentIndex, recordSessionStartLevel]);

  useEffect(() => {
    if (phase === "answering" && currentIndex === 0 && sessionXpRef.current === 0) {
      if (gameStartTimeRef.current === null) {
        gameStartTimeRef.current = Date.now();
      }
      if (!endProgressAppliedRef.current) {
        recordSessionStartLevel();
      }
    }
  }, [phase, currentIndex, recordSessionStartLevel]);

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

  // ── End-of-game handler ─────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "end" || endProgressAppliedRef.current) return;
    endProgressAppliedRef.current = true;

    const gameConfig = useGameStore.getState().gameConfig;
    const { mode: cfgMode, category: cfgCategory, difficulty: cfgDifficulty } = gameConfig;

    if (!cfgMode || !cfgCategory || !cfgDifficulty) {
      console.error("[QuestionPage] Missing game config at end of session:", gameConfig);
      setScreen("result");
      return;
    }

    const triviaState = useTriviaStore.getState();
    const { userAnswers: finalUserAnswers, questions: finalQuestions, rankings: finalRankings, playerScores: finalPlayerScores, maxStreak } = triviaState;

    const correctAnswersCount = finalQuestions.filter(
      (q, index) => q.correctAnswer === finalUserAnswers[index]
    ).length;

    const fallbackScore = scoreForCorrectAnswers(correctAnswersCount);
    const rankingEntry = finalRankings.find((entry) => entry.playerId === localPlayerId);
    const currentPlayerScore =
      cfgMode === "multiplayer"
        ? rankingEntry?.score ?? finalPlayerScores[localPlayerId] ?? fallbackScore
        : fallbackScore;

    const playerRank =
      cfgMode === "multiplayer"
        ? rankingEntry?.rank ??
          1 + Object.values(finalPlayerScores).filter((s) => s > currentPlayerScore).length
        : 0;

    const elapsedMs = gameStartTimeRef.current ? Date.now() - gameStartTimeRef.current : 0;
    const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));

    const avgTime =
      totalAnsweredRef.current > 0
        ? Math.round((totalSessionTimeRef.current / totalAnsweredRef.current) * 10) / 10
        : 0;
    useTriviaStore.setState({ avgTime });

    const progressionInput: SessionProgressInput = {
      mode: cfgMode,
      category: cfgCategory,
      difficulty: cfgDifficulty,
      totalQuestions: finalQuestions.length,
      correctAnswers: correctAnswersCount,
      score: currentPlayerScore,
      maxStreak,
      questions: finalQuestions,
      userAnswers: finalUserAnswers,
      timeTaken: elapsedSeconds,
      mastered: correctAnswersCount === finalQuestions.length,
      won: cfgMode === "multiplayer" ? playerRank === 1 : false,
      topThreeFinish: cfgMode === "multiplayer" ? playerRank <= 3 : false,
      hostedLobby: cfgMode === "multiplayer" && lobbyRole === "host",
      fellBehindByHalfAndWon:
        cfgMode === "multiplayer" && playerRank === 1 && fellBehindByHalfRef.current,
    };

    const newlyUnlockedAchievements = applySessionProgress(progressionInput);

    recordSessionEndLevel();

    if (newlyUnlockedAchievements.length > 0) {
      queueAchievementUnlocks(newlyUnlockedAchievements, "result");
      setScreen("achievement-unlock");
    } else {
      setScreen("result");
    }
  }, [phase, applySessionProgress, localPlayerId, lobbyRole, setScreen,
      recordSessionEndLevel, queueAchievementUnlocks]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const currentQuestion = questions[currentIndex];

  const persistedTotalXp = usePlayerStore((s) => s.getPlayer().totalXp);
  const persistedLevel   = usePlayerStore((s) => s.getPlayer().level);

  const visualOldXP = persistedTotalXp;
  const visualNewXP = persistedTotalXp + sessionXpRef.current;
  const visualLevel = getLevel(visualNewXP);

  const scale = useResponsiveScale();

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

  // ── Multiplayer display rankings ────────────────────────────────────────────

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
              fontSize: "17px",
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
    <ScaleWrapper>
      <GameScreen style={{ transform: scale, position: 'relative' }}>
        {/* CRT vignette */}
        <div className="vignette" />

        {/* ── TOP HUD ──────────────────────────────────────────────────────── */}
        <HudBar>
          <ProgressText>
            {currentIndex + 1}/{questions.length}
          </ProgressText>

          <CategoryLabel>
            {category ?? "TRIVIA"}
          </CategoryLabel>

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
              {timer !== undefined ? `${timer}s` : "--"}
            </TimerText>
          </TimerBox>
        </HudBar>

        {/* ── XP BAR ──────────────────────────────────────────────────────── */}
        <Box sx={{ width: 'calc(100% - 100px)', px: 6, py: 1 }}>
          <XPBarAnimate
            oldXP={visualOldXP}
            newXP={visualNewXP}
            xpPerLevel={1000}
            level={visualLevel}
            animate={rewardState.showXPBar}
          />
        </Box>

        {/* Divider */}
        <NeonDivider />

        {/* ── QUESTION PANEL ────────────────────────────────────────────────── */}
        <QuestionPanel>
          <QuestionText>{currentQuestion.text}</QuestionText>
        </QuestionPanel>

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

        {/* ── RANKING OVERLAY (multiplayer scoring phase) ───────────────────── */}
        {phase === "scoring" && mode === "multiplayer" && displayedRankings.length > 0 && (
          <RankingOverlay>
            <RankingPanel>
              <RankingTitle>— RANKINGS —</RankingTitle>
              {displayedRankings.slice(0, 8).map((entry) => (
                <RankingRow key={entry.playerId} isLocal={entry.playerId === localPlayer.id}>
                  <RankNumber>#{entry.rank}</RankNumber>
                  <RankName>
                    {entry.name}
                    {entry.playerId === localPlayer.id ? " ◀" : ""}
                  </RankName>
                  <RankScore>{entry.score}</RankScore>
                </RankingRow>
              ))}
            </RankingPanel>
          </RankingOverlay>
        )}

        {/* ── REWARD OVERLAY ───────────────────────────────────────────────── */}
        <RewardOverlay
          rewardState={rewardState}
          onLevelUpDone={handleLevelUpDone}
          xpPerLevel={1000}
        />
      </GameScreen>
    </ScaleWrapper>
  );
};

export default QuestionPage;