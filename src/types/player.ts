import { Category, Difficulty, Mode, Rank } from "../constants";
import { Question } from "./question";

export interface Player {
  // Basic Profile
  id: string;
  name: string;
  avatar: string;
  lastActive: Date;
  gameHistory: GameSession[];

  // Progress
  totalXp: number;
  xpToNextLevel: number;
  level: number;
  rank: Rank;
  achievements: Achievement[];

  // Total Stats
  totalScore: number;
  soloTopScore: number;
  multiplayerTopScore: number;
  totalTimePlayed?: number; // in seconds

  soloGamesPlayed: number;
  multiplayerGamesPlayed: number;
  gamesMastered: number; // perfect games
  gamesWon: number; // multiplayer wins
  topThreeFinishes: number; // multiplayer top 3 finishes
  leaderboardAppearances: number; // multiplayer top 3 finishes used as leaderboard entries
  lobbiesCreated: number; // hosted multiplayer games that were completed and saved
  lastPlayedDate?: Date;
  currentPlayStreak: number;

  totalQuestionsAnswered: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTimePerQuestion?: number; // in seconds

  // Specific stats
  individualStats: Record<Category, Record<Mode, Record<Difficulty, PlayData>>>;
}


export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  progress: number;
}


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
  averageTimePerQuestion?: number; // in seconds
}

// A limited stack of recent game sessions for quick access and display.
// The cap is enforced per mode from config.
export interface GameSession {
  id: string;
  date: Date;
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
  hostedLobby?: boolean;
  fellBehindByHalfAndWon?: boolean;
}