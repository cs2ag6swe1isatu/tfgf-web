import { Container, Typography, Box } from "@mui/material";
import { Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const SoloMenuPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Solo Mode
        </Typography>

        <Box sx={{ mt: 4, display: "grid", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => setScreen("category")}
          >
            Start Game
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={() => setScreen("profile")}
          >
            Profile
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default SoloMenuPage;