import { Phase } from "../store";
import { Category, Difficulty, Rank } from "../constants";
import type { PlayerRoundAnswer } from "../rules";

export type PlayerConnectionState = "connected" | "disconnected";

export interface LobbyMember {
  id: string;
  name: string;
  avatar: string;
  level: number;
  rank: Rank;
  isReady: boolean;
  isHost: boolean;
  connectionState?: PlayerConnectionState;
  lastSeenAt?: number;
  disconnectedAt?: number;
  status?: "lobby" | "playing" | "results";
  role?: "player" | "spectator"; 
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
  sessionId?: string;
  difficulty?: Difficulty;
  questionLimit?: number;
  questionTimer?: number;
  answerTimer?: number;
  questionPort?: number;
  playerScores?: Record<string, number>;
  playerAnswers?: Record<string, PlayerRoundAnswer[]>;
  // Set to true when the host exits mid-game to signal clients that the
  // session was abandoned and no progression should be saved.
  hostAbandoned?: boolean;
  rankings?: Array<{
    playerId: string;
    name: string;
    score: number;
    rank: number;
    correctCount?: number;
    questionsAnswered?: number;
    accuracy?: number;
    avgTime?: number;
    xp?: number;
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
  playerId: string;
}

export interface MultiplayerReadyUpdate {
  lobbyId: string;
  hostAddress: string;
  playerId: string;
  ready: boolean;
  member?: Partial<LobbyMember>;
}

export interface MultiplayerHostExitPayload {
  lobbyId: string;
  sessionId?: string;
}

/**
 * Payload for host:session_terminated (explicit mid-game host exit).
 * Broadcast by the host when they press Back during an active multiplayer match.
 */
export interface MultiplayerSessionTerminatedPayload {
  reason: "host_exit";
}

export type DiscoveredHost = {
  [x: string]: any;
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
onPlayerDisconnected(arg0: string, cb: (playerId: string) => void): unknown;
  onPlayerLeft(arg0: string, onPlayerLeft: (playerId: string) => void): unknown;
  offPlayerDisconnected(arg0: string): unknown;
  onHttpServerStarted(arg0: string, arg1: (port: any) => void): unknown;
  offHttpServerStarted(arg0: string): unknown;
  // ── HTTP question server (host only) ──────────────────────────────────────
  // Starts a local HTTP server that serves the serialized question list to
  // clients fetching from http://<hostAddress>:<questionPort>/questions.
  startHttpServer?: (questionsJson: string) => void;

  startDiscovery: () => void;
  stopDiscovery: () => void;
  discoveryRequest: () => void;
  getLocalIp?: () => string;
  onDiscoveryResponse: (id: string, cb: (payload: MultiplayerDiscoveredPayload) => void) => void;
  offDiscoveryResponse: (id: string, cb: (payload: MultiplayerDiscoveredPayload) => void) => void;
  onHostFound: (id: string, cb: (payload: MultiplayerDiscoveredPayload) => void) => void;
  offHostFound: (id: string) => void;
  onPlayerJoined: (id: string, cb: (player: LobbyMember) => void) => void;
  offPlayerJoined: (id: string) => void;
  onPlayerReadyChanged: (id: string, cb: (playerId: string, ready: boolean, member?: Partial<LobbyMember>) => void) => void;
  offPlayerReadyChanged: (id: string) => void;
  onPlayerLeft(id: string, cb: (playerId: string) => void): unknown;
  offPlayerLeft: (id: string) => void;
  onPlayerStatusChanged?: (id: string, cb: (playerId: string, connectionState: PlayerConnectionState) => void) => void;
  offPlayerStatusChanged?: (id: string) => void;
  onPlayerKicked?: (id: string, cb: (lobbyId: string, playerId: string) => void) => void;
  offPlayerKicked?: (id: string) => void;
  onHostExit: (id: string, cb: (payload: MultiplayerHostExitPayload) => void) => void;
  offHostExit: (id: string) => void;

  /**
   * Register a listener for host:session_terminated events.
   * Fired when the host explicitly terminates a mid-game session.
   */
  onSessionTerminated: (id: string, cb: (payload: MultiplayerSessionTerminatedPayload) => void) => void;
  /** Remove a previously registered session-terminated listener. */
  offSessionTerminated: (id: string) => void;
  /**
   * Broadcast a host:session_terminated event to all clients.
   * Called by the host when pressing Back during an active multiplayer match.
   */
  broadcastSessionTerminated: (payload: MultiplayerSessionTerminatedPayload) => void;

  startBroadcast: (payload: MultiplayerLobbySnapshot) => void;
  updateLobbySnapshot?: (payload: MultiplayerLobbySnapshot) => void;
  requestJoin: (payload: MultiplayerJoinRequest) => void;
  directJoin?: (hostAddress: string) => void;
  setReady: (payload: MultiplayerReadyUpdate) => void;
  kickPlayer?: (payload: { lobbyId: string; playerId: string }) => void;
  leaveLobby: (payload: { lobbyId: string; hostAddress: string; playerId: string }) => void;
  sendHeartbeat?: (payload: { lobbyId: string; hostAddress: string; playerId: string }) => void;
  stopBroadcast: (options?: { suppressHostExit?: boolean }) => void;
  broadcastGameState: (gameState: MultiplayerGameState) => void;
  onGameStateSync: (id: string, cb: (gameState: MultiplayerGameState) => void) => void;
  offGameStateSync: (id: string) => void;
  onAnswerSubmission: (id: string, cb: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) => void) => void;
  offAnswerSubmission: (id: string) => void;
  sendAnswerSubmission: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) => void;
  broadcastEmote?: (payload: { playerId: string; emoteId: string }) => void;
  onEmoteReceived?: (listenerId: string, callback: (payload: { playerId: string; emoteId: string }) => void) => void;
  offEmoteReceived?: (listenerId: string) => void;
  sendEmote?: (payload: { lobbyId: string; hostAddress: string; playerId: string; emoteId: string; timestamp: number; uniqueId: string }) => void;
  onEmoteSync?: (source: string, callback: (payload: any) => void) => void;
  offEmoteSync?: (source: string) => void;
}

declare global {
  interface Window {
    multiplayer?: MultiplayerBridge;
  }
}

export {};