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
  MultiplayerBridge,
} from "./types/multiplayer";

type MultiplayerPacket =
  | { type: "lobby-broadcast"; snapshot: MultiplayerLobbySnapshot }
  | { type: "discovery-request" }
  | { type: "join-request"; payload: MultiplayerJoinRequest }
  | { type: "ready-update"; payload: MultiplayerReadyUpdate }
  | { type: "leave-request"; payload: MultiplayerLeaveRequest }
  | { type: "heartbeat"; payload: { lobbyId: string; playerId: string } }
  | { type: "host-exit"; payload: MultiplayerHostExitPayload };
  // | { type: "game-start"; payload: };

class MockMultiplayerBridge implements MultiplayerBridge {
  private channel: BroadcastChannel;
  private onHostFoundCbs = new Set<(payload: MultiplayerDiscoveredPayload) => void>();
  private onPlayerJoinedCbs = new Set<(player: LobbyMember) => void>();
  private onPlayerReadyChangedCbs = new Set<(playerId: string, ready: boolean) => void>();
  private onPlayerLeftCbs = new Set<(playerId: string) => void>();
  private onDiscoveryResponseCbs = new Set<(payload: MultiplayerDiscoveredPayload) => void>();
  private onHostExitCbs = new Set<(payload: MultiplayerHostExitPayload) => void>();
  
  private activeSnapshot: MultiplayerLobbySnapshot | null = null;
  private activeMode: "host" | "client" | null = null;
  private broadcastInterval: number | null = null;
  private pendingHostExitTimeout: number | null = null;
  private playerHeartbeats = new Map<string, number>();

  constructor() {
    this.channel = new BroadcastChannel("tfgf-multiplayer");
    this.channel.onmessage = (event) => {
      this.handlePacket(event.data);
    };
    console.log('[mock] MultiplayerBridge initialized with BroadcastChannel');
  }

