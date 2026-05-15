import type { Question } from "../types/question";
import type { JSONQuestion } from "src/types/jsonQuestion";

// Works in both dev (http://) and packaged Electron (file://)
const assetBase = window.location.protocol === "file:"
  ? window.location.pathname.replace(/[^/\\]*$/, "")
  : "/";

function assetUrl(rel: string): string {
  return assetBase + rel;
}

// Seeded Random Generator (Mulberry32)
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic Fisher-Yates Shuffle
function shuffleArray<T>(array: T[], randomFunc: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFunc() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function loadQuestions(
  category: string,
  difficulty: 'easy' | 'medium' | 'hard',
  limit: number,
  seed?: number
): Promise<Question[]> {
  try {
    const data = await fetch(assetUrl("data/Questions.json"));
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
    const randomFunc = seed !== undefined ? mulberry32(seed) : Math.random;
    const shuffledQuestions = shuffleArray(filteredQuestions, randomFunc);
    const selectedQuestions = shuffledQuestions.slice(0, limit);

    /* ---------- Map ---------- */
    const processedQuestions = selectedQuestions.map((q, index) => {
      const shuffledAnswers = shuffleArray(q.AllAnswers, randomFunc);
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