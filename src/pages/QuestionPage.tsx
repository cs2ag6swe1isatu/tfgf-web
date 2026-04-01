import { useEffect, useRef } from "react";
import { Box, Typography, Button, Card } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";
import { usePlayerStore } from "../store/playerStore";
import { Clock } from 'pixelarticons/react';
import type { SessionProgressInput } from "src/progression/progressionRules";

const QuestionPage = () => {
  const {
    questions,
    currentIndex,
    phase,
    selectedAnswer,
    timer,
    selectAnswer,
    nextPhase,
  } = useTriviaStore();
  const {
    applySessionProgress,
  } = usePlayerStore();

  const { setScreen } = useGameStore();

  // Timer effect
  useEffect(() => {
    if (phase !== 'readying' && phase !== 'answering' && phase !== 'asking' && phase !== 'scoring') return;

    const timerInterval = setInterval(() => {
      useTriviaStore.getState().tickTimer();
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [phase]);

  // Navigate to result when game ends
  useEffect(() => {
    if (phase === 'end') {
      setScreen('result');
    }
  }, [phase, setScreen]);

  // Apply session progression as a side-effect when the game ends
  const endProgressAppliedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'end' || endProgressAppliedRef.current) return;
    endProgressAppliedRef.current = true;

    const gameConfig = useGameStore.getState().gameConfig;
    const { mode, category, difficulty } = gameConfig || {};
    if (!mode || !category || !difficulty) return;

    const userAnswers = useTriviaStore.getState().userAnswers;
    const questionsState = useTriviaStore.getState().questions;

    const correctAnswersCount = questionsState.filter(
      (q, index) => q.correctAnswer === userAnswers[index]
    ).length;

    const currentPlayerScore = correctAnswersCount * 10;
    const simulatedOpponentScores = [130, 90, 50];
    const playerRank = 1 + simulatedOpponentScores.filter((score) => score > currentPlayerScore).length;

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
      won: mode === 'solo' ? false : playerRank === 1,
      topThreeFinish: mode === 'solo' ? false : playerRank <= 3,
    };

    applySessionProgress(progressionInput);
  }, [phase, applySessionProgress]);

  const currentQuestion = questions[currentIndex];

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
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            Next
          </Button>
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
                  onClick={() => selectAnswer(answer)}
                  sx={{ py: 2, fontSize: '1.1rem' }}
                >
                  {answer}
                </Button>
              ))}
            </Box>
          )}
          </>
        );


      case 'ranking': {
        // Mock player rankings for multiplayer mode
        const userAnswers = useTriviaStore.getState().userAnswers;
        const currentPlayerScore = questions.filter(
          (q, index) => q.correctAnswer === userAnswers[index]
        ).length * 10;

        const mockRankings = [
          { rank: 2, name: 'Player Alpha', score: 130, correct: 13 },
          { rank: 1, name: 'You', score: currentPlayerScore, correct: Math.round(currentPlayerScore / 10) },
          { rank: 3, name: 'Player Beta', score: 90, correct: 9 },
          { rank: 4, name: 'Player Gamma', score: 50, correct: 5 },
        ].sort((a, b) => b.score - a.score);

        return (
          <Box sx={{ gridRow: '2 / span 2', textAlign: 'center', p: 4, overflowY: 'auto' }}>
            <Typography sx={{ mb: 3, fontSize: '1.3rem', fontWeight: 'bold' }}>
              Final Rankings
            </Typography>

            <Box sx={{ mt: 3 }}>
              {mockRankings.map((player, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #ddd' }}>
                  <Typography>
                    #{player.rank} - {player.name}
                  </Typography>
                  <Typography>
                    Score: {player.score} ({player.correct}/{questions.length} correct)
                  </Typography>
                </Box>
              ))}
            </Box>

            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => nextPhase()}
              sx={{ mt: 4 }}
            >
              Next
            </Button>
          </Box>
        );
      }

      case 'end': {
        const gameConfig = useGameStore.getState().gameConfig;
        const { mode, category, difficulty } = gameConfig;

        if (!mode || !category || !difficulty) {
          return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Missing game configuration.
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

      default:
        return null;
    }
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
