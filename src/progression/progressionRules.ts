import { Mode, Category, Difficulty, RANKS } from "../constants";
import { Question } from '../types/question';

/** Progression Rules - Game Progression and Player Advancement Logic
  * 
  * RESPONSIBILITIES:
  * - Define rules for player progression and advancement
  * - Calculate XP gains, score increases, and rank advancements based on game performance
  * - Determine thresholds for unlocking new content (categories, difficulties, modes)
  * - Provide functions to evaluate player performance and update their profile accordingly
  * 
  * SEPARATION OF CONCERNS:
  * This module is solely responsible for defining the logic of player progression.
  * It does NOT handle any game state management, navigation, or UI logic.
  * It provides pure functions that can be used by the playerStore to update player data.
 **/

export interface SessionProgressInput {
    scoreEarned: any;
    xpEarned: any;
    isWin: any;
    isMastery: any;
    isTopThree: any;
    questionsAnswered: any;
    incorrectAnswers: any;
    mode: Mode;
    category: Category;
    difficulty: Difficulty;
    totalQuestions: number;
    correctAnswers: number;
    score: number;
    questions: Question[];
    userAnswers: string[];
    timeTaken: number; // in seconds
    timePerQuestion?: number[];
    mastered: boolean; // perfect score
    won: boolean; // for multiplayer
    topThreeFinish: boolean; // for multiplayer
    hostedLobby?: boolean; // multiplayer host who completed a saved match
    fellBehindByHalfAndWon?: boolean; // achieved comeback from <=50% of leader score and still won
}

export interface SessionDelta {
    xpGained: number;
    scoreGained: number;
    gamesPlayed: number;
    gamesMastered: number;
    totalQuestionsAnswered: number;
    correctAnswers: number;
    incorrectAnswers: number;
    averageTimePerQuestion?: number; // in seconds

    topThreeFinishes: number;
    gamesWon: number;
}

const DIFFICULTY_XP = { easy: 10, medium: 20, hard: 30 } as const;

export function buildSessionDelta(input: SessionProgressInput): SessionDelta {
    // const accuracy = input.totalQuestions > 0 ? input.correctAnswers / input.totalQuestions : 0;
    const baseXp = input.correctAnswers * DIFFICULTY_XP[input.difficulty];

    const winBonus = input.won ? 30 : 0;
    const masteryBonus = input.mastered ? 20 : 0;
    
    return {
        xpGained: baseXp + winBonus + masteryBonus,
        scoreGained: input.score,
        gamesPlayed: 1,
        gamesMastered: input.mastered ? 1 : 0,
        totalQuestionsAnswered: input.totalQuestions,
        correctAnswers: input.correctAnswers,
        incorrectAnswers: input.totalQuestions - input.correctAnswers,
        averageTimePerQuestion: input.timePerQuestion ? (input.timePerQuestion.reduce((a, b) => a + b, 0) / input.timePerQuestion.length) : undefined,
        topThreeFinishes: input.topThreeFinish ? 1 : 0,
        gamesWon: input.won ? 1 : 0,
    };
}

export function levelFromXp(totalXp: number): number {
    let level = 1;
    let threshold = 100;
    let remaining = totalXp;

    while (remaining >= threshold) {
        remaining -= threshold;
        level++;
        threshold = Math.floor(threshold * 1.5);
    }

    return level;
}

export function xpToNextLevel(totalXp: number): number {
    let threshold = 100;
    let remaining = totalXp;

    while (remaining >= threshold) {
        remaining -= threshold;
        threshold = Math.floor(threshold * 1.5);
    }
    
    return threshold - remaining;
}

export function rankFromLevel(level: number) {
    const bucketSize = 10;
    const idx = Math.min(RANKS.length - 1, Math.floor((level - 1) / bucketSize));
    return RANKS[idx];
}