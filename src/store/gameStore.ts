import { create } from "zustand";
import { Player, LobbyRole, LobbyState, ModalState, GameConfig } from "../types/multiplayer";

/**
 * Game Store - Navigation and Session Setup
 * 
 * RESPONSIBILITIES:
 * - Application navigation between screens/pages
 * - Game mode selection (solo/multiplayer)
 * - Category and difficulty selection for game configuration
 * - Multiplayer lobby state management
 * - Basic session setup state management
 * 
 * SEPARATION OF CONCERNS:
 * This store handles ONLY navigation and game configuration.
 * All game-specific logic (questions, scoring, timers, phases) 
 * is managed by triviaStore.ts.
 */

type Screen =
  | "home"
  | "mode-select"
  | "category"
  | "difficulty"
  | "question"
  | "result"
  | "profile"
  | "settings"
  | "standing"
  | "multiplayer-menu"
  | "multiplayer-lobby"
  | "client-discovery";

type Mode = "solo" | "multiplayer" | null;
type Difficulty = "easy" | "medium" | "hard" | null;

interface GameState {
  // Basic navigation state
  screen: Screen;
  mode: Mode;
  category: string | null;
  difficulty: Difficulty;

  // Multiplayer state
  lobbyRole: LobbyRole | null;
  lobbyId: string | null;
  hostId: string;
  players: Player[];
  isHostReady: boolean;
  lobbyState: LobbyState;
  modalState: ModalState;
  gameConfig: GameConfig;

  // Actions
  setScreen: (screen: Screen) => void;
  setMode: (mode: Mode) => void;
  setCategory: (category: string) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  
  // Multiplayer actions
  setLobbyRole: (role: LobbyRole) => void;
  setLobbyId: (id: string) => void;
  setHostId: (id: string) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  setPlayerReady: (playerId: string, ready: boolean) => void;
  setHostReady: (ready: boolean) => void;
  setLobbyState: (state: LobbyState) => void;
  setModalState: (modal: keyof ModalState, open: boolean) => void;
  setGameConfig: (config: Partial<GameConfig>) => void;
  resetMultiplayer: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Basic navigation state
  screen: "home",
  mode: null,
  category: null,
  difficulty: null,

  // Multiplayer state
  lobbyRole: null,
  lobbyId: null,
  hostId: null,
  players: [],
  isHostReady: false,
  lobbyState: 'lobby',
  modalState: {
    category: false,
    difficulty: false,
  },
  gameConfig: {
    category: null,
    difficulty: null,
    questionLimit: 10,
    timer: 15,
  },

  // Actions
  setScreen: (screen) => set({ screen }),
  setMode: (mode) => set({ mode }),
  setCategory: (category) => set({ category }),
  setDifficulty: (difficulty) => set({ difficulty }),
  
  // Multiplayer actions
  setLobbyRole: (role) => set({ lobbyRole: role }),
  setLobbyId: (id) => set({ lobbyId: id }),
  setHostId: (id) => set({ hostId: id }),
  
  addPlayer: (player) => {
    const currentPlayers = get().players;
    const existingPlayer = currentPlayers.find(p => p.id === player.id);
    
    if (existingPlayer) {
      // Update existing player
      const updatedPlayers = currentPlayers.map(p => 
        p.id === player.id ? { ...p, ...player } : p
      );
      set({ players: updatedPlayers });
    } else {
      // Add new player
      set({ players: [...currentPlayers, player] });
    }
  },
  
  removePlayer: (playerId) => {
    const currentPlayers = get().players;
    const filteredPlayers = currentPlayers.filter(p => p.id !== playerId);
    set({ players: filteredPlayers });
  },
  
  setPlayerReady: (playerId, ready) => {
    const currentPlayers = get().players;
    const updatedPlayers = currentPlayers.map(p => 
      p.id === playerId ? { ...p, isReady: ready } : p
    );
    set({ players: updatedPlayers });
  },
  
  setHostReady: (ready) => set({ isHostReady: ready }),
  
  setLobbyState: (state) => set({ lobbyState: state }),
  
  setModalState: (modal, open) => {
    const currentModalState = get().modalState;
    set({ 
      modalState: { 
        ...currentModalState, 
        [modal]: open 
      } 
    });
  },
  
  setGameConfig: (config) => {
    const currentConfig = get().gameConfig;
    set({ 
      gameConfig: { 
        ...currentConfig, 
        ...config 
      } 
    });
  },
  
  resetMultiplayer: () => set({
    lobbyRole: null,
    lobbyId: null,
    hostId: null,
    players: [],
    isHostReady: false,
    lobbyState: 'lobby',
    modalState: {
      category: false,
      difficulty: false,
    },
    gameConfig: {
      category: null,
      difficulty: null,
      questionLimit: 10,
      timer: 15,
    },
  }),
}));
