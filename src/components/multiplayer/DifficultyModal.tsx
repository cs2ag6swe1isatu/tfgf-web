import { Modal, Box, Typography, Button } from "@mui/material";
import { useGameStore } from "../../store/gameStore";

interface DifficultyModalProps {
  open: boolean;
  onClose: () => void;
}

interface DifficultyOption {
  value: 'easy' | 'medium' | 'hard';
  label: string;
  description: string;
}

const difficultyOptions: DifficultyOption[] = [
  {
    value: 'easy',
    label: 'Easy',
    description: 'Perfect for beginners',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Standard challenge',
  },
  {
    value: 'hard',
    label: 'Hard',
    description: 'Expert level',
  },
];

export const DifficultyModal = ({ open, onClose }: DifficultyModalProps) => {
  const { setDifficulty, setGameConfig, difficulty } = useGameStore();

  const handleDifficultySelect = (selectedDifficulty: 'easy' | 'medium' | 'hard') => {
    setDifficulty(selectedDifficulty);
    setGameConfig({ difficulty: selectedDifficulty });
    onClose();
  };

  const handleClear = () => {
    setDifficulty(null);
    setGameConfig({ difficulty: null });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "white",
          boxShadow: 24,
          p: 4,
        }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold"}}>
            Select Difficulty
          </Typography>
          <Typography variant="body2" >
            {difficulty ? `Current: ${difficulty.toUpperCase()}` : "No difficulty selected"}
          </Typography>
        </Box>

        {/* Difficulty Options */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
          {difficultyOptions.map((option) => {
            const isSelected = difficulty === option.value;
            return (
              <Button
                key={option.value}
                variant={isSelected ? "contained" : "outlined"}
                color="primary"
                onClick={() => handleDifficultySelect(option.value)}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  fontWeight: "bold",
                  py: 2,
                  position: "relative",
                }}
              >
                <Box sx={{ textAlign: "left" }}>
                  <Typography variant="subtitle1">
                    {option.label}
                  </Typography>
                  <Typography variant="body2">
                    {option.description}
                  </Typography>
                </Box>
              </Button>
            );
          })}
        </Box>

        {/* Actions */}
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleClear}
            sx={{
              flex: 1,
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            Clear Selection
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            onClick={onClose}
            sx={{
              flex: 1,
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            Apply
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};