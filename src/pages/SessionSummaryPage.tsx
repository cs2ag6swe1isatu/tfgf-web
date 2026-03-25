import { Container, Typography, Box, Divider } from "@mui/material";
import { Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";

const SessionSummaryPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const score = useTriviaStore((state) => state.score);
  const questions = useTriviaStore((state) => state.questions);
  const category = useTriviaStore((state) => state.category);
  const difficulty = useTriviaStore((state) => state.difficulty);

  const sessionQuestions = questions;
  const totalQuestions = questions.length;
  const correctAnswers = score;
  const userAnswers = useTriviaStore((state) => state.userAnswers);

  const accuracy =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 6 }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          Session Summary
        </Typography>

        <Box sx={{ mt: 3, mb: 4, textAlign: "center" }}>
          <Typography>Category: {category ?? "-"}</Typography>
          <Typography>Difficulty: {difficulty ?? "-"}</Typography>
          <Typography>Score: {score}</Typography>
          <Typography>
            Correct Answers: {correctAnswers} / {totalQuestions}
          </Typography>
          <Typography>Accuracy: {accuracy}%</Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: "grid", gap: 3 }}>
          {sessionQuestions.map((q: any, index: number) => {
            const playerAnswer = userAnswers[index] ?? "No answer";
            const isCorrect = playerAnswer === q.answer;

            return (
              <Box
                key={index}
                sx={{
                  p: 2,
                  border: "1px solid #ddd",
                  borderRadius: 2,
                }}
              >
                <Typography variant="h6">
                  {index + 1}. {q.question}
                </Typography>

                <Typography sx={{ mt: 1 }}>
                  Your Answer: {playerAnswer}
                </Typography>

                <Typography>
                  Correct Answer: {q.answer}
                </Typography>

                <Typography
                  sx={{ mt: 1, fontWeight: "bold" }}
                >
                  {isCorrect ? "Correct" : "Incorrect"}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setScreen("home")}
          >
            Back to Home
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default SessionSummaryPage;