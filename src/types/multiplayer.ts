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
  phase: Phase;
  timer: number;
  currentIndex: number;
  seed?: number;
  category?: Category;
  difficulty?: Difficulty;
  questionLimit?: number;
  questionTimer?: number;
  answerTimer?: number;
}

export interface MultiplayerDiscoveredPayload extends MultiplayerLobbySnapshot {
  lastSeen: number;
}

export interface MultiplayerLobbySnapshot extends MultiplayerBroadcastPayload {
  players: LobbyMember[];
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
}

export type DiscoveredHost = {
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
  lastSeen: number; // epoch ms
};

export interface MultiplayerBridge {
  startDiscovery: () => void;
  stopDiscovery: () => void;
  discoveryRequest: () => void;
  onDiscoveryResponse: (cb: (payload: MultiplayerDiscoveredPayload) => void) => void;
  offDiscoveryResponse: (cb: (payload: MultiplayerDiscoveredPayload) => void) => void;
  onHostFound: (cb: (payload: MultiplayerDiscoveredPayload) => void) => void;
  offHostFound: (cb: (payload: MultiplayerDiscoveredPayload) => void) => void;
  onPlayerJoined: (cb: (player: LobbyMember) => void) => void;
  offPlayerJoined: (cb: (player: LobbyMember) => void) => void;
  onPlayerReadyChanged: (cb: (playerId: string, ready: boolean) => void) => void;
  offPlayerReadyChanged: (cb: (playerId: string, ready: boolean) => void) => void;
  onPlayerLeft: (cb: (playerId: string) => void) => void;
  offPlayerLeft: (cb: (playerId: string) => void) => void;
  onPlayerKicked?: (cb: (lobbyId: string, playerId: string) => void) => void;
  offPlayerKicked?: (cb: (lobbyId: string, playerId: string) => void) => void;
  onHostExit: (cb: (payload: MultiplayerHostExitPayload) => void) => void;
  offHostExit: (cb: (payload: MultiplayerHostExitPayload) => void) => void;
  startBroadcast: (payload: MultiplayerLobbySnapshot) => void;
  updateLobbySnapshot?: (payload: MultiplayerLobbySnapshot) => void;
  requestJoin: (payload: MultiplayerJoinRequest) => void;
  setReady: (payload: MultiplayerReadyUpdate) => void;
  kickPlayer?: (payload: { lobbyId: string; playerId: string }) => void;
  leaveLobby: (payload: { lobbyId: string; hostAddress: string; playerId: string }) => void;
  sendHeartbeat?: (payload: { lobbyId: string; hostAddress: string; playerId: string }) => void;
  stopBroadcast: () => void;
  broadcastGameState: (gameState: MultiplayerGameState) => void;
  onGameStateSync: (cb: (gameState: MultiplayerGameState) => void) => void;
  offGameStateSync: (cb: (gameState: MultiplayerGameState) => void) => void;
  onAnswerSubmission: (cb: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string }) => void) => void;
  offAnswerSubmission: (cb: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string }) => void) => void;
  sendAnswerSubmission: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string }) => void;
}

declare global {
  interface Window {
    multiplayer?: MultiplayerBridge;
  }
}

export {};
