import { Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { User, Users } from "pixelarticons/react"

const ModeSelectPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const setMode = useGameStore((state) => state.setMode);

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
          Choose Mode
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 2, p: 2 }}>
        <Button
          sx={{ display: "grid" }}
          fullWidth
          variant="outlined"
          color="secondary"
          onClick={() => {
            setMode("solo");
            setScreen("category");
          }}
        >
          <User width={148} height={148} />
          Single Player
        </Button>

        <Button
          sx={{ display: "grid" }}
          fullWidth
          variant="outlined"
          color="secondary"
          onClick={() => {
            setMode("multiplayer");
            setScreen("multiplayer-menu");
          }}
        >
          <Users width={148} height={148} />
          Multiplayer
        </Button>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Button sx={{ width: "25%" }}
          variant="outlined"
          color="secondary"
          onClick={() => setScreen("home")}
        >
          Back
        </Button>
      </Box>
    </Box>
  );
};

export default ModeSelectPage;
