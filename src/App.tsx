import React, { useDeferredValue, useEffect, useRef, useCallback, useState } from "react";
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
import SpectatorView from "./pages/SpectatorView";
import { useGameStore } from "./store/gameStore";
import { usePlayerStore } from "./store/playerStore";
import theme from "./ui/theme";
import { SoundContext } from "./context/SoundContext";
import type { SoundType } from "./context/SoundContext";
import { usePreloader, lazyPreloadAudio } from "./hooks/usePreloader";
import { registerBundledAssets } from "./utils/registerBundledAssets";
import PowerUpsPage from "./pages/PowerUpsPage";

const NOTIFICATION_COLORS: Record<string, string> = {
  error:   "#E33232",
  warning: "#E3A020",
  info:    "#00DFFF",
  success: "#35E52B",
};

const NOTIFICATION_BG: Record<string, string> = {
  error:   "rgba(227,50,50,0.12)",
  warning: "rgba(227,160,32,0.12)",
  info:    "rgba(0,223,255,0.10)",
  success: "rgba(53,229,43,0.10)",
};

const NotificationOverlay: React.FC<{
  message: string;
  type: "info" | "error" | "warning" | "success";
  onDismiss: () => void;
}> = ({ message, type, onDismiss }) => {
  const color = NOTIFICATION_COLORS[type];
  const bg    = NOTIFICATION_BG[type];

  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        pointerEvents: "all",
        cursor: "pointer",
        animation: "notifFadeIn 0.35s ease both",
      }}
    >
      <style>{`@keyframes notifFadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: "20px 32px",
          border: `2px solid ${color}`,
          background: bg,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "13px",
          color,
          textShadow: `0 0 8px ${color}55`,
          letterSpacing: "2px",
          lineHeight: 1.8,
          textAlign: "center" as const,
          boxShadow: `0 0 30px ${color}33`,
          pointerEvents: "all",
        }}
      >
        {message}
      </div>
      <div
        style={{
          marginTop: "16px",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "9px",
          color: "#888",
          letterSpacing: "1px",
        }}
      >
        CLICK ANYWHERE TO DISMISS
      </div>
    </div>
  );
};

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

// ── Splash / Preloader screen ─────────────────────────────
function SplashScreen({ progress, stage }: { progress: number; stage: string }) {
  const barWidth = Math.min(progress, 100);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#000',
      zIndex: 9999,
    }}>
      <div style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '13px',
        color: '#1FC11A',
        textShadow: '0 0 8px #3FFF56',
        marginBottom: '32px',
        letterSpacing: '3px',
        textTransform: 'uppercase' as const,
      }}>
        LOADING...
      </div>

      {/* Progress bar */}
      <div style={{
        width: '280px',
        height: '20px',
        border: '2px solid #1FC11A',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 0 12px #1FC11A44',
      }}>
        <div style={{
          width: `${barWidth}%`,
          height: '100%',
          background: '#1FC11A',
          boxShadow: '0 0 8px #3FFF56',
          transition: 'width 0.3s ease',
          borderRadius: '2px',
        }} />
      </div>

      {/* Stage label */}
      <div style={{
        fontFamily: "'Courier New', monospace",
        fontSize: '11px',
        color: '#1FC11A88',
        marginTop: '12px',
        letterSpacing: '1px',
      }}>
        {stage}
      </div>

      {/* Stats */}
      <div style={{
        fontFamily: "'Courier New', monospace",
        fontSize: '10px',
        color: '#1FC11A44',
        marginTop: '8px',
      }}>
        Caching assets to RAM...
      </div>
    </div>
  );
}

// ── Asset path helper — works in both dev (http) and packaged Electron (file://) ──
const assetBase = window.location.protocol === "file:"
  ? window.location.pathname.replace(/[^/\\]*$/, "")  // strip index.html, keep trailing slash
  : "/";

function assetUrl(rel: string): string {
  return assetBase + rel;
}

// ── useAudioEngine — defined OUTSIDE App, at the module level ──
function useAudioEngine(sfxEnabled: boolean, vol: number) {
  const audioBank = useRef<Partial<Record<SoundType, HTMLAudioElement>>>({});
  const audioCtx  = useRef<AudioContext | null>(null);
  const mp3Ready  = useRef(false);

  useEffect(() => {
    const files: Record<SoundType, string> = {
      hover: assetUrl("sounds/hover.mp3"),
      select: assetUrl("sounds/select.mp3"),
      tab: assetUrl("sounds/tab.mp3"),
      back: assetUrl("sounds/back.mp3"),
      error: assetUrl("sounds/error.mp3"),
      bunny_sleep: "",
      bunny_cheer: "",
      bunny_panic: "",
      bunny_sad: "",
      bunny_think: "",
      bunny_hyper: "",
      emote_ez: "",
      emote_fire: "",
      emote_no: "",
      emote_dead: "",
      emote_watch: "",
      emote_speed: "",
      emote_gogo: "",
      powerup_fifty_fifty: "",
      powerup_time_freeze: "",
      powerup_double_xp: "",
      powerup_bunny_hint: "",
      powerup_earned: ""
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
    } catch (_) {
      // AudioContext not available — sound is optional
    }
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
  // Pause global BGM while the Credits screen BGM is active
  const creditsBgmActive = useGameStore((s) => s.creditsBgmActive);
  const deferredScreen = useDeferredValue(screen);

  const { playSound } = useAudioEngine(sfxEnabled, vol);

  // ── Asset preloader ──────────────────────────────────────
  const preloader = usePreloader();
  const audioUpgradedRef = useRef(false);

  // Register module-imported assets (bundler-emitted URLs) with
  // the AssetPreloader so they're RAM-cached like public/ assets.
  useEffect(() => {
    registerBundledAssets()
      .then(() => console.log('[Assets] registered bundled module assets'))
      .catch((err) => console.warn('[Assets] registration failed', err));
  }, []);

  // On first user interaction, upgrade audio to Web Audio API buffers
  const handleFirstInteraction = useCallback(() => {
    if (audioUpgradedRef.current) return;
    audioUpgradedRef.current = true;
    // Fire-and-forget: preload audio buffers in background
    lazyPreloadAudio().then((ctx) => {
      console.log('[Audio] Upgraded to AudioBuffer playback, ctx state:', ctx.state);
    });
  }, []);

  // Attach one-time global listener for first interaction
  useEffect(() => {
    const handler = () => {
      handleFirstInteraction();
      // Remove all listeners after first interaction
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    };
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [handleFirstInteraction]);

  // ── BGM ──────────────────────────────────────────────────
  const bgmRef   = useRef<HTMLAudioElement | null>(null);
  const bgmReady = useRef(false);

  useEffect(() => {
    const audio = new Audio(assetUrl("sounds/bgm/Eric Skiff - A Night Of Dizzy Spells ♫ NO COPYRIGHT 8-bit Music + Background.mp3"));
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
    // Pause global BGM when Credits BGM is active to prevent overlap
    if (bgmEnabled && !creditsBgmActive) {
      audio.play().catch((err) => {
        if (err.name !== "NotAllowedError") console.warn("BGM play error:", err);
      });
    } else {
      audio.pause();
    }
  }, [bgmEnabled, vol, creditsBgmActive]);

  // ── Notification overlay ─────────────────────────────────
  const notification = useGameStore((s) => s.notification);
  const clearNotification = useGameStore((s) => s.clearNotification);

  // ── Player init ──────────────────────────────────────────
  const initializePlayer = usePlayerStore((s: { initialize: () => Promise<void>; isLoading: boolean }) => s.initialize);
  const isPlayerLoading  = usePlayerStore((s: { initialize: () => Promise<void>; isLoading: boolean }) => s.isLoading);

  useEffect(() => { initializePlayer(); }, [initializePlayer]);

  // ── Show splash screen while loading ─────────────────────
  if (isPlayerLoading || !preloader.ready) {
    return (
      <SoundContext.Provider value={{ playSound }}>
        <SplashScreen
          progress={preloader.progress}
          stage={preloader.stage}
        />
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
    case "spectator-view":        screenContent = <SpectatorView />;             break;
    case "powerups":              screenContent = <PowerUpsPage />;              break;
    case "home":
      default:                    screenContent = <HomePage />;                  break;
  }

  return (
    <SoundContext.Provider value={{ playSound }}>
      <div style={styles.screenRoot}>{screenContent}</div>
      {notification && (
        <NotificationOverlay
          message={notification.message}
          type={notification.type}
          onDismiss={clearNotification}
        />
      )}
    </SoundContext.Provider>
  );
}
