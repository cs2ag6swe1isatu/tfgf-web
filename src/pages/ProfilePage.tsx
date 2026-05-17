import { useEffect, useMemo, useState } from "react";
import { useSoundContext } from "../context/SoundContext";
import { PowerUpInventoryPanel } from "../components/powerups/PowerUpInventoryPanel";
import {
  Typography,
  Box,
  Button,
  LinearProgress,
  Divider,
  GlobalStyles,
} from "@mui/material";
import { DIFFICULTIES, type Difficulty, type Mode } from "../constants";
import { useGameStore } from "../store/gameStore";
import { usePlayerStore } from "../store/playerStore";
import { getLevelProgressPercent } from '../utils/progression';
import type { GameSession, Player, PlayData } from "../types/player";
import { User } from "pixelarticons/react"; // Assuming you have this
import { ACHIEVEMENT_RULES, type AchievementCategory, type AchievementScope } from "../progression/achievementRules";
import RankIcon, { RANK_ICON_KEYFRAMES, RANK_COLORS, getRankSymbolType } from "../components/ui/RankIcon";





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

type ProfileStatsView = {
  score: number;
  gamesPlayed: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  difficultyStats: Record<Difficulty, DifficultySummary>;
};

type AchievementCard = {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  scope: AchievementScope;
};

const achievementCategoryOrder: AchievementCategory[] = [
  "Getting Started",
  "Perfect Scores",
  "Grind",
  "Skill",
  "Multiplayer",
];

const achievementCategoryTitles: Record<AchievementCategory, string> = {
  "Getting Started": "GETTING STARTED",
  "Perfect Scores": "PERFECT SCORES",
  Grind: "GRIND",
  Skill: "SKILL",
  Multiplayer: "MULTIPLAYER",
};

const createEmptyDifficultySummary = (): DifficultySummary => ({
  score: 0,
  gamesPlayed: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  accuracy: 0,
});

const createEmptyProfileStatsView = (): ProfileStatsView => ({
  score: 0,
  gamesPlayed: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  accuracy: 0,
  difficultyStats: DIFFICULTIES.reduce((acc, difficulty) => {
    acc[difficulty] = createEmptyDifficultySummary();
    return acc;
  }, {} as Record<Difficulty, DifficultySummary>),
});

  const buildProfileStatsView = (player: Player, mode: HistoryView): ProfileStatsView => {
    const view = createEmptyProfileStatsView();

    for (const categoryStats of Object.values(player.individualStats)) {
      const modeEntries = mode === "all" ? Object.values(categoryStats) : [categoryStats[mode]];

      for (const modeStats of modeEntries) {
        for (const [difficulty, playData] of Object.entries(modeStats) as Array<[Difficulty, PlayData]>) {
          const summary = view.difficultyStats[difficulty];
          summary.score += playData.scoreGained;
          summary.gamesPlayed += playData.gamesPlayed;
          summary.questionsAnswered += playData.totalQuestionsAnswered;
          summary.correctAnswers += playData.correctAnswers;

          view.score += playData.scoreGained;
          view.gamesPlayed += playData.gamesPlayed;
          view.questionsAnswered += playData.totalQuestionsAnswered;
          view.correctAnswers += playData.correctAnswers;
        }
      }
    }

    view.score = Math.round(view.score);

    for (const difficulty of DIFFICULTIES) {
      const summary = view.difficultyStats[difficulty];
      summary.score = Math.round(summary.score);
    }

    view.accuracy =
      view.questionsAnswered > 0 ? Math.round((view.correctAnswers / view.questionsAnswered) * 100) : 0;

    for (const difficulty of DIFFICULTIES) {
      const summary = view.difficultyStats[difficulty];
      summary.accuracy =
        summary.questionsAnswered > 0
          ? Math.round((summary.correctAnswers / summary.questionsAnswered) * 100)
          : 0;
    }

    return view;
  };

const formatHistoryDate = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);

const formatHistoryMode = (mode: Mode): string => (mode === "solo" ? "SOLO" : "MULTI");

type HistoryQuestion = GameSession["questions"][number];

