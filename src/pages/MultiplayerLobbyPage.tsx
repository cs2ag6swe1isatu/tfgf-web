import { useMemo, useEffect } from "react";
import { Container, Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { usePlayerStore } from "../store/playerStore";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { useTriviaStore } from "../store/triviaStore";
import { PlayerList } from "../components/multiplayer/PlayerList";

const MultiplayerLobby = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const gameConfig = useGameStore((s) => s.gameConfig);

  const lobbyRole = useMultiplayerStore((s) => s.lobbyRole);
  const lobbyId = useMultiplayerStore((s) => s.lobbyId);
  const players = useMultiplayerStore((s) => s.players);
  const addOrUpdatePlayer = useMultiplayerStore((s) => s.addOrUpdatePlayer);
  const setPlayerReady = useMultiplayerStore((s) => s.setPlayerReady);
  const setCurrentPlayerId = useMultiplayerStore((s) => s.setCurrentPlayerId);
  const setLobbyId = useMultiplayerStore((s) => s.setLobbyId);
  const resetMultiplayer = useMultiplayerStore((s) => s.resetMultiplayer);
  
  const player = usePlayerStore((s) => s.getPlayer());
  const currentPlayer = useMultiplayerStore((s) => s.currentPlayer());
  const isReady = currentPlayer?.isReady ?? false;

  const startGame = useTriviaStore((s) => s.startGame);
  const resetGame = useTriviaStore((s) => s.resetGame);

  const currentLobbyId = useMemo(() => {
    return lobbyId ?? `LOBBY-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }, [lobbyId]);

  const handleCreateLobby = () => {
    setLobbyId(currentLobbyId);
    addOrUpdatePlayer(
      player,
      { isHost: true, isReady: true }
    );
    setCurrentPlayerId(player.id);
  };

  /**
   * Generates mock host data for a lobby when no actual host exists.
   * Uses the lobby ID to create deterministic mock data.
   */
  const generateMockHost = (lobbyId: string) => {
    const seed = lobbyId.split('-').pop() || '0000';
    
    return {
      id: `host-${lobbyId}`,
      name: `Host-${seed.toUpperCase()}`,
      avatar: '',
      xp: 0,
      level: 1,
      rank: { name: "Host", icon: "", minLevel: 0, maxLevel: 999 },
      totalScore: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      lastActive: new Date(),
    };
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
    resetMultiplayer();
    setScreen("multiplayer-menu");
  };

  const handleReadyToggle = (playerId: string, ready: boolean) => {
    const player = players.find(p => p.id === playerId);
    if (player && !player.isHost) {
      setPlayerReady(playerId, ready);
    }
  };

  const allPlayers = players;

  const isCategorySelected = Boolean(gameConfig.category);
  const isDifficultySelected = Boolean(gameConfig.difficulty);
  const canStart = isCategorySelected && isDifficultySelected;

  // Auto-add players to lobby based on role
  useEffect(() => {
    if (lobbyRole === "host" && players.length === 0) {
      // Host: create lobby with host player
      handleCreateLobby();
    } else if (lobbyRole === "client" && players.length === 0 && lobbyId) {
      // Client: add mock host and current player
      const mockHost = generateMockHost(lobbyId);
      addOrUpdatePlayer(mockHost, { isHost: true, isReady: true });
      addOrUpdatePlayer(player, { isHost: false, isReady: false });
      setCurrentPlayerId(player.id);
    }
  }, [lobbyRole, players.length, lobbyId, player]);

  // Conditional rendering based on lobby
  // HOST: text/label lobbyid, list of players, controls for category/difficulty, start game button (disabled until ready)
  // CLIENT: text/label lobbyid, list of players, ready button
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
        {/* Top: Host ID */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6">Lobby: {currentLobbyId}</Typography>
          <Button onClick={handleLeaveLobby}>
            Back
          </Button>
        </Box>

        {/* Middle: Main Container */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Players</Typography>
          <PlayerList 
            players={allPlayers} 
            isHost={lobbyRole === "host"}
          />
        </Box>

        {/* Bottom: Controls */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, maxWidth: "600px", mx: "auto" }}>
           {lobbyRole === "host" ? (
            // Host Controls: Category, Start Game, Difficulty
            <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
              <Button variant="outlined" onClick={() => setScreen("category")} sx={{ flex: 1 }}>
                { gameConfig.category || "Select Category"}
              </Button>
              <Button 
                variant="contained" 
                onClick={handleStartGame} 
                disabled={!canStart}
                sx={{ flex: 1 }}
              >
                Start Game
              </Button>
              <Button variant="outlined" onClick={() => setScreen("difficulty")} sx={{ flex: 1 }}>
                { gameConfig.difficulty || "Select Difficulty" }
              </Button>
            </Box>
          ) : (
            // Client Controls: Ready Toggle
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
