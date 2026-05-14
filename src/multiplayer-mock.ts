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
  MultiplayerJoinAck,
} from "./types/multiplayer";

type MultiplayerPacket =
  & { sequence: number; packetId: string }
  & (
    | { type: "lobby-broadcast"; snapshot: MultiplayerLobbySnapshot }
    | { type: "discovery-request" }
    | { type: "join-request"; payload: MultiplayerJoinRequest }
    | { type: "join-ack"; payload: MultiplayerJoinAck }
    | { type: "join-nack"; payload: MultiplayerJoinAck }
    | { type: "kick-player"; payload: { lobbyId: string; playerId: string; sessionId?: string } }
    | { type: "ready-update"; payload: MultiplayerReadyUpdate }
    | { type: "leave-request"; payload: MultiplayerLeaveRequest }
    | { type: "heartbeat"; payload: { lobbyId: string; hostAddress: string; playerId: string } }
    | { type: "host-exit"; payload: MultiplayerHostExitPayload }
    | { type: "game-state"; payload: MultiplayerGameState }
    | { type: "answer-submission"; payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string } }
  );

class MockMultiplayerBridge implements MultiplayerBridge {
  private channel: BroadcastChannel;

  private onHostFoundCbs = new Map<string, (payload: MultiplayerDiscoveredPayload) => void>();
  private onDiscoveryResponseCbs = new Map<string, (payload: MultiplayerDiscoveredPayload) => void>();
  private onPlayerJoinedCbs = new Map<string, (player: LobbyMember) => void>();
  private onPlayerKickedCbs = new Map<string, (payload: { lobbyId: string; playerId: string; sessionId?: string }) => void>();
  private onPlayerReadyChangedCbs = new Map<string, (playerId: string, ready: boolean) => void>();
  private onPlayerLeftCbs = new Map<string, (playerId: string) => void>();
  private onHostExitCbs = new Map<string, (payload: MultiplayerHostExitPayload) => void>();
  private onJoinResponseCbs = new Map<string, (payload: MultiplayerJoinAck) => void>();
  private onGameStateSyncCbs = new Map<string, (payload: MultiplayerGameState) => void>();
  private onAnswerSubmissionCbs = new Map<string, (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) => void>();

  private activeSnapshot: MultiplayerLobbySnapshot | null = null;
  private activeMode: "host" | "client" | null = null;
  private isGameActive = false;
  private broadcastInterval: number | null = null;
  private pendingHostExitTimeout: number | null = null;
  private playerHeartbeats = new Map<string, number>();
  private packetSequence = 0;
  private lastSeenPacketSequenceByScope = new Map<string, number>();

  private getActiveHostAddress() {
    if (!this.activeSnapshot) return null;
    return this.activeSnapshot.hostAddress ?? `mock:${this.activeSnapshot.lobbyId}`;
  }

