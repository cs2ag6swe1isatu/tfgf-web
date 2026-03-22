import { create } from 'zustand';
import { TriviaState, TriviaActions, JSONQuestion, Question } from './types';

export const useTriviaStore = create<TriviaState & TriviaActions>((set) => ({
    questions: [],
    initializeTriviaQuestions: async (category, difficulty, limit) => {
        const response = await fetch('/data/Questions.json');
        const dbQuestions: JSONQuestion[] = await response.json();
        const filteredQuestions = dbQuestions
        .filter(q => q.Category === category && q.Difficulty == difficulty)
        .slice(0, limit)
        .map((q, index) => ({
            id: `${q.Category}-${index}`,
            category: q.Category,
            difficulty: q.Difficulty,
            text: q.QuestionText,
            correctAnswer: q.CorrectAnswer,
            incorrectAnswers: q.IncorrectAnswers,
            allAnswers: q.AllAnswers
        }));

        set({ questions: filteredQuestions });

        console.log(`Filtered for: ${category} (${difficulty})`);
        console.log("Resulting Questions:", filteredQuestions);
    }
}));