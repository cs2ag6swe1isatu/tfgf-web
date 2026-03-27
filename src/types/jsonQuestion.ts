export interface JSONQuestion{
    Category: string;
    Difficulty: 'easy' | 'medium' | 'hard';
    QuestionText: string;
    CorrectAnswer: string;
    IncorrectAnswers: string[];
    AllAnswers: string[];
}