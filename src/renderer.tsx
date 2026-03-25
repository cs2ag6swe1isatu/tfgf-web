import React from "react";
import { createRoot } from "react-dom/client";
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
import ClientDiscoveryPage from "./pages/ClientDiscoveryPage";
import { useGameStore } from "./store/gameStore";
import "./index.css";

const App = () => {
  const screen = useGameStore((state) => state.screen);

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
      return <MultiplayerLobbyPage />;
    case "client-discovery":
      return <ClientDiscoveryPage />;
    case "home":
    default:
      return <HomePage />;
  }
};

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(<App />);
}