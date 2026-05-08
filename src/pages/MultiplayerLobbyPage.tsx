import { useMemo, useEffect, useCallback, useRef } from "react";
import { Typography, Box, Button } from "@mui/material";
import { Phase, useGameStore, usePlayerStore, useTriviaStore } from "../store";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { PlayerList } from "../components/multiplayer/PlayerList";
import { Globe, Lock } from "pixelarticons/react";

import type { MultiplayerBridge, MultiplayerDiscoveredPayload, MultiplayerLobbySnapshot, LobbyMember, MultiplayerGameState } from "../types/multiplayer";
import { defaultGameConfig } from "../config/gameConfig";

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
  const setGameConfig = useGameStore((s) => s.setGameConfig);

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
    return lobbyId ?? `${defaultGameConfig.lobbyIdPrefix}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }, [lobbyId]);

  const hasHandledHostExitRef = useRef(false);
  const hasConfirmedJoinRef = useRef(false);
  const isTransitioningToGameRef = useRef(false);

  // we can maybe move these handlers to the store later for readability
  const handleHostExit = useCallback(() => {
    console.log('[renderer] handling host exit for lobby', lobbyId);
    if (hasHandledHostExitRef.current) return;
    hasHandledHostExitRef.current = true;
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

  // sync if Game started / client joined mid-game
  const handleGameStateSync = useCallback(
    async (payload: MultiplayerGameState) => {
      const syncablePhases: Phase[] = ['readying', 'asking', 'answering', 'scoring', 'ranking'];
      if (!syncablePhases.includes(payload.phase)) return;
      if (lobbyRole !== 'client') return;
      if (isTransitioningToGameRef.current) return;
      isTransitioningToGameRef.current = true;

      const currentConfig = useGameStore.getState().gameConfig;

      const category = payload.category ?? currentConfig.category ?? "General Knowledge";
      const difficulty = payload.difficulty ?? currentConfig.difficulty ?? "easy";
      const questionLimit = payload.questionLimit ?? currentConfig.questionLimit ?? defaultGameConfig.questionLimit;
      const questionTimer = payload.questionTimer ?? currentConfig.questionTimer ?? defaultGameConfig.questionTimer;
      const answerTimer = payload.answerTimer ?? currentConfig.answerTimer ?? defaultGameConfig.answerTimer;

      setGameConfig({
        category,
        difficulty,
        questionLimit,
        questionTimer,
        answerTimer,
        seed: payload.seed,
      });

       await startGame({

        category: category,
        difficulty: difficulty,
        questionLimit: questionLimit,
        mode: "multiplayer",
        questionTimer: questionTimer,
        answerTimer: answerTimer,
        seed: payload.seed,
        recentSessionLimitSolo: 0, 
        recentSessionLimitMultiplayer: 0,
      });

      const nextState = {
        phase: payload.phase,
        timer: payload.timer,
        currentIndex: payload.currentIndex,
        ...(payload.seed !== undefined ? { seed: payload.seed } : {}),
        ...(payload.category !== undefined ? { category: payload.category } : {}),
        ...(payload.difficulty !== undefined ? { difficulty: payload.difficulty } : {}),
        ...(payload.questionLimit !== undefined ? { questionLimit: payload.questionLimit } : {}),
        ...(payload.questionTimer !== undefined ? { questionTimer: payload.questionTimer } : {}),
        ...(payload.answerTimer !== undefined ? { answerTimer: payload.answerTimer } : {}),
        ...(payload.playerScores !== undefined ? { playerScores: payload.playerScores } : {}),
        ...(payload.rankings !== undefined ? { rankings: payload.rankings } : {}),
      };

      useTriviaStore.setState(nextState);

      // multiplayerBridge?.offGameStateSync?.(handleGameStateSync);
      setScreen("question");
    },
    [lobbyRole, setGameConfig, setScreen, startGame, multiplayerBridge]
  );

  const handleStartGame = async () => {
    resetGame();

    const gameSessionSeed = Math.floor(Math.random() * defaultGameConfig.seedRange);
    useGameStore.getState().setGameConfig({ seed: gameSessionSeed });
    const sessionQuestionLimit = gameConfig.questionLimit ?? defaultGameConfig.questionLimit;
    const sessionQuestionTimer = gameConfig.questionTimer ?? defaultGameConfig.questionTimer;
    const sessionAnswerTimer = gameConfig.answerTimer ?? defaultGameConfig.answerTimer;

    await startGame({
      category: gameConfig.category ?? "General Knowledge",
      difficulty: gameConfig.difficulty ?? "easy",
      questionLimit: sessionQuestionLimit,
      mode: "multiplayer",
      questionTimer: sessionQuestionTimer,
      answerTimer: sessionAnswerTimer,
      seed: gameSessionSeed,
      recentSessionLimitSolo: 0, 
      recentSessionLimitMultiplayer: 0,
    });

    const state = useTriviaStore.getState();
    multiplayerBridge?.broadcastGameState({
      phase: state.phase,
      timer: state.timer,
      currentIndex: state.currentIndex,
      seed: gameSessionSeed,
      category: gameConfig.category ?? undefined,
      difficulty: gameConfig.difficulty ?? undefined,
      questionLimit: state.questionLimit,
      questionTimer: state.questionTimer,
      answerTimer: state.answerTimer,
      playerScores: state.playerScores,
      rankings: state.rankings,
    });

    setScreen("question");
  };

  const handleKick = (playerId: string) => {
    if (lobbyRole !== "host" || !lobbyId) return;
    console.log('[renderer] kicking player', playerId);
    removePlayer(playerId);
    const updatedPlayers = players.filter((p) => p.id !== playerId);
    window.multiplayer?.updateLobbySnapshot?.({
      lobbyId: lobbyId,
      hostId: player.id,
      hostName: player.name,
      hostLevel: player.level,
      playerCount: updatedPlayers.length || 1,
      maxPlayers: defaultGameConfig.maxPlayers,
      category: gameConfig.category ?? undefined,
      difficulty: gameConfig.difficulty ?? undefined,
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
      multiplayerBridge?.stopBroadcast();  
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
    const newestTimestampRef = { current: 0 };

    const sendLeaveOnUnload = () => {
      const state = useMultiplayerStore.getState();
      if (state.lobbyId && state.hostAddress && player.id) {
        multiplayerBridge?.leaveLobby({ lobbyId: state.lobbyId, hostAddress: state.hostAddress, playerId: player.id });
      }
    };

    const onBeforeUnload = () => {
      sendLeaveOnUnload();
    };

    multiplayerBridge.startDiscovery();

    const onHostFoundCb = (payload: MultiplayerDiscoveredPayload) => {
      const currentLobbyId = useMultiplayerStore.getState().lobbyId;
      if (currentLobbyId && payload.lobbyId !== currentLobbyId) return;
      if (isTransitioningToGameRef.current) return;

      // --- Out of Order Packet Protection ---
      const packetTime = payload.lastSeen;
      if (packetTime < newestTimestampRef.current) {
        console.log('[renderer] Dropped delayed out-of-order packet.');
        return;
      }
      newestTimestampRef.current = packetTime;
      // --------------------------------------
      const amIStillInLobby = payload.players.some((p) => p.id === player.id);
      
      if(amIStillInLobby){
        if(!hasConfirmedJoinRef.current){
          hasConfirmedJoinRef.current = true;
          console.log('[renderer] confirming join for lobby', payload.lobbyId);
        }
        syncLobbySnapshot(payload, payload.hostAddress);

        const currentConfig = useGameStore.getState().gameConfig;
        const nextCategory = payload.category ?? undefined;
        const nextDifficulty = payload.difficulty ?? undefined;
        if (currentConfig.category !== nextCategory || currentConfig.difficulty !== nextDifficulty) {
          setGameConfig({ category: nextCategory, difficulty: nextDifficulty });
        }
        return;
      }
      
      if(hasConfirmedJoinRef.current){
        console.warn('[renderer] host found but I am not in the player list, treating as host exit for lobby', payload.lobbyId);
        handleHostExit();
      } else {
        console.log('[renderer] Ignoring host found because I have not confirmed join yet, lobbyId:', payload.lobbyId);
      }
    };

    const onHostExitCb = (payload : { lobbyId: string }) => {
      const currentLobbyId = useMultiplayerStore.getState().lobbyId;
      console.log('[renderer] onHostExitCb', payload, { lobbyId });
      // Only handle host-exit for the lobby we're currently in.
      if (currentLobbyId && payload.lobbyId === currentLobbyId) {
        handleHostExit();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    multiplayerBridge.onHostFound("Lobby", onHostFoundCb);
    multiplayerBridge.onHostExit("Lobby", onHostExitCb);
    multiplayerBridge.onGameStateSync("Lobby", handleGameStateSync);

    const heartbeatInterval = window.setInterval(() => {
      const state = useMultiplayerStore.getState();
      if (state.lobbyId && player.id && multiplayerBridge.sendHeartbeat && state.hostAddress) {
        multiplayerBridge.sendHeartbeat({
          lobbyId: state.lobbyId,
          hostAddress: state.hostAddress,
          playerId: player.id,
        });
      }
    }, 3000);

    return () => {
      window.clearInterval(heartbeatInterval);
      multiplayerBridge.offHostFound?.("Lobby");
      multiplayerBridge.offHostExit?.("Lobby");
      multiplayerBridge.stopDiscovery();
      multiplayerBridge.offGameStateSync?.("Lobby");
      window.removeEventListener('beforeunload', onBeforeUnload);
      // sendLeaveOnUnload(); // dont unload yet
    };
  }, [
    lobbyRole,
    multiplayerBridge,
    syncLobbySnapshot,
    handleHostExit,
    handleGameStateSync,
    player.id,
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
    multiplayerBridge.onPlayerJoined("Lobby", handlePlayerJoined);

    const handlePlayerReadyChanged = (playerId: string, ready: boolean) => {
      console.log('[renderer] onPlayerReadyChanged', playerId, ready);
      setPlayerReady(playerId, ready);
    };
    multiplayerBridge.onPlayerReadyChanged("Lobby", handlePlayerReadyChanged);

    const handlePlayerLeft = (playerId: string) => {
      console.log('[renderer] onPlayerLeft', playerId);
      removePlayer(playerId);
    };
    multiplayerBridge.onPlayerLeft("Lobby", handlePlayerLeft);


    const payload: MultiplayerLobbySnapshot = {
      lobbyId,
      hostId: player.id,
      hostName: player.name,
      hostLevel: player.level,
      playerCount: players.length || 1,
      maxPlayers: defaultGameConfig.maxPlayers,
      category: gameConfig.category ?? undefined,
      difficulty: gameConfig.difficulty ?? undefined,
      isPrivate,
      lastActive: new Date().toISOString(),
      players,
    };

    multiplayerBridge.startBroadcast(payload);

    // clean up listeners on unmount
    return () => {
      multiplayerBridge.offPlayerJoined?.("Lobby");
      multiplayerBridge.offPlayerReadyChanged?.("Lobby");
      multiplayerBridge.offPlayerLeft?.("Lobby");
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
      maxPlayers: defaultGameConfig.maxPlayers,
      category: gameConfig.category ?? undefined,
      difficulty: gameConfig.difficulty ?? undefined,
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
              <Button variant="outlined" disabled sx={{ flex: 1 }}>
                {gameConfig.category || "Select Category"}
              </Button>
              <Button
                variant="contained"
                disabled={!currentPlayer}
                onClick={() => currentPlayer && handleReadyToggle(currentPlayer.id, !isReady)}
                sx={{ flex: 1 }}
              >
                {currentPlayer?.isReady ? "Not Ready" : "Ready"}
              </Button>
              <Button variant="outlined" disabled sx={{ flex: 1 }}>
                {gameConfig.difficulty || "Select Difficulty"}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MultiplayerLobby;
