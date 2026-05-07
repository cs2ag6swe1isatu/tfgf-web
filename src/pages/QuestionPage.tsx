import { useEffect, useRef, useCallback, useMemo } from "react";
import { Box, Typography, Button, Card } from "@mui/material";
import { useTriviaStore, useMultiplayerStore, useGameStore, usePlayerStore } from "../store";
import { Clock } from 'pixelarticons/react';
import type { SessionProgressInput } from "src/progression/progressionRules";
import type { MultiplayerBridge, MultiplayerGameState } from "../types/multiplayer";
import type { TriviaState } from "../store";
import { scoreForCorrectAnswers } from "../rules";

const QuestionPage = () => {
  const {
    questions,
    currentIndex,
    phase,
    selectedAnswer,
    timer,
    playerScores,
    rankings,
    submitAnswer,
    receiveRemoteAnswer,
    scoreCurrentQuestion,
    finalizeRankings,
    nextPhase,
  } = useTriviaStore();

  const {
    applySessionProgress,
  } = usePlayerStore();

  const localPlayerId = usePlayerStore((state) => state.getPlayer().id);

  const localPlayer = usePlayerStore((state) => state.getPlayer());

  const {
    lobbyRole,
    players,
  } = useMultiplayerStore();

  const { setScreen } = useGameStore();

  const mode = useGameStore((state) => state.gameConfig.mode);

  const multiplayerBridge: MultiplayerBridge | undefined = window.multiplayer;

  const broadcastMultiplayerState = useCallback(() => {
    if (mode !== 'multiplayer' || lobbyRole !== 'host') return;

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

  const handleAnswerClick = useCallback(
    (answer: string) => {
      submitAnswer(answer);
    },
    [submitAnswer]
  );

  useEffect(() => {
    if (
      phase !== 'readying' &&
      phase !== 'answering' &&
      phase !== 'asking' &&
      phase !== 'scoring'
    ) return;

    let timerInterval: number;

    if (mode === 'solo' || lobbyRole === 'host') {
      timerInterval = window.setInterval(() => {
        useTriviaStore.getState().tickTimer();

        if (mode === 'multiplayer' && lobbyRole === 'host') {
          broadcastMultiplayerState();
        }
      }, 1000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [phase, mode, lobbyRole, broadcastMultiplayerState]);

  useEffect(() => {
    if (
      mode !== "multiplayer" ||
      lobbyRole !== 'host' ||
      !multiplayerBridge
    ) return;

    const handleAnswerSubmission = (
      payload: {
        lobbyId: string;
        playerId: string;
        questionIndex: number;
        answer: string;
      }
    ) => {
      if (payload.questionIndex !== currentIndex) return;

      receiveRemoteAnswer(
        payload.playerId,
        payload.questionIndex,
        payload.answer
      );
    };

    multiplayerBridge.onAnswerSubmission?.(
      'QuestionPage',
      handleAnswerSubmission
    );

    return () => {
      multiplayerBridge.offAnswerSubmission?.('QuestionPage');
    };
  }, [
    mode,
    lobbyRole,
    multiplayerBridge,
    currentIndex,
    receiveRemoteAnswer
  ]);

  const hasScoredRef = useRef(false);

  useEffect(() => {
    if (hasScoredRef.current) return;

    if (
      phase === "scoring" &&
      mode === "multiplayer" &&
      lobbyRole === "host"
    ) {
      hasScoredRef.current = true;

      scoreCurrentQuestion();
      finalizeRankings();
      broadcastMultiplayerState();
    }
  }, [
    phase,
    mode,
    lobbyRole,
    multiplayerBridge,
    scoreCurrentQuestion,
    finalizeRankings,
    broadcastMultiplayerState
  ]);

  useEffect(() => {
    if (phase !== "scoring") {
      hasScoredRef.current = false;
    }
  }, [phase]);

  useEffect(() => {
    if (mode !== 'multiplayer' || lobbyRole !== 'host') return;

    broadcastMultiplayerState();
  }, [
    mode,
    lobbyRole,
    phase,
    timer,
    currentIndex,
    playerScores,
    rankings,
    broadcastMultiplayerState
  ]);

  useEffect(() => {
    if (
      mode !== 'multiplayer' ||
      lobbyRole !== 'client' ||
      !multiplayerBridge
    ) return;

    const handleGameStateSync = (
      payload: MultiplayerGameState
    ) => {
      const currentState = useTriviaStore.getState();

      const shouldResetSelectedAnswer =
        payload.currentIndex !== currentState.currentIndex;

      const nextState: Partial<TriviaState> = {
        phase: payload.phase,
        timer: payload.timer,
        currentIndex: payload.currentIndex,
        ...(payload.seed !== undefined
          ? { seed: payload.seed }
          : {}),
        ...(payload.category !== undefined
          ? { category: payload.category ?? undefined }
          : {}),
        ...(payload.difficulty !== undefined
          ? { difficulty: payload.difficulty ?? undefined }
          : {}),
        ...(payload.questionLimit !== undefined
          ? { questionLimit: payload.questionLimit }
          : {}),
        ...(payload.questionTimer !== undefined
          ? { questionTimer: payload.questionTimer }
          : {}),
        ...(payload.answerTimer !== undefined
          ? { answerTimer: payload.answerTimer }
          : {}),
        ...(payload.playerScores !== undefined
          ? { playerScores: payload.playerScores }
          : {}),
        ...(payload.rankings !== undefined
          ? { rankings: payload.rankings }
          : {}),
      };

      if (shouldResetSelectedAnswer) {
        nextState.selectedAnswer = '';
      }

      useTriviaStore.setState(nextState);
    };

    multiplayerBridge.onGameStateSync(
      'QuestionPage',
      handleGameStateSync
    );

    return () => {
      multiplayerBridge.offGameStateSync?.('QuestionPage');
    };
  }, [mode, lobbyRole, multiplayerBridge]);

  useEffect(() => {
    if (phase === 'end') {
      setScreen('result');
    } else if (phase === 'ranking') {
      nextPhase();
    }
  }, [phase, setScreen, nextPhase]);

  const endProgressAppliedRef = useRef(false);

  useEffect(() => {
    if (phase !== 'end' || endProgressAppliedRef.current) return;

    endProgressAppliedRef.current = true;

    const gameConfig = useGameStore.getState().gameConfig;

    const { mode, category, difficulty } = gameConfig || {};

    if (!mode || !category || !difficulty) return;

    const triviaState = useTriviaStore.getState();

    const userAnswers = triviaState.userAnswers;

    const questionsState = triviaState.questions;

    const correctAnswersCount = questionsState.filter(
      (q, index) =>
        q.correctAnswer === userAnswers[index]
    ).length;

    const fallbackScore =
      scoreForCorrectAnswers(correctAnswersCount);

    const rankingEntry = triviaState.rankings.find(
      (entry) => entry.playerId === localPlayerId
    );

    const triviaPlayerScores = triviaState.playerScores;

    const currentPlayerScore =
      mode === 'multiplayer'
        ? (
            rankingEntry?.score ??
            triviaPlayerScores[localPlayerId] ??
            fallbackScore
          )
        : fallbackScore;

    const playerRank =
      mode === 'multiplayer'
        ? (
            rankingEntry?.rank ??
            (
              1 +
              Object.values(triviaPlayerScores)
                .filter((s) => s > currentPlayerScore)
                .length
            )
          )
        : 0;

    const progressionInput: SessionProgressInput = {
      mode,
      category,
      difficulty,
      totalQuestions: questionsState.length,
      correctAnswers: correctAnswersCount,
      score: currentPlayerScore,
      questions: questionsState,
      userAnswers,
      timeTaken: 0,
      mastered:
        correctAnswersCount === questionsState.length,
      won:
        mode === 'multiplayer'
          ? playerRank === 1
          : false,
      topThreeFinish:
        mode === 'multiplayer'
          ? playerRank <= 3
          : false,
    };

    applySessionProgress(progressionInput);
  }, [phase, applySessionProgress, localPlayerId]);

  const currentQuestion = questions[currentIndex];

  const displayedRankings = useMemo(() => {
    const byPlayerId = new Map<
      string,
      {
        playerId: string;
        name: string;
        score: number;
      }
    >();

    rankings.forEach((entry) => {
      byPlayerId.set(entry.playerId, {
        playerId: entry.playerId,
        name: entry.name,
        score: entry.score,
      });
    });

    players.forEach((player) => {
      if (!byPlayerId.has(player.id)) {
        byPlayerId.set(player.id, {
          playerId: player.id,
          name: player.name,
          score: playerScores[player.id] ?? 0,
        });
      }
    });

    if (!byPlayerId.has(localPlayer.id)) {
      byPlayerId.set(localPlayer.id, {
        playerId: localPlayer.id,
        name: localPlayer.name,
        score: playerScores[localPlayer.id] ?? 0,
      });
    }

    return Array.from(byPlayerId.values())
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
  }, [
    rankings,
    players,
    playerScores,
    localPlayer.id,
    localPlayer.name
  ]);

  return (
    <Box>
      <Typography>Question Page</Typography>
    </Box>
  );
};

export default QuestionPage;
