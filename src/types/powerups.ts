import type { SoundType } from "../context/SoundContext";
import type { BunnyState } from "../components/bunny/bunnyStates";

// ─── Power-Up IDs ───────────────────────────────────────────────────────────

export type PowerUpId =
  | "fifty_fifty"
  | "time_freeze"
  | "double_xp"
  | "bunny_hint";

// ─── Power-Up Definition ────────────────────────────────────────────────────

export interface PowerUpDefinition {
  id: PowerUpId;
  label: string;
  icon: string;           // emoji or asset path
  description: string;
  activationSound: SoundType;
  bunnyReaction: BunnyState;
  maxStack: number;       // max player can hold at once
}

// ─── Power-Up Instance (in player inventory) ────────────────────────────────

export interface PowerUpInventoryEntry {
  id: PowerUpId;
  count: number;
}

// ─── In-Game Power-Up State ─────────────────────────────────────────────────

export interface ActivePowerUp {
  id: PowerUpId;
  usedOnQuestionIndex: number;
}

// ─── Power-Up Store State ────────────────────────────────────────────────────

export interface PowerUpSessionState {
  /** Which power-ups the player brought into this session (consumed as used) */
  sessionInventory: PowerUpInventoryEntry[];
  /** Power-ups already used this session (one per question) */
  used: ActivePowerUp[];
  /** The indices of answers eliminated by 50/50 this question */
  eliminatedAnswerIndices: number[];
  /** Whether any power-up was used on the current question */
  usedThisQuestion: boolean;
}

// ─── Multiplayer Broadcast Payload ──────────────────────────────────────────

export interface PowerUpUsedPayload {
  playerId: string;
  playerName: string;
  powerUpId: PowerUpId;
  questionIndex: number;
}

// ─── Catalogue ───────────────────────────────────────────────────────────────

export const POWER_UP_CATALOGUE: Record<PowerUpId, PowerUpDefinition> = {
  fifty_fifty: {
    id: "fifty_fifty",
    label: "50/50",
    icon: "½",
    description: "Removes 2 wrong answers",
    activationSound: "powerup_fifty_fifty",
    bunnyReaction: "confident",
    maxStack: 3,
  },
  time_freeze: {
    id: "time_freeze",
    label: "FREEZE",
    icon: "❄️",
    description: "Pauses timer for 5 seconds",
    activationSound: "powerup_time_freeze",
    bunnyReaction: "hyper",
    maxStack: 3,
  },
  double_xp: {
    id: "double_xp",
    label: "2× XP",
    icon: "⚡",
    description: "Double XP for this question",
    activationSound: "powerup_double_xp",
    bunnyReaction: "happy",
    maxStack: 3,
  },
  bunny_hint: {
    id: "bunny_hint",
    label: "HINT",
    icon: "🐰",
    description: "Bunny gestures toward the correct answer",
    activationSound: "powerup_bunny_hint",
    bunnyReaction: "thinking",
    maxStack: 3,
  },
};
