import React, { useDeferredValue, useEffect, useRef } from "react";
import HomePage from "./pages/HomePage";
import ModeSelectPage from "./pages/ModeSelectPage";
import CategoryPage from "./pages/CategoryPage";
import DifficultyPage from "./pages/DifficultyPage";
import QuestionPage from "./pages/QuestionPage";
import SessionSummaryPage from "./pages/SessionSummaryPage";
import AchievementUnlockPage from "./pages/AchievementUnlockPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import StandingPage from "./pages/StandingPage";
import MultiplayerMenuPage from "./pages/MultiplayerMenuPage";
import MultiplayerLobbyPage from "./pages/MultiplayerLobbyPage";
import MultiplayerDiscoveryPage from "./pages/MultiplayerDiscoveryPage";
import MultiplayerResults from "./pages/MultiplayerResults";
import { useGameStore } from "./store/gameStore";
import { usePlayerStore } from "./store/playerStore";
import theme from "./ui/theme";
import { SoundContext } from "./context/SoundContext";
import type { SoundType } from "./context/SoundContext";

const styles = {
  screenRoot: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
};

const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    backgroundColor: theme.palette.background.default, zIndex: 99,
  }}>
    {children}
  </div>
);

// ── useAudioEngine — defined OUTSIDE App, at the module level ──
function useAudioEngine(sfxEnabled: boolean, vol: number) {
  const audioBank = useRef<Partial<Record<SoundType, HTMLAudioElement>>>({});
  const audioCtx  = useRef<AudioContext | null>(null);
  const mp3Ready  = useRef(false);

  useEffect(() => {
    const files: Record<SoundType, string> = {
      hover:  "/sounds/JDSherbert - Pixel UI SFX Pack - Cursor 2 (Square).mp3",
      select: "/sounds/JDSherbert - Pixel UI SFX Pack - Select 1 (Square).mp3",
      tab:    "/sounds/JDSherbert - Pixel UI SFX Pack - Popup Open 1 (Square).mp3",
      back:   "/sounds/JDSherbert - Pixel UI SFX Pack - Cancel 1 (Square).mp3",
      error:  "/sounds/JDSherbert - Pixel UI SFX Pack - Error 1 (Square).mp3",
    };

    let loaded = 0;
    (Object.entries(files) as [SoundType, string][]).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.oncanplaythrough = () => {
        audioBank.current[key] = audio;
        loaded++;
        if (loaded === Object.keys(files).length) mp3Ready.current = true;
      };
    });

    return () => {
      Object.values(audioBank.current).forEach((a) => { a?.pause(); });
    };
  }, []);

  useEffect(() => {
    const v = vol / 10;
    Object.values(audioBank.current).forEach((a) => { if (a) a.volume = v; });
  }, [vol]);

  function synthBeep(freq: number, dur: number, type: OscillatorType = "square", gain = 0.2) {
    try {
      if (!audioCtx.current)
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ac  = audioCtx.current;
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      g.gain.setValueAtTime(gain * (vol / 10), ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start(); osc.stop(ac.currentTime + dur);
    } catch (_) {}
  }

  function synthSound(type: SoundType) {
    switch (type) {
      case "hover":  synthBeep(440, 0.04, "square",   0.15); break;
      case "select": synthBeep(660, 0.07, "square",   0.25); break;
      case "tab":
        synthBeep(520, 0.10, "square", 0.20);
        setTimeout(() => synthBeep(660, 0.08, "square", 0.15), 60);
        break;
      case "back":   synthBeep(300, 0.10, "square",   0.20); break;
      case "error":
        synthBeep(180, 0.15, "sawtooth", 0.30);
        setTimeout(() => synthBeep(140, 0.15, "sawtooth", 0.20), 120);
        break;
    }
  }

  function playSound(type: SoundType) {
    if (!sfxEnabled) return;
    const mp3 = audioBank.current[type];
    if (mp3Ready.current && mp3) {
      mp3.currentTime = 0;
      mp3.play().catch(() => synthSound(type));
    } else {
      synthSound(type);
    }
  }

  return { playSound };
}

