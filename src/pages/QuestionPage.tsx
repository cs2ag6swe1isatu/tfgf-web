import React, { useEffect, useMemo, useState } from "react";
import { Button, Container, Typography, Box, Grid } from "@mui/material";
import { loadQuestions } from "../utils/loadQuestions";
import type { Question } from "../types/question";
import { useGameStore } from "../store/gameStore";

const QuestionPage = () => {
  const category = useGameStore((state) => state.category);
  const difficulty = useGameStore((state) => state.difficulty);
  const currentQuestionIndex = useGameStore((state) => state.currentQuestionIndex);
  const score = useGameStore((state) => state.score);
  const totalQuestions = useGameStore((state) => state.totalQuestions);
  const addCorrectAnswer = useGameStore((state) => state.addCorrectAnswer);
  const nextQuestion = useGameStore((state) => state.nextQuestion);
  const finishSession = useGameStore((state) => state.finishSession);

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    loadQuestions()
      .then((data) => setAllQuestions(data))
      .catch((error) => console.error("Failed to load questions:", error));
  }, []);

  const questions = useMemo(() => {
    return allQuestions
      .filter(
        (q) => q.category === category && q.difficulty === difficulty
      )
      .slice(0, totalQuestions);
  }, [allQuestions, category, difficulty, totalQuestions]);

  useEffect(() => {
    setSelectedAnswer(null);
    setMessage("");
    setTimeLeft(15);
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (questions.length === 0) return;
    if (selectedAnswer) return;
    if (timeLeft <= 0) {
      handleNext();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, selectedAnswer, questions.length]);

  if (questions.length === 0) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 6, textAlign: "center" }}>
          <Typography>Loading questions...</Typography>
        </Box>
      </Container>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 6, textAlign: "center" }}>
          <Typography>No more questions found.</Typography>
        </Box>
      </Container>
    );
  }

  const getPoints = () => {
    let basePoints = 0;

    if (difficulty === "easy") basePoints = 10;
    if (difficulty === "medium") basePoints = 20;
    if (difficulty === "hard") basePoints = 30;

    return basePoints + timeLeft;
  };

  const handleAnswerClick = (choice: string) => {
    if (selectedAnswer) return;

    setSelectedAnswer(choice);

    if (choice === currentQuestion.answer) {
      addCorrectAnswer(getPoints());
      setMessage("Correct!");
    } else {
      setMessage(`Wrong! Correct answer: ${currentQuestion.answer}`);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      nextQuestion();
    } else {
      finishSession();
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Typography variant="h6">Score: {score}</Typography>

        <Typography variant="body2" sx={{ mt: 1 }}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Typography>

        <Typography variant="body1" sx={{ mt: 1 }}>
          Time Left: {timeLeft}s
        </Typography>

        <Typography variant="h5" sx={{ mt: 3 }}>
          {currentQuestion.question}
        </Typography>

        <Grid container spacing={2} sx={{ mt: 3 }}>
          {currentQuestion.choices.map((choice, index) => {
            const isCorrect = choice === currentQuestion.answer;
            const isSelected = choice === selectedAnswer;

            return (
              <Grid size={12} key={index}>
                <Button
                  fullWidth
                  size="large"
                  variant="outlined"
                  onClick={() => handleAnswerClick(choice)}
                  disabled={!!selectedAnswer}
                  color={
                    selectedAnswer
                      ? isCorrect
                        ? "success"
                        : isSelected
                        ? "error"
                        : "primary"
                      : "primary"
                  }
                >
                  {choice}
                </Button>
              </Grid>
            );
          })}
        </Grid>

        <Typography sx={{ mt: 3 }}>{message}</Typography>

        <Button
          sx={{ mt: 3 }}
          variant="contained"
          onClick={handleNext}
          disabled={!selectedAnswer && timeLeft > 0}
        >
          {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish"}
        </Button>
      </Box>
    </Container>
  );
};

export default QuestionPage;