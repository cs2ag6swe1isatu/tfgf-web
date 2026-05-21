import { useState, useEffect, useCallback, useRef } from "react";
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

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#1E1E1E",
  surface: "#0F2A2A",
  neonGreen: "#39FF14",
  cyan: "#4AD2D2",
  shadow: "#000000",
  spectator: "#A855F7",
  spectatorDim: "#2D1B4E",
  warning: "#FFB800",
  warningDim: "#2E2100",
  danger: "#FF4444",
  dangerDim: "#2E0A0A",
};

/** Minimum number of non-host players required before spectators may join. */
const SPECTATOR_MIN_PLAYERS = 1;

// ─────────────────────────────────────────────────────────────────────────────
// DISCONNECT NOTIFICATION TYPES & COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface DisconnectToast {
  id: string;
  playerName: string;
  reason?: "left" | "disconnected" | "kicked";
  timestamp: number;
}

/** Shape used internally for toasts — resolved from the store after receiving a plain id. */
interface ResolvedDisconnectInfo {
  playerId: string;
  playerName: string;
  reason?: "left" | "disconnected" | "kicked";
}

const TOAST_DURATION_MS = 5000;
const TOAST_ENTER_MS = 300;
const TOAST_EXIT_MS = 400;

interface DisconnectNotificationsProps {
  toasts: (DisconnectToast & { exiting?: boolean })[];
  onDismiss: (id: string) => void;
}

const reasonLabel: Record<NonNullable<DisconnectToast["reason"]>, string> = {
  left: "left the game.",
  disconnected: "disconnected.",
  kicked: "was removed from the game.",
};

