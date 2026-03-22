import { Button, Container, Typography, Box } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const MultiplayerLobbyPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const setDifficulty = useGameStore((state) => state.setDifficulty);

  const handleStart = (difficulty: "easy" | "medium" | "hard") => {
    setDifficulty(difficulty);
    setScreen("question");
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Multiplayer Lobby
        </Typography>

        <Typography sx={{ mt: 2 }}>
          Host chooses the difficulty.
        </Typography>

        <Box sx={{ mt: 4, display: "grid", gap: 2 }}>
          <Button variant="contained" onClick={() => handleStart("easy")}>
            Start Easy Game
          </Button>

          <Button variant="contained" onClick={() => handleStart("medium")}>
            Start Medium Game
          </Button>

          <Button variant="contained" onClick={() => handleStart("hard")}>
  Start Hard Game
</Button>

          <Button
            variant="text"
            onClick={() => setScreen("multiplayer-menu")}
          >
            Back
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default MultiplayerLobbyPage;