  private generateSessionId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  }

  private nextPacketMeta() {
    this.packetSequence += 1;
    return { sequence: this.packetSequence, packetId: this.generateSessionId() };
  }

  private createPacket<T extends MultiplayerPacket["type"]>(type: T, payload: Omit<Extract<MultiplayerPacket, { type: T }>, "type" | "sequence" | "packetId"> = {} as Omit<Extract<MultiplayerPacket, { type: T }>, "type" | "sequence" | "packetId">) {
    const meta = this.nextPacketMeta();
    return { ...meta, type, ...payload } as Extract<MultiplayerPacket, { type: T }>;
  }

  private getPacketScope(packet: MultiplayerPacket) {
    switch (packet.type) {
      case "lobby-broadcast":
        return `${packet.snapshot.lobbyId}:${packet.snapshot.sessionId ?? 'no-session'}`;
      case "join-ack":
      case "join-nack":
        return `${packet.payload.lobbyId}:${packet.payload.sessionId ?? 'no-session'}`;
      case "ready-update":
      case "leave-request":
      case "heartbeat":
      case "kick-player":
      case "answer-submission":
        return `${packet.payload.lobbyId}`;
      case "host-exit":
        return `${packet.payload.lobbyId}`;
      case "game-state":
        return `${packet.payload.sessionId ?? 'no-session'}`;
      default:
        return null;
    }
  }

  private shouldAcceptPacket(packet: MultiplayerPacket) {
    const scope = this.getPacketScope(packet);
    if (!scope) return true;
    const lastSeen = this.lastSeenPacketSequenceByScope.get(scope);
    if (lastSeen !== undefined && packet.sequence <= lastSeen) return false;
    this.lastSeenPacketSequenceByScope.set(scope, packet.sequence);
    return true;
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
    const meta = this.nextPacketMeta();
    const sequencedSnapshot = { ...snapshot, sequence: meta.sequence };
    this.activeSnapshot = sequencedSnapshot;
    const packet = this.createPacket("lobby-broadcast", { snapshot: sequencedSnapshot });
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
    const packet = this.createPacket("host-exit", { payload: { lobbyId } });
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
    const current = this.activeSnapshot;
    const updated = mutator(current);
    this.activeSnapshot = {
      ...updated,
      hostAddress: updated.hostAddress ?? this.getActiveHostAddress() ?? "localhost",
      sessionId: updated.sessionId ?? current.sessionId ?? this.generateSessionId(),
    };
    console.log('[mock] updated activeSnapshot, players=', this.activeSnapshot.players.map((p) => p.id).join(','));
    this.broadcastSnapshot(this.activeSnapshot);
    this.emitHostFound(this.activeSnapshot, this.activeSnapshot.hostAddress ?? "localhost");
  }

  private handlePacket(packet: MultiplayerPacket) {
    console.log('[mock] received packet', packet.type, 'activeMode=', this.activeMode);

    // ------- shared discovery behavior (client+host) -------
    if (packet.type === "lobby-broadcast") {
      if (!this.shouldAcceptPacket(packet)) return;
      this.activeMode = this.activeMode ?? "client";
      this.emitHostFound(packet.snapshot, "localhost");
      return;
    }

    if (packet.type === 'join-ack' || packet.type === 'join-nack') {
      if (!this.shouldAcceptPacket(packet)) return;
      // deliver join responses to any listener (no strict activeMode guard)
      this.onJoinResponseCbs.forEach((cb) => cb(packet.payload));
      return;
    }

    if (packet.type === 'kick-player') {
      if (!this.shouldAcceptPacket(packet)) return;
      if (packet.payload.sessionId && this.activeSnapshot?.sessionId && packet.payload.sessionId !== this.activeSnapshot.sessionId) return;
      this.onPlayerKickedCbs.forEach((cb) => cb(packet.payload));
      return;
    }

    // If a client asks for discovery, respond immediately when we're a host.
    if (packet.type === "discovery-request") {
      if (!this.shouldAcceptPacket(packet)) return;
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
      if (!this.shouldAcceptPacket(packet)) return;
      if (packet.payload.sessionId && this.activeSnapshot?.sessionId && packet.payload.sessionId !== this.activeSnapshot.sessionId) return;
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
      if (!this.shouldAcceptPacket(packet)) return;
      if (this.activeMode === "client") {
        this.onGameStateSyncCbs.forEach((cb) => cb(packet.payload));
      }
      return;
    }

    // ------- host-only handler block -------
    if (this.activeMode !== "host" || !this.activeSnapshot) return;

    if (packet.type === "heartbeat") {
      if (!this.shouldAcceptPacket(packet)) return;
      if (!this.activeSnapshot || packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      this.playerHeartbeats.set(packet.payload.playerId, Date.now());
      return;
    }

    if (packet.type === "join-request") {
      if (!this.shouldAcceptPacket(packet)) return;
      // accept join-requests that target this lobbyId regardless of hostAddress formatting
      if (!this.activeSnapshot || packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      console.log('[mock] join-request for lobby', packet.payload.lobbyId, 'player', packet.payload.player.id, 'hostAddress', packet.payload.hostAddress);

      const isExisting = this.activeSnapshot.players.some(p => p.id === packet.payload.player.id);
      if (this.isGameActive && !isExisting) {
        // reject mid-game
        const nack: MultiplayerJoinAck = { lobbyId: packet.payload.lobbyId, hostId: this.activeSnapshot.hostId, sessionId: this.activeSnapshot.sessionId, accepted: false, reason: 'in-game' };
        console.log('[mock] sending join-nack', nack);
        this.channel.postMessage({ type: 'join-nack', payload: nack });
        return;
      }

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

      const ack: MultiplayerJoinAck = { lobbyId: packet.payload.lobbyId, hostId: this.activeSnapshot.hostId, sessionId: this.activeSnapshot.sessionId, accepted: true };
      console.log('[mock] sending join-ack', ack);
      this.channel.postMessage({ type: 'join-ack', payload: ack });
      return;
    }

    if (packet.type === "ready-update") {
      if (!this.shouldAcceptPacket(packet)) return;
      if (!this.activeSnapshot || packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      const playerExists = this.activeSnapshot.players.some((p) => p.id === packet.payload.playerId);
      console.log('[mock] ready-update for', packet.payload.playerId, 'ready=', packet.payload.ready, 'playerExists=', playerExists);

      if (!playerExists) {
        console.warn('[mock] ready-update received for unknown player', packet.payload.playerId);
        return;
      }

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
      if (!this.shouldAcceptPacket(packet)) return;
      if (packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
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
      if (!this.shouldAcceptPacket(packet)) return;
      if (packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
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
    this.isGameActive = false;
    if (this.pendingHostExitTimeout) {
      clearTimeout(this.pendingHostExitTimeout);
      this.pendingHostExitTimeout = null;
    }

    this.activeMode = "host";
    const existing = this.activeSnapshot && this.activeSnapshot.lobbyId === snapshot.lobbyId ? this.activeSnapshot : null;
    const mergedPlayers = [
      ...(snapshot.players || []),
      ...(existing?.players || []).filter((p) => !(snapshot.players || []).some((sp) => sp.id === p.id)),
    ];
    this.activeSnapshot = {
      ...snapshot,
      hostAddress: snapshot.hostAddress ?? `mock:${snapshot.lobbyId}`,
      players: mergedPlayers,
      playerCount: mergedPlayers.length,
      sessionId: snapshot.sessionId ?? existing?.sessionId ?? this.generateSessionId(),
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
    this.isGameActive = false;

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
    console.log('[mock] updateLobbySnapshot lobby', snapshot.lobbyId, 'players', snapshot.players?.map(p => p.id).join(','));
    // merge with existing players to avoid dropping joined players
    const existing = this.activeSnapshot && this.activeSnapshot.lobbyId === snapshot.lobbyId ? this.activeSnapshot : null;
    const mergedPlayers = [
      ...(snapshot.players || []),
      ...(existing?.players || []).filter((p) => !(snapshot.players || []).some((sp) => sp.id === p.id)),
    ];
    this.activeSnapshot = {
      ...snapshot,
      hostAddress: snapshot.hostAddress ?? this.getActiveHostAddress() ?? `mock:${snapshot.lobbyId}`,
      players: mergedPlayers,
      playerCount: mergedPlayers.length,
      sessionId: snapshot.sessionId ?? existing?.sessionId ?? this.generateSessionId(),
    };
    this.broadcastSnapshot(this.activeSnapshot);
  }

  discoveryRequest(): void {
    console.log('[mock] sending discovery-request');
    const packet = this.createPacket("discovery-request");
    this.channel.postMessage(packet);
  }

  requestJoin(payload: MultiplayerJoinRequest): void {
    console.log('[mock] sending join-request to localhost lobby', payload.lobbyId, 'player', payload.player?.id, 'via broadcast');
    const packet = this.createPacket("join-request", { payload });
    this.channel.postMessage(packet);
  }

  setReady(payload: MultiplayerReadyUpdate): void {
    console.log('[mock] sending ready-update to localhost player', payload.playerId, 'ready', payload.ready, 'via broadcast');
    const packet = this.createPacket("ready-update", { payload });
    this.channel.postMessage(packet);
  }

  sendHeartbeat(payload: { lobbyId: string; hostAddress: string; playerId: string }): void {
    // console.log('[mock] sending heartbeat', payload.playerId, 'lobby', payload.lobbyId);
    const packet = this.createPacket("heartbeat", { payload: { lobbyId: payload.lobbyId, hostAddress: payload.hostAddress, playerId: payload.playerId } });
    this.channel.postMessage(packet);
  }

  leaveLobby(payload: MultiplayerLeaveRequest): void {
    console.log('[mock] sending leave-request to localhost player', payload.playerId);
    const packet = this.createPacket("leave-request", { payload });
    this.channel.postMessage(packet);
  }

  broadcastGameState(gameState: MultiplayerGameState): void {
    this.isGameActive = true;
    const packet = this.createPacket("game-state", { payload: { ...gameState, sessionId: this.activeSnapshot?.sessionId } });
    this.channel.postMessage(packet);
  }

  sendAnswerSubmission(payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }): void {
    const packet = this.createPacket("answer-submission", { payload });
    this.channel.postMessage(packet);
  }

  kickPlayer(payload: { lobbyId: string; playerId: string; sessionId?: string }): void {
    console.log('[mock] sending kick-player for lobby', payload.lobbyId, 'player', payload.playerId);
    const packet = this.createPacket("kick-player", { payload: { ...payload, sessionId: payload.sessionId ?? this.activeSnapshot?.sessionId } });
    this.channel.postMessage(packet);
  }

  // ------- Callbacks --------

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
  onPlayerKicked(id: string, cb: (payload: { lobbyId: string; playerId: string; sessionId?: string }) => void): void {
    this.onPlayerKickedCbs.set(id, cb);
  }
  offPlayerKicked(id: string): void {
    this.onPlayerKickedCbs.delete(id);
  }
  onJoinResponse(id: string, cb: (payload: MultiplayerJoinAck) => void): void {
    this.onJoinResponseCbs.set(id, cb);
  }
  offJoinResponse(id: string): void {
    this.onJoinResponseCbs.delete(id);
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
  onGameStateSync(id: string, cb: (payload: MultiplayerGameState) => void): void {
    this.onGameStateSyncCbs.set(id, cb);
  }
  offGameStateSync(id: string): void {
    this.onGameStateSyncCbs.delete(id);
  }
  onAnswerSubmission(id: string, cb: (payload: { lobbyId: string; hostAddress: string; playerId: string; questionIndex: number; answer: string; remainingTime?: number }) => void): void {
    this.onAnswerSubmissionCbs.set(id, cb);
  }
  offAnswerSubmission(id: string): void {
    this.onAnswerSubmissionCbs.delete(id);
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
