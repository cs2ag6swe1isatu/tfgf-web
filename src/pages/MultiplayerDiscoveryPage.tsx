import { useState, useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { getMultiplayerPlayer, usePlayerStore } from "../store/playerStore";
import type { 
  MultiplayerBridge, 
  MultiplayerDiscoveredPayload, 
  MultiplayerHostExitPayload,
  DiscoveredHost,
} from "../types/multiplayer";

const COLORS = {
  bg: '#1E1E1E',
  surface: '#0F2A2A',
  neonGreen: '#39FF14',
  cyan: '#4AD2D2',
  shadow: '#000000',
  spectator: '#A855F7',   // purple accent for spectator
  spectatorDim: '#2D1B4E',
};

// ── Role-selection modal shown after a lobby is chosen ───────────────────────
interface RoleModalProps {
  lobbyId: string;
  hostName?: string;
  onSelect: (role: "player" | "spectator") => void;
  onCancel: () => void;
}

const RoleModal = ({ lobbyId, hostName, onSelect, onCancel }: RoleModalProps) => (
  <Box sx={{
    position: 'fixed', inset: 0, zIndex: 999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.82)',
  }}>
    <Box sx={{
      background: COLORS.surface,
      border: `2px solid ${COLORS.cyan}`,
      boxShadow: `8px 8px 0 ${COLORS.shadow}`,
      padding: '32px 36px',
      maxWidth: '420px',
      width: '90%',
      fontFamily: "'Press Start 2P', monospace",
    }}>
      {/* Header */}
      <Typography sx={{ color: COLORS.neonGreen, fontSize: '1.1rem', mb: 1 }}>
        JOIN LOBBY
      </Typography>
      <Typography sx={{ color: COLORS.cyan, fontSize: '0.7rem', mb: 3, opacity: 0.8 }}>
        #{lobbyId}{hostName ? ` · ${hostName}` : ''}
      </Typography>

      <Typography sx={{ color: '#E5E5E5', fontSize: '0.75rem', mb: 3, lineHeight: 2 }}>
        How do you want to join?
      </Typography>

      {/* Player option */}
      <Box
        onClick={() => onSelect("player")}
        sx={{
          border: `2px solid ${COLORS.neonGreen}`,
          background: 'rgba(57,255,20,0.07)',
          padding: '16px 20px',
          mb: 2,
          cursor: 'pointer',
          transition: '0.1s',
          '&:hover': {
            background: 'rgba(57,255,20,0.18)',
            boxShadow: `4px 4px 0 ${COLORS.neonGreen}`,
            transform: 'translate(-2px,-2px)',
          },
        }}
      >
        <Typography sx={{ color: COLORS.neonGreen, fontSize: '1rem', mb: 0.5 }}>
          ▶ PLAYER
        </Typography>
        <Typography sx={{ color: '#DADADA', fontSize: '0.6rem', lineHeight: 1.8 }}>
          Join as an active player.{'\n'}Answer questions and compete.
        </Typography>
      </Box>

      {/* Spectator option */}
      <Box
        onClick={() => onSelect("spectator")}
        sx={{
          border: `2px solid ${COLORS.spectator}`,
          background: `rgba(168,85,247,0.07)`,
          padding: '16px 20px',
          mb: 3,
          cursor: 'pointer',
          transition: '0.1s',
          '&:hover': {
            background: `rgba(168,85,247,0.18)`,
            boxShadow: `4px 4px 0 ${COLORS.spectator}`,
            transform: 'translate(-2px,-2px)',
          },
        }}
      >
        <Typography sx={{ color: COLORS.spectator, fontSize: '1rem', mb: 0.5 }}>
          👁 SPECTATOR
        </Typography>
        <Typography sx={{ color: '#DADADA', fontSize: '0.6rem', lineHeight: 1.8 }}>
          Watch the game in read-only mode.{'\n'}Cannot answer or affect gameplay.
        </Typography>
      </Box>

      {/* Cancel */}
      <button
        onClick={onCancel}
        style={{
          background: 'transparent',
          color: COLORS.cyan,
          border: `1px solid ${COLORS.cyan}`,
          padding: '8px 20px',
          fontFamily: 'inherit',
          fontSize: '0.65rem',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        CANCEL
      </button>
    </Box>
  </Box>
);

// ── Main discovery component ──────────────────────────────────────────────────
const MultiplayerDiscovery = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const autoJoinLan = useGameStore((s) => s.gameConfig.autoJoinLan);
  
  const { 
    setLobbyId, setLobbyRole, setHostAddress, setCurrentPlayerId,
    addOrUpdatePlayer, addOrUpdateDiscoveredHost, discoveredHosts,
    removeDiscoveredHost, pruneStaleDiscoveredHosts,
    // ── NEW ──────────────────────────────────────────────────────────────
    setParticipantRole, addOrUpdateSpectator,
    // ─────────────────────────────────────────────────────────────────────
  } = useMultiplayerStore();

  const player = usePlayerStore((s) => s.getPlayer());
  const multiplayerPlayer = getMultiplayerPlayer(player);
  const multiplayerBridge = (window as any).multiplayer as MultiplayerBridge;

  const [hostIdInput, setHostIdInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [directIp, setDirectIp] = useState<string>("");
  const [pendingDirectIp, setPendingDirectIp] = useState<string | null>(null);

  // ── NEW: role-selection modal state ──────────────────────────────────────
  const [pendingLobby, setPendingLobby] = useState<{ lobbyId: string; hostAddress: string; hostName?: string } | null>(null);

  const normalizeIp = (value: string) => value.trim().toLowerCase();

  const isSameAddress = (a?: string, b?: string): boolean => {
    if (!a || !b) return false;
    const alias = (ip: string) => (ip === "localhost" ? "127.0.0.1" : ip);
    return alias(normalizeIp(a)) === alias(normalizeIp(b));
  };

  const handleDirectJoin = () => {
    const targetIp = normalizeIp(directIp);
    if (!targetIp) return;
    setPendingDirectIp(targetIp);
    setStatus(`SCANNING ${targetIp}...`);
    multiplayerBridge?.directJoin?.(targetIp);
  };

  // ── UPDATED: shows role modal instead of immediately joining ─────────────
  const beginJoin = (selectedLobbyId: string, discoveredHostAddress: string, role: "player" | "spectator") => {
    if (!discoveredHostAddress) {
      setStatus("LOBBY NOT FOUND ON LAN.");
      return;
    }

    // Store participant role so the lobby screen knows what this client is
    setParticipantRole(role);

    // Update global state
    setLobbyId(selectedLobbyId);
    setLobbyRole("client");
    setHostAddress(discoveredHostAddress);
    setCurrentPlayerId(multiplayerPlayer.id);

    if (role === "spectator") {
      // Add self to spectators list instead of players list
      addOrUpdateSpectator({
        ...multiplayerPlayer,
        isReady: false,
        isHost: false,
        connectionState: "connected",
        status: "lobby",
        role: "spectator",
      });
    } else {
      addOrUpdatePlayer(multiplayerPlayer, { isHost: false, isReady: false });
    }

    // Send join request — pass role so host/bridge can record it
    multiplayerBridge?.requestJoin({
      lobbyId: selectedLobbyId,
      hostAddress: discoveredHostAddress,
      player: { ...multiplayerPlayer, isReady: false, isHost: false, role },
    });

    setStatus("JOINING LOBBY...");
    setScreen("multiplayer-lobby");
  };

  // Clicking a lobby now opens the role modal rather than instantly joining
  const handleJoinLobby = (selectedLobbyId: string) => {
    const discovered = discoveredHosts.find((host) => host.lobbyId === selectedLobbyId);
    if (!discovered?.hostAddress) {
      setStatus("LOBBY NOT FOUND ON LAN.");
      return;
    }
    setPendingLobby({
      lobbyId: selectedLobbyId,
      hostAddress: discovered.hostAddress,
      hostName: discovered.hostName,
    });
  };

  const handleRoleSelected = (role: "player" | "spectator") => {
    if (!pendingLobby) return;
    setPendingLobby(null);
    beginJoin(pendingLobby.lobbyId, pendingLobby.hostAddress, role);
  };

  const handleRoleCancel = () => {
    setPendingLobby(null);
    setStatus("");
  };

  // 1. AUTO-JOIN LOGIC — auto-join always as player
  useEffect(() => {
    if (autoJoinLan && discoveredHosts.length > 0) {
      const autoTarget = discoveredHosts.find(h => !h.isPrivate && !h.isGameActive);
      if (autoTarget) {
        setStatus("AUTO-JOINING LAN HOST...");
        beginJoin(autoTarget.lobbyId, autoTarget.hostAddress ?? "", "player");
      }
    }
  }, [discoveredHosts, autoJoinLan]);

  // 2. DISCOVERY LIFECYCLE
  useEffect(() => {
    if (!multiplayerBridge) return;

    const onHostFoundCb = (payload: MultiplayerDiscoveredPayload) => {
      if (payload.isPrivate) {
        removeDiscoveredHost(payload.lobbyId);
        return;
      }
      const discoveredEntry: Partial<DiscoveredHost> = {
        lobbyId: payload.lobbyId,
        hostId: payload.hostId,
        hostName: payload.hostName,
        hostLevel: payload.hostLevel,
        hostAddress: payload.hostAddress,
        playerCount: payload.playerCount,
        maxPlayers: payload.maxPlayers,
        isPrivate: payload.isPrivate,
        category: payload.category,
        difficulty: payload.difficulty,
        sessionId: payload.sessionId,
        sequence: payload.sequence,
      };
      addOrUpdateDiscoveredHost(discoveredEntry);

      if (pendingDirectIp && payload.hostAddress && isSameAddress(payload.hostAddress, pendingDirectIp)) {
        setPendingDirectIp(null);
        setStatus(`HOST FOUND AT ${pendingDirectIp}. JOINING...`);
        // Direct IP join → show role modal
        setPendingLobby({
          lobbyId: payload.lobbyId,
          hostAddress: payload.hostAddress,
          hostName: payload.hostName,
        });
      }
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
  }, [multiplayerBridge, pendingDirectIp]);

  // 3. STALE HOST PRUNING
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
      fontFamily: "'Press Start 2P', monospace", overflow: "hidden"
    },
    container: {
      width: "100%", maxWidth: "1024px",
      height: "100%", maxHeight: "768px",
      display: "flex", flexDirection: "column", p: 4, gap: 3
    },
    lobbyCard: {
      position: 'relative', borderRadius: 0,
      bgcolor: COLORS.surface, p: 2, mb: 3,
      border: `2px solid ${COLORS.cyan}`,
      boxShadow: `8px 8px 0px ${COLORS.shadow}`,
      cursor: 'pointer', transition: '0.1s',
      '&:hover': {
        transform: 'translate(-2px, -2px)',
        boxShadow: `10px 10px 0px ${COLORS.neonGreen}`,
        borderColor: COLORS.neonGreen
      },
      '&:before': {
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

        {/* Direct Join Section */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', bgcolor: COLORS.surface, p: 2, border: `1px solid ${COLORS.cyan}` }}>
          <Typography sx={{ color: COLORS.cyan, fontSize: '1rem', whiteSpace: 'nowrap' }}>DIRECT IP:</Typography>
          <input 
            type="text" 
            value={directIp}
            onChange={(e) => setDirectIp(e.target.value)}
            placeholder="192.168.1.10"
            style={{ 
              background: 'black', color: COLORS.neonGreen, border: `1px solid ${COLORS.cyan}`, 
              padding: '8px', flex: 1, fontFamily: 'inherit', outline: 'none' 
            }}
          />
          <button 
            onClick={handleDirectJoin}
            style={{ 
              background: COLORS.neonGreen, color: 'black', border: 'none', 
              padding: '8px 20px', fontFamily: 'inherit', cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            CONNECT
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

      {/* Role-selection modal — rendered on top of everything */}
      {pendingLobby && (
        <RoleModal
          lobbyId={pendingLobby.lobbyId}
          hostName={pendingLobby.hostName}
          onSelect={handleRoleSelected}
          onCancel={handleRoleCancel}
        />
      )}
    </Box>
  );
};

export default MultiplayerDiscovery;
