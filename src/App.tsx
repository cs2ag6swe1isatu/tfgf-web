import { useDeferredValue } from "react";
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
import theme from "./ui/theme";


const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        backgroundColor: theme.palette.background.default,
        zIndex: 99,
      }}
    >
      {children}
    </div>
  );
};

export default function App() {
  const screen = useGameStore((state) => state.screen);
  const modalScreen = useGameStore((state) => state.modalScreen);
  const deferredScreen = useDeferredValue(screen); // small optimization, read concurrently in the bg

  let screenContent: React.ReactNode;

  switch (deferredScreen) {
    case "mode-select":
      screenContent = <ModeSelectPage />;
      break;
    case "category":
      screenContent = <CategoryPage />;
      break;
    case "difficulty":
      screenContent = <DifficultyPage />;
      break;
    case "question":
      screenContent = <QuestionPage />;
      break;
    case "result":
      screenContent = <SessionSummaryPage />;
      break;
    case "profile":
      screenContent = <ProfilePage />;
      break;
    case "settings":
      screenContent = <SettingsPage />;
      break;
    case "standing":
      screenContent = <StandingPage />;
      break;
    case "multiplayer-menu":
      screenContent = <MultiplayerMenuPage />;
      break;
    case "multiplayer-lobby":
      screenContent = (
        <>
          <MultiplayerLobbyPage />
          {modalScreen === "category" && (
            <Overlay>
              <CategoryPage />
            </Overlay>
          )}
          {modalScreen === "difficulty" && (
            <Overlay>
              <DifficultyPage />
            </Overlay>
          )}
        </>
      );
      break;
    case "multiplayer-discovery":
      screenContent = <MultiplayerDiscoveryPage />;
      break;
    case "home":
    default:
      screenContent = <HomePage />;
      break;
  }

  return <div style={styles.screenRoot}>{screenContent}</div>;
}

const styles = {
  screenRoot: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
} as const;
