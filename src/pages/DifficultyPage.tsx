import { Button, Container, Typography, Box } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const DifficultyPage = () => {
  const setDifficulty = useGameStore((state) => state.setDifficulty);
  const resetSession = useGameStore((state) => state.resetSession);
  const startSession = useGameStore((state) => state.startSession);

  const handleSelect = (difficulty: "easy" | "medium" | "hard") => {
    setDifficulty(difficulty);
    resetSession();
    startSession();
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Select Difficulty
        </Typography>

        <Box sx={{ mt: 4, display: "grid", gap: 2 }}>
          <Button variant="contained" onClick={() => handleSelect("easy")}>
            Easy
          </Button>
          <Button variant="contained" onClick={() => handleSelect("medium")}>
            Medium
          </Button>
          <Button variant="contained" onClick={() => handleSelect("hard")}>
            Hard
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default DifficultyPage;