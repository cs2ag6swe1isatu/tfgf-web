import { useGameStore } from "../store/gameStore";

export type SfxName =
  | "uiSelect"
  | "uiCancel"
  | "uiCursor"
  | "correct"
  | "incorrect"
  | "popupOpen"
  | "popupClose";

type SemanticSfxName = "confirm" | "cancel" | "back" | "navigate" | "success" | "error";

const SFX_FILE_BY_NAME: Record<SfxName, string> = {
  uiSelect: "JDSherbert - Pixel UI SFX Pack - Select 2 (Square).ogg",
  uiCancel: "JDSherbert - Pixel UI SFX Pack - Cancel 2 (Square).ogg",
  uiCursor: "JDSherbert - Pixel UI SFX Pack - Cursor 2 (Square).ogg",
  correct: "JDSherbert - Pixel UI SFX Pack - Select 2 (Square).ogg",
  incorrect: "JDSherbert - Pixel UI SFX Pack - Error 1 (Square).ogg",
  popupOpen: "JDSherbert - Pixel UI SFX Pack - Popup Open 1 (Square).ogg",
  popupClose: "JDSherbert - Pixel UI SFX Pack - Popup Close 1 (Square).ogg",
};

const BASE_DIR = "/audio/SFX/ogg";
const baseAudioCache = new Map<SfxName, HTMLAudioElement>();

const SEMANTIC_SFX_MAP: Record<SemanticSfxName, SfxName> = {
  confirm: "uiSelect",
  cancel: "uiCancel",
  back: "uiCancel",
  navigate: "uiCursor",
  success: "correct",
  error: "incorrect",
};

const sfxPath = (fileName: string) => `${BASE_DIR}/${encodeURIComponent(fileName)}`;

const getBaseAudio = (name: SfxName): HTMLAudioElement => {
  const cached = baseAudioCache.get(name);
  if (cached) return cached;

  const audio = new Audio(sfxPath(SFX_FILE_BY_NAME[name]));
  audio.preload = "auto";
  baseAudioCache.set(name, audio);
  return audio;
};

const resolveSfxName = (name: string): SfxName | null => {
  if ((name as SfxName) in SFX_FILE_BY_NAME) return name as SfxName;
  if ((name as SemanticSfxName) in SEMANTIC_SFX_MAP) {
    return SEMANTIC_SFX_MAP[name as SemanticSfxName];
  }
  return null;
};

export const playSfx = (name: SfxName, volume = 0.5): void => {
  if (typeof window === "undefined") return;
  const { useSfx, sfxVolume } = useGameStore.getState().settings;
  if (!useSfx) return;

  try {
    // Clone to allow overlapping quick UI events without cutting the previous sound.
    const audio = getBaseAudio(name).cloneNode(true) as HTMLAudioElement;
    const resolvedVolume = Math.max(0, Math.min(1, volume * sfxVolume));
    if (resolvedVolume <= 0) return;
    audio.volume = resolvedVolume;
    void audio.play().catch(() => {
      // Ignore user-gesture/autoplay failures silently.
    });
  } catch {
    // Ignore SFX errors to avoid blocking gameplay.
  }
};

let hasInstalledGlobalUiSfx = false;

export const installGlobalUiSfx = (): void => {
  if (typeof window === "undefined" || hasInstalledGlobalUiSfx) return;

  const clickHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const explicit = target.closest("[data-sfx]") as HTMLElement | null;
    const explicitSfx = explicit?.dataset.sfx;
    const resolvedExplicit = explicitSfx ? resolveSfxName(explicitSfx) : null;
    if (resolvedExplicit) {
      playSfx(resolvedExplicit, 0.45);
      return;
    }

    const clickable = target.closest("button, [role='button'], a, [tabindex]") as HTMLElement | null;
    if (!clickable || clickable.hasAttribute("disabled")) return;

    playSfx("uiSelect", 0.45);
  };

  document.addEventListener("click", clickHandler, true);
  hasInstalledGlobalUiSfx = true;
};
