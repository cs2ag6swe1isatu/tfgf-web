import { Mode, Category, Difficulty } from "../constants";
import { Question } from '../types/question';
import { calculateSoloXP, calculateMultiplayerXP } from '../utils/progression';

/** Progression Rules - Game Progression and Player Advancement Logic
  *
  * RESPONSIBILITIES:
  * - Define the shape of a game session result (SessionProgressInput)
  * - Produce a SessionDelta that playerStore applies to persisted player data
  *
  * SEPARATION OF CONCERNS:
  * This module contains no XP/level/rank formulas — those all live in
  * utils/progression.ts. This file is responsible only for translating a
  * completed session into a delta that the store can apply.
 **/

export interface SessionProgressInput {
  mode: Mode;
  category: Category;
  difficulty: Difficulty;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  maxStreak?: number;
  placement?: number;        // numeric finish position (1-indexed); multiplayer only
  questions: Question[];
  userAnswers: string[];
  timeTaken: number;         // in seconds
  timePerQuestion?: number[];
  mastered: boolean;         // perfect score
  won: boolean;              // for multiplayer
  topThreeFinish: boolean;   // for multiplayer
  hostedLobby?: boolean;     // multiplayer host who completed a saved match
  fellBehindByHalfAndWon?: boolean; // comeback from <=50% of leader score and still won
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

/**
 * Translates a completed session into a delta for playerStore to apply.
 *
 * XP is mode-aware:
 *   Solo        → calculateSoloXP(score, maxStreak)
 *   Multiplayer → calculateMultiplayerXP(score, placement, maxStreak)
 *
 * Callers read xpGained directly from the returned delta — there is no
 * separate getLastXpGained() function.
 */
export function buildSessionDelta(input: SessionProgressInput): SessionDelta {
  const streak = input.maxStreak ?? 0;

  let xpGained: number;

  if (input.mode === "multiplayer") {
    const placement = input.placement ?? 4; // default to 4th+ bonus if missing
    xpGained = calculateMultiplayerXP(input.score, placement, streak);
  } else {
    xpGained = calculateSoloXP(input.score, streak);
  }

  const averageTimePerQuestion =
    input.timePerQuestion && input.timePerQuestion.length > 0
      ? Math.round(
          (input.timePerQuestion.reduce((a, b) => a + b, 0) /
            input.timePerQuestion.length) *
            10,
        ) / 10
      : undefined;

  return {
    xpGained,
    scoreGained: input.score,
    gamesPlayed: 1,
    gamesMastered: input.mastered ? 1 : 0,
    totalQuestionsAnswered: input.totalQuestions,
    correctAnswers: input.correctAnswers,
    incorrectAnswers: input.totalQuestions - input.correctAnswers,
    averageTimePerQuestion,
    topThreeFinishes: input.topThreeFinish ? 1 : 0,
    gamesWon: input.won ? 1 : 0,
  };
}