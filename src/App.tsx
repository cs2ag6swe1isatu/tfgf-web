import { useDeferredValue, useEffect, useRef } from "react";
import HomePage from "./pages/HomePage";
import ModeSelectPage from "./pages/ModeSelectPage";
import CategoryPage from "./pages/CategoryPage";
import DifficultyPage from "./pages/DifficultyPage";
import QuestionPage from "./pages/QuestionPage";
import SessionSummaryPage from "./pages/SessionSummaryPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import StandingPage from "./pages/StandingPage";
import MultiplayerMenuPage from "./pages/MultiplayerMenuPage";
import MultiplayerLobbyPage from "./pages/MultiplayerLobbyPage";
import MultiplayerDiscoveryPage from "./pages/MultiplayerDiscoveryPage";
import { useGameStore } from "./store/gameStore";
import { usePlayerStore } from "./store/playerStore";
import theme from "./ui/theme";

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

export default function App() {
  const screen        = useGameStore((s) => s.screen);
  const modalScreen   = useGameStore((s) => s.modalScreen);
  const bgmEnabled    = useGameStore((s) => s.settings.bgmEnabled);
  const vol           = useGameStore((s) => s.settings.volume);
  const deferredScreen = useDeferredValue(screen);

  // ── BGM — lives here so it survives screen changes ──────
  const bgmRef    = useRef<HTMLAudioElement | null>(null);
  const bgmReady  = useRef(false);

  // Create the audio element once
  useEffect(() => {
    const audio = new Audio("/sounds/bgm.mp3");
    audio.loop = true;
    audio.volume = 0;
    bgmRef.current = audio;

    // Mark ready once the browser has loaded enough to play
    const onCanPlay = () => { bgmReady.current = true; };
    audio.addEventListener("canplaythrough", onCanPlay);

    return () => {
      audio.removeEventListener("canplaythrough", onCanPlay);
      audio.pause();
      audio.src = "";
    };
  }, []);

  // React to bgmEnabled / volume changes
  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio) return;

    audio.volume = (vol / 10) * 0.4;

    if (bgmEnabled) {
      // play() returns a Promise — must catch the NotAllowedError
      // that browsers throw before a user gesture has occurred
      audio.play().catch((err) => {
        if (err.name !== "NotAllowedError") console.warn("BGM play error:", err);
      });
    } else {
      audio.pause();
    }
  }, [bgmEnabled, vol]);

  // ── Screen router ────────────────────────────────────────
  const screen = useGameStore((state) => state.screen);
  const modalScreen = useGameStore((state) => state.modalScreen);
  const deferredScreen = useDeferredValue(screen); // small optimization, read concurrently in the bg
  
  const initializePlayer = usePlayerStore((state) => state.initialize);
  const isPlayerLoading = usePlayerStore((state) => state.isLoading);

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  if (isPlayerLoading) {
    return (
      <div style={{
        ...styles.screenRoot,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        color: '#1FC11A',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '20px'
      }}>
        LOADING...
      </div>
    );
  }

  let screenContent: React.ReactNode;

  switch (deferredScreen) {
    case "mode-select":         screenContent = <ModeSelectPage />;         break;
    case "category":            screenContent = <CategoryPage />;            break;
    case "difficulty":          screenContent = <DifficultyPage />;          break;
    case "question":            screenContent = <QuestionPage />;            break;
    case "result":              screenContent = <SessionSummaryPage />;      break;
    case "profile":             screenContent = <ProfilePage />;             break;
    case "settings":            screenContent = <SettingsPage />;            break;
    case "standing":            screenContent = <StandingPage />;            break;
    case "multiplayer-menu":    screenContent = <MultiplayerMenuPage />;     break;
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
    case "home":
    default:                    screenContent = <HomePage />;               break;
  }

  return <div style={styles.screenRoot}>{screenContent}</div>;
}
