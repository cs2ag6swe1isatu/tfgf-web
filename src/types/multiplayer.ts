export interface Player {
  id: string;
  name: string;
  avatar: string;
  level: number;
  isReady: boolean;
  isHost: boolean;
}

export interface Lobby {
  id: string;
  hostId: string;
  hostName: string;
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  players: Player[];
  isStarted: boolean;
  createdAt: Date;
}

export type LobbyRole = 'host' | 'client';
export type PlayerStatus = 'waiting' | 'ready';
export type LobbyState = 'lobby' | 'game';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Category = string;

// Modal states
export interface ModalState {
  category: boolean;
  difficulty: boolean;
}

// Game configuration
export interface GameConfig {
  category: string | null;
  difficulty: Difficulty | null;
  questionLimit: number;
  timer: number;
}