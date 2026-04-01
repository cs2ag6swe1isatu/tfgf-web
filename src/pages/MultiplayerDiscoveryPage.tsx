import { useState, useEffect } from "react";
import { Typography, Box, Button, TextField } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { usePlayerStore } from "../store/playerStore";
import { LobbyList } from "../components/multiplayer/LobbyList";
import type { MultiplayerBridge, MultiplayerDiscoveredPayload } from "../types/multiplayer";

const MultiplayerDiscovery = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const setLobbyId = useMultiplayerStore((s) => s.setLobbyId);
  const setLobbyRole = useMultiplayerStore((s) => s.setLobbyRole);
  const setCurrentPlayerId = useMultiplayerStore((s) => s.setCurrentPlayerId);
  const addOrUpdatePlayer = useMultiplayerStore((s) => s.addOrUpdatePlayer);
  const addOrUpdateDiscoveredHost = useMultiplayerStore((s) => s.addOrUpdateDiscoveredHost);
  const discoveredHosts = useMultiplayerStore((s) => s.discoveredHosts);
  const pruneStaleDiscoveredHosts = useMultiplayerStore((s) => s.pruneStaleDiscoveredHosts);

  const player = usePlayerStore((s) => s.getPlayer());
  const multiplayerBridge = (window as unknown as { multiplayer?: MultiplayerBridge }).multiplayer;

  const [hostId, setHostId] = useState("");
  const [status, setStatus] = useState<string>("");

  const handleJoinLobby = (selectedLobbyId: string) => {
    const discovered = discoveredHosts.find((host) => host.lobbyId === selectedLobbyId);
    if (!discovered?.hostAddress) {
      setStatus("Lobby not found on LAN.");
      return;
    }

    setLobbyId(selectedLobbyId);
    setLobbyRole("client");
    setCurrentPlayerId(player.id);
    addOrUpdatePlayer(player, { isHost: false, isReady: false });
    console.log('[discovery] requesting join to', discovered.hostAddress, 'lobby', selectedLobbyId, 'player', player.id);
    window.multiplayer?.requestJoin({
      lobbyId: selectedLobbyId,
      hostAddress: discovered.hostAddress,
      player: {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        level: player.level,
        rank: player.rank,
        isReady: false,
        isHost: false,
      },
    });

    setStatus("Joining lobby...");
    setScreen("multiplayer-lobby");
  };

  const handleJoinById = () => {
    if (hostId.trim()) {
      handleJoinLobby(hostId);
    }
  };

  const handleBack = () => setScreen("multiplayer-menu");

  // Start LAN discovery on mount
  useEffect(() => {
    if (!multiplayerBridge) return;

    const onHostFoundCb = (payload: MultiplayerDiscoveredPayload) => {
      addOrUpdateDiscoveredHost(payload);
    };

    multiplayerBridge.startDiscovery();
    multiplayerBridge.onHostFound(onHostFoundCb);

    return () => {
      try {
        multiplayerBridge.offHostFound?.(onHostFoundCb);
        multiplayerBridge.stopDiscovery();
      } catch {
        void 0;
      }
    };
  }, [addOrUpdateDiscoveredHost, multiplayerBridge]);

  // Periodically prune stale hosts
  useEffect(() => {
    const TTL = 8000; // ms — consider ~4x broadcast interval
    const INTERVAL = 3000;
    const id = setInterval(() => {
      try {
        pruneStaleDiscoveredHosts(TTL);
      } catch {
        void 0;
      }
    }, INTERVAL);

    return () => clearInterval(id);
  }, [pruneStaleDiscoveredHosts]);

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px',
      boxSizing: 'border-box',
      color: 'primary.main',
      overflow: 'hidden'
    }}>
      <Box sx={{ mt: 4 }}>
        {status && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2">{status}</Typography>
          </Box>
        )}

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
          <LobbyList onJoinLobby={handleJoinLobby} lobbies={discoveredHosts.map((d) => ({
            id: d.lobbyId,
            hostName: d.hostName || d.hostId,
            hostLevel: d.hostLevel ?? 1,
            category: d.category,
            difficulty: d.difficulty,
            playerCount: d.playerCount || 1,
            maxPlayers: d.maxPlayers || 4,
          }))} />
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
    </Box>
  );
};

export default MultiplayerDiscovery;