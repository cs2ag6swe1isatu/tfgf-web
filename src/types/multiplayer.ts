import { Phase } from "../store";
import { Category, Difficulty, Rank } from "../constants";

export interface LobbyMember {
  id: string;
  name: string;
  avatar: string;
  level: number;
  rank: Rank;
  isReady: boolean;
  isHost: boolean;
}

export interface MultiplayerBroadcastPayload {
  lobbyId: string;
  hostId: string;
  hostName: string;
  hostLevel?: number;
  hostAddress?: string;
  playerCount?: number;
  maxPlayers?: number;
  category?: Category;
  difficulty?: Difficulty;
  lastActive?: string;
  isPrivate?: boolean;
}

export interface MultiplayerGameState {
  sessionId?: string;
  sequence?: number;
  phase: Phase;
  timer: number;
  currentIndex: number;
  seed?: number;
  category?: Category;
  difficulty?: Difficulty;
  questionLimit?: number;
  questionTimer?: number;
  answerTimer?: number;
  questionPort?: number;
  playerScores?: Record<string, number>;
  rankings?: Array<{
    playerId: string;
    name: string;
    score: number;
    rank: number;
  }>;
}

export interface MultiplayerDiscoveredPayload extends MultiplayerLobbySnapshot {
  lastSeen: number;
  isGameActive?: boolean;
}

export interface MultiplayerLobbySnapshot extends MultiplayerBroadcastPayload {
  players: LobbyMember[];
  sessionId?: string;
  sequence?: number;
  questionPort?: number;
}

export interface MultiplayerJoinAck {
  lobbyId: string;
  hostId: string;
  sessionId?: string;
  accepted: boolean;
  reason?: string;
}

export interface MultiplayerJoinRequest {
  lobbyId: string;
  hostAddress: string;
  player: LobbyMember;
}

export interface MultiplayerLeaveRequest { 
  lobbyId: string; 
  hostAddress: string; 
  playerId: string
}

export interface MultiplayerReadyUpdate {
  lobbyId: string;
  hostAddress: string;
  playerId: string;
  ready: boolean;
}

export interface MultiplayerHostExitPayload {
  lobbyId: string;
  sessionId?: string;
}

export type DiscoveredHost = {
  [x: string]: unknown;
  lobbyId: string;
  hostId: string;
  hostName?: string;
  hostLevel?: number;
  hostAddress?: string;
  playerCount?: number;
  maxPlayers?: number;
  isPrivate?: boolean;
  category?: string;
  difficulty?: string;
  sessionId?: string;
  sequence?: number;
  lastSeen: number; // epoch ms
};

export interface MultiplayerBridge {
  startDiscovery: () => void;
  stopDiscovery: () => void;
  discoveryRequest: () => void;
  onDiscoveryResponse: (id: string, cb: (payload: MultiplayerDiscoveredPayload) => void) => void;
  offDiscoveryResponse: (id: string) => void;
  onHostFound: (id: string, cb: (payload: MultiplayerDiscoveredPayload) => void) => void;
  offHostFound: (id: string) => void;
  onPlayerJoined: (id: string, cb: (player: LobbyMember) => void) => void;
  offPlayerJoined: (id: string) => void;
  onPlayerReadyChanged: (id: string, cb: (playerId: string, ready: boolean) => void) => void;
  offPlayerReadyChanged: (id: string) => void;
  onPlayerLeft: (id: string, cb: (playerId: string) => void) => void;
  offPlayerLeft: (id: string) => void;
  onPlayerKicked?: (id: string, cb: (payload: { lobbyId: string; playerId: string; sessionId?: string }) => void) => void;
  offPlayerKicked?: (id: string) => void;
  onHostExit: (id: string, cb: (payload: MultiplayerHostExitPayload) => void) => void;
  offHostExit: (id: string) => void;
  onJoinResponse?: (id: string, cb: (payload: MultiplayerJoinAck) => void) => void;
  offJoinResponse?: (id: string) => void;
  startBroadcast: (payload: MultiplayerLobbySnapshot) => void;
  updateLobbySnapshot?: (payload: MultiplayerLobbySnapshot) => void;
  requestJoin: (payload: MultiplayerJoinRequest) => void;
  directJoin?: (hostAddress: string) => void;
  setReady: (payload: MultiplayerReadyUpdate) => void;
  kickPlayer?: (payload: { lobbyId: string; playerId: string; sessionId?: string }) => void;
  leaveLobby: (payload: { lobbyId: string; hostAddress: string; playerId: string }) => void;
  sendHeartbeat?: (payload: { lobbyId: string; hostAddress: string; playerId: string }) => void;
  stopBroadcast: () => void;
  broadcastGameState: (gameState: MultiplayerGameState) => void;
  onGameStateSync: (id: string, cb: (gameState: MultiplayerGameState) => void) => void;
  offGameStateSync: (id: string) => void;
  onAnswerSubmission: (id: string, cb: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) => void) => void;
  offAnswerSubmission: (id: string) => void;
  sendAnswerSubmission: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) => void;
  startHttpServer?: (data: string) => void;
  stopHttpServer?: () => void;
  onHttpServerStarted?: (id: string, cb: (port: number) => void) => void;
  offHttpServerStarted?: (id: string) => void;
}

declare global {
  interface Window {
    multiplayer?: MultiplayerBridge;
  }
}

export {};
