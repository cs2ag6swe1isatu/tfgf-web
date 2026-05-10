import { useMemo, useState } from "react";
import {
  Typography,
  Box,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { DIFFICULTIES } from "../constants";
import { useGameStore } from "../store/gameStore";
import { usePlayerStore } from "../store/playerStore";
import type { Difficulty } from "../constants";
import type { Player, PlayData } from "../types/player";
import { User } from "pixelarticons/react"; // Assuming you have this

// --- Theme Constants based on your design ---
const themeColors = {
  bg: "#050a05", // Very dark green/black
  neonGreen: "#00ff00",
  neonGreenDim: "rgba(0, 255, 0, 0.2)",
  neonCyan: "#00ffff",
  neonYellow: "#ffff00",
  textMuted: "#00aa00",
};

const pixelFont = '"Press Start 2P", "Courier New", monospace';

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

  // Reusable Retro Button Style
  const getButtonStyle = (isActive: boolean) => ({
    fontFamily: pixelFont,
    color: isActive ? "#000" : themeColors.neonGreen,
    backgroundColor: isActive ? themeColors.neonGreen : "transparent",
    border: `2px solid ${themeColors.neonGreen}`,
    borderRadius: 0,
    padding: "0.75rem 1rem",
    boxShadow: isActive ? `0 0 10px ${themeColors.neonGreen}` : "none",
    "&:hover": {
      backgroundColor: isActive ? themeColors.neonGreen : themeColors.neonGreenDim,
      color: isActive ? "#000" : themeColors.neonGreen,
      boxShadow: isActive ? `0 0 15px ${themeColors.neonGreen}` : `0 0 5px ${themeColors.neonGreenDim}`,
    },
    textTransform: "uppercase",
    width: "100%",
    justifyContent: "center",
  });

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%", // Adapts to your resolution wrapper
        backgroundColor: themeColors.bg,
        color: themeColors.neonGreen,
        fontFamily: pixelFont,
        p: "4%", // Using percentage for spacing based on wrapper size
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box sx={{ flex: "0 0 auto", display: "flex", alignItems: "center", mb: "2%", gap: "1rem" }}>
        <User style={{ fontSize: "2rem", color: themeColors.neonGreen }} />
        <Typography sx={{ fontFamily: pixelFont, fontSize: "1.5rem", textShadow: `0 0 5px ${themeColors.neonGreen}` }}>
          PROFILE
        </Typography>
      </Box>

      {/* Main Layout */}
      <Box sx={{ flex: "1 1 auto", display: "flex", gap: "4%", minHeight: 0 }}>
        
        {/* Left Sidebar */}
        <Box
          sx={{
            flex: "0 0 25%", // Takes exactly 25% of the wrapper width
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            height: "100%",
          }}
        >
          {/* User Info */}
          <Box sx={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Box
              sx={{
                width: "4rem",
                height: "4rem",
                border: `1px solid ${themeColors.neonGreen}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}
            >
              {player.avatar ? (
                <img src={player.avatar} alt={playerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User style={{ fontSize: "3rem" }} />
              )}
            </Box>
            <Box>
              <Typography sx={{ fontFamily: pixelFont, fontSize: "1.2rem", letterSpacing: "2px" }}>{playerName}</Typography>
              <Typography sx={{ fontFamily: pixelFont, fontSize: "0.7rem", color: "white" }}>STUDENT</Typography>
            </Box>
          </Box>

          {/* Level Progress */}
          <Box>
            <Typography sx={{ fontFamily: pixelFont, fontSize: "0.8rem", mb: "0.5rem", color: "white" }}>Level {level}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Box sx={{ flex: 1, border: "1px solid white", p: "2px" }}>
                <LinearProgress
                  variant="determinate"
                  value={xpToNextLevel > 0 ? (xp / (xp + xpToNextLevel)) * 100 : 0}
                  sx={{
                    height: "8px",
                    backgroundColor: "transparent",
                    "& .MuiLinearProgress-bar": { backgroundColor: "white" },
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Navigation */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "1rem" }}>
            <Button sx={getButtonStyle(selectedTab === 0)} onClick={() => setSelectedTab(0)}>
              STATS
            </Button>
            <Button sx={getButtonStyle(selectedTab === 1)} onClick={() => setSelectedTab(1)}>
              ACHIEVEMENTS
            </Button>
            <Button sx={getButtonStyle(selectedTab === 2)} onClick={() => setSelectedTab(2)}>
              GAME HISTORY
            </Button>
          </Box>

          {/* Back Button positioned at bottom */}
          <Box sx={{ mt: "auto" }}>
            <Button
              sx={{
                ...getButtonStyle(false),
                color: themeColors.neonCyan,
                borderColor: themeColors.neonCyan,
                width: "auto",
                px: "2rem"
              }}
              onClick={() => setScreen("home")}
            >
              BACK
            </Button>
          </Box>
        </Box>

        {/* Right Content Area */}
        <Box
          sx={{
            flex: "1 1 auto",
            border: `2px solid ${themeColors.neonCyan}`,
            borderRadius: "8px",
            boxShadow: `0 0 15px rgba(0, 255, 255, 0.2), inset 0 0 15px rgba(0, 255, 255, 0.1)`,
            p: "2%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Scrollable Container inside the glowing box */}
          <Box
            sx={{
              flex: "1 1 auto",
              overflowY: "auto",
              pr: "1%",
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-thumb": { backgroundColor: themeColors.neonGreen },
            }}
          >
            {selectedTab === 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Stats Header Tabs */}
                <Box sx={{ display: "flex", gap: "1.5rem", mb: "2rem", justifyContent: "center", alignItems: "center" }}>
                  <Typography
                    onClick={() => setHistoryView("all")}
                    sx={{ fontFamily: pixelFont, fontSize: "1.2rem", cursor: "pointer", color: historyView === "all" ? themeColors.neonGreen : "white", textShadow: historyView === "all" ? `0 0 8px ${themeColors.neonGreen}` : "none" }}
                  >
                    Overall
                  </Typography>
                  <Typography sx={{ color: "white" }}>|</Typography>
                  <Typography
                    onClick={() => setHistoryView("solo")}
                    sx={{ fontFamily: pixelFont, fontSize: "1.2rem", cursor: "pointer", color: historyView === "solo" ? "white" : themeColors.textMuted }}
                  >
                    Solo
                  </Typography>
                  <Typography sx={{ color: "white" }}>|</Typography>
                  <Typography
                    onClick={() => setHistoryView("multiplayer")}
                    sx={{ fontFamily: pixelFont, fontSize: "1.2rem", cursor: "pointer", color: historyView === "multiplayer" ? "white" : themeColors.textMuted }}
                  >
                    Multiplayer
                  </Typography>
                </Box>

                {/* 3x2 Grid */}
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", mb: "2rem" }}>
                  {[
                    { label: "TOTAL SCORE", val: player.totalScore },
                    { label: "TOP SCORE", val: player.topScore },
                    { label: "TOTAL GAMES PLAYED", val: totalGamesPlayed },
                    { label: "QUESTIONS ANSWERED", val: questionsAnswered },
                    { label: "CORRECT ANSWERS", val: correctAnswers },
                    { label: "ACCURACY", val: `${accuracy}%` },
                  ].map((stat, i) => (
                    <Box key={i} sx={{ border: `1px solid ${themeColors.textMuted}`, p: "1rem", textAlign: "center" }}>
                      <Typography sx={{ fontFamily: pixelFont, fontSize: "1.5rem", mb: "0.5rem" }}>{stat.val}</Typography>
                      <Typography sx={{ fontFamily: pixelFont, fontSize: "0.6rem", color: themeColors.neonCyan }}>{stat.label}</Typography>
                    </Box>
                  ))}
                </Box>

                <Divider sx={{ borderColor: themeColors.textMuted, mb: "1.5rem" }} />

                {/* Level of Difficulty Section */}
                <Typography sx={{ fontFamily: pixelFont, fontSize: "1rem", mb: "1.5rem", textAlign: "center" }}>LEVEL OF DIFFICULTY</Typography>
                <Box sx={{ display: "flex", gap: "2rem", flex: 1 }}>
                  {/* Left Side: Custom Retro Bar Chart */}
                  <Box sx={{ flex: "1 1 50%", display: "flex", flexDirection: "column", pr: "2%" }}>
                    
                    {/* Graph Title */}
                    <Typography sx={{ fontFamily: pixelFont, fontSize: "0.8rem", color: themeColors.neonGreen, mb: "1rem", textAlign: "center" }}>
                      ACCURACY
                    </Typography>

                    <Box sx={{ flex: 1, display: "flex", height: "100%", minHeight: 0 }}>
                      
                      {/* Y-Axis Labels (100% to 0%) */}
                      <Box sx={{ 
                        display: "flex", 
                        flexDirection: "column-reverse", 
                        justifyContent: "space-between", 
                        pr: "0.5rem",
                        pb: "1.5rem" // Offset to account for X-axis label height
                      }}>
                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                          <Typography key={val} sx={{ fontFamily: pixelFont, fontSize: "0.45rem", color: "white", lineHeight: 1 }}>
                            {val}%
                          </Typography>
                        ))}
                      </Box>

                      {/* Main Chart Area */}
                      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        
                        {/* Bars and Axes lines */}
                        <Box sx={{ 
                          flex: 1, 
                          borderLeft: `2px solid ${themeColors.textMuted}`, 
                          borderBottom: `2px solid ${themeColors.textMuted}`, 
                          display: "flex", 
                          alignItems: "flex-end", 
                          justifyContent: "space-around",
                          position: "relative",
                          pt: "1rem" // Room for the % label above 100% bars
                        }}>
                          {[
                            { id: "EASY", val: difficultyStats.easy.accuracy, color: themeColors.neonGreen },
                            { id: "MEDIUM", val: difficultyStats.medium.accuracy, color: themeColors.neonCyan },
                            { id: "HARD", val: difficultyStats.hard.accuracy, color: themeColors.neonYellow },
                          ].map((bar) => (
                            <Box key={bar.id} sx={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", width: "15%" }}>
                              {/* Percentage Label floating above bar */}
                              <Typography sx={{ fontFamily: pixelFont, fontSize: "0.5rem", color: "white", mb: "4px" }}>
                                {bar.val}%
                              </Typography>
                              {/* The Colored Bar */}
                              <Box sx={{ 
                                width: "100%", 
                                height: `${bar.val}%`, 
                                backgroundColor: bar.color,
                                // Prevent 0% from disappearing entirely for visual consistency (optional)
                                minHeight: bar.val === 0 ? "1px" : "0", 
                              }} />
                            </Box>
                          ))}
                        </Box>

                        {/* X-Axis Labels & Dots */}
                        <Box sx={{ display: "flex", justifyContent: "space-around", pt: "0.5rem", ml: "-2px" }}>
                           {[
                            { id: "EASY", color: themeColors.neonGreen },
                            { id: "MEDIUM", color: themeColors.neonCyan },
                            { id: "HARD", color: themeColors.neonYellow },
                          ].map((axis) => (
                            <Box key={axis.id} sx={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                              {/* Glowing Dot */}
                              <Box sx={{ 
                                width: "6px", 
                                height: "6px", 
                                borderRadius: "50%", 
                                backgroundColor: axis.color, 
                                boxShadow: `0 0 6px ${axis.color}` 
                              }} />
                              <Typography sx={{ fontFamily: pixelFont, fontSize: "0.5rem", color: "white" }}>
                                {axis.id}
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                      </Box>
                    </Box>
                  </Box>

                  {/* Right Side: Difficulty Stats Text */}
                  <Box sx={{ flex: "1 1 50%", display: "flex", flexDirection: "column", gap: "1rem", justifyContent: "center" }}>
                    {[
                      { diff: "EASY", color: themeColors.neonGreen, data: difficultyStats.easy },
                      { diff: "MEDIUM", color: themeColors.neonCyan, data: difficultyStats.medium },
                      { diff: "HARD", color: themeColors.neonYellow, data: difficultyStats.hard }
                    ].map((row, i) => (
                       <Box key={i}>
                         <Typography sx={{ fontFamily: pixelFont, fontSize: "0.8rem", color: row.color, mb: "0.5rem" }}>{row.diff}</Typography>
                         <Typography sx={{ fontFamily: pixelFont, fontSize: "0.6rem", color: themeColors.textMuted, lineHeight: 1.5 }}>
                           GAMES PLAYED: {row.data.gamesPlayed}<br/>
                           QUESTIONS ANSWERED: {row.data.questionsAnswered}<br/>
                           CORRECT ANSWERS: {row.data.correctAnswers}<br/>
                           ACCURACY: {row.data.accuracy}%
                         </Typography>
                       </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}

            {/* Achievements & History tabs would go here styled similarly */}
            {selectedTab === 1 && (
               <Typography sx={{ fontFamily: pixelFont }}>Achievements coming soon...</Typography>
            )}
            {selectedTab === 2 && (
               <Typography sx={{ fontFamily: pixelFont }}>Game History coming soon...</Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ProfilePage;