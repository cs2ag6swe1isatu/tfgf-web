import { Container, Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const ModeSelectPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const setMode = useGameStore((state) => state.setMode);

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Choose Mode
        </Typography>

        <Box sx={{ mt: 4, display: "grid", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setMode("solo");
              setScreen("category");
            }}
          >
            Single Player
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setMode("multiplayer");
              setScreen("multiplayer-menu");
            }}
          >
            Multiplayer
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => setScreen("home")}
          >
            Back
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default ModeSelectPage;