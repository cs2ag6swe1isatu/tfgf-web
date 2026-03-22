import { Button, Container, Typography, Box } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const HomePage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const setMode = useGameStore((state) => state.setMode);

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10, textAlign: "center" }}>
        <Typography variant="h3" gutterBottom>
          Trivia Game
        </Typography>

        <Box sx={{ mt: 6, display: "grid", gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              setMode("solo");
              setScreen("solo-menu");
            }}
          >
            Solo
          </Button>

          <Button
            variant="outlined"
            size="large"
            onClick={() => {
              setMode("multiplayer");
              setScreen("multiplayer-menu");
            }}
          >
            Multiplayer
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default HomePage;