  private handlePacket(packet: MultiplayerPacket) {
    console.log('[mock] received packet', packet.type, 'activeMode=', this.activeMode);

    // ------- shared discovery behavior (client+host) -------
    if (packet.type === "lobby-broadcast") {
      this.activeMode = this.activeMode ?? "client";
      const payload = {
        ...packet.snapshot,
        hostAddress: "localhost",
        lastSeen: Date.now(),
      } as MultiplayerDiscoveredPayload;

      this.onHostFoundCbs.forEach((cb) => cb(payload));
      this.onDiscoveryResponseCbs.forEach((cb) => cb(payload));
      return;
    }

    // If a client asks for discovery, respond immediately when we're a host.
    if (packet.type === "discovery-request") {
      if (this.activeMode === "host" && this.activeSnapshot) {
        // Private lobbies do not answer discovery requests.
        if (this.activeSnapshot.isPrivate) {
          console.log('[mock] ignoring discovery request for private lobby', this.activeSnapshot.lobbyId);
          return;
        }

        // Respond with current snapshot so the requester learns about us.
        console.log('[mock] responding to discovery request with lobby', this.activeSnapshot.lobbyId);
        this.broadcastSnapshot(this.activeSnapshot);
      }
      return;
    }

    if (packet.type === "host-exit") {
      console.log('[mock] host-exit detected for lobby', packet.payload.lobbyId);
      this.onHostExitCbs.forEach((cb) => cb(packet.payload));

      // Only clear local host state if it is the same lobby that just exited.
      if (this.activeMode === "host" && this.activeSnapshot?.lobbyId === packet.payload.lobbyId) {
        console.log('[mock] clearing host state for lobby', packet.payload.lobbyId);
        this.activeSnapshot = null;
        this.activeMode = null;
      }
      
      return;
    }

    // ------- host-only handler block -------
    if (this.activeMode !== "host" || !this.activeSnapshot) return;

    if (packet.type === "join-request") {
      if (packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      console.log('[mock] join-request for lobby', packet.payload.lobbyId, 'player', packet.payload.player.id);
      
      // Update heartbeat as soon as player joins
      this.playerHeartbeats.set(packet.payload.player.id, Date.now());

      // Update snapshot
      this.activeSnapshot = this.upsertLobbyMember(this.activeSnapshot, {
        ...packet.payload.player,
        isHost: false,
        isReady: false,
      });
      
      // Broadcast updated snapshot
      this.broadcastSnapshot(this.activeSnapshot);
      
      // Notify renderer
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
      if (packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      console.log('[mock] ready-update for', packet.payload.playerId, 'ready=', packet.payload.ready);
      
      // Update heartbeat (client is active)
      this.playerHeartbeats.set(packet.payload.playerId, Date.now());

      // Update snapshot
      this.activeSnapshot = {
        ...this.activeSnapshot,
        players: this.activeSnapshot.players.map((p) =>
          p.id === packet.payload.playerId ? { ...p, isReady: packet.payload.ready } : p
        ),
      };
      
      // Broadcast updated snapshot
      this.broadcastSnapshot(this.activeSnapshot);
      
      // Notify renderer
      this.onPlayerReadyChangedCbs.forEach((cb) => cb(packet.payload.playerId, packet.payload.ready));
      return;
    }

    if (packet.type === "heartbeat") {
      if (packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      this.playerHeartbeats.set(packet.payload.playerId, Date.now());
      return;
    }

    if (packet.type === "leave-request") {
      if (packet.payload.lobbyId !== this.activeSnapshot.lobbyId) return;
      console.log('[mock] leave-request for player', packet.payload.playerId);
      
      // Update snapshot
      this.activeSnapshot = {
        ...this.activeSnapshot,
        players: this.activeSnapshot.players.filter((p) => p.id !== packet.payload.playerId),
        playerCount: this.activeSnapshot.players.filter((p) => p.id !== packet.payload.playerId).length,
      };

      this.playerHeartbeats.delete(packet.payload.playerId);
      
      // Broadcast updated snapshot
      this.broadcastSnapshot(this.activeSnapshot);
      
      // Notify renderer
      this.onPlayerLeftCbs.forEach((cb) => cb(packet.payload.playerId));
      return;
    }
  }

  private upsertLobbyMember(snapshot: MultiplayerLobbySnapshot, member: LobbyMember): MultiplayerLobbySnapshot {
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

  private broadcastSnapshot(snapshot: MultiplayerLobbySnapshot) {
    // Do not broadcast snapshots for private lobbies — private lobbies
    // should not be discoverable via BroadcastChannel.
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
  }

  private sendHostExit(lobbyId: string) {
    console.log('[mock] sending host-exit for lobby', lobbyId);
    const packet: MultiplayerPacket = { type: "host-exit", payload: { lobbyId } };
    this.channel.postMessage(packet);
  }

  startDiscovery(): void {
    console.log('[mock] startDiscovery');
    this.activeMode = "client";
    this.discoveryRequest();
  }

  discoveryRequest(): void {
    console.log('[mock] sending discovery-request');
    const packet: MultiplayerPacket = { type: "discovery-request" };
    this.channel.postMessage(packet);
  }

  stopDiscovery(): void {
    console.log('[mock] stopDiscovery');
    if (this.activeMode === "client") {
      this.activeMode = null;
    }
  }

  onHostFound(cb: (payload: MultiplayerDiscoveredPayload) => void): void {
    this.onHostFoundCbs.add(cb);
  }

  onDiscoveryResponse(cb: (payload: MultiplayerDiscoveredPayload) => void): void {
    this.onDiscoveryResponseCbs.add(cb);
  }

  offDiscoveryResponse(cb: (payload: MultiplayerDiscoveredPayload) => void): void {
    this.onDiscoveryResponseCbs.delete(cb);
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

  startBroadcast(payload: MultiplayerLobbySnapshot): void {
    console.log('[mock] startBroadcast lobby', payload.lobbyId);
    if (this.pendingHostExitTimeout) {
      clearTimeout(this.pendingHostExitTimeout);
      this.pendingHostExitTimeout = null;
    }

    this.activeMode = "host";
    this.activeSnapshot = payload;
    this.broadcastSnapshot(payload);

    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }
    this.broadcastInterval = window.setInterval(() => {
      if (!this.activeSnapshot) return;

      this.pruneStalePlayers(9000);

      this.broadcastSnapshot(this.activeSnapshot);
    }, 2000);
  }

  updateLobbySnapshot(payload: MultiplayerLobbySnapshot): void {
    console.log('[mock] updateLobbySnapshot lobby', payload.lobbyId);
    this.activeSnapshot = payload;
    this.broadcastSnapshot(payload);
  }

  stopBroadcast(): void {
    console.log('[mock] stopBroadcast');
    if (this.activeMode === 'host' && this.activeSnapshot) {
      const lobbyId = this.activeSnapshot.lobbyId;
      if (this.pendingHostExitTimeout) {
        clearTimeout(this.pendingHostExitTimeout);
      }
      this.pendingHostExitTimeout = window.setTimeout(() => {
        this.sendHostExit(lobbyId);
        this.pendingHostExitTimeout = null;
      }, 250);
    }

    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.playerHeartbeats.clear();
    this.activeMode = null;
    this.activeSnapshot = null;
  }

  requestJoin(payload: MultiplayerJoinRequest): void {
    console.log('[mock] sending join-request lobby', payload.lobbyId, 'player', payload.player?.id);
    const packet: MultiplayerPacket = { type: "join-request", payload };
    this.channel.postMessage(packet);
  }

  setReady(payload: MultiplayerReadyUpdate): void {
    console.log('[mock] sending ready-update player', payload.playerId, 'ready', payload.ready);
    const packet: MultiplayerPacket = { type: "ready-update", payload };
    this.channel.postMessage(packet);
  }

  sendHeartbeat(payload: { lobbyId: string; hostAddress: string; playerId: string }): void {
    // For mock we don't actually need hostAddress, but keep prototype compatible.
    console.log('[mock] sending heartbeat', payload.playerId, 'lobby', payload.lobbyId);
    const packet: MultiplayerPacket = { type: "heartbeat", payload: { lobbyId: payload.lobbyId, playerId: payload.playerId } };
    this.channel.postMessage(packet);
  }


  leaveLobby(payload: { lobbyId: string; hostAddress: string; playerId: string }): void {
    console.log('[mock] sending leave-request player', payload.playerId);
    const packet: MultiplayerPacket = { type: "leave-request", payload };
    this.channel.postMessage(packet);
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
