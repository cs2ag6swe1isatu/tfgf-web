import type { TriviaQuestion } from '../types/TriviaQuestion';
import fs from 'fs';
import path from 'path';

interface OpenTdbQuestion {
  type: string;
  difficulty: string;
  category: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface OpenTdbResponse {
  response_code: number;
  results: OpenTdbQuestion[];
}

function decodeBase64(text: string): string {
  return Buffer.from(text, 'base64').toString('utf-8');
}

function shuffleChoices(choices: string[]): string[] {
  return [...choices].sort(() => Math.random() - 0.5);
}

export async function fetchTriviaQuestions(): Promise<TriviaQuestion[]> {
  try {
    const response = await fetch('https://opentdb.com/api.php?amount=10&category=9&difficulty=easy&type=multiple&encode=base64');

    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data: OpenTdbResponse = await response.json();
    console.log('Raw API response:', data);

    const formattedQuestions: TriviaQuestion[] = data.results.map((item, index) => {
      const question = decodeBase64(item.question);
      const category = decodeBase64(item.category);
      const difficulty = decodeBase64(item.difficulty);
      const answer = decodeBase64(item.correct_answer);
      const incorrectAnswers = item.incorrect_answers.map((choice) => decodeBase64(choice));

      const choices = shuffleChoices([...incorrectAnswers, answer]);

      return {
        id: `q${index + 1}`,
        category,
        difficulty,
        question,
        choices,
        answer
      };
    });

    console.log('Formatted questions:', formattedQuestions);

    const outputPath = path.join(__dirname, '../data/Question.json');

fs.writeFileSync(
  outputPath,
  JSON.stringify(formattedQuestions, null, 2),
  'utf-8'
);

console.log('Questions saved to Question.json');

    return formattedQuestions;
  } catch (error) {
    console.error('Failed to fetch trivia questions:', error);
    return [];
  }
}