const DisconnectNotifications = ({
  toasts,
  onDismiss,
}: DisconnectNotificationsProps) => {
  if (toasts.length === 0) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        alignItems: "center",
        pointerEvents: "none",
        minWidth: 340,
        maxWidth: 560,
      }}
    >
      {toasts.map((toast) => (
        <Box
          key={toast.id}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: COLORS.dangerDim,
            border: `2px solid ${COLORS.danger}`,
            boxShadow: `6px 6px 0 ${COLORS.shadow}, 0 0 18px rgba(255,68,68,0.35)`,
            px: 2.5,
            py: 1.5,
            width: "100%",
            fontFamily: "'Press Start 2P', monospace",
            pointerEvents: "all",
            opacity: toast.exiting ? 0 : 1,
            transform: toast.exiting ? "translateY(12px)" : "translateY(0)",
            transition: `opacity ${TOAST_EXIT_MS}ms ease, transform ${TOAST_EXIT_MS}ms ease`,
            animation: !toast.exiting
              ? `toastSlideIn ${TOAST_ENTER_MS}ms ease forwards`
              : undefined,
            "@keyframes toastSlideIn": {
              from: { opacity: 0, transform: "translateY(16px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          {/* Icon */}
          <Typography
            sx={{ color: COLORS.danger, fontSize: "1.2rem", flexShrink: 0 }}
          >
            ✕
          </Typography>

          {/* Message */}
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{ color: COLORS.danger, fontSize: "0.65rem", lineHeight: 1.8 }}
            >
              <span style={{ color: "#FFFFFF" }}>{toast.playerName}</span>{" "}
              {reasonLabel[toast.reason ?? "left"]}
            </Typography>
            <Typography sx={{ color: "#888", fontSize: "0.5rem", mt: 0.25 }}>
              {new Date(toast.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </Typography>
          </Box>

          {/* Dismiss button */}
          <Box
            component="button"
            onClick={() => onDismiss(toast.id)}
            sx={{
              background: "transparent",
              color: COLORS.danger,
              border: `1px solid ${COLORS.danger}`,
              px: 1,
              py: 0.5,
              fontFamily: "inherit",
              fontSize: "0.5rem",
              cursor: "pointer",
              flexShrink: 0,
              "&:hover": { bgcolor: "rgba(255,68,68,0.15)" },
            }}
          >
            OK
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLE MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface RoleModalProps {
  lobbyId: string;
  hostName?: string;
  /** Total participants currently in the lobby (including host). */
  playerCount: number;
  onSelect: (role: "player" | "spectator") => void;
  onCancel: () => void;
}

const RoleModal = ({
  lobbyId,
  hostName,
  playerCount,
  onSelect,
  onCancel,
}: RoleModalProps) => {
  // Spectators may only join when there is at least one non-host player present.
  // playerCount from the discovery payload counts the host as 1, so we need > 1.
  const spectatorAllowed = playerCount > SPECTATOR_MIN_PLAYERS;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.82)",
      }}
    >
      <Box
        sx={{
          background: COLORS.surface,
          border: `2px solid ${COLORS.cyan}`,
          boxShadow: `8px 8px 0 ${COLORS.shadow}`,
          padding: "32px 36px",
          maxWidth: "420px",
          width: "90%",
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        {/* Header */}
        <Typography sx={{ color: COLORS.neonGreen, fontSize: "1.1rem", mb: 1 }}>
          JOIN LOBBY
        </Typography>
        <Typography
          sx={{ color: COLORS.cyan, fontSize: "0.7rem", mb: 3, opacity: 0.8 }}
        >
          #{lobbyId}
          {hostName ? ` · ${hostName}` : ""}
        </Typography>

        <Typography
          sx={{ color: "#E5E5E5", fontSize: "0.75rem", mb: 3, lineHeight: 2 }}
        >
          How do you want to join?
        </Typography>

        {/* ── Player option ── */}
        <Box
          onClick={() => onSelect("player")}
          sx={{
            border: `2px solid ${COLORS.neonGreen}`,
            background: "rgba(57,255,20,0.07)",
            padding: "16px 20px",
            mb: 2,
            cursor: "pointer",
            transition: "0.1s",
            "&:hover": {
              background: "rgba(57,255,20,0.18)",
              boxShadow: `4px 4px 0 ${COLORS.neonGreen}`,
              transform: "translate(-2px,-2px)",
            },
          }}
        >
          <Typography
            sx={{ color: COLORS.neonGreen, fontSize: "1rem", mb: 0.5 }}
          >
            ▶ PLAYER
          </Typography>
          <Typography
            sx={{ color: "#DADADA", fontSize: "0.6rem", lineHeight: 1.8 }}
          >
            Join as an active player.{"\n"}Answer questions and compete.
          </Typography>
        </Box>

        {/* ── Spectator option ── */}
        <Box
          onClick={() => {
            if (spectatorAllowed) onSelect("spectator");
          }}
          sx={{
            border: `2px solid ${
              spectatorAllowed ? COLORS.spectator : "#444"
            }`,
            background: spectatorAllowed
              ? "rgba(168,85,247,0.07)"
              : "rgba(40,40,40,0.5)",
            padding: "16px 20px",
            mb: spectatorAllowed ? 3 : 1,
            cursor: spectatorAllowed ? "pointer" : "not-allowed",
            opacity: spectatorAllowed ? 1 : 0.55,
            transition: "0.1s",
            ...(spectatorAllowed && {
              "&:hover": {
                background: "rgba(168,85,247,0.18)",
                boxShadow: `4px 4px 0 ${COLORS.spectator}`,
                transform: "translate(-2px,-2px)",
              },
            }),
          }}
        >
          <Typography
            sx={{
              color: spectatorAllowed ? COLORS.spectator : "#666",
              fontSize: "1rem",
              mb: 0.5,
            }}
          >
            👁 SPECTATOR
          </Typography>
          <Typography
            sx={{ color: "#DADADA", fontSize: "0.6rem", lineHeight: 1.8 }}
          >
            Watch the game in read-only mode.{"\n"}Cannot answer or affect
            gameplay.
          </Typography>
        </Box>

        {/* ── Spectator unavailable notice ── */}
        {!spectatorAllowed && (
          <Box
            sx={{
              border: `1px solid ${COLORS.warning}`,
              background: COLORS.warningDim,
              px: 2,
              py: 1.5,
              mb: 3,
            }}
          >
            <Typography
              sx={{
                color: COLORS.warning,
                fontSize: "0.55rem",
                lineHeight: 2,
              }}
            >
              ⚠ Spectator mode is unavailable until at least 2 players are
              inside the lobby.
            </Typography>
          </Box>
        )}

        {/* Cancel */}
        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            color: COLORS.cyan,
            border: `1px solid ${COLORS.cyan}`,
            padding: "8px 20px",
            fontFamily: "inherit",
            fontSize: "0.65rem",
            cursor: "pointer",
            width: "100%",
          }}
        >
          CANCEL
        </button>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const MultiplayerDiscovery = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const autoJoinLan = useGameStore((s) => s.gameConfig.autoJoinLan);

  const {
    setLobbyId,
    setLobbyRole,
    setHostAddress,
    setCurrentPlayerId,
    addOrUpdatePlayer,
    addOrUpdateDiscoveredHost,
    discoveredHosts,
    removeDiscoveredHost,
    pruneStaleDiscoveredHosts,
    setParticipantRole,
    addOrUpdateSpectator,
  } = useMultiplayerStore();

  const player = usePlayerStore((s) => s.getPlayer());
  const multiplayerPlayer = getMultiplayerPlayer(player);
  const multiplayerBridge = (window as any).multiplayer as MultiplayerBridge;

  const [hostIdInput, setHostIdInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [directIp, setDirectIp] = useState<string>("");
  const [pendingDirectIp, setPendingDirectIp] = useState<string | null>(null);
  const [pendingLobby, setPendingLobby] = useState<{
    lobbyId: string;
    hostAddress: string;
    hostName?: string;
    playerCount: number;
  } | null>(null);

  // ── Disconnect toast state ─────────────────────────────────────────────────
  const [toasts, setToasts] = useState<
    (DisconnectToast & { exiting?: boolean })[]
  >([]);
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const scheduleToastExit = useCallback((id: string) => {
    // Start exit animation then remove
    const exitTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimers.current.delete(id);
    }, TOAST_EXIT_MS);

    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );

    return exitTimer;
  }, []);

  const addDisconnectToast = useCallback(
    (info: ResolvedDisconnectInfo) => {
      const id = `${info.playerId}-${Date.now()}`;
      const newToast: DisconnectToast & { exiting?: boolean } = {
        id,
        playerName: info.playerName,
        reason: info.reason ?? "left",
        timestamp: Date.now(),
        exiting: false,
      };

      setToasts((prev) => [...prev.slice(-4), newToast]); // cap at 5 toasts

      // Auto-dismiss after duration
      const autoTimer = setTimeout(() => {
        const exitTimer = scheduleToastExit(id);
        toastTimers.current.set(id + "_exit", exitTimer);
      }, TOAST_DURATION_MS);
      toastTimers.current.set(id, autoTimer);
    },
    [scheduleToastExit]
  );

  const handleDismissToast = useCallback(
    (id: string) => {
      // Cancel auto-dismiss timer if pending
      const existing = toastTimers.current.get(id);
      if (existing) {
        clearTimeout(existing);
        toastTimers.current.delete(id);
      }
      scheduleToastExit(id);
    },
    [scheduleToastExit]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      toastTimers.current.forEach(clearTimeout);
    };
  }, []);

  // ── Disconnect bridge listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!multiplayerBridge) return;

    // Bridge emits a plain playerId string; resolve the display name from the store.
    const resolvePlayerName = (playerId: string): string => {
      const store = useMultiplayerStore.getState();
      const found =
        store.players?.find((p: any) => p.id === playerId) ??
        store.spectators?.find((p: any) => p.id === playerId);
      return found?.name ?? `Player ${playerId.slice(0, 6)}`;
    };

    const onPlayerDisconnected = (playerId: string) => {
      addDisconnectToast({
        playerId,
        playerName: resolvePlayerName(playerId),
        reason: "disconnected",
      });
    };

    const onPlayerLeft = (playerId: string) => {
      addDisconnectToast({
        playerId,
        playerName: resolvePlayerName(playerId),
        reason: "left",
      });
    };

    multiplayerBridge.onPlayerDisconnected?.("Discovery", onPlayerDisconnected);
    multiplayerBridge.onPlayerLeft?.("Discovery", onPlayerLeft);

    return () => {
      multiplayerBridge.offPlayerDisconnected?.("Discovery");
      multiplayerBridge.offPlayerLeft?.("Discovery");
    };
  }, [multiplayerBridge, addDisconnectToast]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const normalizeIp = (value: string) => value.trim().toLowerCase();

  const isSameAddress = (a?: string, b?: string): boolean => {
    if (!a || !b) return false;
    const alias = (ip: string) =>
      ip === "localhost" ? "127.0.0.1" : ip;
    return alias(normalizeIp(a)) === alias(normalizeIp(b));
  };

  const handleDirectJoin = () => {
    const targetIp = normalizeIp(directIp);
    if (!targetIp) return;
    setPendingDirectIp(targetIp);
    setStatus(`SCANNING ${targetIp}...`);
    multiplayerBridge?.directJoin?.(targetIp);
  };

  const beginJoin = (
    selectedLobbyId: string,
    discoveredHostAddress: string,
    role: "player" | "spectator"
  ) => {
    if (!discoveredHostAddress) {
      setStatus("LOBBY NOT FOUND ON LAN.");
      return;
    }

    setParticipantRole(role);
    setLobbyId(selectedLobbyId);
    setLobbyRole("client");
    setHostAddress(discoveredHostAddress);
    setCurrentPlayerId(multiplayerPlayer.id);

    if (role === "spectator") {
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

    multiplayerBridge?.requestJoin({
      lobbyId: selectedLobbyId,
      hostAddress: discoveredHostAddress,
      player: { ...multiplayerPlayer, isReady: false, isHost: false, role },
    });

    setStatus("JOINING LOBBY...");
    setScreen("multiplayer-lobby");
  };

  // Open role modal — passes live playerCount for spectator gating
  const handleJoinLobby = (selectedLobbyId: string) => {
    const discovered = discoveredHosts.find(
      (host) => host.lobbyId === selectedLobbyId
    );
    if (!discovered?.hostAddress) {
      setStatus("LOBBY NOT FOUND ON LAN.");
      return;
    }
    setPendingLobby({
      lobbyId: selectedLobbyId,
      hostAddress: discovered.hostAddress,
      hostName: discovered.hostName,
      playerCount: discovered.playerCount ?? 1,
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

  // ── Auto-join (always as player) ──────────────────────────────────────────
  useEffect(() => {
    if (autoJoinLan && discoveredHosts.length > 0) {
      const autoTarget = discoveredHosts.find(
        (h) => !h.isPrivate && !h.isGameActive
      );
      if (autoTarget) {
        setStatus("AUTO-JOINING LAN HOST...");
        beginJoin(autoTarget.lobbyId, autoTarget.hostAddress ?? "", "player");
      }
    }
  }, [discoveredHosts, autoJoinLan]);

  // ── Discovery lifecycle ───────────────────────────────────────────────────
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

      if (
        pendingDirectIp &&
        payload.hostAddress &&
        isSameAddress(payload.hostAddress, pendingDirectIp)
      ) {
        setPendingDirectIp(null);
        setStatus(`HOST FOUND AT ${pendingDirectIp}. JOINING...`);
        setPendingLobby({
          lobbyId: payload.lobbyId,
          hostAddress: payload.hostAddress,
          hostName: payload.hostName,
          playerCount: payload.playerCount ?? 1,
        });
      }
    };

    const onHostExitCb = (payload: MultiplayerHostExitPayload) => {
      removeDiscoveredHost(payload.lobbyId);
    };

    multiplayerBridge.startDiscovery();
    multiplayerBridge.onHostFound("Discovery", onHostFoundCb);
    multiplayerBridge.onHostExit?.("Discovery", onHostExitCb);

    const intervalId = window.setInterval(
      () => multiplayerBridge.discoveryRequest?.(),
      3000
    );

    return () => {
      multiplayerBridge.offHostFound?.("Discovery");
      multiplayerBridge.offHostExit?.("Discovery");
      multiplayerBridge.stopDiscovery();
      window.clearInterval(intervalId);
    };
  }, [multiplayerBridge, pendingDirectIp]);

  // ── Stale host pruning ────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => pruneStaleDiscoveredHosts(4500), 1500);
    return () => clearInterval(id);
  }, [pruneStaleDiscoveredHosts]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const styles = {
    root: {
      width: "100%",
      height: "100%",
      bgcolor: COLORS.bg,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "'Press Start 2P', monospace",
      overflow: "hidden",
    },
    container: {
      width: "100%",
      maxWidth: "1024px",
      height: "100%",
      maxHeight: "768px",
      display: "flex",
      flexDirection: "column",
      p: 4,
      gap: 3,
    },
    lobbyCard: {
      position: "relative",
      borderRadius: 0,
      bgcolor: COLORS.surface,
      p: 2,
      mb: 3,
      border: `2px solid ${COLORS.cyan}`,
      boxShadow: `8px 8px 0px ${COLORS.shadow}`,
      cursor: "pointer",
      transition: "0.1s",
      "&:hover": {
        transform: "translate(-2px, -2px)",
        boxShadow: `10px 10px 0px ${COLORS.neonGreen}`,
        borderColor: COLORS.neonGreen,
      },
      "&:before": {
        content: '""',
        position: "absolute",
        top: "-14px",
        left: "-2px",
        width: "120px",
        height: "14px",
        bgcolor: COLORS.surface,
        border: `2px solid ${COLORS.cyan}`,
        borderBottom: "none",
      },
    },
  } as const;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={styles.root}>
      <Box sx={styles.container}>
        {/* Top Bar */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography sx={{ color: COLORS.neonGreen, fontSize: "2rem" }}>
            {autoJoinLan ? "AUTO-DISCOVERY ACTIVE" : "MANUAL DISCOVERY"}
          </Typography>
          <button
            style={{
              background: COLORS.surface,
              color: COLORS.cyan,
              border: `2px solid ${COLORS.cyan}`,
              padding: "8px 24px",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
            onClick={() => setScreen("multiplayer-menu")}
          >
            BACK
          </button>
        </Box>

        {/* Direct Join */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            bgcolor: COLORS.surface,
            p: 2,
            border: `1px solid ${COLORS.cyan}`,
          }}
        >
          <Typography
            sx={{
              color: COLORS.cyan,
              fontSize: "1rem",
              whiteSpace: "nowrap",
            }}
          >
            DIRECT IP:
          </Typography>
          <input
            type="text"
            value={directIp}
            onChange={(e) => setDirectIp(e.target.value)}
            placeholder="192.168.1.10"
            style={{
              background: "black",
              color: COLORS.neonGreen,
              border: `1px solid ${COLORS.cyan}`,
              padding: "8px",
              flex: 1,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={handleDirectJoin}
            style={{
              background: COLORS.neonGreen,
              color: "black",
              border: "none",
              padding: "8px 20px",
              fontFamily: "inherit",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            CONNECT
          </button>
        </Box>

        {status && (
          <Typography sx={{ color: COLORS.neonGreen, textAlign: "center" }}>
            {status}
          </Typography>
        )}

        {/* Lobbies List */}
        <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
          {discoveredHosts.length === 0 ? (
            <Typography
              sx={{
                color: COLORS.cyan,
                opacity: 0.5,
                textAlign: "center",
                mt: 10,
              }}
            >
              SCANNING LOCAL NETWORK...
            </Typography>
          ) : (
            discoveredHosts.map((lobby) => (
              <Paper
                key={lobby.lobbyId}
                sx={styles.lobbyCard}
                onClick={() => handleJoinLobby(lobby.lobbyId)}
              >
                <Box
                  sx={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography
                      sx={{ color: COLORS.neonGreen, fontSize: "1.5rem" }}
                    >
                      {lobby.hostName || "UNKNOWN HOST"}
                    </Typography>
                    <Typography sx={{ color: COLORS.cyan }}>
                      ID: #{lobby.lobbyId} | {lobby.category || "ANY"} |{" "}
                      {lobby.difficulty || "ANY"}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{ color: COLORS.cyan, alignSelf: "center" }}
                  >
                    {lobby.playerCount}/{lobby.maxPlayers} USERS
                  </Typography>
                </Box>
              </Paper>
            ))
          )}
        </Box>
      </Box>

      {/* Role-selection modal */}
      {pendingLobby && (
        <RoleModal
          lobbyId={pendingLobby.lobbyId}
          hostName={pendingLobby.hostName}
          playerCount={pendingLobby.playerCount}
          onSelect={handleRoleSelected}
          onCancel={handleRoleCancel}
        />
      )}

      {/* Disconnect notifications — rendered above everything */}
      <DisconnectNotifications
        toasts={toasts}
        onDismiss={handleDismissToast}
      />
    </Box>
  );
};

export default MultiplayerDiscovery;
