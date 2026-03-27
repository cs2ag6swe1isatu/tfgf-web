import { Container, Typography, Box, Button  } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";
import { Difficulty } from "../constants";

const DifficultyPage = () => {
  const mode = useGameStore((state) => state.gameConfig.mode);
  // NOTE: category should used for solo-mode only; multiplayer flow will have different config flow
  const category = useGameStore((state) => state.gameConfig.category) || "General Knowledge";

  const setDifficulty = useGameStore((state) => state.setDifficulty);
  const setScreen = useGameStore((state) => state.setScreen);
  
  const startGame = useTriviaStore((state) => state.startGame);
  const resetGame = useTriviaStore((state) => state.resetGame);

  const handleSelect = (difficulty: Difficulty) => {
    setDifficulty(difficulty);
    if(mode === "solo") {
      resetGame();
      // NOTE: debugging values, change later
      startGame({
        category: category,
        difficulty: difficulty,
        questionLimit : 1,
        mode: 'solo',
        questionTimer: 10,
        answerTimer: 10,
      });
      setScreen("question");
    } else if(mode === "multiplayer"){
      setScreen("multiplayer-lobby");
    }
  };

  const handleBack = () => {
    if(mode === "solo") {
      setScreen("category");
    } else if(mode === "multiplayer") {
      setScreen("multiplayer-lobby");
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Select Difficulty
        </Typography>

        <Box sx={{ mt: 4, display: "grid", gap: 2 }}>
          <Button variant="contained" color="primary" onClick={() => handleSelect("easy")}>
            Easy
          </Button>

          <Button variant="contained" color="primary" onClick={() => handleSelect("medium")}>
            Medium
          </Button>

          <Button variant="contained" color="primary" onClick={() => handleSelect("hard")}>
            Hard
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => handleBack()}
          >
            Back
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default DifficultyPage;