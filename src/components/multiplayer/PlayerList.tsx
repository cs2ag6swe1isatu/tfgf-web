import { Box, Typography, Avatar } from "@mui/material";
import { LobbyMember } from "../../types/multiplayer";
import { UserSharp, Robot, RobotFaceHappy } from "pixelarticons/react";

interface PlayerListProps {
  players: LobbyMember[];
  isHost: boolean;
  onReadyToggle?: (playerId: string, ready: boolean) => void;
}

export const PlayerList = ({ players }: PlayerListProps) => {
  const sortedPlayers = [...players].sort((a, b) => {
    // Host always first
    if (a.isHost && !b.isHost) return -1;
    if (!a.isHost && b.isHost) return 1;
    
    // Ready players first
    if (a.isReady && !b.isReady) return -1;
    if (!a.isReady && b.isReady) return 1;
    
    // Alphabetical by name
    return a.name.localeCompare(b.name);
  });

  return (
    <Box sx={{ width: "100%" }}>
      {sortedPlayers.map((player) => (
        <Box key={player.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2}}>
            <Avatar
              src={player.avatar}
              alt={player.name}
              sx={{ width: 32, height: 32 }}
            >
              {!player.avatar && <UserSharp />}
            </Avatar>
            <Box>
              <Typography variant="body2">
                {player.name}
                {player.isHost && " (Host)"}
              </Typography>
              <Typography variant="subtitle1">Level {player.level}</Typography>
              <Typography variant="subtitle1">Rank {player.rank.name}</Typography>
            </Box>
          </Box>

          <Typography variant="body2">
          </Typography>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2">
              {player.isReady ? "Ready" : "Waiting"}
            </Typography>
            {player.isReady ? (
              <RobotFaceHappy width={16} height={16} />
            ) : (
              <Robot width={16} height={16} />
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};