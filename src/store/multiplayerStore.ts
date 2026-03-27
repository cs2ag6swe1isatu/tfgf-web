import { create } from "zustand";
import { Player } from "./playerStore";

type LobbyRole = "host" | "client";
type LobbyState = "lobby" | "discovering";

export interface LobbyMember extends Player {
  isReady: boolean;
  isHost: boolean;
}


export interface MultiplayerStateData {
  lobbyRole: LobbyRole | null;
  lobbyId: string | null;
  hostId: string | null;
  players: LobbyMember[];
  lobbyState: LobbyState;
  currentPlayerId: string | null;
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
  addOrUpdatePlayer: (player: Player, opts?: { isHost?: boolean; isReady?: boolean }) => void;
  removePlayer: (playerId: string) => void;
  setPlayerReady: (playerId: string, ready: boolean) => void;
  setCurrentPlayerId: (id: string | null) => void;
  setLobbyState: (state: LobbyState) => void;
  resetMultiplayer: () => void;
}

export type MultiplayerState = MultiplayerStateData & MultiplayerSelectors & MultiplayerActions;

const initialState: MultiplayerStateData = {
  lobbyRole: null,
  lobbyId: null,
  hostId: null,
  players: [],
  lobbyState: "lobby",
  currentPlayerId: null,
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
  setHostId: (id) => set({ hostId: id }),

  addOrUpdatePlayer: (player, opts) => {
    set((state) => {
      // Prevent duplicate players
      const existingIndex = state.players.findIndex((p) => p.id === player.id);
      const member: LobbyMember = {
        ...player,
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

  resetMultiplayer: () => set({ ...initialState }),
}));
