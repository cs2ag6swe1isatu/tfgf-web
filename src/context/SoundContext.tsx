import { createContext, useContext } from "react";

export type SoundType = "hover" | "select" | "tab" | "back" | "error";

export const SoundContext = createContext<{
  playSound: (type: SoundType) => void;
}>({ playSound: () => {} });

export const useSoundContext = () => useContext(SoundContext);