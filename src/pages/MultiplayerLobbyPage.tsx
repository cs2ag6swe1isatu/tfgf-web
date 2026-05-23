import { useMemo, useEffect, useCallback, useRef, useState } from "react";
import { Box, GlobalStyles, keyframes } from "@mui/material";
import { Phase, useGameStore, useTriviaStore } from "../store";
import { getMultiplayerPlayer, usePlayerStore } from "../store/playerStore";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { Globe, Lock } from "pixelarticons/react";
import { getAvatarSrc } from "../utils/avatar";
import RankIcon, { RANK_ICON_KEYFRAMES, RANK_COLORS, getRankSymbolType } from "../components/ui/RankIcon";
import { useSoundContext } from "../context/SoundContext";
import { getCategoryDisplay } from "../utils/categoryShorthand";

import type {
  MultiplayerBridge,
  MultiplayerDiscoveredPayload,
  MultiplayerLobbySnapshot,
  LobbyMember,
  MultiplayerGameState,
} from "../types/multiplayer";
import { defaultGameConfig } from "../config/gameConfig";

const SPECTATOR_COLOR = "#A855F7";
const SPECTATOR_DIM   = "rgba(168,85,247,0.10)";

// ── Notification overlay animation ───────────────────────────────────────────
const overlayFadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const NOTIFICATION_DURATION_MS = 4000;

// ── Overlay colors per type ─────────────────────────────────────────────────
const OVERLAY_THEME: Record<string, { border: string; bg: string; text: string }> = {
  kick:       { border: "#E33232", bg: "rgba(227,50,50,0.12)", text: "#E33232" },
  "host-exit": { border: "#E33232", bg: "rgba(227,50,50,0.12)", text: "#E33232" },
  disconnect: { border: "#E3A020", bg: "rgba(227,160,32,0.12)", text: "#E3A020" },
};