const getQuestionReviewState = (question: HistoryQuestion, userAnswer?: string) => {
  const isAnswered = Boolean(userAnswer);
  const isCorrect = userAnswer === question.correctAnswer;

  return {
    isAnswered,
    isCorrect,
    isIncorrect: isAnswered && !isCorrect,
  };
};

const statsCardHeight = "clamp(8.5rem, 13vw, 10rem)";
const achievementCardHeight = "clamp(11rem, 15vw, 12.5rem)";


const ProfilePage = () => {
  const localPlayer = usePlayerStore((state) => state.getPlayer());
  const setScreen = useGameStore((state) => state.setScreen);
  const player = usePlayerStore((state) => state.getPlayer());
  const { playSound } = useSoundContext();
  const isDailyBonusClaimed = (() => {
  const last = localPlayer.lastPlayedDate;
  if (!last) return false;
  const now = new Date();
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  );
})();


  // States
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [historyView, setHistoryView] = useState<HistoryView>("all");
  const [historyMode, setHistoryMode] = useState<Mode>("solo");
  const [achCategoryView, setAchCategoryView] = useState<"solo" | "multiplayer">("solo");
  const [selectedAchievementCategory, setSelectedAchievementCategory] = useState<AchievementCategory | null>(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<GameSession | null>(null);

  useEffect(() => {
    if (selectedTab === 0) {
      setHistoryView("all");
    }

    if (selectedTab === 1) {
      setAchCategoryView("solo");
      setSelectedAchievementCategory(null);
    }

    if (selectedTab === 2) {
      setHistoryMode("solo");
    }
  }, [selectedTab]);

  useEffect(() => {
    setSelectedAchievementCategory(null);
  }, [achCategoryView]);

  useEffect(() => {
    if (selectedTab !== 2) {
      setSelectedHistoryEntry(null);
    }
  }, [selectedTab]);

  const playerName = player.name;
  const level = player.level;
  const xp = player.totalXp;
  const xpToNextLevel = player.xpToNextLevel;
  const displayedTopScore = Math.round(historyView === "all"
    ? Math.max(player.soloTopScore ?? 0, player.multiplayerTopScore ?? 0)
    : historyView === "solo"
      ? (player.soloTopScore ?? 0)
      : (player.multiplayerTopScore ?? 0));

  const profileStats = useMemo(() => buildProfileStatsView(player, historyView), [player, historyView]);
  const difficultyStats = profileStats.difficultyStats;

  const totalGamesPlayed = profileStats.gamesPlayed;
  const questionsAnswered = profileStats.questionsAnswered;
  const correctAnswers = profileStats.correctAnswers;
  const accuracy = profileStats.accuracy;

  const achievementCards = useMemo<AchievementCard[]>(() => {
    const unlockedIds = new Set(player.achievements.map((achievement) => achievement.id));

    return ACHIEVEMENT_RULES.filter((rule) => achCategoryView === "solo" ? rule.scope !== "multiplayer" : rule.scope !== "solo")
      .map((rule) => ({
        id: rule.id,
        category: rule.category,
        name: rule.name,
        description: rule.description,
        icon: rule.icon,
        unlocked: unlockedIds.has(rule.id),
        scope: rule.scope,
      }))
      .sort((left, right) => {
        const categoryDiff = achievementCategoryOrder.indexOf(left.category) - achievementCategoryOrder.indexOf(right.category);
        if (categoryDiff !== 0) return categoryDiff;
        return left.name.localeCompare(right.name);
      });
  }, [achCategoryView, player.achievements]);

  const unlockedAchievementCount = achievementCards.filter((achievement) => achievement.unlocked).length;
  const achievementProgress = achievementCards.length > 0 ? Math.round((unlockedAchievementCount / achievementCards.length) * 100) : 0;

  const subTabButtonStyle = (isActive: boolean) => ({
    fontFamily: pixelFont,
    fontSize: "1rem",
    cursor: "pointer",
    color: isActive ? themeColors.neonGreen : "white",
    textShadow: isActive ? `0 0 8px ${themeColors.neonGreen}` : "none",
    transition: "color 120ms ease, text-shadow 120ms ease",
  });

  // Reusable Retro Button Style
  const getButtonStyle = (isActive: boolean) => ({
    fontFamily: pixelFont,
    fontSize: "0.8rem",
    color: isActive ? "#000" : themeColors.neonGreen,
    backgroundColor: isActive ? themeColors.neonGreen : "transparent",
    border: `2px solid ${themeColors.neonGreen}`,
    borderRadius: 0,
    padding: "0.75rem 1rem",
    boxShadow: isActive ? `0 0 10px ${themeColors.neonGreen}` : "none",
    boxSizing: "border-box",
    whiteSpace: "nowrap",
    justifyContent: "center",
    textTransform: "uppercase",
    width: "100%",
    "&:hover": {
      backgroundColor: isActive ? themeColors.neonGreen : themeColors.neonGreenDim,
      color: isActive ? "#000" : themeColors.neonGreen,
      border: `2px solid ${themeColors.neonGreen}`,
      boxShadow: isActive ? `0 0 15px ${themeColors.neonGreen}` : `0 0 5px ${themeColors.neonGreenDim}`,
    },
  });

  <PowerUpInventoryPanel
  inventory={localPlayer.powerUpInventory ?? [
  { id: "fifty_fifty", count: 2 },
  { id: "time_freeze", count: 1 },
  { id: "double_xp", count: 1 },
]}
  dailyClaimed={isDailyBonusClaimed}
/>


  // Focus one achievements category at a time for maximum visibility
  const toggleCategory = (category: AchievementCategory) => {
    setSelectedAchievementCategory((current) => (current === category ? null : category));
  };

  const groupedAchievements = useMemo(() => {
    return achievementCards.reduce((acc, achievement) => {
      if (!acc[achievement.category]) acc[achievement.category] = [];
      acc[achievement.category].push(achievement);
      return acc;
    }, {} as Record<AchievementCategory, AchievementCard[]>);
  }, [achievementCards]);

  const historyEntries = useMemo(() => {
    return player.gameHistory
      .filter((entry: GameSession) => entry.mode === historyMode)
      .slice(-10)
      .reverse();
  }, [historyMode, player.gameHistory]);

  const historyReviewEntry = selectedHistoryEntry;

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
          {/* Rank icon keyframes */}
          <GlobalStyles styles={{ [RANK_ICON_KEYFRAMES]: {} }} />

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
            flex: "0 0 20%",
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
                <img
                  src={`./img/avatars/${encodeURIComponent(player.avatar)}`}
                  alt={playerName}
                  style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }}
                />
              ) : (
                <User style={{ fontSize: "3rem" }} />
              )}
            </Box>
            <Box>
              <Typography sx={{ fontFamily: pixelFont, fontSize: "0.8rem", letterSpacing: "2px" }}>{playerName}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.4rem', mt: '0.3rem' }}>
                <RankIcon
                  type={getRankSymbolType(player.rank.name)}
                  color={RANK_COLORS[getRankSymbolType(player.rank.name)].primary}
                  glow={RANK_COLORS[getRankSymbolType(player.rank.name)].glow}
                  size={20}
                  style={{ flexShrink: 0 }}
                />
                <Typography sx={{ fontFamily: pixelFont, fontSize: "0.65rem", color: RANK_COLORS[getRankSymbolType(player.rank.name)].primary, textShadow: `0 0 6px ${RANK_COLORS[getRankSymbolType(player.rank.name)].glow}` }}>
                  {player.rank.name}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Level Progress */}
          <Box>
            <Typography sx={{ fontFamily: pixelFont, fontSize: "0.8rem", mb: "0.5rem", color: "white" }}>Level {level}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Box sx={{ flex: 1, border: "1px solid white", p: "2px" }}>
                <LinearProgress
                  variant="determinate"
                  value={getLevelProgressPercent(xp)}
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
          <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "1rem"}}>
            <Button sx={getButtonStyle(selectedTab === 0)} onClick={() => { setSelectedTab(0); playSound("select"); }} onMouseEnter={() => playSound("hover")}>
              STATS
            </Button>
            <Button sx={getButtonStyle(selectedTab === 1)} onClick={() => { setSelectedTab(1); playSound("select"); }} onMouseEnter={() => playSound("hover")}>
              ACHIEVEMENTS
            </Button>
            <Button sx={getButtonStyle(selectedTab === 2)} onClick={() => { setSelectedTab(2); playSound("select"); }} onMouseEnter={() => playSound("hover")}>
              HISTORY
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
              onClick={() => { setScreen("home"); playSound("select"); }} onMouseEnter={() => playSound("hover")}
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
  onClick={() => { setHistoryView("all"); playSound("select"); }}
  onMouseEnter={() => playSound("hover")}
  sx={subTabButtonStyle(historyView === "all")}
                  >
                    All
                  </Typography>
                  <Typography sx={{ color: "white" }}>|</Typography>
                  <Typography
                    onClick={() => { setHistoryView("solo"); playSound("select"); }} onMouseEnter={() => playSound("hover")}
                    sx={subTabButtonStyle(historyView === "solo")}
                  >
                    Solo
                  </Typography>
                  <Typography sx={{ color: "white" }}>|</Typography>
                  <Typography
                    onClick={() => { setHistoryView("multiplayer"); playSound("select"); }} onMouseEnter={() => playSound("hover")}
                    sx={subTabButtonStyle(historyView === "multiplayer")}
                  >
                    Multi
                  </Typography>
                </Box>

                {/* 3x2 Grid */}
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", mb: "2rem", alignItems: "stretch" }}>
                  {[
                    { label: "TOTAL SCORE", val: profileStats.score },
                    { label: "TOP SCORE", val: displayedTopScore },
                    { label: "TOTAL GAMES PLAYED", val: totalGamesPlayed },
                    { label: "QUESTIONS ANSWERED", val: questionsAnswered },
                    { label: "CORRECT ANSWERS", val: correctAnswers },
                    { label: "ACCURACY", val: `${accuracy}%` },
                  ].map((stat, i) => (
                    <Box
                      key={i}
                      sx={{
                        border: `1px solid ${themeColors.textMuted}`,
                        p: "1rem",
                        textAlign: "center",
                        minHeight: statsCardHeight,
                        height: statsCardHeight,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        overflow: "hidden",
                      }}
                    >
                      <Typography sx={{ fontFamily: pixelFont, fontSize: "clamp(1rem, 1.6vw, 1.5rem)", lineHeight: 1.1, overflowWrap: "anywhere" }}>{stat.val}</Typography>
                      <Typography sx={{ fontFamily: pixelFont, fontSize: "clamp(0.45rem, 0.8vw, 0.6rem)", color: themeColors.neonCyan, lineHeight: 1.35 }}>{stat.label}</Typography>
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
                  <Box sx={{ flex: "1 1 50%", display: "flex", flexDirection: "column", gap: "1rem", justifyContent: "center", minHeight: 0 }}>
                    {[
                      { diff: "EASY", color: themeColors.neonGreen, data: difficultyStats.easy },
                      { diff: "MEDIUM", color: themeColors.neonCyan, data: difficultyStats.medium },
                      { diff: "HARD", color: themeColors.neonYellow, data: difficultyStats.hard }
                    ].map((row, i) => (
                       <Box key={i} sx={{ overflow: "hidden" }}>
                         <Typography sx={{ fontFamily: pixelFont, fontSize: "0.75rem", color: row.color, mb: "0.35rem" }}>{row.diff}</Typography>
                         <Typography sx={{ fontFamily: pixelFont, fontSize: "0.55rem", color: themeColors.textMuted, lineHeight: 1.45 }}>
                           GAMES: {row.data.gamesPlayed}<br/>
                           QUESTIONS: {row.data.questionsAnswered}<br/>
                           CORRECT: {row.data.correctAnswers}<br/>
                           ACCURACY: {row.data.accuracy}%
                         </Typography>
                       </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}

            {/* ACHIEVEMENTS TAB */}
            {selectedTab === 1 && (
              <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                
                {/* Header Solo | Multiplayer */}
                <Box sx={{ display: "flex", gap: "1.5rem", mb: "1rem", alignItems: "center", justifyContent: "center", width: "100%" }}>
                  <Typography
                    onClick={() => { setAchCategoryView("solo"); playSound("select"); }} onMouseEnter={() => playSound("hover")}
                    sx={subTabButtonStyle(achCategoryView === "solo")}
                  >
                    Solo
                  </Typography>
                  <Typography sx={{ color: "white" }}>|</Typography>
                  <Typography
                    onClick={() => { setAchCategoryView("multiplayer"); playSound("select"); }} onMouseEnter={() => playSound("hover")}
                    sx={subTabButtonStyle(achCategoryView === "multiplayer")}
                  >
                    Multi
                  </Typography>
                </Box>

                {/* Unlocked Progress Bar */}
                <Box sx={{ display: "flex", alignItems: "center", gap: "1rem", mb: "2rem" }}>
                  <Typography sx={{ fontFamily: pixelFont, fontSize: "0.5rem", color: themeColors.textMuted }}>
                    {unlockedAchievementCount}/{achievementCards.length} Unlocked
                  </Typography>
                  <Box sx={{ flex: 1, height: "2px", backgroundColor: "#003300", position: "relative" }}>
                    <Box sx={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${achievementProgress}%`, backgroundColor: themeColors.textMuted }} />
                  </Box>
                  <Typography sx={{ fontFamily: pixelFont, fontSize: "0.5rem", color: themeColors.textMuted }}>
                    {achievementProgress}%
                  </Typography>
                </Box>

                {/* Categories Loop */}
                {achievementCategoryOrder
                  .filter((category) => groupedAchievements[category]?.length)
                  .filter((category) => selectedAchievementCategory === null || selectedAchievementCategory === category)
                  .map((category) => {
                  const items = groupedAchievements[category] ?? [];
                  const isExpanded = selectedAchievementCategory === category;
                  const visibleItems = isExpanded ? items : items.slice(0, 3);

                  return (
                    <Box key={category} sx={{ mb: "1.5rem" }}>
                      
                      {/* Category Title & Dropdown Toggle */}
                      <Box 
                        onClick={() => toggleCategory(category)} 
                        sx={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", mb: "1rem", width: "fit-content" }}
                      >
                        <Typography sx={{ fontFamily: pixelFont, color: themeColors.neonYellow, fontSize: "0.7rem", letterSpacing: "1px" }}>
                          {achievementCategoryTitles[category]}
                        </Typography>
                        <Typography sx={{ fontFamily: pixelFont, color: "white", fontSize: "0.5rem" }}>
                          {isExpanded ? "▲" : "▼"}
                        </Typography>
                      </Box>

                      {/* Cards Grid */}
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", alignItems: "stretch" }}>
                        {visibleItems.map((ach) => (
                          <Box 
                            key={ach.id} 
                            sx={{
                              border: `1px solid ${themeColors.neonCyan}`,
                              backgroundColor: ach.unlocked ? "rgba(0, 0, 0, 0.09)" : "rgba(0, 170, 170, 0.5)",
                              borderRadius: "8px",
                              p: "0.7rem",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.4rem",
                              minHeight: achievementCardHeight,
                              height: achievementCardHeight,
                              overflow: "hidden",
                            }}
                          >
                            {/* Icon and Title Row */}
                            <Box sx={{ display: "flex", gap: "0.6rem", alignItems: "center", minHeight: 0 }}>
                              <Box sx={{ 
                                width: "48px", height: "48px", 
                                border: `${ach.unlocked ? 0 : 1}px solid ${themeColors.neonCyan}`, 
                                display: "flex", alignItems: "center", justifyContent: "center",
                                borderRadius: "4px",
                                backgroundColor: `${ach.unlocked ? 'rgba(0, 0, 0, 0.00)' : 'rgba(0, 170, 170, 0.5)'}`,
                                overflow: "hidden",
                              }}>
                                <img
                                  src={ach.unlocked ? ach.icon : "/img/achievements/Locked%20icon.png"}
                                  alt={ach.name}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    imageRendering: "pixelated",
                                    opacity: 1,
                                  }}
                                />
                              </Box>
                              <Typography sx={{ fontFamily: pixelFont, color: themeColors.neonCyan, fontSize: "0.55rem", lineHeight: 1.35, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                                {ach.name}
                              </Typography>
                            </Box>

                            {/* Description */}
                            <Typography sx={{ fontFamily: pixelFont, color: themeColors.neonGreen, fontSize: "0.5rem", lineHeight: 1.45, flex: 1, minHeight: 0, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 4 }}>
                              {ach.description}
                            </Typography>

                            {/* Status Pill */}
                            <Box sx={{ display: "flex", justifyContent: "center", mt: "0.4rem" }}>
                              <Box sx={{ 
                                backgroundColor: themeColors.neonGreen,
                                border: ach.unlocked ? "none" : `1px solid ${themeColors.neonGreen}`,
                                color: "#000",
                                px: "0.8rem", py: "0.3rem", borderRadius: "12px", 
                                fontFamily: pixelFont, fontSize: "0.4rem", 
                                letterSpacing: "1px", textTransform: "uppercase" 
                              }}>
                                {ach.unlocked ? "UNLOCKED" : "LOCKED"}
                              </Box>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
            {selectedTab === 2 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <Box sx={{ display: "flex", gap: "1.5rem", alignItems: "center", justifyContent: "center", width: "100%" }}>
                  <Typography
                   onClick={() => { setSelectedHistoryEntry(null); setHistoryMode("solo"); playSound("select"); }} onMouseEnter={() => playSound("hover")}
                    sx={{
                      ...subTabButtonStyle(historyMode === "solo"),
                    }}
                  >
                    SOLO
                  </Typography>
                  <Typography sx={{ color: "white" }}>|</Typography>
                  <Typography
                    onClick={() => { setSelectedHistoryEntry(null); setHistoryMode("multiplayer"); playSound("select"); }} onMouseEnter={() => playSound("hover")}
                    sx={{
                      ...subTabButtonStyle(historyMode === "multiplayer"),
                    }}
                  >
                    MULTI
                  </Typography>
                </Box>

                {historyReviewEntry ? (
                  <Box
                    sx={{
                      border: `1px solid ${historyReviewEntry.mode === "solo" ? themeColors.neonGreen : themeColors.neonCyan}`,
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      borderRadius: "8px",
                      p: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <Typography sx={{ fontFamily: pixelFont, fontSize: "0.8rem", color: themeColors.neonYellow }}>
                          {historyReviewEntry.category.toUpperCase()} | {historyReviewEntry.difficulty.toUpperCase()}
                        </Typography>
                        <Typography sx={{ fontFamily: pixelFont, fontSize: "0.55rem", color: themeColors.textMuted }}>
                          {formatHistoryDate(historyReviewEntry.date)} | {formatHistoryMode(historyReviewEntry.mode)}
                        </Typography>
                      </Box>
                      <Button
                        onClick={() => { setSelectedHistoryEntry(null); playSound("select"); }} onMouseEnter={() => playSound("hover")}
                        sx={{
                          ...getButtonStyle(false),
                          width: "auto",
                          px: "1.2rem",
                          color: themeColors.neonCyan,
                          borderColor: themeColors.neonCyan,
                          "&:hover": {
                            backgroundColor: themeColors.neonGreenDim,
                            color: themeColors.neonCyan,
                            border: `2px solid ${themeColors.neonCyan}`,
                            boxShadow: `0 0 5px ${themeColors.neonGreenDim}`,
                          },
                        }}
                      >
                        BACK
                      </Button>
                    </Box>

                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                      {[
                        { label: "QUESTIONS", value: historyReviewEntry.questions.length },
                        { label: "CORRECT", value: historyReviewEntry.correctAnswers },
                        { label: "XP", value: `+${historyReviewEntry.score}` },
                      ].map((stat) => (
                        <Box
                          key={stat.label}
                          sx={{
                            border: `1px solid ${themeColors.textMuted}`,
                            p: "0.75rem",
                            minHeight: "5.5rem",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <Typography sx={{ fontFamily: pixelFont, fontSize: "0.9rem", color: "white" }}>{stat.value}</Typography>
                          <Typography sx={{ fontFamily: pixelFont, fontSize: "0.45rem", color: themeColors.neonCyan, textAlign: "center" }}>
                            {stat.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                      {historyReviewEntry.questions.map((question, index) => {
                        const userAnswer = historyReviewEntry.userAnswers[index];
                        const reviewState = getQuestionReviewState(question, userAnswer);

                        return (
                          <Box
                            key={question.id}
                            sx={{
                              border: `1px solid ${reviewState.isCorrect ? themeColors.neonGreen : reviewState.isIncorrect ? "#ff4d4d" : themeColors.textMuted}`,
                              backgroundColor: "rgba(0, 0, 0, 0.22)",
                              borderRadius: "8px",
                              p: "0.85rem",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.65rem",
                            }}
                          >
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                              <Typography sx={{ fontFamily: pixelFont, fontSize: "0.55rem", color: themeColors.neonYellow, lineHeight: 1.45, flex: 1 }}>
                                {index + 1}. {question.text}
                              </Typography>
                              <Typography sx={{ fontFamily: pixelFont, fontSize: "0.45rem", color: reviewState.isCorrect ? themeColors.neonGreen : reviewState.isIncorrect ? "#ff4d4d" : themeColors.textMuted }}>
                                {reviewState.isCorrect ? "CORRECT" : reviewState.isIncorrect ? "INCORRECT" : "NO ANSWER"}
                              </Typography>
                            </Box>

                            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.5rem" }}>
                              {question.allAnswers.map((answer) => {
                                const isCorrectAnswer = answer === question.correctAnswer;
                                const isUserAnswer = answer === userAnswer;

                                return (
                                  <Box
                                    key={answer}
                                    sx={{
                                      border: `1px solid ${isCorrectAnswer ? themeColors.neonGreen : isUserAnswer ? "#ff4d4d" : themeColors.textMuted}`,
                                      color: isCorrectAnswer ? themeColors.neonGreen : isUserAnswer ? "#ff4d4d" : "white",
                                      backgroundColor: isCorrectAnswer
                                        ? "rgba(0, 255, 0, 0.08)"
                                        : isUserAnswer
                                          ? "rgba(255, 77, 77, 0.08)"
                                          : "rgba(0, 0, 0, 0.15)",
                                      borderRadius: "6px",
                                      px: "0.65rem",
                                      py: "0.5rem",
                                      fontFamily: pixelFont,
                                      fontSize: "0.42rem",
                                      lineHeight: 1.35,
                                      minHeight: "3.25rem",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    {answer}
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ) : historyEntries.length === 0 ? (
                  <Box
                    sx={{
                      border: `1px solid ${themeColors.textMuted}`,
                      p: "1.5rem",
                      textAlign: "center",
                      color: themeColors.textMuted,
                    }}
                  >
                    <Typography sx={{ fontFamily: pixelFont, fontSize: "0.8rem" }}>
                      NO {historyMode === "solo" ? "SOLO" : "MULTI"} HISTORY YET
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {historyEntries.map((entry) => (
                      <Box
                        key={entry.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectedHistoryEntry(entry); playSound("select"); }} onMouseEnter={() => playSound("hover")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedHistoryEntry(entry);
                          }
                        }}
                        sx={{
                          border: `1px solid ${entry.mode === "solo" ? themeColors.neonGreen : themeColors.neonCyan}`,
                          backgroundColor: "rgba(0, 0, 0, 0.25)",
                          borderRadius: "8px",
                          p: "1rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.6rem",
                          cursor: "pointer",
                          transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                          outline: "none",
                          "&:hover": {
                            transform: "translateY(-1px)",
                            borderColor: themeColors.neonYellow,
                            boxShadow: `0 0 12px ${themeColors.neonGreenDim}`,
                          },
                          "&:focus-visible": {
                            borderColor: themeColors.neonYellow,
                            boxShadow: `0 0 0 2px ${themeColors.neonYellow}`,
                          },
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline" }}>
                          <Typography sx={{ fontFamily: pixelFont, fontSize: "0.7rem", color: themeColors.neonYellow }}>
                            {entry.category.toUpperCase()} | {entry.difficulty.toUpperCase()}
                          </Typography>
                          <Typography sx={{ fontFamily: pixelFont, fontSize: "0.7rem", color: "white" }}>
                            {entry.correctAnswers}/{entry.totalQuestions}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline" }}>
                          <Typography sx={{ fontFamily: pixelFont, fontSize: "0.55rem", color: themeColors.textMuted }}>
                            {formatHistoryDate(entry.date)} | {formatHistoryMode(entry.mode)}
                          </Typography>
                          <Typography sx={{ fontFamily: pixelFont, fontSize: "0.55rem", color: themeColors.neonGreen }}>
                            XP +{entry.score}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ProfilePage;