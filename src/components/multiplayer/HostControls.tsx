import { Box, Button } from "@mui/material";
import { useGameStore } from "../../store/gameStore";

interface HostControlsProps {
  onCategoryOpen: () => void;
  onDifficultyOpen: () => void;
  onStartGame: () => void;
}

export const HostControls = ({ 
  onCategoryOpen, 
  onDifficultyOpen, 
  onStartGame 
}: HostControlsProps) => {
  const { gameConfig, category, difficulty } = useGameStore();

  const isCategorySelected = !!category || !!gameConfig.category;
  const isDifficultySelected = !!difficulty || !!gameConfig.difficulty;
  const canStart = isCategorySelected && isDifficultySelected;

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
        <Button
          id="category-btn"
          variant="outlined"
          onClick={onCategoryOpen}
          sx={{
            flex: 1,
            height: 50,
            fontWeight: "bold",
            textTransform: "uppercase",
          }}
        >
          {category || gameConfig.category || "Category"}
        </Button>

        <Button
          variant="contained"
          color="primary"
          disabled={!canStart}
          onClick={onStartGame}
          sx={{
            flex: 1,
            height: 50,
            fontWeight: "bold",
            textTransform: "uppercase",
          }}
        >
          Start Game
        </Button>

        <Button
          id="difficulty-btn"
          variant="outlined"
          onClick={onDifficultyOpen}
          sx={{
            flex: 1,
            height: 50,
            fontWeight: "bold",
            textTransform: "uppercase",
          }}
        >
          {difficulty || gameConfig.difficulty || "Difficulty"}
        </Button>
      </Box>
    </Box>
  );
};
