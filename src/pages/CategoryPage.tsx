import { Container, Typography, Box, Button} from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { Category } from "../constants";

const CategoryPage = () => {
  const mode = useGameStore((state) => state.gameConfig.mode);
  const setCategory = useGameStore((state) => state.setCategory);
  const setScreen = useGameStore((state) => state.setScreen);

  const handleSelect = (category: Category) => {
    setCategory(category);
    if(mode === "solo") {
      setScreen("difficulty");
    } else if(mode === "multiplayer") {
      setScreen("multiplayer-lobby");
    }
  };

  const handleBack = () => {
    if(mode === "solo") {
      setScreen("mode-select");
    } else if(mode === "multiplayer") {
      setScreen("multiplayer-lobby");
    }
  }

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

          <Button variant="contained" color="primary" onClick={() => handleSelect("Science and Technology")}>
            Science and Technology
          </Button>

          <Button variant="contained" color="primary" onClick={() => handleSelect("History")}>
            History
          </Button>

          <Button variant="contained" color="primary" onClick={() => handleSelect("Geography")}>
            Geography
          </Button>

          <Button variant="contained" color="primary" onClick={() => handleSelect("Mathematics")}>
            Mathematics
          </Button>

          <Button variant="contained" color="primary" onClick={() => handleSelect("Language and Literature")}>
            Language and Literature
          </Button>

          <Button variant="contained" color="primary" onClick={() => handleSelect("Pop Culture")}>
            Pop Culture
          </Button>

          <Button
            variant="outlined"
            color="primary"
            className="mt-1"
            onClick={() => handleBack()}
          >
            Back
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default CategoryPage;