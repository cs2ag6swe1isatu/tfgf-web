import { create } from "zustand";
import { Player } from "../types/player";
import type { DiscoveredHost, LobbyMember, MultiplayerLobbySnapshot, PlayerConnectionState } from "../types/multiplayer";
import { getRankForLevel } from "../constants";


type LobbyRole = "host" | "client";
type LobbyState = "lobby" | "discovering";

// ── NEW: spectator role this client is occupying ──────────────────────────
export type ParticipantRole = "player" | "spectator";

export interface MultiplayerStateData {
  lobbyRole: LobbyRole | null;
  lobbyId: string | null;
  hostId: string | null;
  hostAddress: string | null;
  players: LobbyMember[];
  // ── NEW ──────────────────────────────────────────
  spectators: LobbyMember[];
  participantRole: ParticipantRole;
  // ─────────────────────────────────────────────────
  lobbyState: LobbyState;
  isPrivate: boolean;
  currentPlayerId: string | null;
  discoveredHosts: DiscoveredHost[];
  joinStatus: 'idle' | 'joining' | 'joined';
  knownPlayers: Record<string, LobbyMember>;
}

export interface MultiplayerSelectors {
  currentPlayer: () => LobbyMember | null;
  isPlayerReady: (playerId: string) => boolean;
  isHostReady: () => boolean;
  isEveryoneReady: () => boolean;
}

export interface MultiplayerActions {
  setLobbyRole: (role: LobbyRole | null) => void;
  setLobbyId: (id: string | null) => void;
  setHostId: (id: string | null) => void;
  setHostAddress: (address: string | null) => void;
  setPrivate: (isPrivate: boolean) => void;
  addOrUpdatePlayer: (player: Player | LobbyMember, opts?: { isHost?: boolean; isReady?: boolean; connectionState?: PlayerConnectionState; lastSeenAt?: number; status?: "lobby" | "playing" | "results" }) => void;
  removePlayer: (playerId: string) => void;
  setPlayerReady: (playerId: string, ready: boolean) => void;
  setPlayerConnectionState: (playerId: string, connectionState: PlayerConnectionState) => void;
  setCurrentPlayerId: (id: string | null) => void;
  setLobbyState: (state: LobbyState) => void;
  resetMultiplayer: () => void;
  resetPlayerStatuses: () => void;
  syncLobbySnapshot: (snapshot: MultiplayerLobbySnapshot, hostAddress?: string | null) => void;
  addOrUpdateDiscoveredHost: (host: Partial<DiscoveredHost>) => void;
  removeDiscoveredHost: (lobbyId: string) => void;
  pruneStaleDiscoveredHosts: (ttlMs: number) => void;
  clearDiscoveredHosts: () => void;
  setJoinStatus: (status: 'idle' | 'joining' | 'joined') => void;
  // ── NEW ──────────────────────────────────────────
  setParticipantRole: (role: ParticipantRole) => void;
  addOrUpdateSpectator: (spectator: LobbyMember) => void;
  removeSpectator: (spectatorId: string) => void;
  // ─────────────────────────────────────────────────
}

export type MultiplayerState = MultiplayerStateData & MultiplayerSelectors & MultiplayerActions;

