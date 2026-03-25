import { Box, Typography, Avatar, Chip, IconButton } from "@mui/material";
import { CheckCircleOutline, CancelOutlined, PersonOutline } from "@mui/icons-material";
import { Player } from "../../types/multiplayer";
// installed @mui/icons-material via npm; please retry the correct reference
interface PlayerRowProps {
  player: Player;
  onReadyToggle?: (playerId: string, ready: boolean) => void;
  isHost: boolean;
}

export const PlayerRow = ({ player, onReadyToggle, isHost }: PlayerRowProps) => {
  const handleReadyToggle = () => {
    if (onReadyToggle && !player.isHost) {
      onReadyToggle(player.id, !player.isReady);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 2,
        mb: 1,
        border: "1px solid",
      }}
    >
      {/* Left side: Avatar, Name, Host Badge */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
        <Avatar
          src={player.avatar}
          alt={player.name}
          sx={{
            width: 40,
            height: 40,
            border: player.isHost ? "2px solid black" : "1px solid gray",
            bgcolor: player.isHost ? "black" : "gray",
          }}
        >
          {!player.avatar && <PersonOutline />}
        </Avatar>
        
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: "bold",
              color: player.isHost ? "black" : "gray",
            }}
          >
            {player.name}
            {player.isHost && (
              <Chip
                label="HOST"
                size="small"
                sx={{
                  ml: 1,
                  fontWeight: "bold",
                  fontSize: "0.6rem",
                  border: "1px solid black",
                }}
              />
            )}
          </Typography>
          <Typography variant="caption" sx={{ color: "#888" }}>
            Level {player.level}
          </Typography>
        </Box>
      </Box>

      {/* Right side: Ready Status */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {player.isReady ? (
          <CheckCircleOutline sx={{ fontSize: 20 }} />
        ) : (
          <CancelOutlined sx={{ fontSize: 20 }} />
        )}
        
        <Typography
          variant="body2"
          sx={{
            fontWeight: "bold",
            color: player.isReady ? "black" : "gray",
            textTransform: "uppercase",
          }}
        >
          {player.isReady ? "Ready" : "Waiting"}
        </Typography>

        {/* Ready Toggle Button (for non-host players) */}
        {!player.isHost && (
          <IconButton
            onClick={handleReadyToggle}
            sx={{
              ml: 1,
            }}
          >
            {player.isReady ? "✓" : "○"}
          </IconButton>
        )}
      </Box>
    </Box>
  );
};