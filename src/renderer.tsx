import React from "react";
import { createRoot } from "react-dom/client";
import HomePage from "./pages/HomePage";
import SoloMenuPage from "./pages/SoloMenuPage";
import CategoryPage from "./pages/CategoryPage";
import DifficultyPage from "./pages/DifficultyPage";
import QuestionPage from "./pages/QuestionPage";
import ResultPage from "./pages/ResultPage";
import ProfilePage from "./pages/ProfilePage";
import MultiplayerMenuPage from "./pages/MultiplayerMenuPage";
import MultiplayerLobbyPage from "./pages/MultiplayerLobbyPage";
import { useGameStore } from "./store/gameStore";
import "./index.css";

const App = () => {
  const screen = useGameStore((state) => state.screen);

  switch (screen) {
    case "solo-menu":
      return <SoloMenuPage />;
    case "category":
      return <CategoryPage />;
    case "difficulty":
      return <DifficultyPage />;
    case "question":
      return <QuestionPage />;
    case "result":
      return <ResultPage />;
    case "profile":
      return <ProfilePage />;
    case "multiplayer-menu":
      return <MultiplayerMenuPage />;
    case "multiplayer-lobby":
      return <MultiplayerLobbyPage />;
    case "home":
    default:
      return <HomePage />;
  }
};

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(<App />);
}