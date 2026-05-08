import { useMemo, useState } from "react";
import {
  Typography,
  Box,
  Button,
  Avatar,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Stack,
  Divider,
  Chip,
} from "@mui/material";
import { DIFFICULTIES } from "../constants";
import { useGameStore } from "../store/gameStore";
import { usePlayerStore } from "../store/playerStore";
import type { Difficulty } from "../constants";
import type { Player, PlayData } from "../types/player";
import { User } from "pixelarticons/react";

type HistoryView = "all" | "solo" | "multiplayer";

type DifficultySummary = {
  score: number;
  gamesPlayed: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
};

const createEmptyDifficultySummary = (): DifficultySummary => ({
  score: 0,
  gamesPlayed: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  accuracy: 0,
});

const buildDifficultySummaries = (player: Player): Record<Difficulty, DifficultySummary> => {
  const summaries = DIFFICULTIES.reduce((acc, difficulty) => {
    acc[difficulty] = createEmptyDifficultySummary();
    return acc;
  }, {} as Record<Difficulty, DifficultySummary>);

  for (const categoryStats of Object.values(player.individualStats)) {
    for (const modeStats of Object.values(categoryStats)) {
      for (const [difficulty, playData] of Object.entries(modeStats) as Array<[Difficulty, PlayData]>) {
        const summary = summaries[difficulty];
        summary.score += playData.scoreGained;
        summary.gamesPlayed += playData.gamesPlayed;
        summary.questionsAnswered += playData.totalQuestionsAnswered;
        summary.correctAnswers += playData.correctAnswers;
      }
    }
  }

  for (const difficulty of DIFFICULTIES) {
    const summary = summaries[difficulty];
    summary.accuracy =
      summary.questionsAnswered > 0
        ? Math.round((summary.correctAnswers / summary.questionsAnswered) * 100)
        : 0;
  }

  return summaries;
};

