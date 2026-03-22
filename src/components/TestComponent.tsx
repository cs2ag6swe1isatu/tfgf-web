import { useTriviaStore } from "../logic/trivia-manager";
import { useEffect } from "react";
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

  const handleAnswer = (opt: { id: string; text: string; isCorrect: boolean }) => {
    selectAnswer(opt.id);
  };

  const onAnimationComplete = () => {
    nextPhase();
  };

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
    />
  )
}