const MultiplayerLobby = () => {
  const { playSound } = useSoundContext();
  const setScreen = useGameStore((s) => s.setScreen);
  const setModalScreen = useGameStore((s) => s.setModalScreen);
  const gameConfig = useGameStore((s) => s.gameConfig);
  const setGameConfig = useGameStore((s) => s.setGameConfig);

  const lobbyRole = useMultiplayerStore((s) => s.lobbyRole);
  const lobbyId = useMultiplayerStore((s) => s.lobbyId);
  const players = useMultiplayerStore((s) => s.players);
  const spectators = useMultiplayerStore((s) => s.spectators);
  const participantRole = useMultiplayerStore((s) => s.participantRole);
  const isSpectator = participantRole === "spectator";
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
  const multiplayerPlayer = useMemo(() => getMultiplayerPlayer(player), [player]);
  const multiplayerBridge = (window as unknown as { multiplayer?: MultiplayerBridge }).multiplayer;
  const machineIp = multiplayerBridge?.getLocalIp?.() ?? hostAddress ?? "127.0.0.1";
  const currentPlayer = useMultiplayerStore((s) => s.currentPlayer());
  const isReady = currentPlayer?.isReady ?? false;
  const isCurrentPlayerDisconnected = currentPlayer?.connectionState === "disconnected";

  const resetGameConfig = useGameStore((s) => s.resetGameConfig);
  const startGame = useTriviaStore((s) => s.startGame);
  const resetGame = useTriviaStore((s) => s.resetGame);

  const currentLobbyId = useMemo(() => {
    return lobbyId ?? `${defaultGameConfig.lobbyIdPrefix}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }, [lobbyId]);

  const hasHandledHostExitRef = useRef(false);
  const hasConfirmedJoinRef = useRef(false);
  const isTransitioningToGameRef = useRef(false);
  const joinTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const gameStartAbortRef = useRef<AbortController | null>(null);

  // ── Notification overlay state ─────────────────────────────────────────────
  const [notification, setNotification] = useState<{
    message: string;
    type: "kick" | "host-exit" | "disconnect";
  } | null>(null);

  const leaveToMenu = useCallback(() => {
    resetMultiplayer();
    resetGameConfig();
    setScreen("multiplayer-menu");
  }, [resetMultiplayer, resetGameConfig, setScreen]);

  /** Called when this player is kicked by the host. */
  const handleKicked = useCallback((_lobbyId: string, kickedPlayerId: string) => {
    if (kickedPlayerId !== multiplayerPlayer.id) return;
    multiplayerBridge?.stopDiscovery();
    setNotification({ message: "YOU HAVE BEEN KICKED FROM THE LOBBY", type: "kick" });
    setTimeout(() => leaveToMenu(), NOTIFICATION_DURATION_MS);
  }, [multiplayerPlayer.id, multiplayerBridge, leaveToMenu]);

  const handleHostExit = useCallback(() => {
    if (hasHandledHostExitRef.current) return;
    hasHandledHostExitRef.current = true;
    multiplayerBridge?.stopDiscovery();
    setNotification({ message: "HOST DISCONNECTED — RETURNING TO MENU", type: "host-exit" });
    setTimeout(() => leaveToMenu(), NOTIFICATION_DURATION_MS);
  }, [multiplayerBridge, leaveToMenu]);

  const handleCreateLobby = () => {
    setLobbyId(currentLobbyId);
    setLobbyRole("host");
    // Explicitly set status to "lobby" to override stale "results"/"playing" from a previous game
    addOrUpdatePlayer(multiplayerPlayer, { isHost: true, isReady: true, connectionState: "connected", status: "lobby" });
    setCurrentPlayerId(multiplayerPlayer.id);
  };

  const handleGameStateSync = useCallback(
    async (payload: MultiplayerGameState) => {
      const syncablePhases: Phase[] = ["readying", "asking", "answering", "scoring", "ranking"];
      if (!syncablePhases.includes(payload.phase)) return;
      if (lobbyRole !== "client") return;
      if (isTransitioningToGameRef.current) return;
      
      if (payload.phase === "ranking") {
      const role = useMultiplayerStore.getState().participantRole;
      if (role === "spectator") {
        if (payload.rankings) {
          useTriviaStore.setState({
            rankings: payload.rankings.map((r) => ({ ...r, xp: r.xp ?? 0 })),
          });
        }
        setScreen("multiplayer-results");
        return;
      }
    }

      console.log(`[Lobby Client] Received game-state, phase=${payload.phase}, starting game transition`);
      isTransitioningToGameRef.current = true;
      const transitionStartTime = Date.now();

      const currentConfig = useGameStore.getState().gameConfig;
      const category = payload.category ?? currentConfig.category ?? "General Knowledge";
      const difficulty = payload.difficulty ?? currentConfig.difficulty ?? "easy";
      const questionLimit = payload.questionLimit ?? currentConfig.questionLimit ?? defaultGameConfig.questionLimit;
      const questionTimer = payload.questionTimer ?? currentConfig.questionTimer ?? defaultGameConfig.questionTimer;
      const answerTimer = payload.answerTimer ?? currentConfig.answerTimer ?? defaultGameConfig.answerTimer;
      const questionPort = payload.questionPort;

      setGameConfig({ category, difficulty, questionLimit, questionTimer, answerTimer, seed: payload.seed });

      const gameStartTime = Date.now();
      await startGame({
        category,
        difficulty,
        questionLimit,
        mode: "multiplayer",
        questionTimer,
        answerTimer,
        seed: payload.seed,
        questionPort,
        recentSessionLimitSolo: 0,
        recentSessionLimitMultiplayer: 0,
        autoJoinLan: false
      });
      const gameElapsedMs = Date.now() - gameStartTime;
      console.log(`[Lobby Client] startGame completed in ${gameElapsedMs}ms`);

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
  ...(payload.playerAnswers !== undefined ? { playerAnswers: payload.playerAnswers } : {}),
  ...(payload.rankings !== undefined ? {
    rankings: payload.rankings.map((r) => ({
      ...r,
      xp: r.xp ?? 0,   // PlayerRanking.xp is number (required), payload has xp?: number
    })),
  } : {}),
};

useTriviaStore.setState(nextState);
      const totalElapsedMs = Date.now() - transitionStartTime;
      console.log(`[Lobby Client] Game transition complete, navigating to question page (${totalElapsedMs}ms total)`);
      setScreen(useMultiplayerStore.getState().participantRole === "spectator" ? "spectator-view" : "question");
    },
    [lobbyRole, setGameConfig, setScreen, startGame, multiplayerBridge]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      console.log(`[Lobby] Component unmounting, cancelling any in-progress game start`);
      isMountedRef.current = false;
      if (gameStartAbortRef.current) {
        gameStartAbortRef.current.abort();
      }
      multiplayerBridge?.stopBroadcast?.({ suppressHostExit: isTransitioningToGameRef.current });
    };
  }, []);

  const handleStartGame = async () => {
    // ── SPECTATOR GUARD: spectators cannot start the game ─────────────────
    if (isSpectator) return;
    if (lobbyRole !== "host") {
      console.error(`[Lobby] handleStartGame called by non-host (role=${lobbyRole}), aborting`);
      return;
    }

    if (!isMountedRef.current) return;
    if (!lobbyId) return;

    resetGame();
    const gameSessionSeed = Math.floor(Math.random() * defaultGameConfig.seedRange);
    useGameStore.getState().setGameConfig({ seed: gameSessionSeed });
    const sessionQuestionLimit = gameConfig.questionLimit ?? defaultGameConfig.questionLimit;
    const sessionQuestionTimer = gameConfig.questionTimer ?? defaultGameConfig.questionTimer;
    const sessionAnswerTimer = gameConfig.answerTimer ?? defaultGameConfig.answerTimer;

    console.log(`[Lobby] Host starting game, seed=${gameSessionSeed}`);

    let httpPort: number | undefined = undefined;
    const httpStartTime = Date.now();
    
    const httpServerReady = new Promise<number>((resolve) => {
      let timeoutHandle: NodeJS.Timeout | null = null;
      
      const safeResolve = (port: number) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        resolve(port);
      };
      
      if (multiplayerBridge?.onHttpServerStarted) {
        multiplayerBridge.onHttpServerStarted("StartGame", (port) => {
          const httpElapsedMs = Date.now() - httpStartTime;
          console.log(`[Lobby] HTTP server callback fired with port ${port} (${httpElapsedMs}ms)`);
          safeResolve(port);
          multiplayerBridge.offHttpServerStarted?.("StartGame");
        });
        
        timeoutHandle = setTimeout(() => {
          console.warn(`[Lobby] HTTP server startup timeout after 10 seconds, proceeding with port=undefined`);
          safeResolve(0);
          multiplayerBridge.offHttpServerStarted?.("StartGame");
        }, 10000);
      } else {
        resolve(0);
      }
    });

    const gameStartTime = Date.now();
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
      autoJoinLan: false
    });
    const gameElapsedMs = Date.now() - gameStartTime;
    console.log(`[Lobby] startGame completed in ${gameElapsedMs}ms, waiting for HTTP server...`);

    if (!isMountedRef.current || !lobbyId) return;

    httpPort = await httpServerReady;
    const totalWaitMs = Date.now() - httpStartTime;
    console.log(`[Lobby] HTTP server ready check complete, port=${httpPort} (${totalWaitMs}ms total)`);

    if (!isMountedRef.current || !lobbyId) return;

    const mpState = useMultiplayerStore.getState();
    mpState.players.forEach(p => {
      if (!p.isHost) {
        mpState.setPlayerReady(p.id, false);
      }
      mpState.addOrUpdatePlayer(p, { status: "playing" } as any);
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
      questionPort: httpPort || undefined,
      playerScores: state.playerScores,
      playerAnswers: state.playerAnswers,
      rankings: state.rankings,
    });

    console.log(`[Lobby] Host game-start complete, navigating to question page`);
    isTransitioningToGameRef.current = true;
    setScreen(useMultiplayerStore.getState().participantRole === "spectator" ? "spectator-view" : "question");
  };

  const handleKick = (playerId: string) => {
    if (lobbyRole !== "host" || !lobbyId) return;
    removePlayer(playerId);
    // Notify the kicked player via the bridge
    multiplayerBridge?.kickPlayer?.({ lobbyId, playerId });
    const updatedPlayers = players.filter((p) => p.id !== playerId);
    window.multiplayer?.updateLobbySnapshot?.({
      lobbyId,
      hostId: multiplayerPlayer.id,
      hostName: multiplayerPlayer.name,
      hostLevel: multiplayerPlayer.level,
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
    // Spectators leave exactly like normal clients — no gameplay side effects
    if (lobbyRole === "client" && lobbyId && hostAddress) {
      multiplayerBridge?.leaveLobby({ lobbyId, hostAddress, playerId: multiplayerPlayer.id });
    } else if (lobbyRole === "host") {
      multiplayerBridge?.stopBroadcast();
    }
    resetMultiplayer();
    resetGameConfig();
    setScreen("multiplayer-menu");
  };

  useEffect(() => {
    if (!multiplayerBridge || lobbyRole !== "client") return;
    hasHandledHostExitRef.current = false;
    const newestTimestampRef = { current: 0 };

    const sendLeaveOnUnload = () => {
      const state = useMultiplayerStore.getState();
      if (state.lobbyId && state.hostAddress && multiplayerPlayer.id) {
        multiplayerBridge?.leaveLobby({ lobbyId: state.lobbyId, hostAddress: state.hostAddress, playerId: multiplayerPlayer.id });
      }
    };

    multiplayerBridge.startDiscovery();

    joinTimeoutRef.current = window.setTimeout(() => {
      if (!hasConfirmedJoinRef.current) {
        handleHostExit();
      }
    }, 8000);

    const onHostFoundCb = (payload: MultiplayerDiscoveredPayload) => {
      const currentLobbyId = useMultiplayerStore.getState().lobbyId;
      if (currentLobbyId && payload.lobbyId !== currentLobbyId) return;
      if (isTransitioningToGameRef.current) return;

      const packetTime = payload.lastSeen;
      if (packetTime < newestTimestampRef.current) return;
      newestTimestampRef.current = packetTime;

      // For spectators: check if this spectator's ID is in the broadcast
      // The host may include spectators in the snapshot with role="spectator"
      const myId = multiplayerPlayer.id;
      const amIInLobby = payload.players.some((p) => p.id === myId);

      if (amIInLobby) {
        if (!hasConfirmedJoinRef.current) {
          hasConfirmedJoinRef.current = true;
          if (joinTimeoutRef.current !== null) {
            clearTimeout(joinTimeoutRef.current);
            joinTimeoutRef.current = null;
          }
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
     if (hasConfirmedJoinRef.current && !isSpectator) handleHostExit();
    };

    const onHostExitCb = (payload: { lobbyId: string }) => {
      const currentLobbyId = useMultiplayerStore.getState().lobbyId;
      if (currentLobbyId && payload.lobbyId === currentLobbyId) handleHostExit();
    };

    window.addEventListener("beforeunload", sendLeaveOnUnload);
    multiplayerBridge.onHostFound("Lobby", onHostFoundCb);
    multiplayerBridge.onHostExit("Lobby", onHostExitCb);
    multiplayerBridge.onGameStateSync("Lobby", handleGameStateSync);
    multiplayerBridge.onPlayerKicked?.("Lobby", handleKicked);

    const heartbeatInterval = window.setInterval(() => {
      const state = useMultiplayerStore.getState();
      if (state.lobbyId && multiplayerPlayer.id && multiplayerBridge.sendHeartbeat && state.hostAddress) {
        multiplayerBridge.sendHeartbeat({ lobbyId: state.lobbyId, hostAddress: state.hostAddress, playerId: multiplayerPlayer.id });
      }
    }, 3000);

    return () => {
      window.clearInterval(heartbeatInterval);
      multiplayerBridge.offHostFound?.("Lobby");
      multiplayerBridge.offHostExit?.("Lobby");
      multiplayerBridge.stopDiscovery();
      multiplayerBridge.offGameStateSync?.("Lobby");
      multiplayerBridge.offPlayerKicked?.("Lobby");
      window.removeEventListener("beforeunload", sendLeaveOnUnload);
    };
  }, [lobbyRole, multiplayerBridge, syncLobbySnapshot, handleHostExit, handleGameStateSync, multiplayerPlayer.id, handleKicked]);

  useEffect(() => {
    if (lobbyRole !== "host" || !lobbyId || !multiplayerBridge) return;

    const handlePlayerJoined = (p: LobbyMember) => {
  if ((p.role ?? "player") === "spectator") {
    useMultiplayerStore.getState().addOrUpdateSpectator({
      ...p,
      isReady: false,
      isHost: false,
      connectionState: "connected",
      role: "spectator",
    });
  } else {
    addOrUpdatePlayer(p, { isHost: false, isReady: false, connectionState: "connected" });
  }
};
    const handlePlayerReadyChanged = (playerId: string, ready: boolean, member?: Partial<LobbyMember>) => {
      const existing = useMultiplayerStore.getState().players.find(p => p.id === playerId);
      if (existing) {
        addOrUpdatePlayer({ ...existing, ...member }, { isReady: ready, connectionState: "connected" });
      }
    };
    const handlePlayerStatusChanged = (playerId: string, connectionState: "connected" | "disconnected") =>
      useMultiplayerStore.getState().setPlayerConnectionState(playerId, connectionState);
    const handlePlayerLeft = (playerId: string) => {
      // Player might be a spectator — clean up from both lists
      removePlayer(playerId);
      const mpState = useMultiplayerStore.getState();
      if (mpState.spectators.some((s) => s.id === playerId)) {
        mpState.removeSpectator(playerId);
      }
    };

    multiplayerBridge.onPlayerJoined("Lobby", handlePlayerJoined);
    multiplayerBridge.onPlayerReadyChanged("Lobby", handlePlayerReadyChanged);
    multiplayerBridge.onPlayerLeft("Lobby", handlePlayerLeft);
    multiplayerBridge.onPlayerStatusChanged?.("Lobby", handlePlayerStatusChanged);

    return () => {
      multiplayerBridge.offPlayerJoined?.("Lobby");
      multiplayerBridge.offPlayerReadyChanged?.("Lobby");
      multiplayerBridge.offPlayerLeft?.("Lobby");
      multiplayerBridge.offPlayerStatusChanged?.("Lobby");
    };
  }, [lobbyRole, lobbyId, multiplayerBridge, addOrUpdatePlayer, setPlayerReady, removePlayer]);

  useEffect(() => {
    if (lobbyRole !== "host" || !lobbyId || !multiplayerBridge) return;

    const initialPayload: MultiplayerLobbySnapshot = {
      lobbyId,
      hostId: multiplayerPlayer.id,
      hostName: multiplayerPlayer.name,
      hostLevel: multiplayerPlayer.level,
      playerCount: 1,
      maxPlayers: defaultGameConfig.maxPlayers,
      category: undefined,
      difficulty: undefined,
      isPrivate: false,
      lastActive: new Date().toISOString(),
      players: [{ ...multiplayerPlayer, isHost: true, isReady: true, connectionState: "connected", role: "player" }],
    };

    multiplayerBridge.startBroadcast(initialPayload);

    return () => {
      multiplayerBridge.stopBroadcast?.({ suppressHostExit: isTransitioningToGameRef.current });
    };
  }, [lobbyRole, lobbyId, multiplayerBridge]);

  // ── UPDATED: include spectators in broadcast so clients see them ──────────
  useEffect(() => {
    if (lobbyRole !== "host" || !lobbyId || !multiplayerBridge) return;
    const connectedPlayerCount = players.filter((p) => p.connectionState !== "disconnected").length;
    const allMembers = [
      ...players,
      ...spectators.map((s) => ({ ...s, role: "spectator" as const })),
    ];
    const payload: MultiplayerLobbySnapshot = {
      lobbyId,
      hostId: multiplayerPlayer.id,
      hostName: multiplayerPlayer.name,
      hostLevel: multiplayerPlayer.level,
      playerCount: connectedPlayerCount || 1,
      maxPlayers: defaultGameConfig.maxPlayers,
      category: gameConfig.category ?? undefined,
      difficulty: gameConfig.difficulty ?? undefined,
      isPrivate,
      lastActive: new Date().toISOString(),
      players: allMembers,
    };
    if (typeof multiplayerBridge.updateLobbySnapshot === "function") {
      multiplayerBridge.updateLobbySnapshot(payload);
    }
  }, [players, spectators, gameConfig, lobbyId, lobbyRole, multiplayerBridge, multiplayerPlayer.id, multiplayerPlayer.name, multiplayerPlayer.level, isPrivate]);

  const handleReadyToggle = (playerId: string, ready: boolean) => {
    // ── SPECTATOR GUARD ────────────────────────────────────────────────────
    if (isSpectator) return;
    const targetPlayer = players.find((p) => p.id === playerId);
    if (!targetPlayer || targetPlayer.isHost) return;
    setPlayerReady(playerId, ready);
    if (lobbyRole === "client" && hostAddress && multiplayerBridge && lobbyId) {
      multiplayerBridge.setReady({ lobbyId, hostAddress, playerId, ready });
    }
  };

const allPlayers = players.filter((p) => p.role !== "spectator");
const connectedPlayers = allPlayers.filter((p) => p.connectionState !== "disconnected");
const disconnectedPlayers = allPlayers.filter((p) => p.connectionState === "disconnected");
const isCategorySelected = Boolean(gameConfig.category);
const isDifficultySelected = Boolean(gameConfig.difficulty);
const canStart = isCategorySelected && isDifficultySelected && connectedPlayers.length > 1 && connectedPlayers.every((p) => p.isReady);

  const isCompactViewport = window.innerWidth <= 820 || window.innerHeight <= 500;

  useEffect(() => {
    if (lobbyRole === "host" && players.length === 0) {
      handleCreateLobby();
      return;
    }
    if (lobbyRole === "client" && players.length === 0 && !isSpectator) {
      setCurrentPlayerId(multiplayerPlayer.id);
    }
  }, [lobbyRole, players.length, multiplayerPlayer, setCurrentPlayerId, handleCreateLobby]);

  // ─── Styles ───────────────────────────────────────────────────────────────
  const styles = {
    root: {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "row" as const,
      alignItems: "stretch",
      justifyContent: "center",
      boxSizing: "border-box" as const,
      padding: isCompactViewport ? "12px 10px" : "24px 16px",
      overflow: "hidden",
      gap: isCompactViewport ? "10px" : "16px",
      position: "relative" as const,
    },
    inner: {
      flex: 1,
      maxWidth: isCompactViewport ? "560px" : "640px",
      display: "flex",
      flexDirection: "column" as const,
      gap: isCompactViewport ? "10px" : "16px",
    },
    spectatorPanel: {
      width: isCompactViewport ? "180px" : "220px",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column" as const,
      gap: "0px",
      alignSelf: "flex-start",
      marginTop: "0px",
    },
    spectatorPanelBox: {
      border: `2px solid ${SPECTATOR_COLOR}`,
      borderRadius: "10px",
      padding: isCompactViewport ? "10px 8px" : "14px 12px",
      background: SPECTATOR_DIM,
      boxShadow: `0 0 14px rgba(168,85,247,0.18)`,
    },
    spectatorPanelHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "10px",
    },
    spectatorPanelTitle: {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "9px" : "11px",
      color: SPECTATOR_COLOR,
      letterSpacing: "1.5px",
    },
    spectatorPanelCount: {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "8px" : "10px",
      color: SPECTATOR_COLOR,
      opacity: 0.75,
    },
    spectatorRow: {
      display: "flex",
      alignItems: "center",
      gap: isCompactViewport ? "6px" : "8px",
      padding: isCompactViewport ? "5px 6px" : "7px 8px",
      borderRadius: "6px",
      background: "rgba(168,85,247,0.08)",
      border: `1px solid rgba(168,85,247,0.25)`,
      marginBottom: isCompactViewport ? "4px" : "6px",
    },
    spectatorAvatar: {
      width: isCompactViewport ? "24px" : "28px",
      height: isCompactViewport ? "24px" : "28px",
      borderRadius: "3px",
      background: "#BFC3C3",
      border: `1.5px solid ${SPECTATOR_COLOR}`,
      flexShrink: 0,
      overflow: "hidden",
    },
    spectatorName: {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "8px" : "9px",
      color: SPECTATOR_COLOR,
      letterSpacing: "0.5px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
      flex: 1,
    },
    spectatorStatus: {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "7px" : "8px",
      color: SPECTATOR_COLOR,
      opacity: 0.65,
      background: "rgba(168,85,247,0.12)",
      borderRadius: "3px",
      padding: "2px 4px",
      flexShrink: 0,
    },
    spectatorBanner: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      padding: isCompactViewport ? "6px 10px" : "8px 14px",
      borderRadius: "7px",
      border: `1.5px solid ${SPECTATOR_COLOR}`,
      background: SPECTATOR_DIM,
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "9px" : "11px",
      color: SPECTATOR_COLOR,
      letterSpacing: "1px",
    },
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
    },
    lobbyIdRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flex: 1,
    },
    ipRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap" as const,
      marginTop: "4px",
    },
    lobbyIdLabel: {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "14px" : "18px",
      color: "#E5E5E5",
      whiteSpace: "nowrap" as const,
      letterSpacing: "1px",
    },
    lobbyIdBox: {
      background: "#2C2C2C",
      border: "1.5px solid #10363A",
      borderRadius: "6px",
      padding: isCompactViewport ? "3px 8px" : "4px 12px",
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "14px" : "18px",
      color: "#35E52B",
      letterSpacing: "2px",
      minWidth: "120px",
      textAlign: "center" as const,
    },
    visibilityBtn: (isPrivateMode: boolean) => ({
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: isCompactViewport ? "4px 10px" : "5px 14px",
      borderRadius: "6px",
      border: `1.5px solid ${isPrivateMode ? "#E3A020" : "#00DFFF"}`,
      background: isPrivateMode ? "rgba(227,160,32,0.12)" : "#00DFFF",
      color: isPrivateMode ? "#E3A020" : "#010707",
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "13px" : "17px",
      cursor: "pointer",
      letterSpacing: "1px",
      whiteSpace: "nowrap" as const,
      transition: "all 0.15s",
    }),
    exitBtn: {
      padding: isCompactViewport ? "4px 10px" : "5px 16px",
      borderRadius: "6px",
      border: "1.5px solid #00DFFF",
      background: "#10363A",
      color: "#35E52B",
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "13px" : "17px",
      cursor: "pointer",
      letterSpacing: "1px",
      whiteSpace: "nowrap" as const,
      transition: "all 0.15s",
    },
    panel: {
      border: "2px solid #00E5FF",
      borderRadius: "10px",
      padding: isCompactViewport ? "10px" : "16px",
      background: "rgba(0,229,255,0.03)",
      boxShadow: "0 0 18px rgba(0,229,255,0.10)",
    },
    panelHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "12px",
    },
    panelTitle: {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "16px" : "22px",
      color: "#E5E5E5",
      letterSpacing: "2px",
    },
    panelCount: {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "13px" : "18px",
      color: "#DADADA",
      letterSpacing: "1px",
    },
    playerRow: (active: boolean, disconnected: boolean) => ({
      display: "flex",
      alignItems: "center",
      gap: isCompactViewport ? "8px" : "12px",
      padding: isCompactViewport ? "7px 8px" : "10px 12px",
      borderRadius: "7px",
      background: disconnected ? "rgba(106,115,115,0.35)" : active ? "#022f36" : "#6A7373",
      border: disconnected ? "1px solid rgba(227,50,50,0.55)" : "1px solid transparent",
      marginBottom: isCompactViewport ? "6px" : "8px",
      opacity: disconnected ? 0.72 : 1,
    }),
    avatar: {
      width: isCompactViewport ? "28px" : "36px",
      height: isCompactViewport ? "28px" : "36px",
      borderRadius: "4px",
      background: "#BFC3C3",
      border: "2px solid #2E2E2E",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "18px",
    },
    playerInfo: {
      flex: 1,
      minWidth: 0,
    },
    playerName: {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "13px" : "18px",
      color: "#D9E600",
      letterSpacing: "1px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
    },
    playerSub: {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: isCompactViewport ? "10px" : "13px",
      color: "#DADADA",
      letterSpacing: "0.5px",
    },
    hostBadge: {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: "13px",
      color: "#E5E5E5",
      background: "rgba(0,0,0,0.25)",
      borderRadius: "4px",
      padding: "1px 7px",
      letterSpacing: "1px",
      marginLeft: "4px",
      flexShrink: 0,
    },
    connectionBadge: {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: "13px",
      color: "#E33232",
      background: "rgba(227,50,50,0.12)",
      borderRadius: "4px",
      padding: "1px 7px",
      letterSpacing: "1px",
      flexShrink: 0,
    },
    statusDot: (status: "ready" | "notReady" | "disconnected" | "playing" | "results") => ({
      width: "14px",
      height: "14px",
      borderRadius: "50%",
      background: status === "ready" ? "#35E52B" : status === "disconnected" ? "#A15A5A" : status === "playing" ? "#00DFFF" : status === "results" ? "#D9E600" : "#E33232",
      boxShadow: status === "ready" ? "0 0 7px #35E52B" : status === "disconnected" ? "0 0 7px #A15A5A" : status === "playing" ? "0 0 7px #00DFFF" : status === "results" ? "0 0 7px #D9E600" : "0 0 7px #E33232",
      flexShrink: 0,
    }),
    kickBtn: {
      padding: "3px 10px",
      borderRadius: "5px",
      border: "1.5px solid #E33232",
      background: "rgba(227,50,50,0.10)",
      color: "#E33232",
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: "14px",
      cursor: "pointer",
      letterSpacing: "1px",
      flexShrink: 0,
      transition: "all 0.15s",
    },
    waitingText: {
      textAlign: "center" as const,
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: "16px",
      color: "#E5E5E5",
      letterSpacing: "1px",
      marginTop: "4px",
      opacity: 0.7,
    },
    bottomRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "12px",
    },
    sideBtn: {
      padding: "12px 0",
      borderRadius: "8px",
      border: "1.5px solid #00DFFF",
      background: "#10363A",
      color: "#35E52B",
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: "16px",
      cursor: "pointer",
      letterSpacing: "1px",
      textAlign: "center" as const,
      transition: "all 0.15s",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
    },
    sideBtnDisabled: {
      opacity: 0.5,
      cursor: "default",
    },
    primaryBtn: (disabled: boolean) => ({
      padding: "12px 0",
      borderRadius: "8px",
      border: "none",
      background: disabled ? "#1A4A20" : "#39E600",
      color: disabled ? "#4a7a4a" : "#EAEAEA",
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: "20px",
      cursor: disabled ? "default" : "pointer",
      letterSpacing: "2px",
      textAlign: "center" as const,
      boxShadow: disabled ? "none" : "0 0 18px rgba(57,230,0,0.45)",
      transition: "all 0.15s",
    }),
  };

  const allPlayersReady = connectedPlayers.length > 1 && connectedPlayers.every((p) => p.isReady);

  // ── Notification overlay ─────────────────────────────────────────────────
  const notificationTheme = notification ? OVERLAY_THEME[notification.type] : null;

  // ── Spectator panel (left side) — only shown when there are spectators
  //    OR when this client is a spectator (so they always see themselves) ──
  const showSpectatorPanel = spectators.length > 0 || isSpectator;

  return (
    <Box sx={styles.root}>
      <GlobalStyles styles={{ [RANK_ICON_KEYFRAMES]: {} }} />

      {/* ── Notification overlay ─────────────────────────────────────────── */}
      {notification && notificationTheme && (
        <Box sx={{
          position: "absolute",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.75)",
          animation: `${overlayFadeIn} 0.35s ease both`,
          pointerEvents: "none",
        }}>
          <Box sx={{
            padding: "20px 32px",
            border: `2px solid ${notificationTheme.border}`,
            background: notificationTheme.bg,
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "13px",
            color: notificationTheme.text,
            textShadow: `0 0 8px ${notificationTheme.text}55`,
            letterSpacing: "2px",
            lineHeight: 1.8,
            textAlign: "center" as const,
            boxShadow: `0 0 30px ${notificationTheme.text}33`,
          }}>
            {notification.message}
          </Box>
        </Box>
      )}

      {/* ── LEFT: Spectator panel ─────────────────────────────────────────── */}
      {showSpectatorPanel && (
        <Box sx={styles.spectatorPanel}>
          <Box sx={styles.spectatorPanelBox}>
            <Box sx={styles.spectatorPanelHeader}>
              <span style={styles.spectatorPanelTitle}>SPECTATORS</span>
              <span style={styles.spectatorPanelCount}>
                ({spectators.length}/{Math.max(spectators.length, 1)})
              </span>
            </Box>

            {spectators.length === 0 ? (
              <Box sx={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "9px",
                color: SPECTATOR_COLOR,
                opacity: 0.45,
                textAlign: "center",
                padding: "12px 0",
              }}>
                NO SPECTATORS
              </Box>
            ) : (
              spectators.map((s) => (
                <Box key={s.id} sx={styles.spectatorRow}>
                  <Box sx={styles.spectatorAvatar}>
                    <img
                      src={getAvatarSrc(s.avatar || "")}
                      alt=""
                      style={{ width: "100%", height: "100%", imageRendering: "pixelated", objectFit: "contain" }}
                    />
                  </Box>
                  <span style={styles.spectatorName}>{s.name || "—"}</span>
                  <span style={styles.spectatorStatus}>WATCHING</span>
                </Box>
              ))
            )}
          </Box>
        </Box>
      )}

      {/* ── RIGHT / MAIN: existing lobby layout ─────────────────────────────── */}
      <Box sx={styles.inner}>
        {/* Top bar */}
        <Box sx={styles.topBar}>
          <Box sx={{ minWidth: "120px" }}>
            {/* Only host can toggle visibility; spectators cannot */}
            {lobbyRole === "host" && !isSpectator && (
              <button
                style={styles.visibilityBtn(isPrivate)}
                onClick={() => { setPrivate(!isPrivate); playSound("select"); }}
                onMouseEnter={() => playSound("hover")}
              >
                {isPrivate ? <Lock width={14} height={14} /> : <Globe width={14} height={14} />}
                {isPrivate ? "PRIVATE" : "PUBLIC"}
              </button>
            )}
          </Box>

          <Box sx={styles.ipRow}>
            <span style={styles.lobbyIdBox}>{machineIp}</span>
          </Box>

          <button style={styles.exitBtn} onClick={() => { handleLeaveLobby(); playSound("select"); }} onMouseEnter={() => playSound("hover")}>
            {lobbyRole === "client" ? "EXIT LOBBY" : "BACK"}
          </button>
        </Box>

        {/* Spectator read-only banner */}
        {isSpectator && (
          <Box sx={styles.spectatorBanner}>
            <span>👁</span>
            <span>SPECTATOR MODE — READ ONLY</span>
          </Box>
        )}

        {/* Players panel */}
        <Box sx={styles.panel}>
          <Box sx={styles.panelHeader}>
            <span style={styles.panelTitle}>PLAYERS:</span>
            <span style={styles.panelCount}>
              {connectedPlayers.length}/{defaultGameConfig.maxPlayers ?? 4}
            </span>
          </Box>

          {disconnectedPlayers.length > 0 && (
            <Box sx={styles.waitingText}>
              {disconnectedPlayers.length === 1 ? "1 player is reconnecting" : `${disconnectedPlayers.length} players are reconnecting`}
            </Box>
          )}

          {players.map((p) => (
            <Box key={p.id} sx={styles.playerRow(p.connectionState !== "disconnected", p.connectionState === "disconnected")}>
              <Box sx={styles.avatar}>
                <img src={getAvatarSrc(p.avatar || "")} alt="" style={{ width: "100%", height: "100%", imageRendering: "pixelated", objectFit: "contain", borderRadius: "3px" }} />
              </Box>
              <Box sx={styles.playerInfo}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={styles.playerName}>{p.name || "NAME"}</span>
                  {p.isHost && <span style={styles.hostBadge}>HOST</span>}
                  {p.connectionState === "disconnected" && <span style={styles.connectionBadge}>OFFLINE</span>}
                  {p.connectionState !== "disconnected" && p.status && p.status !== "lobby" && (
                    <span style={{ 
                      ...styles.hostBadge, 
                      background: p.status === "playing" ? "rgba(0,223,255,0.15)" : "rgba(217,230,0,0.15)",
                      color: p.status === "playing" ? "#00DFFF" : "#D9E600",
                      border: `1px solid ${p.status === "playing" ? "#00DFFF44" : "#D9E60044"}`
                    }}>
                      {p.status.toUpperCase()}
                    </span>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RankIcon
                    type={getRankSymbolType(p.rank?.name ?? '')}
                    color={RANK_COLORS[getRankSymbolType(p.rank?.name ?? '')].primary}
                    glow={RANK_COLORS[getRankSymbolType(p.rank?.name ?? '')].glow}
                    size={18}
                    style={{ flexShrink: 0 }}
                  />
                  <span style={{ ...styles.playerSub, color: RANK_COLORS[getRankSymbolType(p.rank?.name ?? '')].primary, textShadow: `0 0 4px ${RANK_COLORS[getRankSymbolType(p.rank?.name ?? '')].glow}` }}>
                    {p.rank?.name ?? 'novice'} · lv.{p.level ?? "—"}
                  </span>
                </Box>
              </Box>
              {/* Host can kick non-spectator players; spectators cannot kick */}
              {lobbyRole === "host" && !p.isHost && !isSpectator && (
                <button style={styles.kickBtn} onClick={() => { handleKick(p.id); playSound("select"); }} onMouseEnter={() => playSound("hover")}>
                  KICK
                </button>
              )}
              <Box sx={styles.statusDot(
                p.connectionState === "disconnected" ? "disconnected" : 
                p.status === "playing" ? "playing" :
                p.status === "results" ? "results" :
                p.isReady ? "ready" : "notReady"
              )} />
            </Box>
          ))}

          {Array.from({ length: Math.max(0, (defaultGameConfig.maxPlayers ?? 4) - players.length) }).map((_, i) => (
            <Box key={`empty-${i}`} sx={styles.playerRow(false, false)}>
              <Box sx={styles.avatar} />
              <Box sx={styles.playerInfo}>
                <span style={{ ...styles.playerName, color: "#DADADA", opacity: 0.5 }}>—</span>
              </Box>
              <Box sx={styles.statusDot("notReady")} />
            </Box>
          ))}

          {!allPlayersReady && !isSpectator && (
            <Box sx={styles.waitingText}>Waiting for others…</Box>
          )}
          {isSpectator && (
            <Box sx={{ ...styles.waitingText, color: SPECTATOR_COLOR, opacity: 0.6 }}>
              Watching as spectator…
            </Box>
          )}
        </Box>

        {/* Bottom action buttons */}
        <Box sx={styles.bottomRow}>
          {/* Category button — DISABLED for spectators */}
          <button
            style={{
              ...styles.sideBtn,
              ...((lobbyRole === "client" || isSpectator) ? styles.sideBtnDisabled : {}),
            }}
            onClick={() => {
              if (lobbyRole === "host" && !isSpectator) { setModalScreen("category"); playSound("select"); }
            }}
            onMouseEnter={() => { if (lobbyRole !== "client" && !isSpectator) playSound("hover"); }}
            disabled={lobbyRole === "client" || isSpectator}
          >
            {getCategoryDisplay(gameConfig.category).toUpperCase()}
          </button>

          {/* Center button: PLAY (host) | READY (player) | WATCHING (spectator) */}
          {isSpectator ? (
            // ── Spectator sees a disabled "WATCHING" button ─────────────────
            <button style={{ ...styles.primaryBtn(true), background: SPECTATOR_DIM, color: SPECTATOR_COLOR, border: `1.5px solid ${SPECTATOR_COLOR}`, cursor: "default" }} disabled>
              WATCHING
            </button>
          ) : lobbyRole === "host" ? (
            <button
              style={styles.primaryBtn(!canStart)}
              onClick={canStart ? () => { handleStartGame(); playSound("select"); } : undefined}
              onMouseEnter={() => { if (canStart) playSound("hover"); }}
              disabled={!canStart}
            >
              PLAY
            </button>
          ) : (
            <button
              style={styles.primaryBtn(!currentPlayer || isCurrentPlayerDisconnected)}
              onClick={() => { if (currentPlayer && !isCurrentPlayerDisconnected) { handleReadyToggle(currentPlayer.id, !isReady); playSound("select"); } }}
              onMouseEnter={() => { if (currentPlayer && !isCurrentPlayerDisconnected) playSound("hover"); }}
              disabled={!currentPlayer || isCurrentPlayerDisconnected}
            >
              {isCurrentPlayerDisconnected ? "RECONNECTING..." : isReady ? "UNREADY" : "READY"}
            </button>
          )}

          {/* Difficulty button — DISABLED for spectators */}
          <button
            style={{
              ...styles.sideBtn,
              ...((lobbyRole === "client" || isSpectator) ? styles.sideBtnDisabled : {}),
            }}
            onClick={() => {
              if (lobbyRole === "host" && !isSpectator) { setModalScreen("difficulty"); playSound("select"); }
            }}
            onMouseEnter={() => { if (lobbyRole !== "client" && !isSpectator) playSound("hover"); }}
            disabled={lobbyRole === "client" || isSpectator}
          >
            {gameConfig.difficulty ? gameConfig.difficulty.toUpperCase() : "DIFFICULTY"}
          </button>
        </Box>
      </Box>
    </Box>
  );
};

export default MultiplayerLobby;