import { Button, Container, Typography, Box } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const MultiplayerMenuPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Multiplayer Mode
        </Typography>

        <Box sx={{ mt: 4, display: "grid", gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => setScreen("multiplayer-lobby")}
          >
            Host Game
          </Button>

          <Button
            variant="outlined"
            size="large"
            onClick={() => setScreen("multiplayer-lobby")}
          >
            Join Game
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default MultiplayerMenuPage;