import { Button, Container, Typography, Box } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const CategoryPage = () => { 
  const setCategory = useGameStore((state) => state.setCategory);
  const setScreen = useGameStore((state) => state.setScreen);

  const handleSelect = (category: string) => {
    setCategory(category);
    setScreen("difficulty");
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Select Category
        </Typography>

        <Box sx={{ mt: 4, display: "grid", gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => handleSelect("Math")}
          >
            Math
          </Button>

          <Button
            variant="contained"
            onClick={() => handleSelect("Science")}
          >
            Science
          </Button>

          <Button
            variant="contained"
            onClick={() => handleSelect("History")}
          >
            History
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default CategoryPage;