export interface TriviaQuestion {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  choices: string[];
  answer: string;
}