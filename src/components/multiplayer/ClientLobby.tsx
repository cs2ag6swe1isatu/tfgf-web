import React from "react";
import { Box, Typography, Button, TextField, Chip } from "@mui/material";
import { useGameStore } from "../../store/gameStore";
import { LobbyDiscovery } from "./LobbyDiscovery";
import { PlayerList } from "./PlayerList";

interface ClientLobbyProps {
  onJoinLobby: (lobbyId: string) => void;
  onReadyToggle: (ready: boolean) => void;
  onLeaveLobby: () => void;
}

export const ClientLobby = ({ 
  onJoinLobby, 
  onReadyToggle, 
  onLeaveLobby 
}: ClientLobbyProps) => {
  const { lobbyRole, lobbyId, players, isHostReady } = useGameStore();

  // Mock client player
  const clientPlayer = {
    id: "client-001",
    name: "ClientPlayer",
    avatar: "",
    level: 15,
    isReady: false,
    isHost: false,
  };

  // Add client to players list if not already present
  const allPlayers = players.length > 0 ? players : [clientPlayer];

  const [hostIdInput, setHostIdInput] = React.useState("");

  const handleJoinLobby = () => {
    if (hostIdInput.trim()) {
      onJoinLobby(hostIdInput.trim());
    }
  };

  const handleReadyToggle = () => {
    onReadyToggle(!clientPlayer.isReady);
  };

  // If in a lobby, show the lobby interface
  if (lobbyId) {
    return (
      <Box sx={{ width: "100%" }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            p: 3,
            bgcolor: "rgba(255, 255, 255, 0.05)",
            borderRadius: 2,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: "bold", color: "white", mb: 1 }}>
              Lobby: {lobbyId}
            </Typography>
            <Typography variant="body2" sx={{ color: "#888" }}>
              Waiting for host to start the game
            </Typography>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Chip
              label="CLIENT"
              color="default"
              variant="outlined"
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                fontWeight: "bold",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            />
            <Button
              variant="outlined"
              color="secondary"
              onClick={onLeaveLobby}
              sx={{
                borderColor: "rgba(255, 255, 255, 0.3)",
                color: "white",
                "&:hover": {
                  borderColor: "rgba(255, 255, 255, 0.5)",
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            >
              Leave Lobby
            </Button>
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr" }, gap: 3 }}>
          <PlayerList
            players={allPlayers}
            isHost={false}
            onReadyToggle={(playerId, ready) => {
              if (playerId === clientPlayer.id) {
                handleReadyToggle();
              }
            }}
          />
        </Box>

        {/* Status */}
        <Box
          sx={{
            mt: 3,
            p: 3,
            bgcolor: "rgba(255, 255, 255, 0.05)",
            borderRadius: 2,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            textAlign: "center",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: isHostReady ? "#00ff9d" : "#888",
              fontWeight: "bold",
              mb: 1,
            }}
          >
            {isHostReady ? "Host is ready" : "Waiting for host to configure game..."}
          </Typography>
          <Typography variant="caption" sx={{ color: "#666" }}>
            Host will select category and difficulty before starting
          </Typography>
        </Box>
      </Box>
    );
  }

  // If not in a lobby, show the lobby discovery interface
  return (
    <Box sx={{ width: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          p: 3,
          bgcolor: "rgba(255, 255, 255, 0.05)",
          borderRadius: 2,
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "white", mb: 1 }}>
            Join a Lobby
          </Typography>
          <Typography variant="body2" sx={{ color: "#888" }}>
            Enter a lobby ID or browse active lobbies
          </Typography>
        </Box>
      </Box>

      {/* Join by ID */}
      <Box
        sx={{
          mb: 3,
          p: 3,
          bgcolor: "rgba(255, 255, 255, 0.05)",
          borderRadius: 2,
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Typography variant="subtitle1" sx={{ color: "white", mb: 2, fontWeight: "bold" }}>
          Join by Lobby ID
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            fullWidth
            placeholder="Enter lobby ID (e.g., LOBBY-ABC123)"
            value={hostIdInput}
            onChange={(e) => setHostIdInput(e.target.value)}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.3)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.5)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#00ff9d",
                },
                color: "white",
              },
              "& .MuiInputLabel-root": {
                color: "rgba(255, 255, 255, 0.7)",
              },
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleJoinLobby}
            disabled={!hostIdInput.trim()}
            sx={{
              fontWeight: "bold",
              textTransform: "uppercase",
              bgcolor: hostIdInput.trim() ? "#00ff9d" : "rgba(255, 255, 255, 0.2)",
              color: hostIdInput.trim() ? "#000" : "white",
              border: hostIdInput.trim() ? "none" : "1px solid rgba(255, 255, 255, 0.3)",
              "&:hover": {
                bgcolor: hostIdInput.trim() ? "#00cc7a" : "rgba(255, 255, 255, 0.3)",
              },
            }}
          >
            Join
          </Button>
        </Box>
      </Box>

      {/* Active Lobbies */}
      <LobbyDiscovery onJoinLobby={onJoinLobby} />
    </Box>
  );
};

