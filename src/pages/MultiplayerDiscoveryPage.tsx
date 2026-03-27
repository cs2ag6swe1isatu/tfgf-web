import { useState } from "react";
import { Container, Typography, Box, Button, TextField } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { usePlayerStore } from "../store/playerStore";
import { LobbyList } from "../components/multiplayer/LobbyList";

/**
 * Generates mock host data for a lobby when no actual host exists.
 * Uses the lobby ID to create deterministic mock data.
 */
function generateMockHost(lobbyId: string) {
  const seed = lobbyId.split('-').pop() || '0000';
  
  return {
    id: `host-${lobbyId}`,
    name: `Host-${seed.toUpperCase()}`,
    avatar: '',
    xp: 0,
    level: 1,
    rank: { name: "Host", icon: "", minLevel: 0, maxLevel: 999 },
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    lastActive: new Date(),
  };
}

const MultiplayerDiscovery = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const setLobbyId = useMultiplayerStore((s) => s.setLobbyId);
  const setCurrentPlayerId = useMultiplayerStore((s) => s.setCurrentPlayerId);
  const addOrUpdatePlayer = useMultiplayerStore((s) => s.addOrUpdatePlayer);

  const player = usePlayerStore((s) => s.getPlayer());

  const [hostId, setHostId] = useState("");

  const handleJoinLobby = (selectedLobbyId: string) => {
    setLobbyId(selectedLobbyId);
    setCurrentPlayerId(player.id);
    
    // Add mock host data
    const mockHost = generateMockHost(selectedLobbyId);
    addOrUpdatePlayer(mockHost, { isHost: true, isReady: true });
    
    // Add current player as client
    addOrUpdatePlayer(player, { isHost: false, isReady: false });
    
    setScreen("multiplayer-lobby");
  };

  const handleJoinById = () => {
    if (hostId.trim()) {
      handleJoinLobby(hostId);
    }
  };

  const handleBack = () => setScreen("multiplayer-menu");

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        {/* Top: Host ID Search */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <TextField 
            fullWidth 
            placeholder="Enter host lobby ID" 
            value={hostId}
            onChange={(e) => setHostId(e.target.value)}
          />
          <Button 
            variant="contained" 
            onClick={handleJoinById}
          >
            Join
          </Button>
        </Box>

        {/* Middle: Active Lobbies */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Active Lobbies</Typography>
          <LobbyList onJoinLobby={handleJoinLobby} />
        </Box>

        {/* Bottom: Back Button */}
        <Button 
          variant="outlined" 
          onClick={handleBack} 
          sx={{ mt: 2 }}
        >
          Back
        </Button>
      </Box>
    </Container>
  );
};

export default MultiplayerDiscovery;