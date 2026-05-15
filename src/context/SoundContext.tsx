import { createContext, useContext } from "react";

export type SoundType = "hover" | "select" | "tab" | "back" | "error" | 'bunny_sleep'
  | 'bunny_cheer'
  | 'bunny_panic'
  | 'bunny_sad'
  | 'bunny_think' 
  | 'bunny_hyper' 
  | 'emote_ez'
  | 'emote_fire'
  | 'emote_no'
  | 'emote_dead'
  | 'emote_watch'
  | 'emote_speed'
  | 'emote_gogo';

export const SoundContext = createContext<{
  playSound: (type: SoundType) => void;
}>({ playSound: () => {} });

export interface MultiplayerEmote {
  id: string;
  icon: string;
  sound: SoundType; // <-- This is the critical fix. It enforces the union type.
}

export const useSoundContext = () => useContext(SoundContext);