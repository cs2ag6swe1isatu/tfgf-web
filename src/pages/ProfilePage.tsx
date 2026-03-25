import { Container, Typography, Box } from "@mui/material";
import { Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";

const ProfilePage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  // Temporary placeholder values
  const playerName = "Player 1";
  const level = 1;
  const xp = 0;
  const rank = "Beginner";

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">
            Name: {playerName}
          </Typography>

          <Typography variant="h6">
            Level: {level}
          </Typography>

          <Typography variant="h6">
            Rank: {rank}
          </Typography>

          <Typography variant="h6">
            XP: {xp}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          className="mt-5"
          onClick={() => setScreen("home")}
        >
          Back
        </Button>
      </Box>
    </Container>
  );
};

export default ProfilePage;