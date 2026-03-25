import { Modal, Box, Typography, Button, Chip } from "@mui/material";
import { useGameStore } from "../../store/gameStore";

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
}

// Mock categories for demonstration
const categories = [
  "Technology",
  "Science",
  "History",
  "Geography",
  "Sports",
  "Entertainment",
  "Art",
  "Literature",
  "Mathematics",
  "Music",
  "Food & Drink",
  "Animals",
  "Video Games",
  "Movies",
  "TV Shows",
];

export const CategoryModal = ({ open, onClose }: CategoryModalProps) => {
  const { setCategory, setGameConfig, category } = useGameStore();

  const handleCategorySelect = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setGameConfig({ category: selectedCategory });
    onClose();
  };

  const handleClear = () => {
    setCategory(null);
    setGameConfig({ category: null });
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
          width: 500,
          bgcolor: "white",
          p: 4,
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold"}}>
            Select Category
          </Typography>
          <Typography variant="body2">
            {category ? `Current: ${category}` : "No category selected"}
          </Typography>
        </Box>

        {/* Category Grid */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2, mb: 4 }}>
          {categories.map((cat) => {
            const isSelected = category === cat;
            return (
              <Button
                key={cat}
                variant={isSelected ? "contained" : "outlined"}
                color="primary"
                onClick={() => handleCategorySelect(cat)}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  fontWeight: "bold",
                  py: 1.5,
                }}
              >
                {cat}
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