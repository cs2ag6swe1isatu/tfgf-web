import { Button, Container, Typography, Box } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const MultiplayerMenuPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          color: "#00ffe0",
        }}
      >
        <Typography variant="h4" sx={{ mb: 6, letterSpacing: 2 }}>
          MULTIPLAYER
        </Typography>

        <Box sx={{ width: "100%", display: "grid", gap: 3 }}>
          <Button
            variant="outlined"
            sx={{ py: 2, borderColor: "#00ffe0", color: "#00ffe0" }}
            onClick={() => setScreen("host-lobby")}
          >
            HOST GAME
          </Button>

          <Button
            variant="outlined"
            sx={{ py: 2, borderColor: "#00ffe0", color: "#00ffe0" }}
            onClick={() => setScreen("join-lobby")}
          >
            JOIN GAME
          </Button>

          <Button
            variant="text"
            sx={{ mt: 2, color: "#00ffe0" }}
            onClick={() => setScreen("mode-select")}
          >
            BACK
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default MultiplayerMenuPage;