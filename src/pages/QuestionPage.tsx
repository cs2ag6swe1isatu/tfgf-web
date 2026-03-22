import { useEffect, useMemo } from "react";
import { Container, Box, Typography, CircularProgress, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";

const QuestionPage = () => {
  const {
    questions,
    currentIndex,
    phase,
    selectedAnswer,
    timer,
    score,
    category,
    difficulty,
    selectAnswer,
    nextPhase,
    resetGame,
  } = useTriviaStore();

  const { setScreen } = useGameStore();

  // Get current question
  const currentQuestion = questions[currentIndex];

  // Handle answer selection
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
      }, 3000); 
      return () => clearTimeout(timeout);
    } if (phase === 'scoring') {
      const timeout = setTimeout(() => {
        nextPhase();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [phase, nextPhase]);

  // Navigate to result when game ends
  useEffect(() => {
    if (phase === 'end') {
      setScreen('result');
    }
  }, [phase, setScreen]);

  // Check if answer was correct
  const isCorrect = useMemo(() => {
    if (!currentQuestion || !selectedAnswer) return false;
    return selectedAnswer === currentQuestion.correctAnswer;
  }, [currentQuestion, selectedAnswer]);

  // Render based on phase
  const renderContent = () => {
    switch (phase) {
      case 'loading':
        return (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={60} sx={{ color: '#00ff9d', mb: 3 }} />
            <Typography variant="h6">
              Loading questions...
            </Typography>
            <Typography variant="body2" sx={{ color: '#999999', mt: 1 }}>
              Category: {category} | Difficulty: {difficulty}
            </Typography>
          </Box>
        );

      case 'asking':
        // Show the next question text with a 2-second countdown
        const nextQuestion = questions[currentIndex];
        return (
          <Box sx={{ py: 4 }}>
            {nextQuestion ? (
              <>
                {/* Question Preview */}
                <Box sx={{ mb: 4, p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ lineHeight: 1.6 }}>
                    {nextQuestion.text}
                  </Typography>
                </Box>

                {/* Countdown */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    Ready...
                  </Typography>
                </Box>

                {/* Progress */}
                <Typography variant="caption" sx={{ color: '#666', mb: 2, display: 'block', textAlign: 'center' }}>
                  Question {currentIndex + 1} / {questions.length}
                </Typography>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" sx={{ color: '#999999', mb: 2 }}>
                  Loading question...
                </Typography>
                <CircularProgress size={40} sx={{ color: '#00ff9d' }} />
              </Box>
            )}
          </Box>
        );

      case 'answering':
        if (!currentQuestion) {
          return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Loading question...
              </Typography>
              <CircularProgress size={40} sx={{ color: '#00ff9d' }} />
            </Box>
          );
        }

        return (
          <Box sx={{ py: 4 }}>
            {/* Timer */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography 
                variant="h3" 
                sx={{ 
                  color: timer <= 5 ? '#ff3333' : '#000',
                  fontWeight: 'bold',
                }}
              >
                {timer}
              </Typography>
              <Typography variant="caption">
                seconds remaining
              </Typography>
            </Box>

            {/* Question */}
            <Box sx={{ mb: 4, p: 3, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ lineHeight: 1.6 }}>
                {currentQuestion.text}
              </Typography>
            </Box>

            {/* Progress */}
            <Typography variant="caption" sx={{ mb: 2, display: 'block' }}>
              Question {currentIndex + 1} / {questions.length}
            </Typography>

            {/* Answers */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {currentQuestion.allAnswers.map((answer, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  onClick={() => handleAnswerSelect(answer)}
                >
                  {answer}
                </Button>
              ))}
            </Box>
          </Box>
        );

      case 'scoring':
        // Check if this is a timeout (no answer selected)
        const isTimeout = !selectedAnswer && !isCorrect;
        
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
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          pb: 2,
          borderBottom: '1px solid #333',
        }}
      >
        <Typography variant="caption" sx={{ color: '#666' }}>
          {category} • {difficulty}
        </Typography>
        <Typography variant="caption" >
          Score: {score}
        </Typography>
      </Box>

      {renderContent()}
    </Container>
  );
};

export default QuestionPage;