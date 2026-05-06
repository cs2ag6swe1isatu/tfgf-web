import { Button, Typography, Box } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const StandingPage = () => {
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
          Standing
        </Typography>

        <Typography sx={{ mt: 2 }}>
          Ranking / standing page is not finished yet.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          className="mt-4"
          onClick={() => setScreen("home")}
        >
          Back
        </Button>
      </Box>
    </Box>
  );
};

export default StandingPage;
