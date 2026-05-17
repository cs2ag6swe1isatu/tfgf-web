export type EmoteId = 'ez' | 'fire' | 'nooo' | 'dead' | 'watch' | 'speed' | 'bunny';

export interface EmoteDefinition {
  id: EmoteId;
  icon: string;
  sound: string;
}

export const EMOTE_DICTIONARY: Record<EmoteId, EmoteDefinition> = {
  ez: { id: 'ez', icon: '😎', sound: 'funky' },
  fire: { id: 'fire', icon: '🔥', sound: 'flame' },
  nooo: { id: 'nooo', icon: '😭', sound: 'crying' },
  dead: { id: 'dead', icon: '💀', sound: 'defeat' },
  watch: { id: 'watch', icon: '👀', sound: 'suspense' },
  speed: { id: 'speed', icon: '⚡', sound: 'dash' },
  bunny: { id: 'bunny', icon: '🐰', sound: 'squeak' },
};

export interface EmotePayload {
  playerId: string;
  emoteId: EmoteId;
  timestamp: number;
  uniqueId: string; // Needed so React can render multiple of the same emote in a row
}