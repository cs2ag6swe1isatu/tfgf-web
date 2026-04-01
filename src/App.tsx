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
import './ui/fonts.css';
import { useTheme } from "@mui/material/styles";

const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();

  return (
    <div
      style={{
        position: 'fixed',
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

  switch (screen) {
    case "mode-select":
      return <ModeSelectPage />;
    case "category":
      return <CategoryPage />;
    case "difficulty":
      return <DifficultyPage />;
    case "question":
      return <QuestionPage />;
    case "result":
      return <SessionSummaryPage />;
    case "profile":
      return <ProfilePage />;
    case "settings":
      return <SettingsPage />;
    case "standing":
      return <StandingPage />;
    case "multiplayer-menu":
      return <MultiplayerMenuPage />;
    case "multiplayer-lobby":
      return (
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
    case "multiplayer-discovery":
      return <MultiplayerDiscoveryPage />;
    case "home":
    default:
      return <HomePage />;
  }
}