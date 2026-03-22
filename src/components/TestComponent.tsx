import { useTriviaStore } from "../logic/trivia-manager";
import { useEffect, useCallback } from "react";
import QuizCard from "./QuizCard";


export default function TestComponent(){
  const { 
    questions,
    currentIndex,
    phase,
    selectAnswer,
    nextPhase, 
    startGame,
  } = useTriviaStore();

  const current = questions[currentIndex];

  const onAnimationComplete = useCallback(() => {
    // Animation callback - trigger next phase after animation finishes
    nextPhase();
  }, [nextPhase]);

  const handleAnswer = useCallback((opt: { id: string; text: string; isCorrect: boolean }) => {
    selectAnswer(opt.id);
    nextPhase();
  }, [selectAnswer, nextPhase]);

  useEffect(() => {
    startGame("General Knowledge", "easy", 5, 15, 'solo');
  }, []);

  return (
    <QuizCard
      question={current?.text}
      options={current?.allAnswers?.map((a, i) => ({
        id: String.fromCharCode(65 + i),
        text: a,
        isCorrect: a === current?.correctAnswer,
      }))}
      onAnswer={handleAnswer}
      onAnimationComplete={onAnimationComplete}
    />
  )
}