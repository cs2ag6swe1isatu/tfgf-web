import { useEffect, useMemo } from "react";
import { Container, Box, Typography, Button, Card } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";

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
  const nextQuestion = questions[currentIndex];
  const isCorrect = useMemo(() => {
    if (!currentQuestion || !selectedAnswer) return false;
    return selectedAnswer === currentQuestion.correctAnswer;
  }, [currentQuestion, selectedAnswer]);
  const isTimeout = !selectedAnswer && !isCorrect;  // Check if this is a timeout (no answer selected)

  // Render based on phase and mode
  const renderHUD = () => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
        pb: 2,
        borderBottom: '1px solid #333',
      }}
    >
      <Typography variant="body2" sx={{ color: '#666' }}>
        {currentIndex + 1} / {questions.length}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* <TimerIcon fontSize="small" /> */}
        <Typography variant="body2">{timer}</Typography>
      </Box>
    </Box>
  );
  const renderContent = () => {
    switch (phase) {
      case 'loading':
        return (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6">
              Loading questions...
            </Typography>
            <Typography variant="body2" sx={{ color: '#999999', mt: 1 }}>
              Category: {category} | Difficulty: {difficulty}
            </Typography>
          </Box>
        );

      case 'asking':
        // Question preview should display on multiplayer mode only
        return (
          <Box sx={{ py: 4 }}>
            {renderHUD()}
            <Box sx={{ 
              variant: 'outlined',
              minHeight: '300px',
              p: 3,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {nextQuestion ? (
                <Typography variant="h6" sx={{ lineHeight: 1.6 }}>
                  {nextQuestion.text}
                </Typography>
              ) : (
                <Typography variant="h6" sx={{ color: '#999999' }}>
                  Loading question...
                </Typography>
              )}
            </Box>
          </Box>
        );

      case 'answering':
        if (!currentQuestion) {
          return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Loading question...
              </Typography>
            </Box>
          );
        }

        return (
          <Box sx={{ py: 4 }}>
            {renderHUD()}
            {/* Question text - top half */}
            <Card sx={{ 
              variant: 'paper',
              minHeight: '300px',
              p: 3,
              display: 'flex',
              textAlign: 'center',
              alignItems: 'center',
              mb: 3
            }}>
              <Typography variant="h6" sx={{ lineHeight: 1.6 }}>
                {currentQuestion.text}
              </Typography>
            </Card>
            {/* Answer buttons - bottom half */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {currentQuestion.allAnswers.map((answer, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  color="primary"
                  onClick={() => handleAnswerSelect(answer)}
                  size="large"
                  sx={{ py: 2 }}
                >
                  {answer}
                </Button>
              ))}
            </Box>
          </Box>
        );

      case 'scoring':
        return (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                mb: 2,
                fontWeight: 'bold'
              }}
            >
              {isTimeout ? 'Time\'s Up!' : (isCorrect ? 'Correct!' : 'Wrong!')}
            </Typography>
            {currentQuestion && (
              <Typography variant="body1">
                {isCorrect 
                  ? 'Great job!' 
                  : isTimeout
                  ? 'You ran out of time!'
                  : `The correct answer was: ${currentQuestion.correctAnswer}`}
              </Typography>
            )}
            <Typography variant="h6" sx={{ mt: 3 }}>
              Score: {score}
            </Typography>
          </Box>
        );

      case 'ranking':
        return (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold'  }}>
              Game Complete!
            </Typography>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Final Score: {score} / {questions.length}
            </Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
              {score === questions.length
                ? "Perfect score!"
                : score >= questions.length * 0.7
                ? "Great job!"
                : "Better luck next time!"}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                resetGame();
                setScreen('home');
              }}
            >
              Back to Menu
            </Button>
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
    <Container maxWidth="sm" sx={{ minHeight: '80vh', py: 4 }}>
      {renderContent()}
    </Container>
  );
};

export default QuestionPage;