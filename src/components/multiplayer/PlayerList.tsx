import { Box, Typography, Button } from "@mui/material";
import { PlayerRow } from "./PlayerRow";
import { Player } from "../../types/multiplayer";

interface PlayerListProps {
  players: Player[];
  onReadyToggle?: (playerId: string, ready: boolean) => void;
  isHost: boolean;
  onAllReady?: () => void;
}

export const PlayerList = ({ 
  players, 
  onReadyToggle, 
  isHost, 
  onAllReady 
}: PlayerListProps) => {
  // Sort players: host first, then by ready status, then by name
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

  const allPlayersReady = sortedPlayers.every(p => p.isReady);
  const readyCount = sortedPlayers.filter(p => p.isReady).length;

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header */}

      {/* Player Rows */}
      <Box sx={{ maxHeight: "400px", overflow: "auto" }}>
        {sortedPlayers.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            onReadyToggle={onReadyToggle}
            isHost={isHost}
          />
        ))}
      </Box>
    </Box>
  );
};