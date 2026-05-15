import { Category, Difficulty, Mode, Rank } from "../constants";
import type { Question } from "./question";

export interface PlayData {
  xpGained: number;
  scoreGained: number;
  gamesPlayed: number;
  gamesMastered: number;
  topThreeFinishes: number;
  gamesWon: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTimePerQuestion: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  progress: number;
}

export interface MultiplayerLeaderboardEntry {
  playerId: string;
  name: string;
  score: number;
  rank: number;
}

export interface GameSession {
  id: string;
  date: Date;
  mode: Mode;
  category: Category;
  difficulty: Difficulty;
  totalQuestions: number;
  correctAnswers: number;
  questionsAnswered: number;
  score: number;
  questions: Question[];
  userAnswers: string[];
  timeTaken: number;
  timePerQuestion?: number[];
  mastered: boolean;
  won: boolean;
  topThreeFinish: boolean;
  incorrectAnswers: number;
  multiplayerPlacement?: number;
  multiplayerLeaderboard?: MultiplayerLeaderboardEntry[];
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  lastActive: Date;
  lastPlayedDate?: Date;
  gameHistory: GameSession[];

  totalXp: number;
  xpToNextLevel: number;
  level: number;
  rank: Rank;
  achievements: Achievement[];

  totalScore: number;
  topScore: number;
  soloTopScore: number;
  multiplayerTopScore: number;
  totalTimePlayed: number;
  soloGamesPlayed: number;
  multiplayerGamesPlayed: number;
  gamesMastered: number;
  gamesWon: number;
  topThreeFinishes: number;
  leaderboardAppearances: number;
  lobbiesCreated: number;
  currentPlayStreak: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTimePerQuestion: number;
  
  rivalDefeats: number;
  rivalStats: Record<string, number>;

  individualStats: Record<Category, Record<Mode, Record<Difficulty, PlayData>>>;
}