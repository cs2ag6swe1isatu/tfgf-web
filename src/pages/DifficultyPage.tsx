import { Button, Container, Typography, Box } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";

const DifficultyPage = () => {
  const setDifficulty = useGameStore((state) => state.setDifficulty);
  const setScreen = useGameStore((state) => state.setScreen);
  const category = useGameStore((state) => state.category);
  
  const startGame = useTriviaStore((state) => state.startGame);
  const resetGame = useTriviaStore((state) => state.resetGame);

  const handleSelect = (difficulty: "easy" | "medium" | "hard") => {
    setDifficulty(difficulty);
    
    resetGame();
    startGame(
      category || "General Knowledge",
      difficulty,
      15, // question limit
      15, // timer per question
      "solo" // mode
    );
    
    // Navigate to question page
    setScreen("question");
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

          <Button
            variant="text"
            onClick={() => setScreen("category")}
          >
            Back
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default DifficultyPage;