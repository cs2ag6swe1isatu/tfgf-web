import { useEffect, useMemo } from "react";
import { Container, Box, Typography, Button, Card } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";
import { Clock } from 'pixelarticons/react';

const QuestionPage = () => {
  const {
    questions,
    currentIndex,
    phase,
    selectedAnswer,
    timer,
    questionTimer,
    answerTimer,
    score,
    category,
    difficulty,
    selectAnswer,
    nextPhase,
    resetGame,
  } = useTriviaStore();

  const { setScreen } = useGameStore();

  const handleAnswerSelect = (answer: string) => {
    if (phase !== 'answering') return;
    selectAnswer(answer);
  };

  // Timer effect
  useEffect(() => {
    if (phase !== 'answering' && phase !== 'asking') return;

    const timerInterval = setInterval(() => {
      useTriviaStore.getState().tickTimer();
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [phase]);

  // Auto-advance from scoring to next phase
  useEffect(() => {
    if (phase === 'asking') {
      const timeout = setTimeout(() => {
        nextPhase();
      }, questionTimer * 1000); 
      return () => clearTimeout(timeout);
    } if (phase === 'scoring') {
      const timeout = setTimeout(() => {
        nextPhase();
      }, answerTimer * 1000);
      return () => clearTimeout(timeout);
    }
  }, [phase, nextPhase]);

  // Navigate to result when game ends
  useEffect(() => {
    if (phase === 'end') {
      setScreen('result');
    }
  }, [phase, setScreen]);

  const currentQuestion = questions[currentIndex];
  const isCorrect = useMemo(() => {
    if (!currentQuestion || !selectedAnswer) return false;
    return selectedAnswer === currentQuestion.correctAnswer;
  }, [currentQuestion, selectedAnswer]);
  const isTimeout = !selectedAnswer && !isCorrect;  // Check if this is a timeout (no answer selected)

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
        <Typography variant="body2">{ phase==='scoring' && !selectedAnswer ? 'TIME\'S UP!' : timer }</Typography>
      </Box>
    </Box>
  );
  const renderContent = () => {
    switch (phase) {
      case 'loading':
        return <Typography sx={{ gridRow: '2 / span 2', alignSelf: 'center', textAlign: 'center' }}>Loading...</Typography>;

      case 'answering':
      case 'scoring':
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
                  disabled={phase === 'scoring'}
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


      case 'ranking':
        return (
          <Box sx={{ gridRow: '2 / span 2', textAlign: 'center', p: 4 }}>
             <Typography variant="h4">Game Over</Typography>
             <Button onClick={() => setScreen('home')}>Back Home</Button>
          </Box>
        );

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
    <Box sx={{ width: '100%',
      height: '100%',
      display: 'grid',
      gridTemplateRows: '1fr 3fr 4fr',
      padding: '40px',
      boxSizing: 'border-box',
      bgColor: 'background.default',
      overflow: 'hidden'
    }}>
      {renderHUD()}
      {renderContent()}
    </Box>
  );
};

export default QuestionPage;
