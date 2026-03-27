export interface Question {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  text: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[];
}