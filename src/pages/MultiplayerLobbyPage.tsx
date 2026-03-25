import { Container, Typography, Box, Button, Chip } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { PlayerList } from "../components/multiplayer/PlayerList";
import { HostControls } from "../components/multiplayer/HostControls";
import { CategoryModal } from "../components/multiplayer/CategoryModal";
import { DifficultyModal } from "../components/multiplayer/DifficultyModal";
import { ContentCopy } from "@mui/icons-material";

const MultiplayerLobbyPage = () => {
  const {
    lobbyRole,
    lobbyId,
    players,
    modalState,
    setScreen,
    setModalState,
    setGameConfig,
    resetMultiplayer,
  } = useGameStore();

  // Generate a mock lobby ID if none exists
  const currentLobbyId = lobbyId || "LOBBY-" + Math.random().toString(36).substr(2, 6).toUpperCase();

  // Mock host player (for demonstration)
  const hostPlayer = {
    id: "host-001",
    name: "HostPlayer",
    avatar: "",
    level: 25,
    isReady: true,
    isHost: true,
  };

  // Add host to players list if not already present
  const allPlayers = players.length > 0 ? players : [hostPlayer];

  const handleCategoryOpen = () => {
    setModalState("category", true);
  };

  const handleDifficultyOpen = () => {
    setModalState("difficulty", true);
  };

  const handleStartGame = () => {
    // Set game mode to multiplayer
    setGameConfig({ category: null, difficulty: "medium" });
    
    // Navigate to question page
    setScreen("question");
  };

  const handleLeaveLobby = () => {
    resetMultiplayer();
    setScreen("multiplayer-menu");
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            p: 3,
            border: "1px solid",
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Host Lobby
            </Typography>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Chip
              label={currentLobbyId}
              variant="outlined"
              sx={{
                fontWeight: "bold",
              }}
            />
          </Box>
        </Box>

        {/* Main Content Grid */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 3 }}>

          <Box>
            <PlayerList
              players={allPlayers}
              isHost={true}
              onReadyToggle={(playerId, ready) => {
                // Host ready toggle logic
              }}
              onAllReady={handleStartGame}
            />
          </Box>

          <Box>
            <HostControls
              onCategoryOpen={handleCategoryOpen}
              onDifficultyOpen={handleDifficultyOpen}
              onStartGame={handleStartGame}
            />
          </Box>
        </Box>

        {/* Footer Actions */}
        <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleLeaveLobby}
            sx={{
              flex: 1,
              textTransform: "uppercase",
            }}
          >
            Leave Lobby
          </Button>
        </Box>
      </Box>

      {/* Modals */}
      <CategoryModal
        open={modalState.category}
        onClose={() => setModalState("category", false)}
      />
      
      <DifficultyModal
        open={modalState.difficulty}
        onClose={() => setModalState("difficulty", false)}
      />
    </Container>
  );
};

export default MultiplayerLobbyPage;
