import { Container, Typography, Box } from "@mui/material";
import { Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";

const ResultPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  const score = useTriviaStore((state) => state.score);
  const questions = useTriviaStore((state) => state.questions);

  const totalQuestions = questions.length;
  const correctAnswers = score;
  const accuracy =
    totalQuestions > 0
      ? Math.round(
          (correctAnswers / totalQuestions) * 100
        )
      : 0;

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Game Results
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">
            Score: {score}
          </Typography>

          <Typography variant="h6">
            Correct Answers: {correctAnswers} /{" "}
            {totalQuestions}
          </Typography>

          <Typography variant="h6">
            Accuracy: {accuracy}%
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          className="mt-5"
          onClick={() => setScreen("home")}
        >
          Back to Home
        </Button>
      </Box>
    </Container>
  );
};

export default ResultPage;