import { useMemo, useState } from "react";
import { Typography, Box, Button, Avatar } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { usePlayerStore } from "../store/playerStore";

type HistoryView = "all" | "solo" | "multiplayer";

/* Layout:
- Top: Profile Icon and Profile Title
- Middle to Bottom: Container: Sidebar, profile content

> Sidebar:
 - Player Avatar, Player Name, Player Rank, Player Level, XP Bar
 - Sidebar Tabs: Stats, Achievements, Game History
> Profile Content:
 - Stats: 
 > TopBar: Overall, solo, multiplayer 
 > Middle: Stats grid: total score, top score, total games played, question answered, correct answers, accuracy
 > Bottom: Individual difficuty stats: left side: bar graph(y-axis: accuracy(%), x-axis: columns: easy, medium, hard); right side per difficulty raw stat numbers: [difficulty]: total scores, top scores, total games played, question answered, correct answers, accuracy
 > Achievements:

 - Game History:
 > Recent games title, recent games list (scrollable), each item: [category|difficulty|score] upper line, [date|mode|xp earned] lower line 
 */

const ProfilePage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const player = usePlayerStore((state) => state.getPlayer());
  const resetPlayer = usePlayerStore((state) => state.resetPlayer);
  const [historyView, setHistoryView] = useState<HistoryView>("all");

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
  const gameHistory = player.gameHistory ?? [];

  const visibleHistory = useMemo(() => {
    const sortedHistory = [...gameHistory].reverse();
    if (historyView === "all") return sortedHistory;
    return sortedHistory.filter((session) => session.mode === historyView);
  }, [gameHistory, historyView]);

  const historyCounts = useMemo(() => {
    const solo = gameHistory.filter((session) => session.mode === "solo").length;
    const multiplayer = gameHistory.filter((session) => session.mode === "multiplayer").length;
    return {
      all: gameHistory.length,
      solo,
      multiplayer,
    };
  }, [gameHistory]);

  const formatSessionLine = (index: number) => {
    const session = visibleHistory[index];
    if (!session) return null;

    const dateLabel = new Date(session.date).toLocaleDateString();
    const accuracy = session.totalQuestions > 0
      ? `${Math.round((session.correctAnswers / session.totalQuestions) * 100)}%`
      : "0%";

    const resultLabel = session.mode === "multiplayer"
      ? [session.won ? "won" : "lost", session.topThreeFinish ? "top 3" : "outside top 3"].join(", ")
      : session.mastered
        ? "perfect"
        : "played";

    return `${dateLabel} | ${session.mode} | ${session.category} | ${session.difficulty} | score ${session.score} | ${session.correctAnswers}/${session.totalQuestions} (${accuracy}) | ${resultLabel}`;
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
      <Box sx={{ textAlign: "center" }}>
        <Avatar src={player.avatar || undefined} alt={playerName} sx={{ width: 96, height: 96, margin: "0 auto", mb: 2, imageRendering: 'pixelated' }} />
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

        <Typography sx={{ mt: 4 }} variant="h6">Recent Game History</Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
          <Button data-sfx="navigate" size="small" variant={historyView === "all" ? "contained" : "outlined"} onClick={() => setHistoryView("all")}>
            All ({historyCounts.all})
          </Button>
          <Button data-sfx="navigate" size="small" variant={historyView === "solo" ? "contained" : "outlined"} onClick={() => setHistoryView("solo")}>
            Solo ({historyCounts.solo})
          </Button>
          <Button data-sfx="navigate" size="small" variant={historyView === "multiplayer" ? "contained" : "outlined"} onClick={() => setHistoryView("multiplayer")}>
            Multiplayer ({historyCounts.multiplayer})
          </Button>
        </Box>

        <Box sx={{ mt: 2, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
          {visibleHistory.length > 0 ? (
            visibleHistory.map((session, index) => (
              <Typography key={session.id} sx={{ fontSize: "0.9rem", mb: 0.75 }}>
                {formatSessionLine(index)}
              </Typography>
            ))
          ) : (
            <Typography sx={{ color: "text.secondary" }}>
              No sessions recorded for this view yet.
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
        <Button
          data-sfx="navigate"
          variant="contained"
          color="primary"
          onClick={() => setScreen("home")}
        >
          Back
        </Button>
        <Button
          data-sfx="navigate"
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