const ProfilePage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const player = usePlayerStore((state) => state.getPlayer());
  const [historyView, setHistoryView] = useState<HistoryView>("all");
  const [selectedTab, setSelectedTab] = useState<number>(0);

  const playerName = player.name;
  const level = player.level;
  const xp = player.totalXp;
  const xpToNextLevel = player.xpToNextLevel;
  const rank = player.rank.name;

  // Achievements & History
  const achievements = player.achievements;
  const gameHistory = player.gameHistory ?? [];
  const difficultyStats = useMemo(() => buildDifficultySummaries(player), [player]);

  const totalGamesPlayed = player.soloGamesPlayed + player.multiplayerGamesPlayed;
  const questionsAnswered = player.totalQuestionsAnswered;
  const correctAnswers = player.correctAnswers;
  const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;

  const visibleHistory = useMemo(() => {
    const sortedHistory = [...gameHistory].reverse();
    if (historyView === "all") return sortedHistory;
    return sortedHistory.filter((session) => session.mode === historyView);
  }, [gameHistory, historyView]);

  return (
    <Box sx={{ width: "100%", height: "100%", p: 4, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <Box sx={{ flex: "0 0 auto", display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
        <User style={{ fontSize: "3rem" }} />
          <Typography variant="h3" sx={{ fontWeight: "bold", textTransform: "uppercase" }}>
            Profile
          </Typography>
        </Box>
      <Box
        sx={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            flex: { md: "0 0 260px" },
            width: { xs: "100%", md: 260 },
            maxWidth: { md: 260 },
            minWidth: 0,
            maxHeight: "100%",
          }}
        >
          <Paper
            sx={{
              p: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              overflowY: "auto",
              overflowX: "hidden",
              pr: 1,
              "&::-webkit-scrollbar": { width: "8px" },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "primary.main",
                borderRadius: 0,
              },
            }}
            elevation={1}
          >
            <Box sx={{ textAlign: "center" }}>
              <Avatar src={player.avatar || undefined} alt={playerName} sx={{ width: 80, height: 80, margin: "0 auto", mb: 1 }} />
              <Typography variant="h6">{playerName}</Typography>
              <Chip label={rank} size="small" sx={{ mt: 1 }} />
            </Box>

            <Box>
              <Typography variant="body2">Level {level}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress variant="determinate" value={xpToNextLevel > 0 ? (xp / (xp + xpToNextLevel)) * 100 : 0} />
                </Box>
                <Typography variant="caption">{xp}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">XP to next: {xpToNextLevel}</Typography>
            </Box>

            <Divider />

            <Stack spacing={1}>
              <Button onClick={() => setSelectedTab(0)} variant={selectedTab === 0 ? "contained" : "outlined"} fullWidth>
                Stats
              </Button>
              <Button onClick={() => setSelectedTab(1)} variant={selectedTab === 1 ? "contained" : "outlined"} fullWidth>
                Achievements
              </Button>
              <Button onClick={() => setSelectedTab(2)} variant={selectedTab === 2 ? "contained" : "outlined"} fullWidth>
                Game History
              </Button>
            </Stack>

            <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
              <Button fullWidth variant="outlined" size="small" onClick={() => setScreen('home')}>Back</Button>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }} elevation={1}>
            <Box sx={{ flex: "1 1 auto", overflowY: 'auto' }}>
              {selectedTab === 0 && (
                <Box sx={{ width: "100%"}}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Button data-sfx="navigate" variant={historyView === "all" ? "contained" : "outlined"} onClick={() => setHistoryView("all")}>
                      Overall
                    </Button>
                    <Button data-sfx="navigate"  variant={historyView === "solo" ? "contained" : "outlined"} onClick={() => setHistoryView("solo")}>
                      Solo
                    </Button>
                    <Button data-sfx="navigate" variant={historyView === "multiplayer" ? "contained" : "outlined"} onClick={() => setHistoryView("multiplayer")}>
                      Multiplayer
                    </Button>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Total Score</Typography>
                      <Typography variant="h6">{player.totalScore}</Typography>
                    </Paper>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Top Score</Typography>
                      <Typography variant="h6">{player.topScore}</Typography>
                    </Paper>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Total Games Played</Typography>
                      <Typography variant="h6">{totalGamesPlayed}</Typography>
                    </Paper>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Questions Answered</Typography>
                      <Typography variant="h6">{questionsAnswered}</Typography>
                    </Paper>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Correct Answers</Typography>
                      <Typography variant="h6">{correctAnswers}</Typography>
                    </Paper>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Accuracy</Typography>
                      <Typography variant="h6">{accuracy}%</Typography>
                    </Paper>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mt: 2 }}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Easy</Typography>
                      <Typography variant="h6">{difficultyStats.easy.score}</Typography>
                      <Typography variant="body2" color="text.secondary">{difficultyStats.easy.gamesPlayed} games, {difficultyStats.easy.questionsAnswered} answered, {difficultyStats.easy.accuracy}% accuracy</Typography>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Medium</Typography>
                      <Typography variant="h6">{difficultyStats.medium.score}</Typography>
                      <Typography variant="body2" color="text.secondary">{difficultyStats.medium.gamesPlayed} games, {difficultyStats.medium.questionsAnswered} answered, {difficultyStats.medium.accuracy}% accuracy</Typography>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Hard</Typography>
                      <Typography variant="h6">{difficultyStats.hard.score}</Typography>
                      <Typography variant="body2" color="text.secondary">{difficultyStats.hard.gamesPlayed} games, {difficultyStats.hard.questionsAnswered} answered, {difficultyStats.hard.accuracy}% accuracy</Typography>
                    </Paper>
                  </Box>
                </Box>
              )}

              {selectedTab === 1 && (
                <Box>
                  <Typography variant="h6">Achievements ({achievements.length})</Typography>
                  <List>
                    {achievements.length > 0 ? achievements.map((ach) => (
                      <ListItem key={ach.id} divider>
                        <ListItemText primary={ach.name} secondary={ach.description} />
                      </ListItem>
                    )) : (
                      <ListItem>
                        <ListItemText primary="No achievements yet" />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}

              {selectedTab === 2 && (
                <Box>
                  <Typography variant="h6">Recent Game History</Typography>
                  <List>
                    {visibleHistory.length > 0 ? visibleHistory.map((session) => (
                      <ListItem key={session.id} alignItems="flex-start" divider>
                        <ListItemText
                          primary={`${session.category} • ${session.difficulty} • score ${session.score}`}
                          secondary={new Date(session.date).toLocaleString() + ' • ' + session.mode}
                        />
                      </ListItem>
                    )) : (
                      <ListItem>
                        <ListItemText primary="No sessions recorded for this view yet." />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default ProfilePage;
