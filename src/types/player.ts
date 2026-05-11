// src/types/player.ts
import { Category, Difficulty, Mode, Rank } from "../constants";

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

export interface GameSession {
  id: string;
  date: Date;
  mode: Mode;
  category: Category;
  difficulty: Difficulty;
  score: number;
  correctAnswers: number;
  questionsAnswered: number;
  timeTaken: number; // in seconds
  questions: any[]; // Placeholder for question details, can be expanded as needed
  userAnswers: string[]; // Player's answers for the session
  mastered: boolean; // Whether the player mastered the session (e.g., perfect score)
  won: boolean; // For multiplayer sessions, whether the player won
  topThreeFinish: boolean; // For multiplayer sessions, whether the player finished in the top three  
  // 👇 Here is the line that fixes your error!
  totalQuestions: number;
  timePerQuestion?: number[]; // Optional array of time taken for each question, in seconds
  incorrectAnswers: number; // Added field for incorrect answers
}

export interface Achievement {
  progress: number;
  id: string;
  name: string;
  description: string;
  unlockedAt: Date;
}

export interface Player {
  // Basic Profile
  id: string;
  name: string;
  avatar: string;
  lastActive: Date;
  gameHistory: GameSession[];

  // Progress & Leveling
  totalXp: number;
  xpToNextLevel: number;
  level: number;
  rank: Rank;
  achievements: Achievement[];

  // Aggregate Statistics
  totalScore: number;
  topScore: number;
  totalTimePlayed: number;
  soloGamesPlayed: number;
  multiplayerGamesPlayed: number;
  gamesMastered: number;
  gamesWon: number;
  topThreeFinishes: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTimePerQuestion: number;

  // Root Data & Deep Stats
  playData: PlayData;
  individualStats: Record<Category, Record<Mode, Record<Difficulty, PlayData>>>;
}