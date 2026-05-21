import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useTriviaStore, useMultiplayerStore, useGameStore } from "../store";
import { getMultiplayerPlayerId, usePlayerStore } from "../store/playerStore";
import { Clock } from 'pixelarticons/react';
import type { SessionProgressInput } from "src/progression/progressionRules";
import type { MultiplayerBridge, MultiplayerGameState } from "../types/multiplayer";
import type { TriviaState } from "../store";
import { scoreIncrementForAnswer } from "../rules";
import { defaultGameConfig } from "../config/gameConfig";
import { styled, keyframes } from "@mui/material/styles";
import { useSoundContext } from "../context/SoundContext";
import { BunnyXPBar } from '../components/rewards/BunnyXPBar';
import { useEmotes } from "../hooks/useEmotes";
import { EmoteControls, PlayerEmoteOverlay } from "../components/emotes/EmoteSystem";
import { BunnyMascot } from "../components/bunny/BunnyMascot";
import { useRewardSystem, RewardOverlay } from '../components/rewards/RewardSystem';
import { calculateXP, getLevel } from "../utils/progression";
import type { Achievement } from "../types/player";
import type { BunnyState } from "src/components/bunny/bunnyStates";
import { PowerUpTray } from "../components/powerups/PowerUpTray";
import { usePowerUps, getStarterInventory } from "../hooks/usePowerUps";
import { usePowerUpStore } from "../store/powerUpStore";
import type { PowerUpId } from "../types/powerups";
import { POWER_UP_CATALOGUE } from "../types/powerups";

// ─── Keyframes ─────────────────────────────────────────────────────────────

const glitchEliminate = keyframes`
  0%   { opacity: 1; transform: translateX(0); filter: brightness(1); }
  15%  { opacity: 0.6; transform: translateX(-4px); filter: brightness(2) hue-rotate(90deg); }
  30%  { opacity: 0.8; transform: translateX(3px); filter: brightness(0.5); }
  50%  { opacity: 0.3; transform: translateX(-2px) scaleX(1.03); }
  70%  { opacity: 0.1; filter: brightness(3) saturate(0); }
  100% { opacity: 0; transform: translateX(0); }
`;

const fadeSlideDown = keyframes`
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeSlideUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px #00E5FF55, inset 0 0 8px rgba(0,229,255,0.05); }
  50%       { box-shadow: 0 0 16px #00E5FFaa, inset 0 0 12px rgba(0,229,255,0.1); }
`;

const retroFlicker = keyframes`
  0%, 100% { opacity: 1; text-shadow: 0 0 8px #35E52B, 0 0 15px #35E52B; }
  50% { opacity: 0.8; text-shadow: 0 0 4px #35E52B; }
  55% { opacity: 1; text-shadow: 0 0 10px #35E52B; }
  60% { opacity: 0.4; text-shadow: none; }
  65% { opacity: 1; text-shadow: 0 0 8px #35E52B; }
`;

const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const correctCountPop = keyframes`
  0%   { transform: scale(1); }
  35%  { transform: scale(1.22); box-shadow: 0 0 10px #35E52Baa, 0 0 20px #35E52B55; }
  65%  { transform: scale(0.96); }
  100% { transform: scale(1); }
`;

// ─── Styled Components ─────────────────────────────────────────────────────

const OuterSpace = styled(Box)({
  minHeight: "100vh",
  width: "100%",
  backgroundColor: "#020408",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
});

const GameScreen = styled(Box)({
  backgroundColor: "#060A10",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  overflow: "visible",
  fontFamily: "'Press Start 2P', 'Courier New', monospace",
  padding: "25px 30px 25px",
  boxSizing: "border-box",
  position: "relative",
  boxShadow: "0 0 30px rgba(0, 229, 255, 0.1), inset 0 0 15px rgba(0, 0, 0, 0.5)",
});

const TopArea = styled(Box)({
  width: "100%",
  maxWidth: "900px",
  display: "flex",
  flexDirection: "column",
  zIndex: 10,
});

const HudTopRow = styled(Box)({
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  marginBottom: "4px",
});

const HudBottomRow = styled(Box)({
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  marginTop: "0px",
  marginBottom: "8px",
  minHeight: "32px",
});

const HudBackButton = styled(Button)({
  fontFamily: "'Press Start 2P', monospace",
  fontSize: "10px",
  padding: "4px 10px 4px 8px",
  lineHeight: 1.6,
  color: "#888",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "4px",
  background: "rgba(255,255,255,0.02)",
  textTransform: "uppercase" as const,
  minWidth: "unset",
  cursor: "pointer",
  transition: "all 0.25s ease",
  "&:hover": {
    color: "#FF0055",
    borderColor: "#FF0055",
    background: "rgba(255, 0, 85, 0.06)",
    boxShadow: "0 0 10px rgba(255, 0, 85, 0.25)",
  },
  "&:active": {
    transform: "scale(0.97)",
  },
});

