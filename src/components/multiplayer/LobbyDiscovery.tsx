import { Box, Typography, Button, Card, CardContent } from "@mui/material";
import { useGameStore } from "../../store/gameStore";

interface Lobby {
  id: string;
  hostName: string;
  hostLevel: number;
  category: string | null;
  difficulty: string | null;
  playerCount: number;
  maxPlayers: number;
}

interface LobbyDiscoveryProps {
  onJoinLobby: (lobbyId: string) => void;
}

// Mock lobby data for demonstration
const mockLobbies: Lobby[] = [
  {
    id: "lobby-001",
    hostName: "TechMaster",
    hostLevel: 25,
    category: "Technology",
    difficulty: "Medium",
    playerCount: 2,
    maxPlayers: 4,
  },
  {
    id: "lobby-002",
    hostName: "ScienceGuru",
    hostLevel: 18,
    category: "Science",
    difficulty: "Easy",
    playerCount: 1,
    maxPlayers: 4,
  },
  {
    id: "lobby-003",
    hostName: "HistoryBuff",
    hostLevel: 32,
    category: "History",
    difficulty: "Hard",
    playerCount: 3,
    maxPlayers: 4,
  },
];

export const LobbyDiscovery = ({ onJoinLobby }: LobbyDiscoveryProps) => {
  const { lobbyId } = useGameStore();

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
      </Box>

      {/* Lobby List */}
      <Box sx={{ display: "flex", flexDirection: "column"}}>
        {mockLobbies.map((lobby) => (
          <Box
            key={lobby.id}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {/* Left side: Host info */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      border: "1px solid black",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    H
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold"}}>
                      {lobby.hostName}
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{ ml: 1, fontWeight: "normal" }}
                      >
                        Level {lobby.hostLevel}
                      </Typography>
                    </Typography>
                    
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.5,
                        }}
                      >
                        {lobby.category || "Any Category"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.5,
                        }}
                      >
                        {lobby.difficulty || "Any Difficulty"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Right side: Player count and Join button */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                  <Typography variant="body2">
                    {lobby.playerCount}/{lobby.maxPlayers} players
                  </Typography>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => onJoinLobby(lobby.id)}
                    disabled={lobby.playerCount >= lobby.maxPlayers}
                  >
                    {lobby.playerCount >= lobby.maxPlayers ? "Full" : "Join"}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Box>
        ))}
      </Box>

      {/* No lobbies message */}
      {mockLobbies.length === 0 && (
        <Box
          sx={{
            p: 4,
            textAlign: "center",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            No active lobbies found
          </Typography>
          <Typography variant="body2" >
            Try creating a new lobby or check back later
          </Typography>
        </Box>
      )}
    </Box>
  );
};