export const defaultGameConfig = {
  // Game configuration (matches GameConfig interface)
  mode: null,
  category: null,
  difficulty: null,
  questionLimit: 5,     // default number of questions
  questionTimer: 25,      // seconds per question
  answerTimer: 15,        // seconds to answer

  // Profile history limits
  recentSessionLimitSolo: 10,
  recentSessionLimitMultiplayer: 10,
  
  // Game timing
  readyTimer: 3,         // seconds before first question
  scoringDelay: 1,       // seconds between questions in solo mode
  seedRange: 1000000,    // range for random seed generation
  
  // Scoring
  baseScore: 10,         // points per correct answer
  
  // Lobby configuration
  lobbyIdPrefix: 'LOBBY-',
  maxPlayers: 4,
  isPrivateDefault: false,
  
  // Multiplayer settings
  hostPath: 'ws://localhost:8080',  // host connection path
  clientPath: 'ws://localhost:8081' // client connection path
};

// Solo defaults used when launching directly from difficulty selection. 
// Temp var for testing only; Use defaultGameConfig later. 
export const soloDifficultyStartConfig = {
  questionLimit: 5,
  questionTimer: 1000, // no question phase in solo mode
  answerTimer: 15,
};

export const multiplayerDifficultyStartConfig = {
  questionLimit: 10,
  questionTimer: 10,
  answerTimer: 15,
};

// Keep these zeroed for active game session state.
export const sessionHistoryRuntimeLimits = {
  recentSessionLimitSolo: 0,
  recentSessionLimitMultiplayer: 0,
};

// Shared interval cadence for countdown timers.
export const timerTickIntervalMs = 1000;
