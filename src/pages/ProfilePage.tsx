import { Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { usePlayerStore } from "../store/playerStore";

const ProfilePage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const player = usePlayerStore((state) => state.getPlayer());
  const resetPlayer = usePlayerStore((state) => state.resetPlayer);

  const handleReset = () => {
    if (confirm('Are you sure you want to delete all player data? This cannot be undone.')) {
      resetPlayer();
      setScreen('home');
    }
  };

  const playerName = player.name;
  const level = player.level;
  const xp = player.totalXp;
  const xpToNextLevel = player.xpToNextLevel;
  const rank = player.rank.name;
  const totalScore = player.totalScore;
  const topScore = player.topScore;
  const soloGamesPlayed = player.soloGamesPlayed;
  const multiplayerGamesPlayed = player.multiplayerGamesPlayed;
  const totalQuestionsAnswered = player.totalQuestionsAnswered;
  const correctAnswers = player.correctAnswers;
  const gamesMastered = player.gamesMastered;
  const achievements = player.achievements;

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
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>
      </Box>

      <Box sx={{ overflowY: "auto", px: 4 }}>
        <Typography>Name: {playerName}</Typography>
        <Typography>Level: {level}</Typography>
        <Typography>Rank: {rank}</Typography>
        <Typography>Total XP: {xp}</Typography>
        <Typography>XP to Next Level: {xpToNextLevel}</Typography>

        <Typography sx={{ mt: 3 }}>Total Score: {totalScore}</Typography>
        <Typography>Top Score: {topScore}</Typography>

        <Typography sx={{ mt: 3 }}>Solo Games Played: {soloGamesPlayed}</Typography>
        <Typography>Multiplayer Games Played: {multiplayerGamesPlayed}</Typography>
        <Typography>Games Mastered: {gamesMastered}</Typography>

        <Typography sx={{ mt: 3 }}>Total Questions Answered: {totalQuestionsAnswered}</Typography>
        <Typography>Correct Answers: {correctAnswers}</Typography>
        <Typography>Accuracy: {totalQuestionsAnswered > 0 ? ((correctAnswers / totalQuestionsAnswered) * 100).toFixed(2) : 0}%</Typography>

        <Typography sx={{ mt: 3 }}>Achievements: {achievements.length}</Typography>
        {achievements.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {achievements.map((achievement) => (
              <Typography key={achievement.id}>
                • {achievement.name}: {achievement.description}
              </Typography>
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setScreen("home")}
        >
          Back
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleReset}
        >
          Reset Player Data
        </Button>
      </Box>
    </Box>
  );
};

export default ProfilePage;
