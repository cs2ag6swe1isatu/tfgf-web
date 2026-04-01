import { Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { Globe, MapPin } from 'pixelarticons/react';

const MultiplayerMenuPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const setLobbyRole = useMultiplayerStore((state) => state.setLobbyRole);

  const handleHostGame = () => {
    setLobbyRole("host");
    setScreen("multiplayer-lobby");
  };

  const handleJoinGame = () => {
    setLobbyRole("client");
    setScreen("multiplayer-discovery");
  };

  return (
     <Box sx={{
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateRows: "1fr 3fr 1fr",
      padding: "40px",
      boxSizing: "border-box",
      position: "relative"
    }}>
      <Box sx={{  textAlign: "center" }}>
        <Typography variant="h1" gutterBottom>
          Multiplayer
        </Typography>
      </Box>

        <Box sx={{ display: "flex", gap: 2, p: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            color="secondary"
            onClick={handleHostGame}
            sx={{ display: "grid" }}
          >
            <Globe width={148} height={148} />
            Host Game
          </Button>

          <Button
            fullWidth
            variant="outlined"
            color="secondary"
            onClick={handleJoinGame}
            sx={{ display: "grid" }}
          >
            <MapPin width={148} height={148}/>
            Join Game
          </Button>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setScreen("mode-select")}
            sx={{ width: "25%" }}
          >
            Back
          </Button>
        </Box>
    </Box>
  );
};

export default MultiplayerMenuPage;
