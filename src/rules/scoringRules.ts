import { defaultGameConfig } from "../config/gameConfig";

export interface RoundScoreInput {
  currentScores: Record<string, number>;
  hostPlayerId: string;
  hostAnswer: string;
  playerAnswers: Record<string, string[]>;
  questionIndex: number;
  correctAnswer: string;
  pointsPerCorrect?: number;
}

const resolvePointsPerCorrect = (pointsPerCorrect?: number): number => {
  return pointsPerCorrect ?? defaultGameConfig.baseScore;
};

export function scoreIncrementForAnswer(
  isCorrect: boolean,
  pointsPerCorrect?: number,
): number {
  if (!isCorrect) return 0;
  return resolvePointsPerCorrect(pointsPerCorrect);
}

export function scoreForCorrectAnswers(
  correctAnswers: number,
  pointsPerCorrect?: number,
): number {
  if (correctAnswers <= 0) return 0;
  return correctAnswers * resolvePointsPerCorrect(pointsPerCorrect);
}

export function applyRoundScores(input: RoundScoreInput): Record<string, number> {
  const {
    currentScores,
    hostPlayerId,
    hostAnswer,
    playerAnswers,
    questionIndex,
    correctAnswer,
    pointsPerCorrect,
  } = input;

  const nextScores = { ...currentScores };
  const increment = resolvePointsPerCorrect(pointsPerCorrect);

  if (hostAnswer === correctAnswer) {
    nextScores[hostPlayerId] = (nextScores[hostPlayerId] ?? 0) + increment;
  }

  Object.entries(playerAnswers).forEach(([playerId, answers]) => {
    if (answers[questionIndex] === correctAnswer) {
      nextScores[playerId] = (nextScores[playerId] ?? 0) + increment;
    }
  });

  return nextScores;
}