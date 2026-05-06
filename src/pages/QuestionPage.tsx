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
    // selectAnswer,
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
    (answer:string) => {
      submitAnswer(answer);
    },
    [submitAnswer]
  );

  // Timer and sync effect
  useEffect(() => {
    if (phase !== 'readying' && phase !== 'answering' && phase !== 'asking' && phase !== 'scoring') return;

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

  /**
   * Host path
   */
  useEffect(() => {
    if(mode !== "multiplayer" || lobbyRole !== 'host' || !multiplayerBridge) return;
    const handleAnswerSubmission = (payload: { lobbyId: string; playerId: string; questionIndex: number; answer: string }) => {
      if (payload.questionIndex !== currentIndex) return;
      receiveRemoteAnswer(payload.playerId, payload.questionIndex, payload.answer);
    };

        multiplayerBridge.onAnswerSubmission?.('QuestionPage', handleAnswerSubmission);
    return()=>{
        multiplayerBridge.offAnswerSubmission?.('QuestionPage');

    };
  }, [mode, lobbyRole, multiplayerBridge, currentIndex, receiveRemoteAnswer]);


  const hasScoredRef = useRef(false);

  useEffect(() => {
    if(hasScoredRef.current) return;
    if(phase === "scoring" && mode === "multiplayer" && lobbyRole === "host"){
      hasScoredRef.current = true;
      scoreCurrentQuestion();
      finalizeRankings();
      broadcastMultiplayerState();
    }
  }, [phase, mode, lobbyRole, multiplayerBridge, scoreCurrentQuestion, finalizeRankings, broadcastMultiplayerState]);
  
  useEffect(() => {
    if(phase !== "scoring"){
      hasScoredRef.current = false;
    }
  }, [phase]);

  useEffect(() => {
    if (mode !== 'multiplayer' || lobbyRole !== 'host') return;
    broadcastMultiplayerState();
  }, [mode, lobbyRole, phase, timer, currentIndex, playerScores, rankings, broadcastMultiplayerState]);
  /**
   * Client path
   */
  useEffect(() => {
    if(mode !== 'multiplayer' || lobbyRole !== 'client' || !multiplayerBridge) return;
    const handleGameStateSync = (payload: MultiplayerGameState) => {
      const currentState = useTriviaStore.getState();
      const shouldResetSelectedAnswer = payload.currentIndex !== currentState.currentIndex;

      const nextState: Partial<Pick<TriviaState,
        | 'phase'
        | 'timer'
        | 'currentIndex'
        | 'seed'
        | 'category'
        | 'difficulty'
        | 'questionLimit'
        | 'questionTimer'
        | 'answerTimer'
        | 'playerScores'
        | 'rankings'
        | 'selectedAnswer'
      >> = {
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

      if (shouldResetSelectedAnswer) nextState.selectedAnswer = '';

      useTriviaStore.setState(nextState);
    };
    const handleHostExit = () => {
       const state = useTriviaStore.getState();
       if (state.phase === 'end' || state.phase === 'ranking' || state.phase === 'scoring') return;
       console.warn('[renderer] Host exit detected mid-game');
       useMultiplayerStore.getState().resetMultiplayer();
       useTriviaStore.getState().resetGame();
       setScreen('multiplayer-menu');
    };
    multiplayerBridge.onGameStateSync('QuestionPage', handleGameStateSync);
    multiplayerBridge.onHostExit?.('QuestionPage', handleHostExit);
    
    return () => {
      multiplayerBridge.offGameStateSync?.('QuestionPage');
      multiplayerBridge.offHostExit?.('QuestionPage');
    };
  }, [mode, lobbyRole, multiplayerBridge, setScreen]);

  // Navigate to result when game ends
  useEffect(() => {
    if (phase === 'end') {
      setScreen('result');
    } else if (phase === 'ranking') {
      nextPhase();
    }
  }, [phase, setScreen, nextPhase]);

  // Apply session progression as a side-effect when the game ends
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
      (q, index) => q.correctAnswer === userAnswers[index]
    ).length;

    const fallbackScore = scoreForCorrectAnswers(correctAnswersCount);
    const rankingEntry = triviaState.rankings.find((entry) => entry.playerId === localPlayerId);
    
    // Use playerScores directly if rankings aren't ready yet
    const triviaPlayerScores = triviaState.playerScores;
    const currentPlayerScore =
      mode === 'multiplayer'
        ? (rankingEntry?.score ?? triviaPlayerScores[localPlayerId] ?? fallbackScore)
        : fallbackScore;
        
    const playerRank =
      mode === 'multiplayer'
        ? (rankingEntry?.rank ?? (1 + Object.values(triviaPlayerScores).filter((s) => s > currentPlayerScore).length))
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
      mastered: correctAnswersCount === questionsState.length,
      won: mode === 'multiplayer' ? playerRank === 1 : false,
      topThreeFinish: mode === 'multiplayer' ? playerRank <= 3 : false,
    };

    applySessionProgress(progressionInput);
  }, [phase, applySessionProgress, localPlayerId]);

  const currentQuestion = questions[currentIndex];

  const displayedRankings = useMemo(() => {
    const byPlayerId = new Map<string, { playerId: string; name: string; score: number }>();

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
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [rankings, players, playerScores, localPlayer.id, localPlayer.name]);

  const renderScoringPhase = () => {
    return (
      <Box
        sx={{
          gridRow: '2 / span 2',
          display: 'grid',
          gridTemplateRows: '1fr 1fr',
          gap: 2,
          minHeight: 0,
        }}
      >
        <Card
          variant="outlined"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            m: 1,
            minHeight: 0,
            transition: 'all 0.5s ease-in-out',
          }}
        >
          <Typography variant="h4" textAlign="center">
            {currentQuestion?.text || 'Loading...'}
          </Typography>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 2,
            p: 1,
            minHeight: 0,
          }}
        >
          <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
            <Typography variant="caption">Your answer</Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>{selectedAnswer || 'No answer'}</Typography>
          </Card>

          <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
            <Typography variant="caption">Correct answer</Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>{currentQuestion?.correctAnswer}</Typography>
          </Card>

          <Card
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 0,
            }}
          >
            <Typography variant="body2">
              Next in {Math.ceil(timer)}s
            </Typography>
          </Card>

          <Button
            variant="contained"
            size="large"
            onClick={() => nextPhase()}
            sx={{
              display: 'none',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
            }}
          >
          </Button>
          {/*
          <Typography variant="h5" sx={{ mb: 2 }}>
            Scoreboard
          </Typography>

          {scoreEntries.map((entry) => (
            <Box key={entry.playerId} sx={{ mb: 1 }}>
              <Typography>
                {entry.name}: {entry.score}
              </Typography>
            </Box>
          ))}
          */}
        </Box>
      </Box>
    );
  };


  // Render based on phase and mode
  const renderHUD = () => (
    <Box
      sx={{
        gridRow: '1',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 2,
        borderBottom: '1px solid #333',
      }}
    >
      <Typography variant="body2" sx={{ color: '#666' }}>
        {currentIndex + 1} / {questions.length}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Clock />
        <Typography variant="body2">{ phase==='scoring' && !selectedAnswer ? 'TIME\'S UP!' : phase === 'scoring' ? "---" : timer }</Typography>
      </Box>
    </Box>
  );
  const renderContent = () => {
    switch (phase) {
      case 'loading':
        return <Typography sx={{ gridRow: '2 / span 2', alignSelf: 'center', textAlign: 'center' }}>Loading...</Typography>;
      case 'readying':
        return (
          <Box sx={{ gridRow: '2 / span 2', alignSelf: 'center', textAlign: 'center' }}>
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
        // Question preview should display on multiplayer mode only
        return (
          <>
          <Card
            variant="outlined"
            sx={{
              gridRow: phase === 'asking' ? '2 / span 2' : '2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              m: 1,
              transition: 'all 0.5s ease-in-out'
            }}
          >
            <Typography variant="h4" textAlign="center">
              {currentQuestion?.text || "Loading..."}
            </Typography>
          </Card>
          {/*Options*/}
          {phase !== 'asking' && (
            <Box sx={{
              gridRow: '3',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              p: 1
            }}>
              {currentQuestion?.allAnswers.map((answer, index) => (
                <Button
                  fullWidth
                  key={index}
                  variant={selectedAnswer === answer ? "contained" : "outlined"}
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

      // in case we need to show rankings overlay / hud later or something
      case 'ranking': {
        return null;
      }

      // case 'end': {
      //   const gameConfig = useGameStore.getState().gameConfig;
      //   const { mode, category, difficulty } = gameConfig;

      //   if (!mode || !category || !difficulty) {
      //     return (
      //       <Box sx={{ textAlign: 'center', py: 8 }}>
      //         <Typography variant="h6" sx={{ mb: 3 }}>
      //           Missing game configuration.
      //         </Typography>
      //         <Button
      //           variant="contained"
      //           color="primary"
      //           onClick={() => setScreen('home')}
      //         >
      //           Back to Menu
      //         </Button>
      //       </Box>
      //     );
      //   }

        
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
      }

    //   default:
    //     return null;
    // }
  };

  return (
    <Box sx={{ width: '100%',
      height: '100%',
      display: 'grid',
      gridTemplateRows: '1fr 3fr 4fr',
      padding: '40px',
      boxSizing: 'border-box',
      bgcolor: 'background.default',
      overflow: 'hidden'
    }}>
      {renderHUD()}
      {renderContent()}
    </Box>
  );
};

export default QuestionPage;
