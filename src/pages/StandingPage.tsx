import { Container, Typography, Box } from "@mui/material";
import { Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const StandingPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <Container maxWidth="sm">
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
    </Container>
  );
};

export default StandingPage;