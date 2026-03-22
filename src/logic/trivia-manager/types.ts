// The interface for the question pool
export interface JSONQuestion{
    Category: string;
    Difficulty: 'easy' | 'medium' | 'hard';
    QuestionText: string;
    CorrectAnswer: string;
    IncorrectAnswers: string[];
    AllAnswers: string[];
}

// The object that will be refernced per game session
export interface Question{
    id: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    text: string;
    correctAnswer: string;
    incorrectAnswers: string[];
    allAnswers: string[];
}

// The reference for the data used per game session
export interface TriviaState {
    questions: Question[];
}

// The reference for the functions used per game session
export interface TriviaActions {
    initializeTriviaQuestions: (category: string, difficulty: 'easy' | 'medium' | 'hard', limit: number) => Promise<void>;
}