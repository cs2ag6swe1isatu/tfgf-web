import { create } from "zustand";

export interface Player {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  rank: { name: string; icon: string; minLevel: number; maxLevel: number };
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  lastActive: Date;
}

interface PlayerState {
  player: Player | null;
  generatePlayer: () => Player;
  getPlayer: () => Player;
}

// Storage key for player data
const PLAYER_STORAGE_KEY = "tfgf-player";

// For debugging: use browser localStorage
// TODO: Change to electron/desktop native paths later:
// - Electron: app.getPath('userData') + '/player.json'
// - Desktop: process.env.APPDATA or ~/.config for config files
const getPlayerFromStorage = (): Player | null => {
  try {
    const existing = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      return { ...parsed, lastActive: new Date(parsed.lastActive) };
    }
  } catch (error) {
    console.warn("Failed to load player from storage:", error);
  }
  return null;
};

const savePlayerToStorage = (player: Player): void => {
  try {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  } catch (error) {
    console.warn("Failed to save player to storage:", error);
  }
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  player: null,

  generatePlayer: () => {
    // Try to load existing player from storage
    const existingPlayer = getPlayerFromStorage();
    if (existingPlayer) {
      set({ player: existingPlayer });
      return existingPlayer;
    }
    
    // Create new player if none exists
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: "Player 1",
      avatar: "",
      xp: 0,
      level: 1,
      rank: { name: "Beginner", icon: "", minLevel: 0, maxLevel: 10 },
      totalScore: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      lastActive: new Date(),
    };
    
    // Save to storage
    savePlayerToStorage(newPlayer);
    set({ player: newPlayer });
    return newPlayer;
  },
  
  getPlayer: () => {
    const currentPlayer = get().player;
    if (currentPlayer) return currentPlayer;
    
    // Try to load from storage first, then generate if needed
    const storedPlayer = getPlayerFromStorage();
    if (storedPlayer) {
      set({ player: storedPlayer });
      return storedPlayer;
    }
    
    return get().generatePlayer();
  },
}));
