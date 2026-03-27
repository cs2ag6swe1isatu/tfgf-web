import { Container, Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useMultiplayerStore } from "../store/multiplayerStore";

const MultiplayerMenuPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const setLobbyRole = useMultiplayerStore((state) => state.setLobbyRole);

  const handleHostGame = () => {
    setLobbyRole("host");
    setScreen("multiplayer-lobby");
  };

  const handleJoinGame = () => {
    setLobbyRole("client");
    setScreen("multiplayer-discovery");
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Multiplayer
        </Typography>

        <Box sx={{ mt: 4, display: "grid", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleHostGame}
            sx={{
              fontWeight: "bold",
              textTransform: "uppercase"
            }}
          >
            Host Game
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={handleJoinGame}
            sx={{
              fontWeight: "bold",
              textTransform: "uppercase"
            }}
          >
            Join Game
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => setScreen("mode-select")}
            sx={{
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            Back
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default MultiplayerMenuPage;
