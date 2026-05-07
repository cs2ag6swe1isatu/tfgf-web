import { Box, Typography, Button, Grid } from "@mui/material";
import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";

const QuestionPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  const questions = useTriviaStore((state) => state.questions);
  const currentIndex = useTriviaStore((state) => state.currentIndex);
  const submitAnswer = useTriviaStore((state) => state.submitAnswer);
  const tickTimer = useTriviaStore((state) => state.tickTimer);
  const timer = useTriviaStore((state) => state.timer);

  const currentQuestion = questions[currentIndex];

  // TIMER
  useEffect(() => {
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickTimer]);

  // BACK
  const handleBack = () => {
    setScreen("difficulty");
  };

  // PREVENT CRASH
  if (!currentQuestion) {
    return <Typography>Loading...</Typography>;
  }

  // ✅ BUILD ANSWERS (SAFE)
  const answers = [
    ...(currentQuestion.incorrect_answers || []),
    currentQuestion.correct_answer,
  ];

  return (
    <Box sx={{ p: 4 }}>
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography>
          {currentIndex + 1}/{questions.length}
        </Typography>
        <Typography>{currentQuestion.category}</Typography>
        <Typography>⏱ {timer}s</Typography>
      </Box>

      {/* QUESTION */}
      <Box mb={3}>
        <Typography variant="h6">
          {currentQuestion.question}
        </Typography>
      </Box>

      {/* ANSWERS */}
      <Grid container spacing={2}>
        {answers.map((ans: string, i: number) => (
          <Grid item xs={6} key={i}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => submitAnswer(ans)}
            >
              {ans}
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* BACK BUTTON */}
      <Box mt={4}>
        <Button variant="contained" onClick={handleBack}>
          Back
        </Button>
      </Box>
    </Box>
  );
};

export default QuestionPage;