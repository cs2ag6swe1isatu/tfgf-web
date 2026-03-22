import { create } from 'zustand';
import { TriviaState, TriviaActions, JSONQuestion, Question } from './types';
import QuizCard from 'src/components/QuizCard';

const initialState: TriviaState = {
    questions: [],
    currentIndex: 0,
    answer: "",
    timer: 15,
    score: 0,
    phase: 'loading',
    mode: 'solo',
}

export const useTriviaStore = create<TriviaState & TriviaActions>((set, get) => ({
    ...initialState,

    /* ---------- Game setup ---------- */
    startGame: async (category, difficulty, limit, timer, mode) => {
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

        set({ questions: filteredQuestions, timer: timer, mode: mode});

        console.log(`Filtered for: ${category} (${difficulty})`);
        console.log("Resulting Questions:", filteredQuestions);
    },

    /* ---------- Answer handling ---------- */
    selectAnswer: (answer) => {
        const { questions, currentIndex, mode, phase } = get();
        if(phase !== 'answering') return;

        if(mode === 'solo'){
            if (currentIndex + 1 < questions.length){
                set({ currentIndex: currentIndex + 1, answer: answer, timer: 5, phase: 'scoring'});
            } else {
                set ({ phase: 'ranking' });
            }
        } else if(mode === 'multi'){
            return;
        }
    },

    /* ---------- Timer ---------- */
    tickTimer: () => {
        const { timer, phase } = get();
        // should we have separate timer for asking and answering?
        if (phase === 'answering' || phase === 'asking'){
            if(timer > 0){
                set({ timer: timer - 1});
            } else {
                // auto submit on timer end
                get().selectAnswer(get().answer);
            }
        } else return;
    },

    /* ---------- Phase machine ---------- */
    nextPhase: () => {
        const { phase, currentIndex, questions } = get();

        switch (phase) {
        case 'loading':
            set({ phase: 'asking' });
            break;

        case 'asking':
            set({ phase: 'answering', timer: 15 });
            break;

        case 'answering':
            if (currentIndex + 1 < questions.length) {
            set({
                phase: 'scoring',
                currentIndex: currentIndex + 1,
                answer: '',
                timer: 5,
            });
            } else {
            set({ phase: 'ranking', answer: '' });
            }
            break;

        case 'scoring':
            set({ phase: 'ranking' });
            break;

        case 'ranking':
            set({ phase: 'end' });
            break;

        default:
            break;
        }
    },
    reset: () => set(initialState),
}));