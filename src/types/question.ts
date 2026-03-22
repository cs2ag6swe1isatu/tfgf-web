export interface Question {
  question: string;
  choices: string[];
  answer: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
}