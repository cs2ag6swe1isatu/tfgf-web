import { useState, useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { getMultiplayerPlayer, usePlayerStore } from "../store/playerStore";
import type { 
  MultiplayerBridge, 
  MultiplayerDiscoveredPayload, 
  MultiplayerHostExitPayload 
} from "../types/multiplayer";

const COLORS = {
  bg: '#1E1E1E',
  surface: '#0F2A2A',
  neonGreen: '#39FF14',
  cyan: '#4AD2D2',
  shadow: '#000000'
};

const MultiplayerDiscovery = () => {
  // Store actions/state
  const setScreen = useGameStore((s) => s.setScreen);
  const autoJoinLan = useGameStore((s) => s.gameConfig.autoJoinLan); // Setting check 
  
  const { 
    setLobbyId, setLobbyRole, setHostAddress, setCurrentPlayerId,
    addOrUpdatePlayer, addOrUpdateDiscoveredHost, discoveredHosts,
    removeDiscoveredHost, pruneStaleDiscoveredHosts 
  } = useMultiplayerStore();

  const player = usePlayerStore((s) => s.getPlayer());
  const multiplayerPlayer = getMultiplayerPlayer(player);
  const multiplayerBridge = (window as any).multiplayer as MultiplayerBridge;

  const [hostIdInput, setHostIdInput] = useState("");
  const [status, setStatus] = useState<string>("");

  const handleJoinLobby = (selectedLobbyId: string) => {
    const discovered = discoveredHosts.find((host) => host.lobbyId === selectedLobbyId);
    if (!discovered?.hostAddress) {
      setStatus("LOBBY NOT FOUND ON LAN.");
      return;
    }

    // Update global state before transition [cite: 1021]
    setLobbyId(selectedLobbyId);
    setLobbyRole("client");
    setHostAddress(discovered.hostAddress);
    setCurrentPlayerId(multiplayerPlayer.id);
    addOrUpdatePlayer(multiplayerPlayer, { isHost: false, isReady: false });

    // Bridge request to Electron [cite: 1017]
    multiplayerBridge?.requestJoin({
      lobbyId: selectedLobbyId,
      hostAddress: discovered.hostAddress,
      player: { ...multiplayerPlayer, isReady: false, isHost: false },
    });

    setStatus("JOINING LOBBY...");
    setScreen("multiplayer-lobby");
  };

  // 1. AUTO-JOIN LOGIC [cite: 975, 976]
  useEffect(() => {
    if (autoJoinLan && discoveredHosts.length > 0) {
      // Find the first public, joinable lobby
      const autoTarget = discoveredHosts.find(h => !h.isPrivate && !h.isGameActive);
      if (autoTarget) {
        setStatus("AUTO-JOINING LAN HOST...");
        handleJoinLobby(autoTarget.lobbyId);
      }
    }
  }, [discoveredHosts, autoJoinLan]);

  // 2. DISCOVERY LIFECYCLE [cite: 1017, 1020]
  useEffect(() => {
    if (!multiplayerBridge) return;

    const onHostFoundCb = (payload: MultiplayerDiscoveredPayload) => {
      if (payload.isPrivate) { removeDiscoveredHost(payload.lobbyId); return; }
      addOrUpdateDiscoveredHost(payload);
    };

    const onHostExitCb = (payload: MultiplayerHostExitPayload) => {
      removeDiscoveredHost(payload.lobbyId);
    };

    multiplayerBridge.startDiscovery();
    multiplayerBridge.onHostFound("Discovery", onHostFoundCb);
    multiplayerBridge.onHostExit?.("Discovery", onHostExitCb);

    const intervalId = window.setInterval(() => multiplayerBridge.discoveryRequest?.(), 3000);

    return () => {
      multiplayerBridge.offHostFound?.("Discovery");
      multiplayerBridge.offHostExit?.("Discovery");
      multiplayerBridge.stopDiscovery();
      window.clearInterval(intervalId);
    };
  }, [multiplayerBridge]);

  // 3. STALE HOST PRUNING [cite: 1020]
  useEffect(() => {
    const id = setInterval(() => pruneStaleDiscoveredHosts(4500), 1500);
    return () => clearInterval(id);
  }, [pruneStaleDiscoveredHosts]);

  // STYLES 
  const styles = {
    root: {
      width: "100%", height: "100%",
      bgcolor: COLORS.bg, display: "flex",
      justifyContent: "center", alignItems: "center",
      fontFamily: "'VT323', monospace", overflow: "hidden"
    },
    container: {
      width: "100%", maxWidth: "1024px", // Ratios [cite: 978, 979]
      height: "100%", maxHeight: "768px",
      display: "flex", flexDirection: "column", p: 4, gap: 3
    },
    // FOLDER TAB CARD [cite: 977]
    lobbyCard: {
      position: 'relative', borderRadius: 0,
      bgcolor: COLORS.surface, p: 2, mb: 3,
      border: `2px solid ${COLORS.cyan}`,
      boxShadow: `8px 8px 0px ${COLORS.shadow}`,
      cursor: 'pointer', transition: '0.1s',
      '&:hover': {
        transform: 'translate(-2px, -2px)',
        boxShadow: `10px 10px 0px ${COLORS.neonGreen}`, // Hover feedback [cite: 952]
        borderColor: COLORS.neonGreen
      },
      '&:before': { // The Folder Tab [cite: 948, 977]
        content: '""', position: 'absolute',
        top: '-14px', left: '-2px',
        width: '120px', height: '14px',
        bgcolor: COLORS.surface,
        border: `2px solid ${COLORS.cyan}`,
        borderBottom: 'none'
      }
    }
  };

  return (
    <Box sx={styles.root}>
      <Box sx={styles.container}>
        {/* Top Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ color: COLORS.neonGreen, fontSize: '2rem' }}>
            {autoJoinLan ? "AUTO-DISCOVERY ACTIVE" : "MANUAL DISCOVERY"}
          </Typography>
          <button 
            style={{ 
              background: COLORS.surface, color: COLORS.cyan, 
              border: `2px solid ${COLORS.cyan}`, padding: '8px 24px',
              fontFamily: 'inherit', cursor: 'pointer'
            }}
            onClick={() => setScreen("multiplayer-menu")}
          >
            BACK
          </button>
        </Box>

        {status && (
          <Typography sx={{ color: COLORS.neonGreen, textAlign: 'center' }}>
            {status}
          </Typography>
        )}

        {/* Lobbies List */}
        <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
          {discoveredHosts.length === 0 ? (
            <Typography sx={{ color: COLORS.cyan, opacity: 0.5, textAlign: 'center', mt: 10 }}>
              SCANNING LOCAL NETWORK...
            </Typography>
          ) : (
            discoveredHosts.map((lobby) => (
              <Paper 
                key={lobby.lobbyId} 
                sx={styles.lobbyCard}
                onClick={() => handleJoinLobby(lobby.lobbyId)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ color: COLORS.neonGreen, fontSize: '1.5rem' }}>
                      {lobby.hostName || 'UNKNOWN HOST'}
                    </Typography>
                    <Typography sx={{ color: COLORS.cyan }}>
                      ID: #{lobby.lobbyId} | {lobby.category || 'ANY'} | {lobby.difficulty || 'ANY'}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: COLORS.cyan, alignSelf: 'center' }}>
                    {lobby.playerCount}/{lobby.maxPlayers} USERS
                  </Typography>
                </Box>
              </Paper>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MultiplayerDiscovery;