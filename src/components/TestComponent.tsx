import { useTriviaStore } from "../logic/trivia-manager";
import { useEffect } from "react";

export default function TestComponent(){
  const { questions, initializeTriviaQuestions } = useTriviaStore();

  useEffect(() => {
    initializeTriviaQuestions("General Knowledge", "easy", 5);
  }, []);

  return (
    <pre>{JSON.stringify(questions, null, 2)}</pre>
  )
}