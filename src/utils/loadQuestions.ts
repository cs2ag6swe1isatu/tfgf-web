import type { Question } from "../types/question";
import type { JSONQuestion } from "src/types/jsonQuestion";

// no need to convert base64, our devtool already do this

export async function loadQuestions(category: string, difficulty: 'easy' | 'medium' | 'hard', mode: 'solo' | 'multi', limit: number): Promise<Question[]> {
  try {
    const data = await fetch('/data/Questions.json');
    const json: JSONQuestion[] = await data.json();
    
    /* ---------- Validation ---------- */
    if (!Array.isArray(json)) {
      console.error("Invalid questions data format");
      return [];
    }
    const filteredQuestions = json
      .filter(q => {
        if (!q.Category || !q.Difficulty || !q.QuestionText || !q.CorrectAnswer || !Array.isArray(q.AllAnswers)) {
          return false;
        }
        return q.Category === category && q.Difficulty === difficulty;
      });
    
    /* ---------- Shuffle ---------- */
    const shuffledQuestions = filteredQuestions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffledQuestions.slice(0, limit);

    /* ---------- Map ---------- */
    const processedQuestions = selectedQuestions.map((q, index) => {
      const shuffledAnswers = [...q.AllAnswers].sort(() => Math.random() - 0.5);
      return {
        id: `${q.Category}-${index}`,
        category: q.Category,
        difficulty: q.Difficulty,
        text: q.QuestionText,
        correctAnswer: q.CorrectAnswer,
        incorrectAnswers: q.IncorrectAnswers || [],
        allAnswers: shuffledAnswers
      };
    });
    
    if (processedQuestions.length === 0) {
      console.warn(`No questions found for category: ${category}, difficulty: ${difficulty}`);
    }

    return processedQuestions;
  } catch (error) {
    console.error("Error loading questions:", error);
    return [];
  }
}
