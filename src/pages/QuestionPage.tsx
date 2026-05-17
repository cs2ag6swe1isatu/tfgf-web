import { useEffect, useRef, useCallback, useMemo, useState } from "react";import { Box, Typography, Button } from "@mui/material";
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

// ─── Keyframes ─────────────────────────────────────────────────────────────

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

// NEW: Tagline Flicker
const retroFlicker = keyframes`
  0%, 100% { opacity: 1; text-shadow: 0 0 8px #35E52B, 0 0 15px #35E52B; }
  50% { opacity: 0.8; text-shadow: 0 0 4px #35E52B; }
  55% { opacity: 1; text-shadow: 0 0 10px #35E52B; }
  60% { opacity: 0.4; text-shadow: none; }
  65% { opacity: 1; text-shadow: 0 0 8px #35E52B; }
`;

// Correct-count pill: brief scale-pop when the number increments
const correctCountPop = keyframes`
  0%   { transform: scale(1); }
  35%  { transform: scale(1.22); box-shadow: 0 0 10px #35E52Baa, 0 0 20px #35E52B55; }
  65%  { transform: scale(0.96); }
  100% { transform: scale(1); }
`;

// ─── Styled Components ─────────────────────────────────────────────────────

// NEW: Outer container to center the strict-resolution game screen
const OuterSpace = styled(Box)({
  minHeight: "100vh",
  width: "100%",
  backgroundColor: "#020408", // Pitch black behind the arcade screen
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
});

const GameScreen = styled(Box)({
  backgroundColor: "#060A10", 
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  overflow: "hidden",
  fontFamily: "'Press Start 2P', 'Courier New', monospace",
  padding: "20px 25px 25px",
  boxSizing: "border-box",
  position: "relative",
  // Optional: adds a subtle CRT border around the game area
  boxShadow: "0 0 30px rgba(0, 229, 255, 0.1), inset 0 0 15px rgba(0, 0, 0, 0.5)", 
});

const TopArea = styled(Box)({
  width: "100%",
  maxWidth: "900px",
  display: "flex",
  flexDirection: "column",
  zIndex: 10,
});

const TopBar = styled(Box)({
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  marginBottom: "8px",
});

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

const AnswerButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'selected' && prop !== 'correct' && prop !== 'incorrect' && prop !== 'revealed',
})<{ selected?: boolean; correct?: boolean; incorrect?: boolean; revealed?: boolean; }>(({ selected, correct, incorrect, revealed }) => {
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
    textTransform: "uppercase",
    textAlign: "left",

    "&:hover": {
      borderColor: "#00E5FF",
      background: "rgba(0, 229, 255, 0.05)",
      boxShadow: "0 0 15px rgba(0, 229, 255, 0.4)",
    },
    "&:disabled": {
      color: color,
      borderColor: borderColor,
      background: bg,
      boxShadow: glow,
    },
  };
});

// FIXED: Narrower Max-Width (800px instead of 900px) pushes elements inwards!
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

// FIXED: Interactive Carrot for future Emotes
const CarrotCircle = styled(Box)({
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  backgroundColor: "#4DB6AC",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  boxShadow: "0 0 15px rgba(77, 182, 172, 0.5)",
  justifySelf: "end",
  cursor: "pointer", // Makes it look clickable
  transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s",
  "&:hover": {
    transform: "scale(1.1) rotate(5deg)", // Bounces up on hover
    boxShadow: "0 0 25px rgba(77, 182, 172, 0.9)", // Glows brighter on hover
  }
});

const ANSWER_LABELS = ["A", "B", "C", "D"];

