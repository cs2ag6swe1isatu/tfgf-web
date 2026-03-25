import { Container, Typography, Box } from "@mui/material";
import { Button } from "@mui/material";
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
      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Select Category
        </Typography>

        <Box sx={{ mt: 4, display: "grid", gap: 2 }}>
          <Button variant="contained" color="primary" onClick={() => handleSelect("General Knowledge")}>
            General Knowledge
          </Button>

          <Button variant="contained" color="secondary" onClick={() => handleSelect("Science and Technology")}>
            Science and Technology
          </Button>

          <Button variant="contained" color="primary" onClick={() => handleSelect("History")}>
            History
          </Button>

          <Button variant="contained" color="secondary" onClick={() => handleSelect("Geography")}>
            Geography
          </Button>

          <Button variant="contained" color="primary" onClick={() => handleSelect("Mathematics")}>
            Mathematics
          </Button>

          <Button variant="contained" color="secondary" onClick={() => handleSelect("Language and Literature")}>
            Language and Literature
          </Button>

          <Button variant="contained" color="primary" onClick={() => handleSelect("Pop Culture")}>
            Pop Culture
          </Button>

          <Button
            variant="outlined"
            color="primary"
            className="mt-1"
            onClick={() => setScreen("mode-select")}
          >
            Back
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default CategoryPage;