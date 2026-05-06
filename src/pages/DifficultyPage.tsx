import { Typography, Box, Button  } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";
import { Difficulty } from "../constants";

const DifficultyPage = () => {
  const mode = useGameStore((state) => state.gameConfig.mode);
  // NOTE: category should used for solo-mode only; multiplayer flow will have different config flow
  const category = useGameStore((state) => state.gameConfig.category) || "General Knowledge";

  const setDifficulty = useGameStore((state) => state.setDifficulty);
  const setScreen = useGameStore((state) => state.setScreen);
  const setScreenModal = useGameStore((state) => state.setModalScreen);

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
      setScreenModal(null);
    }
  };

  const handleBack = () => {
    if(mode === "solo") {
      setScreen("category");
    } else if(mode === "multiplayer") {
      setScreenModal(null);
    }
  };

  return (
    <Box sx={{
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateRows: "1fr 3fr 1fr",
      padding: "40px",
      boxSizing: "border-box",
      position: "relative"
    }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h1" gutterBottom>
          Select Difficulty
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "center" }}>
        <Button sx={{ height: 192 }} fullWidth variant="contained" color="primary" onClick={() => handleSelect("easy")}>
          Easy
        </Button>

        <Button sx={{ height: 192 }} fullWidth variant="contained" color="primary" onClick={() => handleSelect("medium")}>
          Medium
        </Button>

        <Button sx={{ height: 192 }} fullWidth variant="contained" color="primary" onClick={() => handleSelect("hard")}>
          Hard
        </Button>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Button sx={{ width: "25%" }}
            variant="outlined"
            color="primary"
            onClick={() => handleBack()}
          >
            Back
        </Button>
      </Box>
    </Box>
  );
};

export default DifficultyPage;
