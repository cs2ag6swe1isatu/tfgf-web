export const defaultGameConfig = {
  // Game configuration (matches GameConfig interface)
  mode: null,
  category: null,
  difficulty: null,
  questionLimit: 2,     // default number of questions
  questionTimer: 3,      // seconds per question
  answerTimer: 3,        // seconds to answer
  
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