// ── App component ────────────────────────────────────────────
export default function App() {
  const screen        = useGameStore((s) => s.screen);
  const modalScreen   = useGameStore((s) => s.modalScreen);
  const bgmEnabled    = useGameStore((s) => s.settings.bgmEnabled);
  const sfxEnabled    = useGameStore((s) => s.settings.sfxEnabled);
  const vol           = useGameStore((s) => s.settings.volume);
  const deferredScreen = useDeferredValue(screen);

  const { playSound } = useAudioEngine(sfxEnabled, vol);

  // ── BGM ──────────────────────────────────────────────────
  const bgmRef   = useRef<HTMLAudioElement | null>(null);
  const bgmReady = useRef(false);

  useEffect(() => {
    const audio = new Audio("/sounds/bgm.mp3/Eric Skiff - A Night Of Dizzy Spells ♫ NO COPYRIGHT 8-bit Music + Background.mp3");
    audio.loop = true;
    audio.volume = 0;
    bgmRef.current = audio;
    const onCanPlay = () => { bgmReady.current = true; };
    audio.addEventListener("canplaythrough", onCanPlay);
    return () => {
      audio.removeEventListener("canplaythrough", onCanPlay);
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio) return;
    audio.volume = (vol / 10) * 0.4;
    if (bgmEnabled) {
      audio.play().catch((err) => {
        if (err.name !== "NotAllowedError") console.warn("BGM play error:", err);
      });
    } else {
      audio.pause();
    }
  }, [bgmEnabled, vol]);

  // ── Player init ──────────────────────────────────────────
  const initializePlayer = usePlayerStore((s: { initialize: () => Promise<void>; isLoading: boolean }) => s.initialize);
  const isPlayerLoading  = usePlayerStore((s: { initialize: () => Promise<void>; isLoading: boolean }) => s.isLoading);

  useEffect(() => { initializePlayer(); }, [initializePlayer]);

  if (isPlayerLoading) {
    return (
      <SoundContext.Provider value={{ playSound }}>
        <div style={{
          ...styles.screenRoot,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#000', color: '#1FC11A',
          fontFamily: "'Press Start 2P', monospace", fontSize: '20px',
        }}>
          LOADING...
        </div>
      </SoundContext.Provider>
    );
  }

  // ── Screen router ────────────────────────────────────────
  let screenContent: React.ReactNode;
  switch (deferredScreen) {
    case "mode-select":           screenContent = <ModeSelectPage />;           break;
    case "category":              screenContent = <CategoryPage />;              break;
    case "difficulty":            screenContent = <DifficultyPage />;            break;
    case "question":              screenContent = <QuestionPage />;              break;
    case "result":                screenContent = <SessionSummaryPage />;        break;
    case "achievement-unlock":    screenContent = <AchievementUnlockPage />;     break;
    case "profile":               screenContent = <ProfilePage />;               break;
    case "settings":              screenContent = <SettingsPage />;              break;
    case "standing":              screenContent = <StandingPage />;              break;
    case "multiplayer-menu":      screenContent = <MultiplayerMenuPage />;       break;
    case "multiplayer-lobby":
      screenContent = (
        <>
          <MultiplayerLobbyPage />
          {modalScreen === "category"   && <Overlay><CategoryPage /></Overlay>}
          {modalScreen === "difficulty" && <Overlay><DifficultyPage /></Overlay>}
        </>
      );
      break;
    case "multiplayer-discovery": screenContent = <MultiplayerDiscoveryPage />; break;
    case "multiplayer-results":   screenContent = <MultiplayerResults />;        break;
    case "home":
      default:                    screenContent = <HomePage />;                  break;
  }

  return (
    <SoundContext.Provider value={{ playSound }}>
      <div style={styles.screenRoot}>{screenContent}</div>
    </SoundContext.Provider>
  );
}
