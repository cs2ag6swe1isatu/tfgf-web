import { Box, Typography, Button } from "@mui/material";

interface Lobby {
  id: string;
  hostName: string;
  hostLevel: number;
  category?: string;
  difficulty?: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate?: boolean;
}

interface LobbyListProps {
  onJoinLobby: (lobbyId: string) => void;
  lobbies?: Lobby[];
}

export const LobbyList = ({ onJoinLobby, lobbies }: LobbyListProps) => {
  const visibleList = lobbies !== undefined ? lobbies : [];

  return (
    <Box sx={{ width: "100%" }}>
      {visibleList.map((lobby) => (
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
                {lobby.isPrivate && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Private lobby</Typography>
                )}
                <Button
                  variant="contained"
                  onClick={() => onJoinLobby(lobby.id)}
                  disabled={lobby.playerCount >= lobby.maxPlayers || !!lobby.isPrivate}
                >
                  {lobby.playerCount >= lobby.maxPlayers ? "Full" : lobby.isPrivate ? "Private" : "Join"}
                </Button>
              </Box>
          </Box>
        </Box>
      ))}

      {visibleList.length === 0 && lobbies !== undefined && (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography variant="body1">No active lobbies found</Typography>
          <Typography variant="body2">Try creating a new lobby or check back later</Typography>
        </Box>
      )}
    </Box>
  );
};
