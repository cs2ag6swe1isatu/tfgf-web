import { Box, Typography, Avatar, Button } from "@mui/material";
import { LobbyMember } from "../../types/multiplayer";
import { UserSharp, Robot, RobotFaceHappy } from "pixelarticons/react";
import theme from "../../ui/theme";
import { getAvatarSrc } from "../../utils/avatar";

interface PlayerListProps {
  players: LobbyMember[];
  isHost: boolean;
  onReadyToggle?: (playerId: string, ready: boolean) => void;
  onKick?: (playerId: string) => void;
}

export const PlayerList = ({ players, isHost, onKick }: PlayerListProps) => {
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
        <Box key={player.id} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Box sx={{ width:"100%", display: "flex", alignItems: "center", gap: 2}}>
            <Box width={48} height={48} sx={{ display:"flex", justifyContent:"center", alignItems: "center", border: `2px solid ${theme.palette.primary.main}`}}>
              {player.avatar ? (
                <Avatar src={getAvatarSrc(player.avatar)} alt={player.name} sx={{ width: 44, height: 44, imageRendering: 'pixelated' }} />
              ) : (
                <UserSharp width={32} height={32}/>
              )}
            </Box>
            <Box>
              <Typography variant="body2">
                {player.name}
                {player.isHost && " (Host)"}
              </Typography>
              <Typography variant="subtitle1">Level {player.level}</Typography>
              <Typography variant="subtitle1">Rank {player.rank.name}</Typography>
            </Box>
          </Box>

          {isHost && !player.isHost && onKick && (
            <Box sx={{ width: "100%", display: "flex", justifyContent: "right"}}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => {
                  onKick(player.id);
                }}
              >
                Kick
              </Button>
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 2 }}>
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