const initialState: MultiplayerStateData = {
  lobbyRole: null,
  lobbyId: null,
  hostId: null,
  hostAddress: null,
  players: [],
  // ── NEW ──────────────────────────────────────────
  spectators: [],
  participantRole: "player",
  // ─────────────────────────────────────────────────
  lobbyState: "lobby",
  isPrivate: false,
  currentPlayerId: null,
  discoveredHosts: [],
  joinStatus: 'idle',
  knownPlayers: {},
};

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  ...initialState,

  // Selectors
  isPlayerReady: (playerId: string) => {
    const player = get().players.find((p) => p.id === playerId);
    return !!player?.isReady && player.connectionState !== "disconnected";
  },
  isHostReady: () => {
    const hostId = get().hostId;
    if (!hostId) return false;
    const host = get().players.find((p) => p.id === hostId);
    return !!host?.isReady && host.connectionState !== "disconnected";
  },
  isEveryoneReady: () => {
    const players = get().players.filter((player) => player.connectionState !== "disconnected");
    return players.length > 0 && players.every((p) => p.isReady);
  },
  currentPlayer: () => {
    const id = get().currentPlayerId;
    if (!id) return null;
    // Search both players and spectators so currentPlayer() works for spectators too
    return get().players.find((p) => p.id === id) ?? get().spectators.find((p) => p.id === id) ?? null;
  },

  // Actions
  setLobbyRole: (role) => set({ lobbyRole: role }),
  setLobbyId: (id) => set({ lobbyId: id }),
  setHostId: (id) => set({ hostId: id }),
  setHostAddress: (address) => set({ hostAddress: address }),
  setPrivate: (isPrivate) => set({ isPrivate }),
  setJoinStatus: (status) => set({ joinStatus: status }),

  // ── NEW actions ───────────────────────────────────────────────────────────
  setParticipantRole: (role) => set({ participantRole: role }),

  addOrUpdateSpectator: (spectator) => {
    set((state) => {
      const existingIndex = state.spectators.findIndex((s) => s.id === spectator.id);
      if (existingIndex >= 0) {
        const spectators = [...state.spectators];
        spectators[existingIndex] = { ...spectators[existingIndex], ...spectator };
        return { spectators };
      }
      return { spectators: [...state.spectators, spectator] };
    });
  },

  removeSpectator: (spectatorId) =>
    set((state) => ({ spectators: state.spectators.filter((s) => s.id !== spectatorId) })),
  // ─────────────────────────────────────────────────────────────────────────

  addOrUpdateDiscoveredHost: (host) => {
    if (!host.lobbyId || !host.hostId) return;
    const now = Date.now();
    const lobbyId = host.lobbyId;
    const hostId = host.hostId;
    set((state) => {
      const existingIndex = state.discoveredHosts.findIndex((h) => h.lobbyId === lobbyId);
      const entry: DiscoveredHost = {
        lobbyId,
        hostId,
        hostName: host.hostName,
        hostLevel: host.hostLevel,
        hostAddress: host.hostAddress,
        playerCount: host.playerCount,
        maxPlayers: host.maxPlayers,
        category: host.category,
        difficulty: host.difficulty,
        lastSeen: now,
      };

      if (existingIndex >= 0) {
        const arr = [...state.discoveredHosts];
        arr[existingIndex] = { ...arr[existingIndex], ...entry };
        return { discoveredHosts: arr };
      }

      return { discoveredHosts: [...state.discoveredHosts, entry] };
    });
  },

  removeDiscoveredHost: (lobbyId: string) =>
    set((state) => ({ discoveredHosts: state.discoveredHosts.filter((h) => h.lobbyId !== lobbyId) })),

  pruneStaleDiscoveredHosts: (ttlMs) => {
    const now = Date.now();
    set((state) => ({ discoveredHosts: state.discoveredHosts.filter((h) => now - h.lastSeen <= ttlMs) }));
  },

  clearDiscoveredHosts: () => set({ discoveredHosts: [] }),

  addOrUpdatePlayer: (player, opts) => {
    set((state) => {
      const existingIndex = state.players.findIndex((p) => p.id === player.id);
      const existing = existingIndex >= 0 ? state.players[existingIndex] : null;
      const member: LobbyMember = {
        id: player.id,
        name: player.name,
        avatar: player.avatar || existing?.avatar || "",
        level: player.level,
        rank: getRankForLevel(player.level),
        isReady: opts?.isReady ?? existing?.isReady ?? false,
        isHost: opts?.isHost ?? existing?.isHost ?? false,
        connectionState: opts?.connectionState ?? existing?.connectionState ?? "connected",
        lastSeenAt: existing?.lastSeenAt,
        disconnectedAt: opts?.connectionState === "disconnected" ? existing?.disconnectedAt ?? Date.now() : undefined,
        status: opts?.status ?? existing?.status ?? "lobby",
        // Preserve role field if present on the incoming player object
        role: (player as LobbyMember).role ?? existing?.role ?? "player",
      };

      if (existingIndex >= 0) {
        const players = [...state.players];
        players[existingIndex] = { ...players[existingIndex], ...member };
        return { players };
      }

      return { players: [...state.players, member] };
    });
  },

  removePlayer: (playerId) =>
    set((state) => ({ players: state.players.filter((p) => p.id !== playerId) })),

  setPlayerReady: (playerId, ready) =>
    set((state) => ({ players: state.players.map((p) => (p.id === playerId ? { ...p, isReady: ready } : p)) })),

  setPlayerConnectionState: (playerId, connectionState) =>
    set((state) => ({
      players: state.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              connectionState,
              lastSeenAt: Date.now(),
              disconnectedAt: connectionState === "disconnected" ? player.disconnectedAt ?? Date.now() : undefined,
            }
          : player,
      ),
    })),

  setCurrentPlayerId: (id) => set({ currentPlayerId: id }),
  setLobbyState: (stateValue) => set({ lobbyState: stateValue }),

  // ── UPDATED: split snapshot players by role ──────────────────────────────
  syncLobbySnapshot: (snapshot, hostAddress) =>
    set((state) => {
      const allMembers = snapshot.players.map((p) => ({
        ...p,
        rank: getRankForLevel(p.level),
        connectionState: p.connectionState ?? "connected",
        lastSeenAt: p.lastSeenAt,
        disconnectedAt: p.disconnectedAt,
        status: p.status ?? "lobby",
        role: p.role ?? "player",
      }));

      // Spectators live in their own list; everyone else goes to players
      const players = allMembers.filter((p) => p.role !== "spectator");
      const spectators = allMembers.filter((p) => p.role === "spectator");

      return {
        lobbyRole: state.lobbyRole,
        lobbyId: snapshot.lobbyId,
        hostId: snapshot.hostId ?? null,
        hostAddress: hostAddress ?? state.hostAddress ?? null,
        players,
        spectators,
        lobbyState: state.lobbyState,
        isPrivate: snapshot.isPrivate ?? state.isPrivate,
        participantRole: state.participantRole, // ← preserve, don't reset on sync
      };
    }),
  // ─────────────────────────────────────────────────────────────────────────

  resetMultiplayer: () => set({ ...initialState }),
  resetPlayerStatuses: () =>
  set((state) => ({
    players: state.players.map((p) => ({
      ...p,
      status: "lobby",
      isReady: p.isHost ? true : false,
      connectionState: "connected",
      lastSeenAt: Date.now(),
      disconnectedAt: undefined,
    })),
  })),
}));
