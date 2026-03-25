import { Container, Typography, Box, Button, TextField } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { LobbyDiscovery } from "../components/multiplayer/LobbyDiscovery";

const ClientDiscoveryPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const setLobbyRole = useGameStore((state) => state.setLobbyRole);

  const handleJoinLobby = (lobbyId: string) => {
    setLobbyRole("client");
    setScreen("multiplayer-lobby");
  };

  const handleBack = () => {
    setScreen("multiplayer-menu");
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Box>
          <Typography variant="h4">
            Join a Lobby
          </Typography>
        </Box>

        <Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Enter lobby ID"
              variant="outlined"
            />
            <Button
              variant="contained"
              onClick={() => handleJoinLobby("test-lobby")}
              sx={{
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              Join
            </Button>
          </Box>
        </Box>

        {/* Browse Lobbies */}
        <Box>
          <LobbyDiscovery onJoinLobby={handleJoinLobby} />
        </Box>

        {/* Back Button */}
        <Box >
          <Button
            variant="outlined"
            onClick={handleBack}
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

export default ClientDiscoveryPage;