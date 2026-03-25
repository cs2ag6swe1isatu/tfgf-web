import { Container, Typography, Box } from "@mui/material";
import { Button } from "@mui/material";
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
            size="large"
            onClick={() => setScreen("mode-select")}
          >
            Play
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={() => setScreen("profile")}
          >
            Profile
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={() => setScreen("settings")}
          >
            Settings
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="large"
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