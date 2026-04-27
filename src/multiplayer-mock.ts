/// <reference types="vite/client" />

/**
 * Mock Multiplayer Bridge for Vite Development
 * 
 * This simulates the UDP networking layer so you can test multiplayer
 * features in the browser without running Electron.
 * 
 * Usage:
 * - Open multiple browser tabs/windows
 * - Each tab acts as a separate player (host or client)
 * - Uses BroadcastChannel API to simulate UDP broadcasts on localhost
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
} from "./types/multiplayer";

type MultiplayerPacket =
  | { type: "lobby-broadcast"; snapshot: MultiplayerLobbySnapshot }
  | { type: "discovery-request" }
  | { type: "join-request"; payload: MultiplayerJoinRequest }
  | { type: "ready-update"; payload: MultiplayerReadyUpdate }
  | { type: "leave-request"; payload: MultiplayerLeaveRequest }
  | { type: "heartbeat"; payload: { lobbyId: string; hostAddress: string; playerId: string } }
  | { type: "host-exit"; payload: MultiplayerHostExitPayload }
  | { type: "game-state"; payload: MultiplayerGameState }
  | { type: "answer-submission"; payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string } };

class MockMultiplayerBridge implements MultiplayerBridge {
  private channel: BroadcastChannel;

  private onHostFoundCbs = new Set<(payload: MultiplayerDiscoveredPayload) => void>();
  private onDiscoveryResponseCbs = new Set<(payload: MultiplayerDiscoveredPayload) => void>();
  private onPlayerJoinedCbs = new Set<(player: LobbyMember) => void>();
  private onPlayerReadyChangedCbs = new Set<(playerId: string, ready: boolean) => void>();
  private onPlayerLeftCbs = new Set<(playerId: string) => void>();
  private onHostExitCbs = new Set<(payload: MultiplayerHostExitPayload) => void>();
  private onGameStateSyncCbs = new Set<(payload: MultiplayerGameState) => void>();
  private onAnswerSubmissionCbs = new Set<(payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string }) => void>();

  private activeSnapshot: MultiplayerLobbySnapshot | null = null;
  private activeMode: "host" | "client" | null = null;
  private broadcastInterval: number | null = null;
  private pendingHostExitTimeout: number | null = null;
  private playerHeartbeats = new Map<string, number>();

  private getActiveHostAddress() {
    if (!this.activeSnapshot) return null;
    return this.activeSnapshot.hostAddress ?? `mock:${this.activeSnapshot.lobbyId}`;
  }

  private isTargetingActiveHost(hostAddress?: string) {
    const activeHostAddress = this.getActiveHostAddress();
    if (!hostAddress || !activeHostAddress) return true;
    return hostAddress === activeHostAddress;
  }

  constructor() {
    this.channel = new BroadcastChannel("tfgf-multiplayer");
    this.channel.onmessage = (event) => {
      this.handlePacket(event.data);
    };
    console.log('[mock] MultiplayerBridge initialized with BroadcastChannel');
  }

  private emitHostFound(snapshot: MultiplayerLobbySnapshot, hostAddress: string) {
    const payload: MultiplayerDiscoveredPayload = {
      ...snapshot,
      hostAddress,
      lastSeen: Date.now(),
    };
    this.onHostFoundCbs.forEach((cb) => cb(payload));
    this.onDiscoveryResponseCbs.forEach((cb) => cb(payload));
  }

  private emitHostExit(payload: MultiplayerHostExitPayload) {
    this.onHostExitCbs.forEach((cb) => cb(payload));
  }

  private broadcastSnapshot(snapshot: MultiplayerLobbySnapshot) {
    const packet: MultiplayerPacket = { type: "lobby-broadcast", snapshot };
    this.channel.postMessage(packet);
  }

  private pruneStalePlayers(staleMs = 10000) {
    if (!this.activeSnapshot) return;

    const now = Date.now();
    const stalePlayerIds = this.activeSnapshot.players
      .filter((p) => p.id !== this.activeSnapshot?.hostId)
      .filter((p) => {
        const lastSeen = this.playerHeartbeats.get(p.id);
        return lastSeen !== undefined && now - lastSeen > staleMs;
      })
      .map((p) => p.id);

    if (stalePlayerIds.length === 0) return;

    this.activeSnapshot = {
      ...this.activeSnapshot,
      players: this.activeSnapshot.players.filter((p) => !stalePlayerIds.includes(p.id)),
      playerCount: this.activeSnapshot.players.filter((p) => !stalePlayerIds.includes(p.id)).length,
    };

    stalePlayerIds.forEach((playerId) => this.onPlayerLeftCbs.forEach((cb) => cb(playerId)));
    this.broadcastSnapshot(this.activeSnapshot);
  }

  private sendHostExitMessage(lobbyId: string) {
    console.log('[mock] sending host-exit for lobby', lobbyId);
    const packet: MultiplayerPacket = { type: "host-exit", payload: { lobbyId } };
    this.channel.postMessage(packet);
  }

  private upsertLobbyMember(snapshot: MultiplayerLobbySnapshot, member: LobbyMember) {
    const existingIndex = snapshot.players.findIndex((p) => p.id === member.id);
    if (existingIndex >= 0) {
      const players = [...snapshot.players];
      players[existingIndex] = { ...players[existingIndex], ...member };
      return { ...snapshot, players, playerCount: players.length };
    }

    return {
      ...snapshot,
      players: [...snapshot.players, member],
      playerCount: snapshot.players.length + 1,
    };
  }

  private updateHostSnapshot(mutator: (current: MultiplayerLobbySnapshot) => MultiplayerLobbySnapshot) {
    if (!this.activeSnapshot) return;
    this.activeSnapshot = {
      ...mutator(this.activeSnapshot),
      hostAddress: this.getActiveHostAddress() ?? "localhost",
    };
    console.log('[mock] updated activeSnapshot, players=', this.activeSnapshot.players.map(p => p.id).join(','));
    this.broadcastSnapshot(this.activeSnapshot);
    this.emitHostFound(this.activeSnapshot, this.activeSnapshot.hostAddress ?? "localhost");
  }

  private handlePacket(packet: MultiplayerPacket) {
    console.log('[mock] received packet', packet.type, 'activeMode=', this.activeMode);

    // ------- shared discovery behavior (client+host) -------
    if (packet.type === "lobby-broadcast") {
      this.activeMode = this.activeMode ?? "client";
      this.emitHostFound(packet.snapshot, "localhost");
      return;
    }

    // If a client asks for discovery, respond immediately when we're a host.
    if (packet.type === "discovery-request") {
      if (this.activeMode === "host" && this.activeSnapshot) {
        if (this.activeSnapshot.isPrivate) {
          console.log('[mock] ignoring discovery request for private lobby', this.activeSnapshot.lobbyId);
          return;
        }
        console.log('[mock] responding to discovery request with lobby', this.activeSnapshot.lobbyId);
        this.broadcastSnapshot(this.activeSnapshot);
      }
      return;
    }

    if (packet.type === "host-exit") {
      console.log('[mock] host-exit received for lobby', packet.payload.lobbyId);
      this.emitHostExit(packet.payload);

      // Only clear local host state if it is the same lobby that just exited.
      if (this.activeMode === "host" && this.activeSnapshot?.lobbyId === packet.payload.lobbyId) {
        console.log('[mock] clearing host state for lobby', packet.payload.lobbyId);
        this.activeSnapshot = null;
        this.activeMode = null;
      }
      return;
    }

    if (packet.type === "game-state") {
      if (this.activeMode === "client") {
        this.onGameStateSyncCbs.forEach((cb) => cb(packet.payload));
      }
      return;
    }

    // ------- host-only handler block -------
    if (this.activeMode !== "host" || !this.activeSnapshot) return;

    if (packet.type === "heartbeat") {
      if (!this.activeSnapshot || packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      if (!this.isTargetingActiveHost(packet.payload.hostAddress)) return;
      this.playerHeartbeats.set(packet.payload.playerId, Date.now());
      return;
    }

    if (packet.type === "join-request") {
      if (!this.activeSnapshot || packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      if (!this.isTargetingActiveHost(packet.payload.hostAddress)) return;
      console.log('[mock] join-request for lobby', packet.payload.lobbyId, 'player', packet.payload.player.id);

      this.playerHeartbeats.set(packet.payload.player.id, Date.now());

      this.updateHostSnapshot((current) =>
        this.upsertLobbyMember(current, {
          ...packet.payload.player,
          isHost: false,
          isReady: false,
        }),
      );

      this.onPlayerJoinedCbs.forEach((cb) =>
        cb({
          ...packet.payload.player,
          isHost: false,
          isReady: false,
        }),
      );
      return;
    }

    if (packet.type === "ready-update") {
      if (!this.activeSnapshot || packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      if (!this.isTargetingActiveHost(packet.payload.hostAddress)) return;
      console.log('[mock] ready-update for', packet.payload.playerId, 'ready=', packet.payload.ready);

      this.playerHeartbeats.set(packet.payload.playerId, Date.now());

      this.updateHostSnapshot((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === packet.payload.playerId ? { ...player, isReady: packet.payload.ready } : player,
        ),
        playerCount: current.players.length,
      }));

      this.onPlayerReadyChangedCbs.forEach((cb) => cb(packet.payload.playerId, packet.payload.ready));
      return;
    }

    if (packet.type === "leave-request") {
      if (packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      if (!this.isTargetingActiveHost(packet.payload.hostAddress)) return;
      console.log('[mock] leave-request for player', packet.payload.playerId);

      this.playerHeartbeats.delete(packet.payload.playerId);

      this.activeSnapshot = {
        ...this.activeSnapshot,
        players: this.activeSnapshot.players.filter((p) => p.id !== packet.payload.playerId),
        playerCount: this.activeSnapshot.players.filter((p) => p.id !== packet.payload.playerId).length,
      };
      this.broadcastSnapshot(this.activeSnapshot);
      this.onPlayerLeftCbs.forEach((cb) => cb(packet.payload.playerId));
    }

    if (packet.type === "answer-submission") {
      if (packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      if (!this.isTargetingActiveHost(packet.payload.hostAddress)) return;
      console.log('[mock] answer-submission from player', packet.payload.playerId, 'questionIndex', packet.payload.questionIndex, 'answer', packet.payload.answer);
      this.onAnswerSubmissionCbs.forEach((cb) => cb(packet.payload));
      return;
    }
  }

  // -------- Public Bridge -----------
  startDiscovery(): void {
    console.log('[mock] startDiscovery');
    this.activeMode = "client";
  }

  stopDiscovery(): void {
    console.log('[mock] stopDiscovery');
    if (this.activeMode === "client") {
      this.activeMode = null;
    }
  }

  startBroadcast(snapshot: MultiplayerLobbySnapshot): void {
    console.log('[mock] startBroadcast lobby', snapshot.lobbyId);
    if (this.pendingHostExitTimeout) {
      clearTimeout(this.pendingHostExitTimeout);
      this.pendingHostExitTimeout = null;
    }

    this.activeMode = "host";
    this.activeSnapshot = {
      ...snapshot,
      hostAddress: snapshot.hostAddress ?? `mock:${snapshot.lobbyId}`,
    };
    this.broadcastSnapshot(this.activeSnapshot);

    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
    this.broadcastInterval = window.setInterval(() => {
      if (!this.activeSnapshot) return;
      this.pruneStalePlayers(9000);
      this.broadcastSnapshot(this.activeSnapshot);
    }, 2000);
  }

  stopBroadcast(): void {
    console.log('[mock] stopBroadcast');

    if (this.activeMode === 'host' && this.activeSnapshot) {
      const lobbyId = this.activeSnapshot.lobbyId;
      if (this.pendingHostExitTimeout) {
        clearTimeout(this.pendingHostExitTimeout);
      }
      this.pendingHostExitTimeout = window.setTimeout(() => {
        this.sendHostExitMessage(lobbyId);
        this.pendingHostExitTimeout = null;
      }, 250);
    }

    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.playerHeartbeats.clear();
    if (this.activeMode === "host") {
      this.activeMode = null;
    }
    this.activeSnapshot = null;
  }

  updateLobbySnapshot(snapshot: MultiplayerLobbySnapshot): void {
    console.log('[mock] updateLobbySnapshot lobby', snapshot.lobbyId);
    this.activeSnapshot = {
      ...snapshot,
      hostAddress: snapshot.hostAddress ?? this.getActiveHostAddress() ?? `mock:${snapshot.lobbyId}`,
    };
    this.broadcastSnapshot(this.activeSnapshot);
  }

  discoveryRequest(): void {
    console.log('[mock] sending discovery-request');
    const packet: MultiplayerPacket = { type: "discovery-request" };
    this.channel.postMessage(packet);
  }

  requestJoin(payload: MultiplayerJoinRequest): void {
    console.log('[mock] sending join-request to localhost lobby', payload.lobbyId, 'player', payload.player?.id, 'via broadcast');
    const packet: MultiplayerPacket = { type: "join-request", payload };
    this.channel.postMessage(packet);
  }

  setReady(payload: MultiplayerReadyUpdate): void {
    console.log('[mock] sending ready-update to localhost player', payload.playerId, 'ready', payload.ready, 'via broadcast');
    const packet: MultiplayerPacket = { type: "ready-update", payload };
    this.channel.postMessage(packet);
  }

  sendHeartbeat(payload: { lobbyId: string; hostAddress: string; playerId: string }): void {
    // console.log('[mock] sending heartbeat', payload.playerId, 'lobby', payload.lobbyId);
    const packet: MultiplayerPacket = { type: "heartbeat", payload: { lobbyId: payload.lobbyId, hostAddress: payload.hostAddress, playerId: payload.playerId } };
    this.channel.postMessage(packet);
  }

  leaveLobby(payload: MultiplayerLeaveRequest): void {
    console.log('[mock] sending leave-request to localhost player', payload.playerId);
    const packet: MultiplayerPacket = { type: "leave-request", payload };
    this.channel.postMessage(packet);
  }

  broadcastGameState(gameState: MultiplayerGameState): void {
    const packet: MultiplayerPacket = { type: "game-state", payload: gameState };
    this.channel.postMessage(packet);
  }

  sendAnswerSubmission(payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string }): void {
    const packet: MultiplayerPacket = { type: "answer-submission", payload };
    this.channel.postMessage(packet);
  }

  // ------- Callbacks --------

  onDiscoveryResponse(cb: (payload: MultiplayerDiscoveredPayload) => void): void {
    this.onDiscoveryResponseCbs.add(cb);
  }
  offDiscoveryResponse(cb: (payload: MultiplayerDiscoveredPayload) => void): void {
    this.onDiscoveryResponseCbs.delete(cb);
  }
  onHostFound(cb: (payload: MultiplayerDiscoveredPayload) => void): void {
    this.onHostFoundCbs.add(cb);
  }
  offHostFound(cb: (payload: MultiplayerDiscoveredPayload) => void): void {
    this.onHostFoundCbs.delete(cb);
  }
  onPlayerJoined(cb: (player: LobbyMember) => void): void {
    this.onPlayerJoinedCbs.add(cb);
  }
  offPlayerJoined(cb: (player: LobbyMember) => void): void {
    this.onPlayerJoinedCbs.delete(cb);
  }
  onPlayerReadyChanged(cb: (playerId: string, ready: boolean) => void): void {
    this.onPlayerReadyChangedCbs.add(cb);
  }
  offPlayerReadyChanged(cb: (playerId: string, ready: boolean) => void): void {
    this.onPlayerReadyChangedCbs.delete(cb);
  }
  onPlayerLeft(cb: (playerId: string) => void): void {
    this.onPlayerLeftCbs.add(cb);
  }
  offPlayerLeft(cb: (playerId: string) => void): void {
    this.onPlayerLeftCbs.delete(cb);
  }
  onHostExit(cb: (payload: MultiplayerHostExitPayload) => void): void {
    this.onHostExitCbs.add(cb);
  }
  offHostExit(cb: (payload: MultiplayerHostExitPayload) => void): void {
    this.onHostExitCbs.delete(cb);
  }
  onGameStateSync(cb: (payload: MultiplayerGameState) => void): void {
    this.onGameStateSyncCbs.add(cb);
  }
  offGameStateSync(cb: (payload: MultiplayerGameState) => void): void {
    this.onGameStateSyncCbs.delete(cb);
  }
  onAnswerSubmission(cb: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string }) => void): void {
    this.onAnswerSubmissionCbs.add(cb);
  }
  offAnswerSubmission(cb: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string }) => void): void {
    this.onAnswerSubmissionCbs.delete(cb);
  }
}

// Initialize and expose mock bridge in development (only if not already provided by Electron)
declare global {
  interface Window {
    multiplayer?: MultiplayerBridge;
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined' && !window.multiplayer) {
  console.log('[mock] Initializing mock multiplayer bridge for Vite dev mode');
  window.multiplayer = new MockMultiplayerBridge();
} else if (window.multiplayer) {
  console.log('[mock] Electron multiplayer bridge detected, skipping mock');
}