const HudCorrectScore = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'hasCorrect',
})<{ hasCorrect?: boolean }>(({ hasCorrect }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '3px 10px 3px 8px',
  borderRadius: '4px',
  border: `1px solid ${hasCorrect ? '#35E52B' : '#1a2a1a'}`,
  background: hasCorrect ? 'rgba(53, 229, 43, 0.06)' : 'rgba(255,255,255,0.02)',
  boxShadow: hasCorrect
    ? '0 0 8px rgba(53,229,43,0.18), inset 0 0 6px rgba(53,229,43,0.04)'
    : 'none',
  transition: 'border-color 0.4s ease, background 0.4s ease, box-shadow 0.4s ease',
  animation: hasCorrect ? `${correctCountPop} 0.45s cubic-bezier(0.22,1,0.36,1) both` : 'none',
  cursor: 'default',
  userSelect: 'none',
}));

const QuestionPanel = styled(Box)({
  marginTop: "16px",
  width: "100%",
  maxWidth: "900px",
  minHeight: "140px",
  borderRadius: "4px",
  border: "2px solid #00E5FF",
  background: "rgba(0, 229, 255, 0.02)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px",
  position: "relative",
  animation: `${fadeSlideDown} 0.4s ease both, ${pulseGlow} 4s infinite`,
});

const AnswerGrid = styled(Box)({
  marginTop: "24px",
  width: "100%",
  maxWidth: "900px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
  animation: `${fadeSlideUp} 0.5s ease 0.2s both`,
  flex: 1,
});

const AnswerButton = styled(
  (props: React.ComponentProps<typeof Button> & {
    selected?: boolean;
    correct?: boolean;
    incorrect?: boolean;
    revealed?: boolean;
    eliminated?: boolean;
  }) => {
    const { selected, correct, incorrect, revealed, eliminated, ...rest } = props;
    return <Button {...rest} />;
  }
)<{
  selected?: boolean;
  correct?: boolean;
  incorrect?: boolean;
  revealed?: boolean;
  eliminated?: boolean;
}>(({ selected, correct, incorrect, revealed, eliminated }) => {
  let borderColor = "#00E5FF";
  let color = "#35E52B";
  let glow = "none";
  let bg = "transparent";

  if (selected && !revealed) {
    borderColor = "#FF00FF";
    color = "#FF00FF";
    glow = "0 0 15px rgba(255, 0, 255, 0.4)";
    bg = "rgba(255, 0, 255, 0.05)";
  }
  if (correct) {
    borderColor = "#35E52B";
    color = "#35E52B";
    glow = "0 0 20px rgba(53, 229, 43, 0.6)";
    bg = "rgba(53, 229, 43, 0.1)";
  }
  if (incorrect) {
    borderColor = "#FF0055";
    color = "#FF0055";
    glow = "0 0 20px rgba(255, 0, 85, 0.6)";
    bg = "rgba(255, 0, 85, 0.1)";
  }

  if (eliminated) {
    return {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "13px",
      padding: "24px",
      lineHeight: 1.6,
      color: "transparent",
      border: "2px solid #111",
      borderRadius: "8px",
      background: "rgba(0,0,0,0.15)",
      boxShadow: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: "16px",
      animation: `${glitchEliminate} 0.45s ease forwards`,
      pointerEvents: "none",
      textTransform: "uppercase" as const,
      textAlign: "left" as const,
    };
  }

  return {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: "13px",
    padding: "24px",
    lineHeight: 1.6,
    color: color,
    border: `2px solid ${borderColor}`,
    borderRadius: "8px",
    background: bg,
    boxShadow: glow,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "16px",
    transition: "all 0.2s ease",
    textTransform: "uppercase" as const,
    textAlign: "left" as const,
    "&:hover": {
      borderColor: "#35E52B",
      color: "#35E52B",
      background: "rgba(53, 229, 43, 0.08)",
      boxShadow: "0 0 18px rgba(53, 229, 43, 0.45)",
    },
    "&:disabled": {
      color: color,
      borderColor: borderColor,
      background: bg,
      boxShadow: glow,
    },
  };
});

const BottomHud = styled(Box)({
  width: "100%",
  maxWidth: "800px",
  display: "grid",
  gridTemplateColumns: "120px 1fr 120px",
  alignItems: "center",
  marginTop: "auto",
  marginBottom: "10px",
  padding: "0 20px",
});

const PlayerLeftToast = styled(Box)({
  position: "absolute",
  top: "80px",
  right: "24px",
  zIndex: 100,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  pointerEvents: "none",
});

const PlayerLeftNotification = styled(Box)({
  fontFamily: "'Press Start 2P', monospace",
  fontSize: "9px",
  color: "#FF0055",
  border: "1px solid #FF0055",
  borderRadius: "4px",
  background: "rgba(255, 0, 85, 0.08)",
  boxShadow: "0 0 12px rgba(255, 0, 85, 0.25)",
  padding: "8px 14px",
  lineHeight: 1.8,
  animation: `${slideInRight} 0.3s ease both`,
  whiteSpace: "nowrap",
});

const ANSWER_LABELS = ["A", "B", "C", "D"];
const ANSWER_COLLECTION_BUFFER_MS = 300;

// ─── Main Component ─────────────────────────────────────────────────────────

