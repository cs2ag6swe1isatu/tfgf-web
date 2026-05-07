import { Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";
import { Difficulty } from "../constants";

const neonGreen = "#00ff88";
const bgDark = "#0a0f1c";

const DifficultyPage = () => {
  const mode = useGameStore((state) => state.gameConfig.mode);
  const category = useGameStore((state) => state.gameConfig.category) || "General Knowledge";

  const setDifficulty = useGameStore((state) => state.setDifficulty);
  const setScreen = useGameStore((state) => state.setScreen);
  const setScreenModal = useGameStore((state) => state.setModalScreen);

  const startGame = useTriviaStore((state) => state.startGame);
  const resetGame = useTriviaStore((state) => state.resetGame);

  const handleSelect = (difficulty: Difficulty) => {
    setDifficulty(difficulty);
    if (mode === "solo") {
      resetGame();
      startGame({
        category: category,
        difficulty: difficulty,
        questionLimit: 1,
        mode: "solo",
        questionTimer: 10,
        answerTimer: 10,
      });
      setScreen("question");
    } else if (mode === "multiplayer") {
      setScreenModal(null);
    }
  };

  const handleBack = () => {
    if (mode === "solo") {
      setScreen("category");
    } else if (mode === "multiplayer") {
      setScreenModal(null);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateRows: "1fr 3fr 1fr",
        padding: "40px",
        boxSizing: "border-box",
        position: "relative",
        backgroundColor: bgDark,
        color: neonGreen,

        // subtle grid pattern (like your design)
        backgroundImage:
          "radial-gradient(rgba(0,255,136,0.15) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      {/* TITLE */}
      <Box sx={{ textAlign: "center" }}>
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            letterSpacing: "6px",
            fontWeight: "bold",
            textTransform: "uppercase",
            color: neonGreen,
            textShadow: "0 0 10px rgba(0,255,136,0.7)",
          }}
        >
          Select Difficulty
        </Typography>
      </Box>

      {/* BUTTONS */}
      <Box
        sx={{
          display: "flex",
          gap: 4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {["easy", "medium", "hard"].map((level) => (
          <Button
            key={level}
            onClick={() => handleSelect(level as Difficulty)}
            sx={{
              height: 80,
              width: 180,
              border: `2px solid ${neonGreen}`,
              color: neonGreen,
              fontSize: "16px",
              letterSpacing: "2px",
              backgroundColor: "transparent",
              transition: "all 0.2s ease",

              "&:hover": {
                backgroundColor: neonGreen,
                color: bgDark,
                boxShadow: "0 0 15px rgba(0,255,136,0.8)",
              },
            }}
          >
            {level.toUpperCase()}
          </Button>
        ))}
      </Box>

      {/* BACK BUTTON */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Button
          sx={{
            width: "120px",
            border: `1px solid ${neonGreen}`,
            color: neonGreen,
            fontSize: "12px",
            letterSpacing: "2px",

            "&:hover": {
              backgroundColor: neonGreen,
              color: bgDark,
            },
          }}
          onClick={() => handleBack()}
        >
          BACK
        </Button>
      </Box>
    </Box>
  );
};

export default DifficultyPage;