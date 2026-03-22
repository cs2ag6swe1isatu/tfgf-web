import { Button, Container, Typography, Box } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const ResultPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  const score = useGameStore((state) => state.score);
  const correctAnswers = useGameStore(
    (state) => state.correctAnswers
  );
  const totalQuestions = useGameStore(
    (state) => state.totalQuestions
  );

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
          sx={{ mt: 5 }}
          onClick={() => setScreen("home")}
        >
          Back to Home
        </Button>
      </Box>
    </Container>
  );
};

export default ResultPage;