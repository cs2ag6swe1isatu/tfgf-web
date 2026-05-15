/**
 * WebSocket Bridge for Internet Multiplayer Play
 * 
 * Implements the same MultiplayerBridge interface as the UDP/mDNS version.
 * Connects to a relay server (Render.com) instead of using local broadcasts.
 */

import type {
  LobbyMember,
  MultiplayerDiscoveredPayload,
  MultiplayerHostExitPayload,
  MultiplayerJoinRequest,
  MultiplayerLeaveRequest,
  MultiplayerLobbySnapshot,
  MultiplayerReadyUpdate,
  MultiplayerGameState,
  MultiplayerBridge,
} from './types/multiplayer';

type MultiplayerPacket =
  | { type: 'lobby-broadcast'; payload: MultiplayerLobbySnapshot }
  | { type: 'discovery-request' }
  | { type: 'join-request'; payload: MultiplayerJoinRequest }
  | { type: 'ready-update'; payload: MultiplayerReadyUpdate }
  | { type: 'leave-request'; payload: MultiplayerLeaveRequest }
  | { type: 'heartbeat'; payload: { lobbyId: string; hostAddress: string; playerId: string } }
  | { type: 'host-exit'; payload: MultiplayerHostExitPayload }
  | { type: 'game-state'; payload: MultiplayerGameState }
  | { type: 'answer-submission'; payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string } };

export class WebSocketMultiplayerBridge implements MultiplayerBridge {
  private ws: WebSocket | null = null;
  public relayUrl: string; // Made public for bridge manager comparison
  private currentLobbyId: string | null = null;

  // Event callbacks
  private onHostFoundCbs = new Map<string, (payload: MultiplayerDiscoveredPayload) => void>();
  private onDiscoveryResponseCbs = new Map<string, (payload: MultiplayerDiscoveredPayload) => void>();
  private onPlayerJoinedCbs = new Map<string, (player: LobbyMember) => void>();
  private onPlayerReadyChangedCbs = new Map<string, (playerId: string, ready: boolean) => void>();
  private onPlayerLeftCbs = new Map<string, (playerId: string) => void>();
  private onHostExitCbs = new Map<string, (payload: MultiplayerHostExitPayload) => void>();
  private onGameStateSyncCbs = new Map<string, (payload: MultiplayerGameState) => void>();
  private onAnswerSubmissionCbs = new Map<string, (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) => void>();

  private discoveryInterval: number | null = null;
  private activeSnapshot: MultiplayerLobbySnapshot | null = null;
  private activeMode: 'host' | 'client' | null = null;

  constructor(relayUrl: string) {
    this.relayUrl = relayUrl.endsWith('/') ? relayUrl.slice(0, -1) : relayUrl;
    console.log('[WS] WebSocketMultiplayerBridge initialized');
  }