// ── Correct-count pill — lives in TopArea between TopBar and BunnyXPBar ────
// Styled as a prop-driven component so the animation re-triggers on each
// increment via a changing `key` prop (React remounts → CSS animation replays).
const CorrectCountPill = styled(Box, {
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

// ─── Main Component ─────────────────────────────────────────────────────────

const QuestionPage = () => {
  const { playSound } = useSoundContext();
  
  // NEW: Fetch resolution from the store!
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
  const { setScreen, recordSessionStartLevel, recordSessionEndLevel, queueAchievementUnlocks } = useGameStore();
  const mode = useGameStore((state) => state.gameConfig.mode);
  const category = useGameStore((state) => state.gameConfig.category);
  const localPlayerId = mode === "multiplayer" ? getMultiplayerPlayerId(localPlayer.id) : localPlayer.id;

  const multiplayerBridge: MultiplayerBridge | undefined = window.multiplayer;

  const { state: rewardState, trigger: triggerReward, handleLevelUpDone } = useRewardSystem();
  const answerButtonRef = useRef<HTMLElement>(null);
  const { activeEmotes, sendEmote, isOnCooldown } = useEmotes(multiplayerBridge, localPlayerId);

  const previousXP = localPlayer.totalXp;
  const xpEarned = rewardState.data?.xp ?? 0;
  const currentLevel = localPlayer.level;

  const currentQuestion = questions[currentIndex];
  
  const currentStreak = useTriviaStore((state) => state.currentStreak);
  const sessionXpRef = useRef<number>(0);
  const [sessionXpState, setSessionXpState] = useState<number>(0);

  // ── Live correct-answer counter ───────────────────────────────────────────
  // Incremented in the phase==="scoring" effect (same gate as triggerReward)
  // so it only ticks up after the official reveal — never on click.
  // Resets to 0 at the start of each session (phase==="readying", index===0).
  const [liveCorrectCount, setLiveCorrectCount] = useState<number>(0);
  // animKey changes on every increment so React remounts CorrectCountPill,
  // replaying the CSS pop animation each time without needing JS timers.
  const [correctAnimKey, setCorrectAnimKey] = useState<number>(0);

  // ── FIX: Track pending reward data to fire ONLY at reveal phase ──────────
  // Stores the calculated reward data from handleAnswerClick so it can be
  // fired by the phase==="scoring" effect instead of immediately on click.
  const pendingRewardRef = useRef<Parameters<typeof triggerReward>[0] | null>(null);
  // Prevents the reveal-phase effect from double-firing for the same question.
  const rewardFiredForIndexRef = useRef<number>(-1);

  const derivedBunnyState: BunnyState = useMemo(() => {
    if (phase === 'end') return 'winner';
    if (phase === 'scoring') return selectedAnswer === currentQuestion?.correctAnswer ? 'happy' : 'sad';
    if (phase === 'answering') {
      if (!selectedAnswer && timer !== undefined && timer <= 5) return 'panicked';
      if (!selectedAnswer) return 'thinking';
      if (rewardState.showXPBar) return 'running';
      if (currentStreak >= 5) return 'hyper';
      return 'idle'; 
    }
    return 'sleeping';
  }, [phase, timer, selectedAnswer, currentQuestion?.correctAnswer, rewardState.showXPBar]);

  const didLevelUpThisSessionRef = useRef<boolean>(false);
  const levelAfterSessionRef     = useRef<number>(0);
  const endDataRef = useRef<{ achievements: Achievement[]; postUnlockScreen: "result" | "multiplayer-results"; } | null>(null);
  const gameStartTimeRef = useRef<number | null>(null);
  const gameElapsedTimeRef = useRef<number>(0);
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

  const broadcastMultiplayerState = useCallback(() => {
    if (mode !== "multiplayer" || lobbyRole !== "host") return;
    const state = useTriviaStore.getState();
    multiplayerBridge?.broadcastGameState?.({
      phase: state.phase, timer: state.timer, currentIndex: state.currentIndex, seed: state.seed,
      category: state.category ?? undefined, difficulty: state.difficulty ?? undefined,
      questionLimit: state.questionLimit, questionTimer: state.questionTimer, answerTimer: state.answerTimer,
      playerScores: state.playerScores, rankings: state.rankings,
    });
  }, [mode, lobbyRole, multiplayerBridge]);

  // ── FIXED: handleAnswerClick no longer calls triggerReward directly ──────
  // It still accumulates sessionXp and stores the *pending* reward data
  // (score, xp, streak) in a ref. The actual triggerReward call is deferred
  // to the phase==="scoring" useEffect below, which fires for BOTH host and
  // client only after the answer has officially been revealed to everyone.
  const handleAnswerClick = useCallback((answer: string) => {
      submitAnswer(answer);
      const questionToScore = questions[currentIndex];
      if (!questionToScore) return;

      const isCorrect = answer === questionToScore.correctAnswer;
      if (!isCorrect) return;

      if (mode === "solo") {
        const timeTaken = 15 - (timer ?? 0);
        totalSessionTimeRef.current += timeTaken;
        totalAnsweredRef.current += 1;
      }

      const finalScore = scoreIncrementForAnswer(
        true,
        useGameStore.getState().gameConfig.difficulty ?? 'easy',
        timer ?? 0,
        answerTimer,
      );

      // streak is already incremented by submitAnswer → selectAnswer
      const currentStreak = useTriviaStore.getState().currentStreak;
      const xpEarned = calculateXP(finalScore, currentStreak);

      sessionXpRef.current += xpEarned;
      setSessionXpState(sessionXpRef.current);

      const persistedTotalXp = usePlayerStore.getState().getPlayer().totalXp;
      const oldXP = persistedTotalXp + (sessionXpRef.current - xpEarned);
      const newXP = persistedTotalXp + sessionXpRef.current;

      const visualLevel = getLevel(newXP);

      // FIX: Store the reward data in the ref instead of firing immediately.
      // triggerReward will be called by the phase==="scoring" effect below.
      pendingRewardRef.current = {
        score: finalScore,
        xp: xpEarned,
        streak: currentStreak,
        oldXP,
        newXP,
        oldLevel: visualLevel,
        newLevel: visualLevel,
        xpPerLevel: 1000,
        buttonRef: answerButtonRef,
      };
    },
    [submitAnswer, questions, currentIndex, timer, answerTimer, mode]
  );

  // ── FIX: Fire all feedback effects ONLY when the reveal phase begins ─────
  // This is the single source of truth for XP effects, correct-answer
  // effects, and streak/combo effects. Both host and client reach this
  // effect at the same logical moment: when phase transitions to "scoring".
  // The host drives that transition; the client receives it via onGameStateSync.
  useEffect(() => {
    if (phase !== "scoring") return;

    // Already fired for this question — guard against re-renders re-triggering.
    if (rewardFiredForIndexRef.current === currentIndex) return;
    rewardFiredForIndexRef.current = currentIndex;

    // Increment the live correct counter if the local player got it right.
    // pendingRewardRef is only populated for correct answers (handleAnswerClick
    // returns early for incorrect ones), so its presence is the correct-answer signal.
    if (pendingRewardRef.current) {
      setLiveCorrectCount((n) => n + 1);
      setCorrectAnimKey((k) => k + 1);
    }

    // Only trigger visual rewards if the local player answered correctly.
    if (!pendingRewardRef.current) return;

    triggerReward(pendingRewardRef.current);
    pendingRewardRef.current = null;
  }, [phase, currentIndex, triggerReward]);

  // ── Reset pending reward ref when moving to a new question ───────────────
  // Ensures stale data from the previous question never leaks into the next.
  useEffect(() => {
    if (phase === "answering" || phase === "readying") {
      pendingRewardRef.current = null;
    }
  }, [phase, currentIndex]);


  useEffect(() => {
    if (
      phase !== "readying" &&
      phase !== "answering" &&
      phase !== "scoring"
    )
      return;

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

    const activePlayers = players.filter((player) => player.connectionState !== "disconnected");
    if (activePlayers.length === 0) return;

    const state = useTriviaStore.getState();
    const everyoneAnswered = activePlayers.every((player) => {
      if (player.isHost) {
        return Boolean(state.selectedAnswer);
      }

      const answers = state.playerAnswers[player.id];
      return Boolean(answers && answers[state.currentIndex]);
    });

    if (!everyoneAnswered) return;

    useTriviaStore.setState({ phase: "scoring", timer: 3 });
    broadcastMultiplayerState();
  }, [mode, lobbyRole, phase, currentIndex, selectedAnswer, playerAnswers, players, broadcastMultiplayerState]);

  // ── Multiplayer: score current question (host) ──────────────────────────────
  // CRITICAL: Host waits for answer-submission packets to arrive before scoring.
  // Packets can be in-flight for up to ~500ms on a LAN, so we add a 300ms buffer
  // after entering scoring phase to collect as many answers as possible.

const ANSWER_COLLECTION_BUFFER_MS = 300;
const hasScoredRef = useRef(false);
const scoringStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "scoring" || mode !== "multiplayer" || lobbyRole !== "host") {
      if (phase !== "scoring") {
        hasScoredRef.current = false;
        scoringStartTimeRef.current = null;
      }
      return;
    }

    if (hasScoredRef.current) return;

    // Record when scoring phase started to enforce answer collection buffer
    if (scoringStartTimeRef.current === null) {
      scoringStartTimeRef.current = Date.now();
      console.log('[QuestionPage] Scoring phase started, waiting for in-flight answers for', ANSWER_COLLECTION_BUFFER_MS, 'ms');
      return;
    }

    // Wait for buffer period to allow in-flight answer-submission packets to arrive
    const elapsedMs = Date.now() - scoringStartTimeRef.current;
    if (elapsedMs < ANSWER_COLLECTION_BUFFER_MS) {
      return;
    }

    hasScoredRef.current = true;
    console.log('[QuestionPage] Answer collection buffer complete, computing scores');
    scoreCurrentQuestion();
    finalizeRankings();
    broadcastMultiplayerState();
  }, [phase, mode, lobbyRole, scoreCurrentQuestion, finalizeRankings, broadcastMultiplayerState]);

  useEffect(() => {
    if (mode !== "multiplayer" || lobbyRole !== "host") return;
    broadcastMultiplayerState();
  }, [mode, lobbyRole, phase, timer, currentIndex, playerScores, rankings, broadcastMultiplayerState]);

  useEffect(() => {
    if (mode !== "multiplayer" || lobbyRole !== "client" || !multiplayerBridge) return;
    const handleGameStateSync = (payload: MultiplayerGameState) => {
      const currentState = useTriviaStore.getState();
      const shouldResetSelectedAnswer =
        payload.currentIndex !== currentState.currentIndex;

      const mappedRankings = payload.rankings?.map((r) => ({
        playerId: r.playerId,
        name: r.name,
        score: r.score,
        rank: r.rank,
        correctCount: r.correctCount,
        questionsAnswered: r.questionsAnswered,
        accuracy: r.accuracy,
        avgTime: r.avgTime,
        xp: r.xp ?? 0,
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
        ...(mappedRankings !== undefined ? { rankings: mappedRankings } : {}),
      };
      if (shouldResetSelectedAnswer) nextState.selectedAnswer = "";
      useTriviaStore.setState(nextState);
    };
    multiplayerBridge.onGameStateSync("QuestionPage", handleGameStateSync);
    return () => { multiplayerBridge.offGameStateSync?.("QuestionPage"); };
  }, [mode, lobbyRole, multiplayerBridge]);

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
      levelAfterSessionRef.current     = 0;
    }
  }, [phase, currentIndex, recordSessionStartLevel]);



  useEffect(() => {
    if (phase !== "end" || endProgressAppliedRef.current) return;
    endProgressAppliedRef.current = true;
    const gameConfig = useGameStore.getState().gameConfig;
    const { mode, category, difficulty } = gameConfig || {};
    if (!mode || !category || !difficulty) return;
    if (mode === "multiplayer") finalizeRankings();

    const triviaState = useTriviaStore.getState();
    const { userAnswers: finalUserAnswers, questions: finalQuestions, rankings: finalRankings, playerScores: finalPlayerScores, maxStreak } = triviaState;

    const correctAnswersCount = finalQuestions.filter(
      (q, index) => q.correctAnswer === finalUserAnswers[index]
    ).length;

    const currentPlayerScore =
      mode === "multiplayer"
        ? finalRankings.find((entry) => entry.playerId === localPlayerId)?.score
          ?? finalPlayerScores[localPlayerId]
          ?? 0
        : triviaState.score;

    const playerRank =
      mode === "multiplayer"
        ? finalRankings.find((entry) => entry.playerId === localPlayerId)?.rank
          ?? 1 + Object.values(finalPlayerScores).filter((s) => s > currentPlayerScore).length
        : 0;

    const elapsedMs = gameStartTimeRef.current ? Date.now() - gameStartTimeRef.current : 0;
    const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));
    gameElapsedTimeRef.current = elapsedSeconds;

    const avgTime = totalAnsweredRef.current > 0 ? Math.round((totalSessionTimeRef.current / totalAnsweredRef.current) * 10) / 10 : 0.0;
    useTriviaStore.setState({ avgTime });

    const postUnlockScreen = mode === "multiplayer" ? "multiplayer-results" : "result";
    const progressionInput: SessionProgressInput = {
      mode,
      category,
      difficulty,
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
      fellBehindByHalfAndWon:
        mode === "multiplayer" && playerRank === 1 && fellBehindByHalfRef.current,
      rank: mode === "multiplayer" ? playerRank : undefined,
    };

    const newlyUnlockedAchievements = applySessionProgress(progressionInput);

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

  const isRevealed = phase === "scoring";
  const correctAnswer = currentQuestion?.correctAnswer;
  const getAnswerState = (answer: string) => ({
    isSelected: selectedAnswer === answer,
    isCorrect: isRevealed && answer === correctAnswer,
    isIncorrect: isRevealed && selectedAnswer === answer && answer !== correctAnswer
  });

  const isAnswered = !!selectedAnswer || phase === "scoring";

  if (!currentQuestion) return <OuterSpace><GameScreen sx={{ width: resolution.width, height: resolution.height, justifyContent: 'center' }}><Typography sx={{ color: '#00E5FF' }}>LOADING MAINFRAME...</Typography></GameScreen></OuterSpace>;

  return (
    <OuterSpace>
      {/* ── RESOLUTION LOCK ── Game strictly follows width/height from store */}
      <GameScreen sx={{ width: resolution.width, height: resolution.height }}>
        
        {/* ── TOP HUD (XP BAR AND CATEGORY) ────────────────────────────────── */}
        <TopArea>
          <TopBar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
               <Typography sx={{ fontFamily: "'Courier New', monospace", fontSize: '14px', color: '#888' }}>
                 {currentIndex + 1}/{questionLimit}
               </Typography>
            </Box>

            <Typography sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: '14px', color: '#35E52B', textAlign: 'center' }}>
              {category ?? "TRIVIA"}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
              <Clock style={{ width: 16, height: 16, color: "#fff" }} />
              <Typography sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: '16px', color: '#fff' }}>
                {timer !== undefined ? `${Math.ceil(timer)}S` : "--S"}
              </Typography>
            </Box>
          </TopBar>

          {/* ── LIVE CORRECT COUNTER — sits between nav row and XP bar ─────── */}
          {/* Right-aligned so it pairs visually with the XP label below it.    */}
          {/* Uses a key-swap to replay the pop animation on every increment.   */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: '6px', mt: '-2px' }}>
            <CorrectCountPill key={correctAnimKey} hasCorrect={liveCorrectCount > 0}>
              <Typography sx={{
                fontFamily: "'Courier New', monospace",
                fontSize: '10px',
                color: liveCorrectCount > 0 ? '#35E52B99' : '#333',
                letterSpacing: '1.5px',
                lineHeight: 1,
                transition: 'color 0.4s ease',
              }}>
                CORRECT
              </Typography>
              <Typography sx={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '11px',
                color: liveCorrectCount > 0 ? '#35E52B' : '#2a2a2a',
                lineHeight: 1,
                textShadow: liveCorrectCount > 0 ? '0 0 8px rgba(53,229,43,0.6)' : 'none',
                transition: 'color 0.4s ease, text-shadow 0.4s ease',
                minWidth: '18px',
                textAlign: 'right',
              }}>
                {liveCorrectCount}
              </Typography>
            </CorrectCountPill>
          </Box>

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
          <Typography sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: '16px', color: '#35E52B', textAlign: 'center', lineHeight: 2 }}>
            {currentQuestion.text}
          </Typography>
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
                <Box component="span" sx={{ color: 'inherit' }}>
                  {ANSWER_LABELS[idx]}.
                </Box>
                {answer}
              </AnswerButton>
            );
          })}
        </AnswerGrid>

        {/* ── BOTTOM HUD (MASCOT, TAGLINE, COLLECTIBLE) ─────────────────────── */}
        <BottomHud>
          {/* Left: Mascot */}
          <Box sx={{ width: '120px', height: '120px', display: 'flex', alignItems: 'flex-end' }}>
            <BunnyMascot state={derivedBunnyState} size={110} />
          </Box>

          {/* Center: Tagline & Emote Spawner */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            
            {/* Render flying emotes for EVERY player who sends one */}
            {Object.keys(activeEmotes).map((pid) => (
              <PlayerEmoteOverlay key={pid} playerId={pid} emotes={activeEmotes} />
            ))}

            <Typography sx={{ 
              fontFamily: "'Press Start 2P', monospace", 
              fontSize: '14px', 
              color: '#35E52B', 
              textAlign: 'center', 
              lineHeight: 1.8,
              animation: `${retroFlicker} 3s infinite` 
            }}>
              THINK FAST<br />GUESS FASTER
            </Typography>
          </Box>

          {/* Right: Interactive Emote Carrot */}
          <Box sx={{ justifySelf: 'end' }}>
            <EmoteControls sendEmote={sendEmote} isOnCooldown={isOnCooldown} />
          </Box>
        </BottomHud>

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