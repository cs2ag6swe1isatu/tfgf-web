import { calculateScore, calculateXP, getStreakMultiplier } from "../utils/progression";
import { Difficulty } from "../constants";

export interface PlayerRoundAnswer {
  answer: string;
  remainingTime: number;
}

export interface RoundScoreInput {
  currentScores: Record<string, number>;
  hostPlayerId: string;
  hostAnswer: string;
  hostRemainingTime: number;
  playerAnswers: Record<string, PlayerRoundAnswer[]>;
  questionIndex: number;
  correctAnswer: string;
  difficulty: Difficulty;
  totalTime?: number;
}

export function scoreIncrementForAnswer(
  isCorrect: boolean,
  difficulty: Difficulty,
  remainingTime: number,
  totalTime = 15,
): number {
  if (!isCorrect) return 0;
  return calculateScore(difficulty, remainingTime, totalTime);
}

export function scoreForCorrectAnswers(
  correctAnswers: number,
  pointsPerCorrect = 10,
): number {
  if (correctAnswers <= 0) return 0;
  return correctAnswers * pointsPerCorrect;
}

export function getStreakMultiplierForQuestion(streak: number): number {
  return getStreakMultiplier(streak);
}

export function calculateXpForAnswer(
  finalScore: number,
  streak: number,
): number {
  return calculateXP(finalScore, streak);
}

export function applyRoundScores(input: RoundScoreInput): Record<string, number> {
  const {
    currentScores,
    hostPlayerId,
    hostAnswer,
    hostRemainingTime,
    playerAnswers,
    questionIndex,
    correctAnswer,
    difficulty,
    totalTime,
  } = input;

  const nextScores = { ...currentScores };

  if (hostAnswer === correctAnswer) {
    nextScores[hostPlayerId] =
      (nextScores[hostPlayerId] ?? 0) +
      calculateScore(difficulty, hostRemainingTime, totalTime);
  }

  Object.entries(playerAnswers).forEach(([playerId, answers]) => {
    const answerData = answers[questionIndex];
    if (!answerData) return;

    if (answerData.answer === correctAnswer) {
      nextScores[playerId] =
        (nextScores[playerId] ?? 0) +
        calculateScore(difficulty, answerData.remainingTime, totalTime);
    }
  });

  return nextScores;
}