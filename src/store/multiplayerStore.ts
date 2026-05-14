import { create } from "zustand";
import { Player } from "../types/player";
import type { DiscoveredHost, LobbyMember, MultiplayerLobbySnapshot } from "../types/multiplayer";
import { getRankForLevel } from "../constants";


type LobbyRole = "host" | "client";
type LobbyState = "lobby" | "discovering";

export interface MultiplayerStateData {
  lobbyRole: LobbyRole | null;
  lobbyId: string | null;
  sessionId: string | null;
  lastSnapshotSequence: number | null;
  hostId: string | null;
  hostAddress: string | null;
  players: LobbyMember[];
  lobbyState: LobbyState;
  isPrivate: boolean;
  currentPlayerId: string | null;
  discoveredHosts: DiscoveredHost[];
  joinStatus: 'idle' | 'joining' | 'joined'; // set grace period for joining to prevent multiple join attempts in quick succession / receiving stale snapshots
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
  setSessionId: (id: string | null) => void;
  setLastSnapshotSequence: (sequence: number | null) => void;
  setHostId: (id: string | null) => void;
  setHostAddress: (address: string | null) => void;
  setPrivate: (isPrivate: boolean) => void;
  addOrUpdatePlayer: (player: Player | LobbyMember, opts?: { isHost?: boolean; isReady?: boolean }) => void;
  removePlayer: (playerId: string) => void;
  setPlayerReady: (playerId: string, ready: boolean) => void;
  setCurrentPlayerId: (id: string | null) => void;
  setLobbyState: (state: LobbyState) => void;
  resetMultiplayer: () => void;
  syncLobbySnapshot: (snapshot: MultiplayerLobbySnapshot, hostAddress?: string | null) => void;
  // Discovered hosts management
  addOrUpdateDiscoveredHost: (host: Partial<DiscoveredHost>) => void;
  removeDiscoveredHost: (lobbyId: string) => void;
  pruneStaleDiscoveredHosts: (ttlMs: number) => void;
  clearDiscoveredHosts: () => void;
  setJoinStatus: (status: 'idle' | 'joining' | 'joined') => void;
}

export type MultiplayerState = MultiplayerStateData & MultiplayerSelectors & MultiplayerActions;

const initialState: MultiplayerStateData = {
  lobbyRole: null,
  lobbyId: null,
  sessionId: null,
  lastSnapshotSequence: null,
  hostId: null,
  hostAddress: null,
  players: [],
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
  isPlayerReady: (playerId: string) => !!get().players.find((p) => p.id === playerId)?.isReady,
  isHostReady: () => {
    const hostId = get().hostId;
    if (!hostId) return false;
    return !!get().players.find((p) => p.id === hostId)?.isReady;
  },
  isEveryoneReady: () => {
    const players = get().players;
    return players.length > 0 && players.every((p) => p.isReady);
  },
  currentPlayer: () => {
    const id = get().currentPlayerId;
    if (!id) return null;
    return get().players.find((p) => p.id === id) ?? null;
  },

  // Actions
  setLobbyRole: (role) => set({ lobbyRole: role }),
  setLobbyId: (id) => set({ lobbyId: id }),
  setSessionId: (id) => set({ sessionId: id }),
  setLastSnapshotSequence: (sequence) => set({ lastSnapshotSequence: sequence }),
  setHostId: (id) => set({ hostId: id }),
  setHostAddress: (address) => set({ hostAddress: address }),
  setPrivate: (isPrivate) => set({ isPrivate }),
  setJoinStatus: (status) => set({ joinStatus: status }),

  addOrUpdateDiscoveredHost: (host) => {
    const lobbyId = host.lobbyId;
    const hostId = host.hostId;
    if (typeof lobbyId !== 'string' || typeof hostId !== 'string') return;
    const now = Date.now();
    set((state) => {
      const existingIndex = state.discoveredHosts.findIndex((h) => h.lobbyId === lobbyId);
      const existing = existingIndex >= 0 ? state.discoveredHosts[existingIndex] : null;
      if (existing?.sequence !== undefined && host.sequence !== undefined && host.sequence <= existing.sequence) {
        return state;
      }
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
        sessionId: host.sessionId,
        sequence: host.sequence,
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
    // console.log('[multiplayer] Adding/updating player:', player.id, player.name);
    set((state) => {
      const existingIndex = state.players.findIndex((p) => p.id === player.id);
      const member: LobbyMember = {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        level: player.level,
        rank: getRankForLevel(player.level),
        isReady: opts?.isReady ?? false,
        isHost: opts?.isHost ?? false,
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

  setCurrentPlayerId: (id) => set({ currentPlayerId: id }),
  setLobbyState: (stateValue) => set({ lobbyState: stateValue }),

  syncLobbySnapshot: (snapshot, hostAddress) =>
    set((state) => {
      const incomingSessionId = snapshot.sessionId ?? null;
      const incomingSequence = snapshot.sequence ?? null;
      if (state.sessionId && incomingSessionId && state.sessionId !== incomingSessionId) {
        return state;
      }
      if (state.lastSnapshotSequence !== null && incomingSequence !== null && incomingSequence <= state.lastSnapshotSequence) {
        return state;
      }

      return {
        lobbyRole: state.lobbyRole,
        lobbyId: snapshot.lobbyId,
        sessionId: incomingSessionId ?? state.sessionId,
        lastSnapshotSequence: incomingSequence ?? state.lastSnapshotSequence,
        hostId: snapshot.hostId ?? null,
        hostAddress: hostAddress ?? state.hostAddress ?? null,
        players: snapshot.players.map((p) => ({
          ...p,
          rank: getRankForLevel(p.level),
        })),
        lobbyState: state.lobbyState,
        isPrivate: snapshot.isPrivate ?? state.isPrivate,
      };
    }),

  resetMultiplayer: () => set({ ...initialState }),
}));
