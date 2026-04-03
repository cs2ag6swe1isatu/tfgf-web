import { useMemo, useEffect, useCallback, useRef } from "react";
import { Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { usePlayerStore } from "../store/playerStore";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { useTriviaStore } from "../store/triviaStore";
import { PlayerList } from "../components/multiplayer/PlayerList";
import { Globe, Lock } from "pixelarticons/react";

import type { MultiplayerBridge, MultiplayerDiscoveredPayload, MultiplayerLobbySnapshot, LobbyMember } from "../types/multiplayer";

/**
 * Todo: make heartbeats dynamic; lower interval for lower player count; higher for higher player count;
 */
const MultiplayerLobby = () => {
  /**
   * --- shared game state / navigation ---
   */
  const setScreen = useGameStore((s) => s.setScreen);
  const setModalScreen = useGameStore((s) => s.setModalScreen);
  const gameConfig = useGameStore((s) => s.gameConfig);

  /**
   * --- multiplayer store state ---
   */
  const lobbyRole = useMultiplayerStore((s) => s.lobbyRole);
  const lobbyId = useMultiplayerStore((s) => s.lobbyId);
  const players = useMultiplayerStore((s) => s.players);
  const hostAddress = useMultiplayerStore((s) => s.hostAddress);
  const isPrivate = useMultiplayerStore((s) => s.isPrivate);
  const setPrivate = useMultiplayerStore((s) => s.setPrivate);
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
  const hasConfirmedJoinRef = useRef(false);
  const HOST_DISCONNECT_TIMEOUT_MS = 6000;
  const HOST_CHECK_INTERVAL_MS = 1000;

  const handleHostExit = useCallback(() => {
    console.log('[renderer] handling host exit for lobby', lobbyId);
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

  const handleKick = (playerId: string) => {
    if (lobbyRole !== "host" || !lobbyId) return;
    console.log('[renderer] kicking player', playerId);
    removePlayer(playerId);
    const updatedPlayers = players.filter((p) => p.id !== playerId);
    window.multiplayer?.updateLobbySnapshot({
      lobbyId: lobbyId,
      hostId: player.id,
      hostName: player.name,
      hostLevel: player.level,
      playerCount: updatedPlayers.length || 1,
      maxPlayers: 4,
      category: gameConfig.category,
      difficulty: gameConfig.difficulty,
      isPrivate,
      lastActive: new Date().toISOString(),
      players: updatedPlayers,
    });
  };


  const handleLeaveLobby = () => {
    if (lobbyRole === "client" && lobbyId && hostAddress) {
      multiplayerBridge?.leaveLobby({ lobbyId, hostAddress, playerId: player.id});
    }
    else if(lobbyRole === "host") {
      multiplayerBridge.stopBroadcast();  
    }
    resetMultiplayer();
    setScreen("multiplayer-menu");
  };

  /**
   * Client path: detect host disconnect, maintain heartbeat, and keep lobby data synced.
   */
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

    const sendLeaveOnUnload = () => {
      if (lobbyId && hostAddress && player.id) {
        multiplayerBridge.leaveLobby({ lobbyId, hostAddress, playerId: player.id });
      }
    };

    const onBeforeUnload = () => {
      sendLeaveOnUnload();
    };

    hostDisconnectIntervalRef.current = window.setInterval(checkHostHeartbeat, HOST_CHECK_INTERVAL_MS);

    multiplayerBridge.startDiscovery();

    const onHostFoundCb = (payload: MultiplayerDiscoveredPayload) => {
      if (lobbyId && payload.lobbyId !== lobbyId) return;
      lastHostSeenRef.current = Date.now();
      const amIStillInLobby = payload.players.some((p) => p.id === player.id);
      if(amIStillInLobby){
        if(!hasConfirmedJoinRef.current){
          hasConfirmedJoinRef.current = true;
          console.log('[renderer] confirming join for lobby', payload.lobbyId);
        }
        syncLobbySnapshot(payload, payload.hostAddress);
      } else {
        if(hasConfirmedJoinRef.current){
          console.warn('[renderer] host found but I am not in the player list, treating as host exit for lobby', payload.lobbyId);
          handleHostExit();
        } else {
          console.log('[renderer] Ignoring host found because I have not confirmed join yet, lobbyId:', payload.lobbyId);
        }
      }
    };

    const onHostExitCb = (payload : { lobbyId: string }) => {
      console.log('[renderer] onHostExitCb', payload, { lobbyId });
      // Only handle host-exit for the lobby we're currently in.
      if (lobbyId && payload.lobbyId === lobbyId) {
        handleHostExit();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    multiplayerBridge.onHostFound(onHostFoundCb);
    multiplayerBridge.onHostExit(onHostExitCb);

    const heartbeatInterval = window.setInterval(() => {
      if (lobbyId && player.id && multiplayerBridge.sendHeartbeat) {
        multiplayerBridge.sendHeartbeat({
          lobbyId,
          hostAddress: hostAddress || "",
          playerId: player.id,
        });
      }
    }, 3000);

    return () => {
      if (hostDisconnectIntervalRef.current) {
        window.clearInterval(hostDisconnectIntervalRef.current);
        hostDisconnectIntervalRef.current = null;
      }
      window.clearInterval(heartbeatInterval);
      multiplayerBridge.offHostFound?.(onHostFoundCb);
      multiplayerBridge.offHostExit?.(onHostExitCb);
      multiplayerBridge.stopDiscovery();
      window.removeEventListener('beforeunload', onBeforeUnload);
      sendLeaveOnUnload();
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

  /**
   * Host path: accept join/ready/leave events from clients + broadcast current lobby snapshot.
   */
  useEffect(() => {
    if (lobbyRole !== "host" || !lobbyId || !multiplayerBridge) return;

    const handlePlayerJoined = (p: LobbyMember) => {
      console.log('[renderer] onPlayerJoined', p?.id);
      addOrUpdatePlayer(p, { isHost: false, isReady: false });
    };
    multiplayerBridge.onPlayerJoined(handlePlayerJoined);

    const handlePlayerReadyChanged = (playerId: string, ready: boolean) => {
      console.log('[renderer] onPlayerReadyChanged', playerId, ready);
      setPlayerReady(playerId, ready);
    };
    multiplayerBridge.onPlayerReadyChanged(handlePlayerReadyChanged);

    const handlePlayerLeft = (playerId: string) => {
      console.log('[renderer] onPlayerLeft', playerId);
      removePlayer(playerId);
    };
    multiplayerBridge.onPlayerLeft(handlePlayerLeft);


    const payload: MultiplayerLobbySnapshot = {
      lobbyId,
      hostId: player.id,
      hostName: player.name,
      hostLevel: player.level,
      playerCount: players.length || 1,
      maxPlayers: 4,
      category: gameConfig.category,
      difficulty: gameConfig.difficulty,
      isPrivate,
      lastActive: new Date().toISOString(),
      players,
    };

    multiplayerBridge.startBroadcast(payload);

    // clean up listeners on unmount
    return () => {
      multiplayerBridge.offPlayerJoined?.(handlePlayerJoined);
      multiplayerBridge.offPlayerReadyChanged?.(handlePlayerReadyChanged);
      multiplayerBridge.offPlayerLeft?.(handlePlayerLeft);
    };
  }, [lobbyRole, lobbyId, multiplayerBridge, player.id, player.name, player.level, addOrUpdatePlayer, setPlayerReady, removePlayer]);

  // Send incremental snapshot updates when players or gameConfig changes
  useEffect(() => {
    if (lobbyRole !== "host" || !lobbyId || !multiplayerBridge) return;

    const payload: MultiplayerLobbySnapshot = {
      lobbyId,
      hostId: player.id,
      hostName: player.name,
      hostLevel: player.level,
      playerCount: players.length || 1,
      maxPlayers: 4,
      category: gameConfig.category,
      difficulty: gameConfig.difficulty,
      isPrivate,
      lastActive: new Date().toISOString(),
      players,
    };

    if (typeof multiplayerBridge.updateLobbySnapshot === "function") {
      multiplayerBridge.updateLobbySnapshot(payload);
    }
  }, [players, gameConfig, lobbyId, lobbyRole, multiplayerBridge, player.id, player.name, player.level, isPrivate]);

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

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "left", mt: 1 }}>
            {lobbyRole === "host" && (
              <Button
                sx={{ gap: 1 }}
                variant={isPrivate ? "contained" : "outlined"}
                color={isPrivate ? "warning" : "secondary"}
                onClick={() => setPrivate(!isPrivate)}
              >
                {isPrivate ? <Lock width={16} height={16} /> : <Globe width={16} height={16} />}
                {isPrivate ? "Private" : "Public"}
              </Button>
            )}

          </Box>
          <Typography variant="h6">Lobby: {currentLobbyId}</Typography>
          <Button onClick={handleLeaveLobby}>Back</Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Players
          </Typography>
          <PlayerList players={allPlayers} isHost={lobbyRole === "host"} onReadyToggle={handleReadyToggle} onKick={handleKick} />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, maxWidth: "600px", mx: "auto" }}>
          {lobbyRole === "host" ? (
            <>
              <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
                <Button variant="outlined" onClick={() => setModalScreen("category")} sx={{ flex: 1 }}>
                  {gameConfig.category || "Select Category"}
                </Button>
                <Button variant="contained" onClick={handleStartGame} disabled={!canStart} sx={{ flex: 1 }}>
                  Start Game
                </Button>
                <Button variant="outlined" onClick={() => setModalScreen("difficulty")} sx={{ flex: 1 }}>
                  {gameConfig.difficulty || "Select Difficulty"}
                </Button>
              </Box>
            </>
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
