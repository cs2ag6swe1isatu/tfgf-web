import { useMemo, useEffect, useCallback, useRef } from "react";
import { Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { usePlayerStore } from "../store/playerStore";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { useTriviaStore } from "../store/triviaStore";
import { PlayerList } from "../components/multiplayer/PlayerList";
import type { MultiplayerBridge, MultiplayerDiscoveredPayload, MultiplayerLobbySnapshot } from "../types/multiplayer";

const MultiplayerLobby = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const gameConfig = useGameStore((s) => s.gameConfig);

  const lobbyRole = useMultiplayerStore((s) => s.lobbyRole);
  const lobbyId = useMultiplayerStore((s) => s.lobbyId);
  const players = useMultiplayerStore((s) => s.players);
  const hostAddress = useMultiplayerStore((s) => s.hostAddress);
  const addOrUpdatePlayer = useMultiplayerStore((s) => s.addOrUpdatePlayer);
  const removePlayer = useMultiplayerStore((s) => s.removePlayer);
  const setLobbyRole = useMultiplayerStore((s) => s.setLobbyRole);
  const setPlayerReady = useMultiplayerStore((s) => s.setPlayerReady);
  const setCurrentPlayerId = useMultiplayerStore((s) => s.setCurrentPlayerId);
  const setLobbyId = useMultiplayerStore((s) => s.setLobbyId);
  const syncLobbySnapshot = useMultiplayerStore((s) => s.syncLobbySnapshot);
  const resetMultiplayer = useMultiplayerStore((s) => s.resetMultiplayer);

  const player = usePlayerStore((s) => s.getPlayer());
  const multiplayerBridge = (window as unknown as { multiplayer?: MultiplayerBridge }).multiplayer;
  const currentPlayer = useMultiplayerStore((s) => s.currentPlayer());
  const isReady = currentPlayer?.isReady ?? false;

  const startGame = useTriviaStore((s) => s.startGame);
  const resetGame = useTriviaStore((s) => s.resetGame);

  const currentLobbyId = useMemo(() => {
    return lobbyId ?? `LOBBY-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }, [lobbyId]);

  const lastHostSeenRef = useRef(Date.now());
  const hostDisconnectIntervalRef = useRef<number | null>(null);
  const hasHandledHostExitRef = useRef(false);
  const HOST_DISCONNECT_TIMEOUT_MS = 9000;
  const HOST_CHECK_INTERVAL_MS = 2000;

  const handleHostExit = useCallback(() => {
    if (hasHandledHostExitRef.current) return;
    hasHandledHostExitRef.current = true;
    if (hostDisconnectIntervalRef.current) {
      window.clearInterval(hostDisconnectIntervalRef.current);
      hostDisconnectIntervalRef.current = null;
    }
    multiplayerBridge?.stopDiscovery();
    resetMultiplayer();
    setScreen("multiplayer-menu");
  }, [multiplayerBridge, resetMultiplayer, setScreen]);

  const handleCreateLobby = () => {
    setLobbyId(currentLobbyId);
    setLobbyRole("host");
    addOrUpdatePlayer(player, { isHost: true, isReady: true });
    setCurrentPlayerId(player.id);
  };

  const handleStartGame = async () => {
    resetGame();
    await startGame({
      category: gameConfig.category ?? "General Knowledge",
      difficulty: gameConfig.difficulty ?? "easy",
      questionLimit: 15,
      mode: "multiplayer",
      questionTimer: gameConfig.questionTimer ?? 5,
      answerTimer: gameConfig.answerTimer ?? 10,
    });
    setScreen("question");
  };

  const handleLeaveLobby = () => {
    if (lobbyRole === "client" && lobbyId && hostAddress) {
      multiplayerBridge?.leaveLobby({
        lobbyId,
        hostAddress,
        playerId: player.id,
      });
    }

    multiplayerBridge?.stopBroadcast();
    resetMultiplayer();
    setScreen("multiplayer-menu");
  };

  useEffect(() => {
    if (!multiplayerBridge || lobbyRole !== "client") return;

    hasHandledHostExitRef.current = false;
    lastHostSeenRef.current = Date.now();

    const checkHostHeartbeat = () => {
      if (!lobbyId) return;
      if (Date.now() - lastHostSeenRef.current > HOST_DISCONNECT_TIMEOUT_MS) {
        handleHostExit();
      }
    };

    hostDisconnectIntervalRef.current = window.setInterval(checkHostHeartbeat, HOST_CHECK_INTERVAL_MS);

    multiplayerBridge.startDiscovery();

    const onHostFoundCb = (payload: MultiplayerDiscoveredPayload) => {
      if (lobbyId && payload.lobbyId !== lobbyId) return;
      lastHostSeenRef.current = Date.now();
      syncLobbySnapshot(payload, payload.hostAddress);
    };

    const onHostExitCb = (payload: { lobbyId: string }) => {
      if (payload.lobbyId !== lobbyId) return;
      handleHostExit();
    };

    multiplayerBridge.onHostFound(onHostFoundCb);
    multiplayerBridge.onHostExit(onHostExitCb);

    return () => {
      if (hostDisconnectIntervalRef.current) {
        window.clearInterval(hostDisconnectIntervalRef.current);
        hostDisconnectIntervalRef.current = null;
      }
      multiplayerBridge.offHostFound?.(onHostFoundCb);
      multiplayerBridge.offHostExit?.(onHostExitCb);
      multiplayerBridge.stopDiscovery();
    };
  }, [
    lobbyId,
    lobbyRole,
    multiplayerBridge,
    syncLobbySnapshot,
    handleHostExit,
    HOST_CHECK_INTERVAL_MS,
    HOST_DISCONNECT_TIMEOUT_MS,
  ]);

  useEffect(() => {
    if (lobbyRole !== "host" || !lobbyId || !multiplayerBridge) return;

    // Set up listeners for player events (host only)
    const handlePlayerJoined = (p: any) => {
      console.log('[renderer] onPlayerJoined', p?.id);
      addOrUpdatePlayer(p, { isHost: false, isReady: false });
    };
    multiplayerBridge.onPlayerJoined(handlePlayerJoined as any);

    const handlePlayerReadyChanged = (playerId: string, ready: boolean) => {
      console.log('[renderer] onPlayerReadyChanged', playerId, ready);
      setPlayerReady(playerId, ready);
    };
    multiplayerBridge.onPlayerReadyChanged(handlePlayerReadyChanged as any);

    const handlePlayerLeft = (playerId: string) => {
      console.log('[renderer] onPlayerLeft', playerId);
      removePlayer(playerId);
    };
    multiplayerBridge.onPlayerLeft(handlePlayerLeft as any);


    const payload: MultiplayerLobbySnapshot = {
      lobbyId,
      hostId: player.id,
      hostName: player.name,
      hostLevel: player.level,
      playerCount: players.length || 1,
      maxPlayers: 4,
      category: gameConfig.category,
      difficulty: gameConfig.difficulty,
      lastActive: new Date().toISOString(),
      players,
    };

    multiplayerBridge.startBroadcast(payload);

    return () => {
      multiplayerBridge.offPlayerJoined?.(handlePlayerJoined as any);
      multiplayerBridge.offPlayerReadyChanged?.(handlePlayerReadyChanged as any);
      multiplayerBridge.offPlayerLeft?.(handlePlayerLeft as any);
      multiplayerBridge.stopBroadcast();
    };
  }, [lobbyRole, lobbyId, players, gameConfig, multiplayerBridge, player.id, player.name, player.level, addOrUpdatePlayer, setPlayerReady, removePlayer]);

  const handleReadyToggle = (playerId: string, ready: boolean) => {
    const targetPlayer = players.find((p) => p.id === playerId);
    if (!targetPlayer || targetPlayer.isHost) return;

    setPlayerReady(playerId, ready);

    if (lobbyRole === "client" && hostAddress && multiplayerBridge && lobbyId) {
      multiplayerBridge.setReady({
        lobbyId,
        hostAddress,
        playerId,
        ready,
      });
    } else if (lobbyRole === "client" && multiplayerBridge && hostAddress && !lobbyId) {
      console.warn("Can't set ready: missing lobbyId");
    }
  };

  const allPlayers = players;
  const isCategorySelected = Boolean(gameConfig.category);
  const isDifficultySelected = Boolean(gameConfig.difficulty);
  const canStart = isCategorySelected && isDifficultySelected && allPlayers.length > 1 && allPlayers.every((p) => p.isReady);

  useEffect(() => {
    if (lobbyRole === "host" && players.length === 0) {
      handleCreateLobby();
      return;
    }

    if (lobbyRole === "client" && players.length === 0) {
      addOrUpdatePlayer(player, { isHost: false, isReady: false });
      setCurrentPlayerId(player.id);
    }
  }, [lobbyRole, players.length, player]);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "40px",
        boxSizing: "border-box",
        color: "primary.main",
        overflow: "hidden",
      }}
    >
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6">Lobby: {currentLobbyId}</Typography>
          <Button onClick={handleLeaveLobby}>Back</Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Players
          </Typography>
          <PlayerList players={allPlayers} isHost={lobbyRole === "host"} onReadyToggle={handleReadyToggle} />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, maxWidth: "600px", mx: "auto" }}>
          {lobbyRole === "host" ? (
            <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
              <Button variant="outlined" onClick={() => setScreen("category")} sx={{ flex: 1 }}>
                {gameConfig.category || "Select Category"}
              </Button>
              <Button variant="contained" onClick={handleStartGame} disabled={!canStart} sx={{ flex: 1 }}>
                Start Game
              </Button>
              <Button variant="outlined" onClick={() => setScreen("difficulty")} sx={{ flex: 1 }}>
                {gameConfig.difficulty || "Select Difficulty"}
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
              <Button
                variant="contained"
                disabled={!currentPlayer}
                onClick={() => currentPlayer && handleReadyToggle(currentPlayer.id, !isReady)}
                sx={{ flex: 1 }}
              >
                {currentPlayer?.isReady ? "Not Ready" : "Ready"}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MultiplayerLobby;
