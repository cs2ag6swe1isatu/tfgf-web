import { Mode, Category, Difficulty, getRankForLevel } from "../constants";
import { Question } from '../types/question';
import { calculateXP } from '../utils/progression';
import { applyXpMultiplier } from "../tests/xpMultiplierTester";

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
    mode: Mode;
    category: Category;
    difficulty: Difficulty;
    totalQuestions: number;
    correctAnswers: number;
    score: number;
    maxStreak?: number;
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

/** Stores the last computed XP gain for display on result/summary pages */
let _lastXpGained = 0;

/** Returns the XP gained from the most recently built session delta */
export function getLastXpGained(): number {
  return _lastXpGained;
}

export function buildSessionDelta(input: SessionProgressInput): SessionDelta {
    const xpGained = calculateXP(input.score, input.maxStreak ?? 0);

    const rawXp = baseXp + winBonus + masteryBonus;
    const finalXp = applyXpMultiplier(rawXp);
    _lastXpGained = finalXp;
    return {
        xpGained,
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
    return Math.floor(totalXp / 1000) + 1;
}

export function xpToNextLevel(totalXp: number): number {
    return 1000 - (totalXp % 1000);
}

export function rankFromLevel(level: number) {
    return getRankForLevel(level);
}