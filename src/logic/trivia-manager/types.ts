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
    currentIndex: number;
    answer: string;
    score: number;
    timer: number;
    phase: 'loading' | 'asking' | 'answering' | 'scoring' | 'ranking' | 'end';
    mode: 'solo' | 'multi';
}

// The reference for the functions used per game session
export interface TriviaActions {
    startGame: (category: string, difficulty: 'easy' | 'medium' | 'hard', limit: number, timer: number, mode: 'solo' | 'multi') => Promise<void>;
    selectAnswer: (answer: string) => void;
    tickTimer: () => void;
    nextPhase: () => void;
    reset: () => void;
}