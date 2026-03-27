import { Box, Typography, Button } from "@mui/material";

interface Lobby {
  id: string;
  hostName: string;
  hostLevel: number;
  category?: string;
  difficulty?: string;
  playerCount: number;
  maxPlayers: number;
}

interface LobbyListProps {
  onJoinLobby: (lobbyId: string) => void;
}

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

export const LobbyList = ({ onJoinLobby }: LobbyListProps) => {
  return (
    <Box sx={{ width: "100%" }}>
      {mockLobbies.map((lobby) => (
        <Box key={lobby.id} sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="subtitle1">
                {lobby.hostName} (Level {lobby.hostLevel})
              </Typography>
              <Typography variant="body2">
                {lobby.category || "Any Category"} • {lobby.difficulty || "Any Difficulty"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <Typography variant="body2">{lobby.playerCount}/{lobby.maxPlayers} players</Typography>
              <Button 
                variant="contained" 
                onClick={() => onJoinLobby(lobby.id)} 
                disabled={lobby.playerCount >= lobby.maxPlayers}
              >
                {lobby.playerCount >= lobby.maxPlayers ? "Full" : "Join"}
              </Button>
            </Box>
          </Box>
        </Box>
      ))}

      {mockLobbies.length === 0 && (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography variant="body1">No active lobbies found</Typography>
          <Typography variant="body2">Try creating a new lobby or check back later</Typography>
        </Box>
      )}
    </Box>
  );
};