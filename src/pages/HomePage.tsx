import { Container, Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const HomePage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h1" gutterBottom>
          Think Fast, Guess Faster
        </Typography>

        <Box sx={{ mt: 5, display: "grid", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setScreen("mode-select")}
          >
            Play
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => setScreen("profile")}
          >
            Profile
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => setScreen("settings")}
          >
            Settings
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => setScreen("standing")}
          >
            Standing
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default HomePage;