const QuestionPage = () => {
  const { playSound } = useSoundContext();

  const resolution = useGameStore((state) => state.resolution);

  const {
    questions,
    currentIndex,
    phase,
    selectedAnswer,
    timer,
    answerTimer,
    playerScores,
    playerAnswers,
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
  const { setScreen, recordSessionStartLevel, queueAchievementUnlocks } = useGameStore();
  const mode = useGameStore((state) => state.gameConfig.mode);
  const category = useGameStore((state) => state.gameConfig.category);
  const localPlayerId = mode === "multiplayer" ? getMultiplayerPlayerId(localPlayer.id) : localPlayer.id;
  const [showHostExitNotification, setShowHostExitNotification] = useState(false);

  const multiplayerBridge: MultiplayerBridge | undefined = window.multiplayer;

  const { state: rewardState, trigger: triggerReward, handleLevelUpDone } = useRewardSystem();
  const answerButtonRef = useRef<HTMLElement>(null);
  const { activeEmotes, sendEmote, isOnCooldown } = useEmotes(multiplayerBridge, localPlayerId);

  const previousXP = localPlayer.totalXp;
  const currentLevel = localPlayer.level;

  const currentQuestion = questions[currentIndex];

  const currentStreak = useTriviaStore((state) => state.currentStreak);
  const sessionXpRef = useRef<number>(0);
  const [sessionXpState, setSessionXpState] = useState<number>(0);
  const [revealScore, setRevealScore] = useState<number | null>(null);
  const [liveCorrectCount, setLiveCorrectCount] = useState(0);
  const [correctAnimKey, setCorrectAnimKey] = useState<number>(0);
  const [leftNotifications, setLeftNotifications] = useState<Array<{ id: string; name: string; toastKey: number }>>([]);
  const toastKeyRef = useRef(0);

  // ── broadcastMultiplayerState ─────────────────────────────────────────────
  const broadcastMultiplayerState = useCallback(() => {
    if (mode !== "multiplayer" || lobbyRole !== "host") return;
    const state = useTriviaStore.getState();
    multiplayerBridge?.broadcastGameState?.({
      phase: state.phase, timer: state.timer, currentIndex: state.currentIndex, seed: state.seed,
      category: state.category ?? undefined, difficulty: state.difficulty ?? undefined,
      questionLimit: state.questionLimit, questionTimer: state.questionTimer, answerTimer: state.answerTimer,
      playerScores: state.playerScores, playerAnswers: state.playerAnswers, rankings: state.rankings,
    });
  }, [mode, lobbyRole, multiplayerBridge]);

  // ── broadcastHostAbandoned ────────────────────────────────────────────────
  const broadcastHostAbandoned = useCallback(() => {
    if (mode !== "multiplayer" || lobbyRole !== "host") return;
    const state = useTriviaStore.getState();
    multiplayerBridge?.broadcastGameState?.({
      phase: state.phase, timer: state.timer, currentIndex: state.currentIndex, seed: state.seed,
      category: state.category ?? undefined, difficulty: state.difficulty ?? undefined,
      questionLimit: state.questionLimit, questionTimer: state.questionTimer, answerTimer: state.answerTimer,
      playerScores: state.playerScores, playerAnswers: state.playerAnswers, rankings: state.rankings,
      hostAbandoned: true,
    });
  }, [mode, lobbyRole, multiplayerBridge]);

  // ── broadcastPlayerLeft — host notifies all clients when someone leaves ───
  const broadcastPlayerLeft = useCallback((playerId: string, playerName: string) => {
    if (mode !== "multiplayer" || lobbyRole !== "host") return;
    const state = useTriviaStore.getState();
    multiplayerBridge?.broadcastGameState?.({
      phase: state.phase, timer: state.timer, currentIndex: state.currentIndex, seed: state.seed,
      category: state.category ?? undefined, difficulty: state.difficulty ?? undefined,
      questionLimit: state.questionLimit, questionTimer: state.questionTimer, answerTimer: state.answerTimer,
      playerScores: state.playerScores, playerAnswers: state.playerAnswers, rankings: state.rankings,
      playerLeftId: playerId,
      playerLeftName: playerName,
    });
  }, [mode, lobbyRole, multiplayerBridge]);

  // ── Player left / disconnected notifications ──────────────────────────────
  useEffect(() => {
    if (mode !== "multiplayer" || !multiplayerBridge) return;

    const activePhases = ["readying", "asking", "answering", "scoring", "ranking"];

    const pushNotification = (playerId: string) => {
      if (!activePhases.includes(useTriviaStore.getState().phase)) return;
      if (playerId === localPlayerId) return;

      const member = useMultiplayerStore.getState().players.find((p) => p.id === playerId);
      const name = member?.name ?? "A PLAYER";
      const toastKey = ++toastKeyRef.current;

      setLeftNotifications((prev) => [...prev, { id: playerId, name, toastKey }]);
      setTimeout(() => {
        setLeftNotifications((prev) => prev.filter((n) => n.toastKey !== toastKey));
      }, 4000);

      // Host broadcasts the leave event to all clients
      if (lobbyRole === "host") {
        broadcastPlayerLeft(playerId, name);
      }
    };

    multiplayerBridge.onPlayerLeft?.("QuestionPage:left", pushNotification);
    multiplayerBridge.onPlayerDisconnected?.("QuestionPage:disconnected", pushNotification);

    return () => {
      multiplayerBridge.offPlayerLeft?.("QuestionPage:left");
      multiplayerBridge.offPlayerDisconnected?.("QuestionPage:disconnected");
    };
  }, [mode, multiplayerBridge, localPlayerId, lobbyRole, broadcastPlayerLeft]);

  const correctCount = useMemo(() => {
    if (mode === "multiplayer") {
      const rankingData = rankings.find((r) => r.playerId === localPlayerId);
      return rankingData?.correctCount ?? liveCorrectCount;
    }
    return liveCorrectCount;
  }, [rankings, localPlayerId, liveCorrectCount, mode]);

  // ── Power-up state ────────────────────────────────────────────────────────
  const [bunnyMessage, setBunnyMessage] = useState<string | null>(null);
  const bunnyMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [powerUpBunnyOverride, setPowerUpBunnyOverride] = useState<BunnyState | null>(null);
  const powerUpBunnyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAnswered = !!selectedAnswer || phase === "scoring";

  const { activatePowerUp, isEliminated } = usePowerUps({
    questionIndex: currentIndex,
    allAnswers: currentQuestion?.allAnswers ?? [],
    correctAnswer: currentQuestion?.correctAnswer ?? "",
    isAnswered,
    currentStreak,
    onBunnyReaction: (state, durationMs = 2000) => {
      if (powerUpBunnyTimerRef.current) clearTimeout(powerUpBunnyTimerRef.current);
      setPowerUpBunnyOverride(state);
      powerUpBunnyTimerRef.current = setTimeout(() => setPowerUpBunnyOverride(null), durationMs);
    },
    onPowerUpEarned: (id) => {
      playSound("powerup_earned");
      const label = POWER_UP_CATALOGUE[id].label;
      if (bunnyMessageTimerRef.current) clearTimeout(bunnyMessageTimerRef.current);
      setBunnyMessage(`POWER UP\nGAINED: ${label}`);
      bunnyMessageTimerRef.current = setTimeout(() => setBunnyMessage(null), 3000);
    },
  });

  // Init session inventory once on mount
  useEffect(() => {
    usePowerUpStore.getState().initSession(
      (localPlayer as any).powerUpInventory ?? getStarterInventory()
    );
    return () => { usePowerUpStore.getState().resetSession(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const derivedBunnyState: BunnyState = useMemo(() => {
    if (powerUpBunnyOverride) return powerUpBunnyOverride;
    if (phase === "end") return "winner";

    if (phase === "scoring") {
      return selectedAnswer === currentQuestion?.correctAnswer ? "happy" : "sad";
    }

    if (phase === "answering") {
      if (mode === "multiplayer" && selectedAnswer) return "thinking";
      if (!selectedAnswer && timer !== undefined && timer <= 5) return "panicked";
      if (!selectedAnswer) return "thinking";
      if (rewardState.showXPBar) return "running";
      if (currentStreak >= 5) return "hyper";
      return "idle";
    }

    return "sleeping";
  }, [powerUpBunnyOverride, phase, mode, timer, selectedAnswer, currentQuestion?.correctAnswer, rewardState.showXPBar, currentStreak]);

  const didLevelUpThisSessionRef = useRef<boolean>(false);
  const levelAfterSessionRef = useRef<number>(0);
  const endDataRef = useRef<{ achievements: Achievement[]; postUnlockScreen: "result" | "multiplayer-results"; } | null>(null);
  const gameStartTimeRef = useRef<number | null>(null);
  const gameElapsedTimeRef = useRef<number>(0);
  const totalSessionTimeRef = useRef<number>(0);
  const totalAnsweredRef = useRef<number>(0);
  const endProgressAppliedRef = useRef(false);
  const fellBehindByHalfRef = useRef(false);
  const hasExitedRef = useRef(false);

  useEffect(() => {
    if (phase === "answering" || phase === "asking") {
      if (gameStartTimeRef.current === null) {
        gameStartTimeRef.current = Date.now();
      }
    }
  }, [phase]);

  const pendingRewardRef = useRef<null | {
    finalScore: number;
    xpEarned: number;
    currentStreak: number;
  }>(null);

  const handleAnswerClick = useCallback((answer: string) => {
    submitAnswer(answer);
    const questionToScore = questions[currentIndex];
    if (!questionToScore) return;

    const isCorrect = answer === questionToScore.correctAnswer;
    if (!isCorrect) return;

    if (mode === "solo") {
      setLiveCorrectCount((prev) => prev + 1);
      setCorrectAnimKey((prev) => prev + 1);
    }

    if (mode === "solo") {
      const timeTaken = 15 - (timer ?? 0);
      totalSessionTimeRef.current += timeTaken;
      totalAnsweredRef.current += 1;
    }

    const finalScore = scoreIncrementForAnswer(
      true,
      useGameStore.getState().gameConfig.difficulty ?? "easy",
      timer ?? 0,
      answerTimer,
    );

    const currentStreak = useTriviaStore.getState().currentStreak;
    const xpEarned = calculateXP(finalScore, currentStreak);

    sessionXpRef.current += xpEarned;
    setSessionXpState(sessionXpRef.current);

    if (mode === "multiplayer") {
      pendingRewardRef.current = { finalScore, xpEarned, currentStreak };
      return;
    }

    const persistedTotalXp = usePlayerStore.getState().getPlayer().totalXp;
    const oldXP = persistedTotalXp + (sessionXpRef.current - xpEarned);
    const newXP = persistedTotalXp + sessionXpRef.current;
    const visualLevel = getLevel(newXP);

    triggerReward({
      score: finalScore,
      xp: xpEarned,
      streak: currentStreak,
      oldXP,
      newXP,
      oldLevel: visualLevel,
      newLevel: visualLevel,
      xpPerLevel: 1000,
      buttonRef: answerButtonRef,
    });
  }, [submitAnswer, questions, currentIndex, timer, answerTimer, triggerReward, mode]);

  useEffect(() => {
    if (phase !== "readying" && phase !== "answering" && phase !== "scoring") return;
    if (phase === "answering" && mode === "solo" && selectedAnswer) return;

    let timerInterval: number;
    if (mode === "solo" || lobbyRole === "host") {
      timerInterval = window.setInterval(() => {
        useTriviaStore.getState().tickTimer();
        if (mode === "multiplayer" && lobbyRole === "host") broadcastMultiplayerState();
      }, 1000);
    }
    return () => { if (timerInterval) clearInterval(timerInterval); };
  }, [phase, mode, lobbyRole, selectedAnswer, broadcastMultiplayerState]);

  useEffect(() => {
    if (mode !== "multiplayer" || lobbyRole !== "host" || !multiplayerBridge) return;
    const handleAnswerSubmission = (payload: { lobbyId: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number; }) => {
      if (payload.questionIndex !== currentIndex) return;
      receiveRemoteAnswer(payload.playerId, payload.questionIndex, payload.answer, payload.remainingTime);
    };
    multiplayerBridge.onAnswerSubmission?.("QuestionPage", handleAnswerSubmission);
    return () => { multiplayerBridge.offAnswerSubmission?.("QuestionPage"); };
  }, [mode, lobbyRole, multiplayerBridge, currentIndex, receiveRemoteAnswer]);

  useEffect(() => {
    if (mode !== "multiplayer" || lobbyRole !== "host" || phase !== "answering") return;
    const activePlayers = players.filter((p) => p.connectionState !== "disconnected");
    if (activePlayers.length === 0) return;

    const state = useTriviaStore.getState();
    const everyoneAnswered = activePlayers.every((player) => {
      if (player.isHost) return Boolean(state.selectedAnswer);
      const answers = state.playerAnswers[player.id];
      return Boolean(answers && answers[state.currentIndex]);
    });

    if (!everyoneAnswered) return;
    useTriviaStore.setState({ phase: "scoring", timer: 3 });
    broadcastMultiplayerState();
  }, [mode, lobbyRole, phase, currentIndex, selectedAnswer, playerAnswers, players, broadcastMultiplayerState]);

  const hasScoredRef = useRef(false);

  useEffect(() => {
    if (mode !== "multiplayer" || lobbyRole !== "host") return;
    if (phase !== "scoring") {
      hasScoredRef.current = false;
      return;
    }
    if (hasScoredRef.current) return;

    hasScoredRef.current = true;

    console.log('[QuestionPage] Scoring phase started, collecting answers for', ANSWER_COLLECTION_BUFFER_MS, 'ms');

    const timeoutId = window.setTimeout(() => {
      console.log('[QuestionPage] Answer collection buffer complete, computing scores');
      scoreCurrentQuestion();
      finalizeRankings();
      broadcastMultiplayerState();
    }, ANSWER_COLLECTION_BUFFER_MS);

    return () => window.clearTimeout(timeoutId);
  }, [phase, mode, lobbyRole, scoreCurrentQuestion, finalizeRankings, broadcastMultiplayerState]);

  const broadcastOnMountRef = useRef(false);
  useEffect(() => {
    if (mode !== "multiplayer" || lobbyRole !== "host") return;
    broadcastMultiplayerState();
  }, [mode, lobbyRole, phase, timer, currentIndex, playerScores, rankings, broadcastMultiplayerState]);

  // ── Client: receive game state from host ──────────────────────────────────
  useEffect(() => {
    if (mode !== "multiplayer" || lobbyRole !== "client" || !multiplayerBridge) return;

    const handleGameStateSync = (payload: MultiplayerGameState) => {
      const currentState = useTriviaStore.getState();
      const shouldResetSelectedAnswer = payload.currentIndex !== currentState.currentIndex;

      // Host abandoned — go home immediately
      if (payload.hostAbandoned) {
        endProgressAppliedRef.current = true;
        hasExitedRef.current = true;
        useTriviaStore.setState({ phase: "end" });
        setTimeout(() => setScreen("home"), 50);
        return;
      }

      // Another player left — show notification on this client
      if (payload.playerLeftId && payload.playerLeftName) {
        const toastKey = ++toastKeyRef.current;
        setLeftNotifications((prev) => [
          ...prev,
          { id: payload.playerLeftId!, name: payload.playerLeftName!, toastKey },
        ]);
        setTimeout(() => {
          setLeftNotifications((prev) => prev.filter((n) => n.toastKey !== toastKey));
        }, 4000);
      }

      const mappedRankings = payload.rankings?.map((r) => ({
        playerId: r.playerId, name: r.name, score: r.score, rank: r.rank,
        correctCount: r.correctCount, questionsAnswered: r.questionsAnswered,
        accuracy: r.accuracy, avgTime: r.avgTime, xp: r.xp ?? 0,
      }));

      const nextState: Partial<TriviaState> = {
        phase: payload.phase, timer: payload.timer, currentIndex: payload.currentIndex,
        ...(payload.seed !== undefined ? { seed: payload.seed } : {}),
        ...(payload.category !== undefined ? { category: payload.category ?? undefined } : {}),
        ...(payload.difficulty !== undefined ? { difficulty: payload.difficulty ?? undefined } : {}),
        ...(payload.questionLimit !== undefined ? { questionLimit: payload.questionLimit } : {}),
        ...(payload.questionTimer !== undefined ? { questionTimer: payload.questionTimer } : {}),
        ...(payload.answerTimer !== undefined ? { answerTimer: payload.answerTimer } : {}),
        ...(payload.playerScores !== undefined ? { playerScores: payload.playerScores } : {}),
        ...(payload.playerAnswers !== undefined ? { playerAnswers: payload.playerAnswers } : {}),
        ...(mappedRankings !== undefined ? { rankings: mappedRankings } : {}),
      };
      if (shouldResetSelectedAnswer) nextState.selectedAnswer = "";

      if (payload.phase === "end" && hasExitedRef.current) {
        setTimeout(() => setScreen("multiplayer-results"), 50);
      }

      useTriviaStore.setState(nextState);
    };

    multiplayerBridge.onGameStateSync("QuestionPage", handleGameStateSync);
    return () => { multiplayerBridge.offGameStateSync?.("QuestionPage"); };
  }, [mode, lobbyRole, multiplayerBridge, setScreen]);

  useEffect(() => { if (phase === "ranking") nextPhase(); }, [phase, nextPhase]);

  useEffect(() => {
    if (phase === "readying" && currentIndex === 0) {
      fellBehindByHalfRef.current = false;
      totalSessionTimeRef.current = 0;
      totalAnsweredRef.current = 0;
      sessionXpRef.current = 0;
      setSessionXpState(0);
      setLiveCorrectCount(0);
      setCorrectAnimKey(0);
      endProgressAppliedRef.current = false;
      gameStartTimeRef.current = null;
      recordSessionStartLevel();
      didLevelUpThisSessionRef.current = false;
      levelAfterSessionRef.current = 0;
      setRevealScore(null);
    }
  }, [phase, currentIndex, recordSessionStartLevel]);

  useEffect(() => {
    if (phase !== "end" || endProgressAppliedRef.current) return;
    endProgressAppliedRef.current = true;
    const gameConfig = useGameStore.getState().gameConfig;
    const { mode, category, difficulty } = gameConfig || {};
    if (!mode || !category || !difficulty) return;
    if (mode === "multiplayer") {
      finalizeRankings();
    }

    const triviaState = useTriviaStore.getState();
    const { userAnswers: finalUserAnswers, questions: finalQuestions, rankings: finalRankings, playerScores: finalPlayerScores, maxStreak } = triviaState;

    const correctAnswersCount = finalQuestions.filter(
      (q, index) => q.correctAnswer === finalUserAnswers[index]
    ).length;

    const currentPlayerScore =
      mode === "multiplayer"
        ? finalRankings.find((e) => e.playerId === localPlayerId)?.score ?? finalPlayerScores[localPlayerId] ?? 0
        : triviaState.score;

    const playerRank =
      mode === "multiplayer"
        ? finalRankings.find((e) => e.playerId === localPlayerId)?.rank
          ?? 1 + Object.values(finalPlayerScores).filter((s) => s > currentPlayerScore).length
        : 0;

    const elapsedMs = gameStartTimeRef.current ? Date.now() - gameStartTimeRef.current : 0;
    const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));
    gameElapsedTimeRef.current = elapsedSeconds;

    const avgTime = totalAnsweredRef.current > 0
      ? Math.round((totalSessionTimeRef.current / totalAnsweredRef.current) * 10) / 10
      : 0.0;
    useTriviaStore.setState({ avgTime });

    const postUnlockScreen = mode === "multiplayer" ? "multiplayer-results" : "result";
    const progressionInput: SessionProgressInput = {
      mode, category, difficulty,
      totalQuestions: finalQuestions.length,
      correctAnswers: correctAnswersCount,
      score: currentPlayerScore,
      maxStreak,
      questions: finalQuestions,
      userAnswers: finalUserAnswers,
      timeTaken: elapsedSeconds,
      mastered: correctAnswersCount === finalQuestions.length,
      won: mode === "multiplayer" ? playerRank === 1 : false,
      topThreeFinish: mode === "multiplayer" ? playerRank <= 3 : false,
      hostedLobby: mode === "multiplayer" && lobbyRole === "host",
      fellBehindByHalfAndWon: mode === "multiplayer" && playerRank === 1 && fellBehindByHalfRef.current,
      rank: mode === "multiplayer" ? playerRank : undefined,
    };

    const powerUpState = usePowerUpStore.getState();

    for (const used of powerUpState.used) {
      usePlayerStore.getState().spendPowerUp(used.id);
    }

    const sessionInventory = powerUpState.sessionInventory;
    const starterInventory = localPlayer.powerUpInventory ?? [];
    for (const entry of sessionInventory) {
      const startCount = starterInventory.find((e) => e.id === entry.id)?.count ?? 0;
      const usedCount = powerUpState.used.filter((u) => u.id === entry.id).length;
      const netEarned = entry.count - startCount + usedCount;
      if (netEarned > 0) {
        usePlayerStore.getState().earnPowerUp(entry.id, netEarned);
      }
    }

    const newlyUnlockedAchievements = applySessionProgress(progressionInput);

    if (mode === "multiplayer") {
      const latestPlayer = usePlayerStore.getState().getPlayer();
      const mpState = useMultiplayerStore.getState();
      const currentMpPlayer = mpState.players.find(p => p.id === localPlayerId);

      if (currentMpPlayer) {
        mpState.addOrUpdatePlayer({ ...latestPlayer, id: localPlayerId }, { status: "results", isReady: false });
        if (mpState.lobbyRole === "client" && mpState.lobbyId && mpState.hostAddress) {
          window.multiplayer?.setReady({
            lobbyId: mpState.lobbyId,
            hostAddress: mpState.hostAddress,
            playerId: localPlayerId,
            ready: false,
            member: {
              status: "results",
              level: latestPlayer.level,
              rank: latestPlayer.rank
            }
          });
        }
      }
    }

    if (didLevelUpThisSessionRef.current) {
      endDataRef.current = { achievements: newlyUnlockedAchievements, postUnlockScreen };
      triggerReward({ score: 0, xp: 0, streak: 0, oldXP: 0, newXP: 0, oldLevel: levelAfterSessionRef.current - 1, newLevel: levelAfterSessionRef.current, xpPerLevel: 1000 });
    } else if (newlyUnlockedAchievements.length > 0) {
      const gameState = useGameStore.getState();
      gameState.queueAchievementUnlocks(newlyUnlockedAchievements, postUnlockScreen);
      gameState.setScreen("achievement-unlock");
    } else {
      if (mode === "multiplayer") { setTimeout(() => setScreen(postUnlockScreen), 50); } else { setScreen(postUnlockScreen); }
    }
  }, [phase, applySessionProgress, localPlayerId, lobbyRole, setScreen, triggerReward, finalizeRankings]);

  useEffect(() => {
    if (mode !== "multiplayer" || phase !== "scoring") return;
    if (!pendingRewardRef.current) return;

    const { finalScore, xpEarned, currentStreak } = pendingRewardRef.current;
    pendingRewardRef.current = null;

    setRevealScore(finalScore);
    setTimeout(() => setRevealScore(null), 3000);

    const persistedTotalXp = usePlayerStore.getState().getPlayer().totalXp;
    const oldXP = persistedTotalXp + (sessionXpRef.current - xpEarned);
    const newXP = persistedTotalXp + sessionXpRef.current;
    const visualLevel = getLevel(newXP);

    triggerReward({
      score: finalScore,
      xp: xpEarned,
      streak: currentStreak,
      oldXP,
      newXP,
      oldLevel: visualLevel,
      newLevel: visualLevel,
      xpPerLevel: 1000,
      buttonRef: answerButtonRef,
    });
  }, [phase, mode, triggerReward]);

  const isRevealed = phase === "scoring";
  const correctAnswer = currentQuestion?.correctAnswer;

  const getAnswerState = (answer: string) => ({
    isSelected: selectedAnswer === answer,
    isCorrect: isRevealed && answer === correctAnswer,
    isIncorrect: isRevealed && selectedAnswer === answer && answer !== correctAnswer,
  });

  if (!currentQuestion) return (
    <OuterSpace>
      <GameScreen sx={{ width: resolution.width, height: resolution.height, justifyContent: "center" }}>
        <Typography sx={{ color: "#00E5FF" }}>LOADING MAINFRAME...</Typography>
      </GameScreen>
    </OuterSpace>
  );

  return (
    <OuterSpace>
      <GameScreen sx={{ width: resolution.width, height: resolution.height }}>

        {/* ── TOP HUD ───────────────────────────────────────────────────────── */}
        <TopArea>

          {/* ── HUD Top Row: Question Counter | Category | Timer ── */}
          <HudTopRow>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={{ fontFamily: "'Courier New', monospace", fontSize: "14px", color: "#888" }}>
                {currentIndex + 1}/{questionLimit}
              </Typography>
            </Box>

            <Typography sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "14px", color: "#35E52B", textAlign: "center" }}>
              {category ?? "TRIVIA"}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
              <Clock style={{ width: 16, height: 16, color: "#fff" }} />
              <Typography sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "16px", color: "#fff" }}>
                {timer !== undefined ? `${Math.ceil(timer)}S` : "--S"}
              </Typography>
            </Box>
          </HudTopRow>

          {/* ── HUD Bottom Row ── */}
          <HudBottomRow>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <HudBackButton
                onClick={() => {
  playSound("select");
  if (mode === "multiplayer" && lobbyRole === "host") {
    broadcastHostAbandoned();
  }
  setScreen("home");
}}
                onMouseEnter={() => playSound("hover")}
              >
                ◀ BACK
              </HudBackButton>
            </Box>

            <Box />

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <HudCorrectScore hasCorrect={correctCount > 0} key={correctAnimKey}>
                <Box component="span" sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "8px", color: correctCount > 0 ? "#35E52B" : "#333" }}>
                  ✓
                </Box>
                <Box component="span" sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px", color: correctCount > 0 ? "#35E52B" : "#555" }}>
                  {correctCount}
                </Box>
              </HudCorrectScore>
            </Box>
          </HudBottomRow>

          {/* ── XP Bar ── */}
          <BunnyXPBar
            oldXP={previousXP + (sessionXpState - (rewardState.data?.xp ?? 0))}
            newXP={previousXP + sessionXpState}
            xpPerLevel={1000}
            level={currentLevel}
            animate={rewardState.showXPBar}
            levelUp={rewardState.showLevelUp}
          />
        </TopArea>

        {/* ── QUESTION PANEL ────────────────────────────────────────────────── */}
        <QuestionPanel>
          <Typography sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "16px", color: "#35E52B", textAlign: "center", lineHeight: 2 }}>
            {currentQuestion.text}
          </Typography>

          {mode === "multiplayer" && revealScore !== null && (
            <Box sx={{
              position: "absolute",
              top: "10px",
              right: "14px",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "12px",
              color: "#35E52B",
              textShadow: "0 0 10px #35E52B",
            }}>
              +{revealScore} PTS
            </Box>
          )}
        </QuestionPanel>

        {/* ── ANSWER GRID ───────────────────────────────────────────────────── */}
        <AnswerGrid>
          {currentQuestion.allAnswers.map((answer: string, idx: number) => {
            const { isSelected, isCorrect, isIncorrect } = getAnswerState(answer);
            const isEliminatedByFiftyFifty = isEliminated(idx);

            return (
              <AnswerButton
                key={answer}
                ref={isSelected ? (answerButtonRef as any) : undefined}
                onClick={() => {
                  if (!isAnswered && !isEliminatedByFiftyFifty) {
                    handleAnswerClick(answer);
                    playSound("select");
                  }
                }}
                onMouseEnter={() => { if (!isAnswered) playSound("hover"); }}
                disabled={isAnswered || isEliminatedByFiftyFifty}
                selected={isSelected && !isRevealed}
                correct={isCorrect}
                incorrect={isIncorrect}
                eliminated={isEliminatedByFiftyFifty}
                disableRipple={false}
              >
                <Box component="span" sx={{ color: "inherit" }}>
                  {ANSWER_LABELS[idx]}.
                </Box>
                {answer}
              </AnswerButton>
            );
          })}
        </AnswerGrid>

        {/* ── POWER-UP TRAY ── */}
        <PowerUpTray
          questionIndex={currentIndex}
          onActivate={(id: PowerUpId) => { activatePowerUp(id); }}
        />

        {/* ── BOTTOM HUD ────────────────────────────────────────────────────── */}
        <BottomHud>
          <Box sx={{ width: "120px", height: "120px", display: "flex", alignItems: "flex-end", position: "relative" }}>
            {bunnyMessage && (
              <Box sx={{
                position: "absolute",
                bottom: "115px",
                left: "0px",
                background: "#060A10",
                border: "2px solid #35E52B",
                borderRadius: "6px",
                padding: "8px 10px",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "7px",
                color: "#35E52B",
                whiteSpace: "pre-line",
                lineHeight: 1.8,
                zIndex: 30,
                boxShadow: "0 0 10px rgba(53,229,43,0.4)",
                width: "120px",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: "-8px",
                  left: "16px",
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "8px solid #35E52B",
                }
              }}>
                {bunnyMessage}
              </Box>
            )}
            <BunnyMascot state={derivedBunnyState} size={110} />
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {Object.keys(activeEmotes).map((pid) => (
              <PlayerEmoteOverlay key={pid} playerId={pid} emotes={activeEmotes} />
            ))}
            <Typography sx={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "14px",
              color: "#35E52B",
              textAlign: "center",
              lineHeight: 1.8,
              animation: `${retroFlicker} 3s infinite`,
            }}>
              THINK FAST<br />GUESS FASTER
            </Typography>
          </Box>

          <Box sx={{ justifySelf: "end" }}>
            <EmoteControls sendEmote={sendEmote} isOnCooldown={isOnCooldown} />
          </Box>
        </BottomHud>

        {/* ── PLAYER LEFT NOTIFICATIONS ─────────────────────────────────────── */}
        {mode === "multiplayer" && leftNotifications.length > 0 && (
          <PlayerLeftToast>
            {leftNotifications.map((n) => (
              <PlayerLeftNotification key={n.toastKey}>
                ⚠ {n.name.toUpperCase()} LEFT THE GAME
              </PlayerLeftNotification>
            ))}
          </PlayerLeftToast>
        )}

        {/* ── HOST-EXIT NOTIFICATION OVERLAY ──────────────────────────────── */}
        {showHostExitNotification && (
          <Box sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
            pointerEvents: "none",
            animation: `${fadeSlideDown} 0.3s ease both`,
          }}>
            <Box sx={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "14px",
              color: "#FF0055",
              textShadow: "0 0 8px #FF0055, 0 0 20px #FF005588",
              background: "rgba(6, 10, 16, 0.92)",
              border: "2px solid #FF0055",
              borderRadius: "8px",
              padding: "20px 32px",
              textAlign: "center",
              lineHeight: 1.8,
              boxShadow: "0 0 30px rgba(255, 0, 85, 0.3), inset 0 0 15px rgba(255, 0, 85, 0.06)",
              letterSpacing: "2px",
            }}>
              HOST ENDED<br />THE SESSION
            </Box>
          </Box>
        )}

        <RewardOverlay
          rewardState={rewardState}
          onLevelUpDone={handleLevelUpDone}
          xpPerLevel={1000}
        />

      </GameScreen>
    </OuterSpace>
  );
};

export default QuestionPage;