  private async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const wsUrl = this.relayUrl.replace(/^http/, 'ws');
        console.log(`[WS] Connecting to ${wsUrl}`);
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[WS] Connected to relay server');
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handlePacket(JSON.parse(event.data));
        };

        this.ws.onerror = (err) => {
          console.error('[WS] WebSocket error:', err);
        };

        this.ws.onclose = () => {
          console.log('[WS] Disconnected from relay server');
          this.ws = null;
        };

        // Timeout if connection doesn't establish
        setTimeout(() => {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[WS] Connection timeout');
            resolve(false);
          }
        }, 5000);
      } catch (err) {
        console.error('[WS] Connection failed:', err);
        resolve(false);
      }
    });
  }

  private send(packet: MultiplayerPacket) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Not connected, dropping packet:', packet.type);
      return;
    }
    const message = JSON.stringify({
      ...packet,
      lobbyId: this.currentLobbyId,
    });
    this.ws.send(message);
  }

  private handlePacket(message: any) {
    const { type, payload } = message;

    switch (type) {
      case 'lobby-broadcast': {
        const snapshot = payload as MultiplayerLobbySnapshot;
        this.activeSnapshot = snapshot;
        this.currentLobbyId = snapshot.lobbyId;

        const discovered: MultiplayerDiscoveredPayload = {
          ...snapshot,
          lastSeen: Date.now(),
        };

        this.onDiscoveryResponseCbs.forEach((cb) => cb(discovered));
        this.onHostFoundCbs.forEach((cb) => cb(discovered));
        break;
      }

      case 'join-request': {
        const { lobbyId, player } = payload as MultiplayerJoinRequest;
        this.onPlayerJoinedCbs.forEach((cb) => cb(player));
        break;
      }

      case 'ready-update': {
        const { playerId, ready } = payload as MultiplayerReadyUpdate;
        this.onPlayerReadyChangedCbs.forEach((cb) => cb(playerId, ready));
        break;
      }

      case 'leave-request': {
        const { playerId } = payload as MultiplayerLeaveRequest;
        this.onPlayerLeftCbs.forEach((cb) => cb(playerId));
        break;
      }

      case 'host-exit': {
        const hostExit = payload as MultiplayerHostExitPayload;
        this.onHostExitCbs.forEach((cb) => cb(hostExit));
        break;
      }

      case 'game-state': {
        const gameState = payload as MultiplayerGameState;
        this.onGameStateSyncCbs.forEach((cb) => cb(gameState));
        break;
      }

      case 'answer-submission': {
        const answerSubmission = payload as {
          lobbyId: string;
          hostAddress: string;
          playerId: string;
          questionIndex: number;
          answer: string;
          remainingTime?: number;
        };
        this.onAnswerSubmissionCbs.forEach((cb) => cb(answerSubmission));
        break;
      }
    }
  }

  // ─── MultiplayerBridge Implementation ───────────────────────────────────

  startDiscovery(): void {
    console.log('[WS] Starting discovery');
    this.connect();

    // Send discovery request periodically
    this.discoveryInterval = window.setInterval(() => {
      this.send({ type: 'discovery-request' });
    }, 3000) as unknown as number;
  }

  stopDiscovery(): void {
    console.log('[WS] Stopping discovery');
    if (this.discoveryInterval !== null) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }

  discoveryRequest(): void {
    this.send({ type: 'discovery-request' });
  }

  onDiscoveryResponse(id: string, cb: (payload: MultiplayerDiscoveredPayload) => void): void {
    this.onDiscoveryResponseCbs.set(id, cb);
  }

  offDiscoveryResponse(id: string): void {
    this.onDiscoveryResponseCbs.delete(id);
  }

  onHostFound(id: string, cb: (payload: MultiplayerDiscoveredPayload) => void): void {
    this.onHostFoundCbs.set(id, cb);
  }

  offHostFound(id: string): void {
    this.onHostFoundCbs.delete(id);
  }

  onPlayerJoined(id: string, cb: (player: LobbyMember) => void): void {
    this.onPlayerJoinedCbs.set(id, cb);
  }

  offPlayerJoined(id: string): void {
    this.onPlayerJoinedCbs.delete(id);
  }

  onPlayerReadyChanged(id: string, cb: (playerId: string, ready: boolean) => void): void {
    this.onPlayerReadyChangedCbs.set(id, cb);
  }

  offPlayerReadyChanged(id: string): void {
    this.onPlayerReadyChangedCbs.delete(id);
  }

  onPlayerLeft(id: string, cb: (playerId: string) => void): void {
    this.onPlayerLeftCbs.set(id, cb);
  }

  offPlayerLeft(id: string): void {
    this.onPlayerLeftCbs.delete(id);
  }

  onHostExit(id: string, cb: (payload: MultiplayerHostExitPayload) => void): void {
    this.onHostExitCbs.set(id, cb);
  }

  offHostExit(id: string): void {
    this.onHostExitCbs.delete(id);
  }

  startBroadcast(payload: MultiplayerLobbySnapshot): void {
    this.activeMode = 'host';
    this.currentLobbyId = payload.lobbyId;
    this.activeSnapshot = payload;
    this.send({ type: 'lobby-broadcast', payload });
  }

  updateLobbySnapshot(payload: MultiplayerLobbySnapshot): void {
    this.activeSnapshot = payload;
    this.send({ type: 'lobby-broadcast', payload });
  }

  requestJoin(payload: MultiplayerJoinRequest): void {
    this.activeMode = 'client';
    this.currentLobbyId = payload.lobbyId;
    this.send({ type: 'join-request', payload });
  }

  directJoin(hostAddress: string): void {
    // Not applicable for WebSocket - we don't use direct IP
  }

  setReady(payload: MultiplayerReadyUpdate): void {
    this.send({ type: 'ready-update', payload });
  }

  leaveLobby(payload: { lobbyId: string; hostAddress: string; playerId: string }): void {
    this.send({
      type: 'leave-request',
      payload: payload as MultiplayerLeaveRequest,
    });
  }

  stopBroadcast(): void {
    this.activeMode = null;
    this.currentLobbyId = null;
  }

  broadcastGameState(gameState: MultiplayerGameState): void {
    this.send({ type: 'game-state', payload: gameState });
  }

  onGameStateSync(id: string, cb: (gameState: MultiplayerGameState) => void): void {
    this.onGameStateSyncCbs.set(id, cb);
  }

  offGameStateSync(id: string): void {
    this.onGameStateSyncCbs.delete(id);
  }

  sendAnswerSubmission(payload: {
    lobbyId: string;
    hostAddress: string;
    playerId: string;
    questionIndex: number;
    answer: string;
    remainingTime?: number;
  }): void {
    this.send({ type: 'answer-submission', payload });
  }

  onAnswerSubmission(
    id: string,
    cb: (payload: {
      lobbyId: string;
      hostAddress: string;
      playerId: string;
      questionIndex: number;
      answer: string;
      remainingTime?: number;
    }) => void
  ): void {
    this.onAnswerSubmissionCbs.set(id, cb);
  }

  offAnswerSubmission(id: string): void {
    this.onAnswerSubmissionCbs.delete(id);
  }

  /**
   * Cleanup method to disconnect and reset state.
   * Call when switching away from internet mode.
   */
  cleanup(): void {
    console.log('[WS] Cleaning up WebSocket bridge');
    this.stopDiscovery();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onHostFoundCbs.clear();
    this.onDiscoveryResponseCbs.clear();
    this.onPlayerJoinedCbs.clear();
    this.onPlayerReadyChangedCbs.clear();
    this.onPlayerLeftCbs.clear();
    this.onHostExitCbs.clear();
    this.onGameStateSyncCbs.clear();
    this.onAnswerSubmissionCbs.clear();
    this.activeSnapshot = null;
    this.activeMode = null;
    this.currentLobbyId = null;
  }
}
