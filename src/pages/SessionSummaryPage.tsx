import { Typography, Box, Divider, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";
import { Question } from "../types/question";

const SessionSummaryPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const score = useTriviaStore((state) => state.score);
  const questions = useTriviaStore((state) => state.questions);
  const category = useTriviaStore((state) => state.category);
  const difficulty = useTriviaStore((state) => state.difficulty);

  const sessionQuestions = questions;
  const totalQuestions = questions.length;
  const userAnswers = useTriviaStore((state) => state.userAnswers);
  const correctAnswers = questions.reduce((total, question, index) => {
    return total + (userAnswers[index] === question.correctAnswer ? 1 : 0);
  }, 0);

  const accuracy =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

  return (
    <Box sx={{
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateRows: "1fr 3fr 1fr",
      padding: "40px",
      boxSizing: "border-box",
      position: "relative"
    }}>
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
          {sessionQuestions.map((q: Question, index: number) => {
            const playerAnswer = userAnswers[index] ?? "No answer";
            const isCorrect = playerAnswer === q.correctAnswer;

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
                  {index + 1}. {q.text}
                </Typography>

                <Typography sx={{ mt: 1 }}>
                  Your Answer: {playerAnswer}
                </Typography>

                <Typography>
                  Correct Answer: {q.correctAnswer}
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
    </Box>
  );
};

export default SessionSummaryPage;
