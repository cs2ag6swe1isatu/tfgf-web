import { useMemo, useEffect, useCallback, useRef } from "react";
import { Box, GlobalStyles } from "@mui/material";
import { Phase, useGameStore, useTriviaStore } from "../store";
import { getMultiplayerPlayer, usePlayerStore } from "../store/playerStore";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { Globe, Lock } from "pixelarticons/react";
import { getAvatarSrc } from "../utils/avatar";
import RankIcon, { RANK_ICON_KEYFRAMES, RANK_COLORS, getRankSymbolType } from "../components/ui/RankIcon";
import { useSoundContext } from "../context/SoundContext";

import type {
  MultiplayerBridge,
  MultiplayerDiscoveredPayload,
  MultiplayerLobbySnapshot,
  LobbyMember,
  MultiplayerGameState,
} from "../types/multiplayer";
import { defaultGameConfig } from "../config/gameConfig";

const MultiplayerLobby = () => {
  const { playSound } = useSoundContext();
  const setScreen = useGameStore((s) => s.setScreen);
  const setModalScreen = useGameStore((s) => s.setModalScreen);
  const gameConfig = useGameStore((s) => s.gameConfig);
  const setGameConfig = useGameStore((s) => s.setGameConfig);

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
  const multiplayerPlayer = useMemo(() => getMultiplayerPlayer(player), [player]);
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
  const joinTimeoutRef = useRef<number | null>(null);

  const handleHostExit = useCallback(() => {
    if (hasHandledHostExitRef.current) return;
    hasHandledHostExitRef.current = true;
    multiplayerBridge?.stopDiscovery();
    resetMultiplayer();
    setScreen("multiplayer-menu");
  }, [multiplayerBridge, resetMultiplayer, setScreen]);

  const handleCreateLobby = () => {
    setLobbyId(currentLobbyId);
    setLobbyRole("host");
    addOrUpdatePlayer(multiplayerPlayer, { isHost: true, isReady: true });
    setCurrentPlayerId(multiplayerPlayer.id);
  };

  const handleGameStateSync = useCallback(
    async (payload: MultiplayerGameState) => {
      const syncablePhases: Phase[] = ["readying", "asking", "answering", "scoring", "ranking"];
      if (!syncablePhases.includes(payload.phase)) return;
      if (lobbyRole !== "client") return;
      if (isTransitioningToGameRef.current) return;
      isTransitioningToGameRef.current = true;

      const currentConfig = useGameStore.getState().gameConfig;
      const category = payload.category ?? currentConfig.category ?? "General Knowledge";
      const difficulty = payload.difficulty ?? currentConfig.difficulty ?? "easy";
      const questionLimit = payload.questionLimit ?? currentConfig.questionLimit ?? defaultGameConfig.questionLimit;
      const questionTimer = payload.questionTimer ?? currentConfig.questionTimer ?? defaultGameConfig.questionTimer;
      const answerTimer = payload.answerTimer ?? currentConfig.answerTimer ?? defaultGameConfig.answerTimer;
      const questionPort = payload.questionPort;

      setGameConfig({ category, difficulty, questionLimit, questionTimer, answerTimer, seed: payload.seed });

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

    if (multiplayerBridge?.onHttpServerStarted) {
      multiplayerBridge.onHttpServerStarted("StartGame", (port) => {
        console.log(`[Lobby] HTTP server started on port ${port}, broadcasting game-state`);
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
          questionPort: port,
          playerScores: state.playerScores,
          rankings: state.rankings,
        });
        multiplayerBridge.offHttpServerStarted("StartGame");
      });
    }

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

    setScreen("question");
  };

  const handleKick = (playerId: string) => {
    if (lobbyRole !== "host" || !lobbyId) return;
    removePlayer(playerId);
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
    if (lobbyRole === "client" && lobbyId && hostAddress) {
      multiplayerBridge?.leaveLobby({ lobbyId, hostAddress, playerId: multiplayerPlayer.id });
    } else if (lobbyRole === "host") {
      multiplayerBridge?.stopBroadcast();
    }
    resetMultiplayer();
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

      const amIStillInLobby = payload.players.some((p) => p.id === multiplayerPlayer.id);
      if (amIStillInLobby) {
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
      if (hasConfirmedJoinRef.current) handleHostExit();
    };

    const onHostExitCb = (payload: { lobbyId: string }) => {
      const currentLobbyId = useMultiplayerStore.getState().lobbyId;
      if (currentLobbyId && payload.lobbyId === currentLobbyId) handleHostExit();
    };

    window.addEventListener("beforeunload", sendLeaveOnUnload);
    multiplayerBridge.onHostFound("Lobby", onHostFoundCb);
    multiplayerBridge.onHostExit("Lobby", onHostExitCb);
    multiplayerBridge.onGameStateSync("Lobby", handleGameStateSync);

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
      window.removeEventListener("beforeunload", sendLeaveOnUnload);
    };
  }, [lobbyRole, multiplayerBridge, syncLobbySnapshot, handleHostExit, handleGameStateSync, multiplayerPlayer.id]);

  useEffect(() => {
    if (lobbyRole !== "host" || !lobbyId || !multiplayerBridge) return;

    const handlePlayerJoined = (p: LobbyMember) => addOrUpdatePlayer(p, { isHost: false, isReady: false });
    const handlePlayerReadyChanged = (playerId: string, ready: boolean) => setPlayerReady(playerId, ready);
    const handlePlayerLeft = (playerId: string) => removePlayer(playerId);

    multiplayerBridge.onPlayerJoined("Lobby", handlePlayerJoined);
    multiplayerBridge.onPlayerReadyChanged("Lobby", handlePlayerReadyChanged);
    multiplayerBridge.onPlayerLeft("Lobby", handlePlayerLeft);

    return () => {
      multiplayerBridge.offPlayerJoined?.("Lobby");
      multiplayerBridge.offPlayerReadyChanged?.("Lobby");
      multiplayerBridge.offPlayerLeft?.("Lobby");
    };
  }, [lobbyRole, lobbyId, multiplayerBridge, addOrUpdatePlayer, setPlayerReady, removePlayer]);

  useEffect(() => {
    if (lobbyRole !== "host" || !lobbyId || !multiplayerBridge) return;

    // FIX: include host (with avatar) in the initial players array so clients
    // receive the host's avatar from the very first broadcast packet.
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
      players: [{ ...multiplayerPlayer, isHost: true, isReady: true }], // ← FIX: was []
    };

    multiplayerBridge.startBroadcast(initialPayload);

    return () => {
      multiplayerBridge.stopBroadcast?.();
    };
  }, [lobbyRole, lobbyId, multiplayerBridge, multiplayerPlayer.id, multiplayerPlayer.name, multiplayerPlayer.level]);

  useEffect(() => {
    if (lobbyRole !== "host" || !lobbyId || !multiplayerBridge) return;
    const payload: MultiplayerLobbySnapshot = {
      lobbyId,
      hostId: multiplayerPlayer.id,
      hostName: multiplayerPlayer.name,
      hostLevel: multiplayerPlayer.level,
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
  }, [players, gameConfig, lobbyId, lobbyRole, multiplayerBridge, multiplayerPlayer.id, multiplayerPlayer.name, multiplayerPlayer.level, isPrivate]);

  const handleReadyToggle = (playerId: string, ready: boolean) => {
    const targetPlayer = players.find((p) => p.id === playerId);
    if (!targetPlayer || targetPlayer.isHost) return;
    setPlayerReady(playerId, ready);
    if (lobbyRole === "client" && hostAddress && multiplayerBridge && lobbyId) {
      multiplayerBridge.setReady({ lobbyId, hostAddress, playerId, ready });
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
      setCurrentPlayerId(multiplayerPlayer.id);
    }
  }, [lobbyRole, players.length, multiplayerPlayer, setCurrentPlayerId, handleCreateLobby]);

  // ─── Styles ──────────────────────────────────────────────────────────────
  const styles = {
    root: {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      boxSizing: "border-box" as const,
      padding: "24px 16px",
      overflow: "hidden",
    },
    inner: {
      width: "100%",
      maxWidth: "640px",
      display: "flex",
      flexDirection: "column" as const,
      gap: "16px",
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
    lobbyIdLabel: {
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: "18px",
      color: "#E5E5E5",
      whiteSpace: "nowrap" as const,
      letterSpacing: "1px",
    },
    lobbyIdBox: {
      background: "#2C2C2C",
      border: "1.5px solid #10363A",
      borderRadius: "6px",
      padding: "4px 12px",
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: "18px",
      color: "#35E52B",
      letterSpacing: "2px",
      minWidth: "120px",
      textAlign: "center" as const,
    },
    visibilityBtn: (isPrivateMode: boolean) => ({
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "5px 14px",
      borderRadius: "6px",
      border: `1.5px solid ${isPrivateMode ? "#E3A020" : "#00DFFF"}`,
      background: isPrivateMode ? "rgba(227,160,32,0.12)" : "#00DFFF",
      color: isPrivateMode ? "#E3A020" : "#010707",
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: "17px",
      cursor: "pointer",
      letterSpacing: "1px",
      whiteSpace: "nowrap" as const,
      transition: "all 0.15s",
    }),
    exitBtn: {
      padding: "5px 16px",
      borderRadius: "6px",
      border: "1.5px solid #00DFFF",
      background: "#10363A",
      color: "#35E52B",
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: "17px",
      cursor: "pointer",
      letterSpacing: "1px",
      whiteSpace: "nowrap" as const,
      transition: "all 0.15s",
    },
    panel: {
      border: "2px solid #00E5FF",
      borderRadius: "10px",
      padding: "16px",
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
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: "22px",
      color: "#E5E5E5",
      letterSpacing: "2px",
    },
    panelCount: {
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: "18px",
      color: "#DADADA",
      letterSpacing: "1px",
    },
    playerRow: (active: boolean) => ({
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "10px 12px",
      borderRadius: "7px",
      background: active ? "#0D7B89" : "#6A7373",
      marginBottom: "8px",
    }),
    avatar: {
      width: "36px",
      height: "36px",
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
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: "18px",
      color: "#D9E600",
      letterSpacing: "1px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
    },
    playerSub: {
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: "13px",
      color: "#DADADA",
      letterSpacing: "0.5px",
    },
    hostBadge: {
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: "13px",
      color: "#E5E5E5",
      background: "rgba(0,0,0,0.25)",
      borderRadius: "4px",
      padding: "1px 7px",
      letterSpacing: "1px",
      marginLeft: "4px",
      flexShrink: 0,
    },
    statusDot: (ready: boolean) => ({
      width: "14px",
      height: "14px",
      borderRadius: "50%",
      background: ready ? "#35E52B" : "#E33232",
      boxShadow: ready ? "0 0 7px #35E52B" : "0 0 7px #E33232",
      flexShrink: 0,
    }),
    kickBtn: {
      padding: "3px 10px",
      borderRadius: "5px",
      border: "1.5px solid #E33232",
      background: "rgba(227,50,50,0.10)",
      color: "#E33232",
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: "14px",
      cursor: "pointer",
      letterSpacing: "1px",
      flexShrink: 0,
      transition: "all 0.15s",
    },
    waitingText: {
      textAlign: "center" as const,
      fontFamily: "'VT323', 'Courier New', monospace",
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
      fontFamily: "'VT323', 'Courier New', monospace",
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
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: "20px",
      cursor: disabled ? "default" : "pointer",
      letterSpacing: "2px",
      textAlign: "center" as const,
      boxShadow: disabled ? "none" : "0 0 18px rgba(57,230,0,0.45)",
      transition: "all 0.15s",
    }),
  };

  const allPlayersReady = allPlayers.length > 1 && allPlayers.every((p) => p.isReady);

  return (
    <Box sx={styles.root}>
      <GlobalStyles styles={{ [RANK_ICON_KEYFRAMES]: {} }} />
      <Box sx={styles.inner}>
        {/* Top bar */}
        <Box sx={styles.topBar}>
          <Box sx={{ minWidth: "120px" }}>
            {lobbyRole === "host" && (
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

          <Box sx={styles.lobbyIdRow}>
            <span style={styles.lobbyIdLabel}>LOBBY ID:</span>
            <span style={styles.lobbyIdBox}>{currentLobbyId}</span>
          </Box>

          <button style={styles.exitBtn} onClick={() => { handleLeaveLobby(); playSound("select"); }} onMouseEnter={() => playSound("hover")}>
            {lobbyRole === "client" ? "EXIT LOBBY" : "BACK"}
          </button>
        </Box>

        {/* Players panel */}
        <Box sx={styles.panel}>
          <Box sx={styles.panelHeader}>
            <span style={styles.panelTitle}>PLAYERS:</span>
            <span style={styles.panelCount}>
              {allPlayers.length}/{defaultGameConfig.maxPlayers ?? 4}
            </span>
          </Box>

          {allPlayers.map((p) => (
            <Box key={p.id} sx={styles.playerRow(true)}>
              <Box sx={styles.avatar}>
                <img src={getAvatarSrc(p.avatar || "")} alt="" style={{ width: "100%", height: "100%", imageRendering: "pixelated", objectFit: "contain", borderRadius: "3px" }} />
              </Box>
              <Box sx={styles.playerInfo}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={styles.playerName}>{p.name || "NAME"}</span>
                  {p.isHost && <span style={styles.hostBadge}>HOST</span>}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RankIcon
                    type={getRankSymbolType(p.rank?.name ?? '')}
                    color={RANK_COLORS[getRankSymbolType(p.rank?.name ?? '')].primary}
                    glow={RANK_COLORS[getRankSymbolType(p.rank?.name ?? '')].glow}
                    size={18}
                    style={{ flexShrink: 0 }}
                  />
                  <span style={styles.playerSub}>
                    {p.rank?.name ?? 'novice'} · lv.{p.level ?? "—"}
                  </span>
                </Box>
              </Box>
              {lobbyRole === "host" && !p.isHost && (
                <button style={styles.kickBtn} onClick={() => { handleKick(p.id); playSound("select"); }} onMouseEnter={() => playSound("hover")}>
                  KICK
                </button>
              )}
              <Box sx={styles.statusDot(p.isReady ?? false)} />
            </Box>
          ))}

          {Array.from({ length: Math.max(0, (defaultGameConfig.maxPlayers ?? 4) - allPlayers.length) }).map((_, i) => (
            <Box key={`empty-${i}`} sx={styles.playerRow(false)}>
              <Box sx={styles.avatar} />
              <Box sx={styles.playerInfo}>
                <span style={{ ...styles.playerName, color: "#DADADA", opacity: 0.5 }}>—</span>
              </Box>
              <Box sx={styles.statusDot(false)} />
            </Box>
          ))}

          {!allPlayersReady && (
            <Box sx={styles.waitingText}>Waiting for others…</Box>
          )}
        </Box>

        {/* Bottom action buttons */}
        <Box sx={styles.bottomRow}>
          <button
            style={{ ...styles.sideBtn, ...(lobbyRole === "client" ? styles.sideBtnDisabled : {}) }}
            onClick={() => { if (lobbyRole === "host") { setModalScreen("category"); playSound("select"); } }}
            onMouseEnter={() => { if (lobbyRole !== "client") playSound("hover"); }}
            disabled={lobbyRole === "client"}
          >
            {gameConfig.category ? gameConfig.category.toUpperCase() : "CATEGORY"}
          </button>


          {lobbyRole === "host" ? (
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
              style={styles.primaryBtn(!currentPlayer)}
              onClick={() => { if (currentPlayer) { handleReadyToggle(currentPlayer.id, !isReady); playSound("select"); } }}
              onMouseEnter={() => { if (currentPlayer) playSound("hover"); }}
              disabled={!currentPlayer}
            >
              {isReady ? "UNREADY" : "READY"}
            </button>
          )}


          <button
            style={{ ...styles.sideBtn, ...(lobbyRole === "client" ? styles.sideBtnDisabled : {}) }}
            onClick={() => { if (lobbyRole === "host") { setModalScreen("difficulty"); playSound("select"); } }}
            onMouseEnter={() => { if (lobbyRole !== "client") playSound("hover"); }}
            disabled={lobbyRole === "client"}
          >
            {gameConfig.difficulty ? gameConfig.difficulty.toUpperCase() : "DIFFICULTY"}
          </button>
        </Box>
      </Box>
    </Box>
  );
};

export default MultiplayerLobby;
