import { useEffect, useRef, useCallback, useMemo } from "react";
import { Box, Typography, Button, Card } from "@mui/material";
import { useTriviaStore, useMultiplayerStore, useGameStore, usePlayerStore } from "../store";
import { Clock } from 'pixelarticons/react';
import type { SessionProgressInput } from "src/progression/progressionRules";
import type { MultiplayerBridge, MultiplayerGameState } from "../types/multiplayer";
import type { TriviaState } from "../store";
import { scoreForCorrectAnswers } from "../rules";
import { timerTickIntervalMs } from "../config/gameConfig";

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
      }, timerTickIntervalMs);
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

  const renderHUD = () => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 2,
        py: 1.5,
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        color: 'text.secondary',
      }}
    >
      <Typography variant="body2">
        {Math.min(currentIndex + 1, Math.max(questions.length, 1))} / {questions.length || 1}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Clock />
        <Typography variant="body2">
          {phase === 'scoring' && !selectedAnswer
            ? "TIME'S UP!"
            : phase === 'scoring'
              ? '---'
              : Math.ceil(timer)}
        </Typography>
      </Box>
    </Box>
  );

  const renderScoringPhase = () => {
    const scoreEntries = displayedRankings.slice(0, 6);

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' },
          gap: 2,
          minHeight: 0,
        }}
      >
        <Card variant="outlined" sx={{ p: 3, minHeight: 0 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 1, opacity: 0.7 }}>
            Current question
          </Typography>
          <Typography variant="h4" textAlign="center" sx={{ mb: 3 }}>
            {currentQuestion?.text ?? 'No question loaded'}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption">Your answer</Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {selectedAnswer || 'No answer'}
              </Typography>
            </Card>

            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption">Correct answer</Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {currentQuestion?.correctAnswer ?? '—'}
              </Typography>
            </Card>

            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption">Next question in</Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {Math.ceil(timer)}s
              </Typography>
            </Card>

            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption">Mode</Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {mode ?? 'solo'}
              </Typography>
            </Card>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ p: 3, minHeight: 0 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 2, opacity: 0.7 }}>
            Rankings
          </Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            {scoreEntries.map((entry) => (
              <Box
                key={entry.playerId}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  bgcolor: entry.playerId === localPlayer.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                }}
              >
                <Typography variant="body2">
                  #{entry.rank} {entry.name}
                </Typography>
                <Typography variant="body2">{entry.score}</Typography>
              </Box>
            ))}
          </Box>
        </Card>
      </Box>
    );
  };

  const renderContent = () => {
    switch (phase) {
      case 'loading':
        return (
          <Typography sx={{ alignSelf: 'center', textAlign: 'center' }}>
            Loading...
          </Typography>
        );
      case 'readying':
        return (
          <Box sx={{ alignSelf: 'center', textAlign: 'center' }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Get ready!
            </Typography>
            <Typography variant="body1">
              Starting in {Math.ceil(timer)}...
            </Typography>
          </Box>
        );
      case 'scoring':
        return renderScoringPhase();
      case 'answering':
      case 'asking':
        return (
          <>
            <Card
              variant="outlined"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                minHeight: { xs: 180, md: 240 },
              }}
            >
              <Typography variant="h4" textAlign="center">
                {currentQuestion?.text ?? 'Loading...'}
              </Typography>
            </Card>

            {phase !== 'asking' && currentQuestion && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                {currentQuestion.allAnswers.map((answer) => (
                  <Button
                    key={answer}
                    fullWidth
                    variant={selectedAnswer === answer ? 'contained' : 'outlined'}
                    onClick={() => handleAnswerClick(answer)}
                    sx={{ py: 2 }}
                  >
                    {answer}
                  </Button>
                ))}
              </Box>
            )}
          </>
        );
      case 'ranking':
        return null;
      case 'end':
        return (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              No questions available for the selected criteria.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setScreen('home')}
            >
              Back to Menu
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gap: 2,
        p: 4,
        boxSizing: 'border-box',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {renderHUD()}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          alignContent: 'center',
          minHeight: 0,
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
};

export default QuestionPage;
