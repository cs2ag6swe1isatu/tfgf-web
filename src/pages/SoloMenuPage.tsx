import { Container, Typography, Box } from "@mui/material";
import { Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const SoloMenuPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

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
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Solo Mode
        </Typography>

        <Box sx={{ mt: 4, display: "grid", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => setScreen("category")}
          >
            Start Game
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={() => setScreen("profile")}
          >
            Profile
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SoloMenuPage;
