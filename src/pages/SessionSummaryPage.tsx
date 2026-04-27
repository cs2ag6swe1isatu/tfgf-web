import { useMemo } from "react";
import { Typography, Box, Button } from "@mui/material";
import { useGameStore, useTriviaStore, usePlayerStore } from "../store";
import { buildSessionDelta } from "../progression/progressionRules";

function getLevelProgressPercent(totalXp: number) {
  let threshold = 100;
  let remaining = Math.max(0, totalXp);

  while (remaining >= threshold) {
    remaining -= threshold;
    threshold = Math.floor(threshold * 1.5);
  }

  if (threshold <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((remaining / threshold) * 100)));
}

const SessionSummaryPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const gameConfig = useGameStore((state) => state.gameConfig);
  const score = useTriviaStore((state) => state.score);
  const questions = useTriviaStore((state) => state.questions);
  const userAnswers = useTriviaStore((state) => state.userAnswers);

  const player = usePlayerStore((state) => state.player ?? state.getPlayer());

  const category = gameConfig.category;
  const difficulty = gameConfig.difficulty;
  const isSolo = gameConfig.mode === "solo";

  const totalQuestions = questions.length;
  const correctAnswers = useMemo(
    () => questions.filter((q, index) => userAnswers[index] === q.correctAnswer).length,
    [questions, userAnswers]
  );
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  const latestSoloSession = useMemo(
    () => [...(player?.gameHistory ?? [])].reverse().find((session) => session.mode === "solo") ?? null,
    [player]
  );

  const xpGained = useMemo(() => {
    if (!latestSoloSession) return 0;
    return buildSessionDelta({
      mode: latestSoloSession.mode,
      category: latestSoloSession.category,
      difficulty: latestSoloSession.difficulty,
      totalQuestions: latestSoloSession.totalQuestions,
      correctAnswers: latestSoloSession.correctAnswers,
      score: latestSoloSession.score,
      questions: latestSoloSession.questions,
      userAnswers: latestSoloSession.userAnswers,
      timeTaken: latestSoloSession.timeTaken,
      timePerQuestion: latestSoloSession.timePerQuestion,
      mastered: latestSoloSession.mastered,
      won: latestSoloSession.won,
      topThreeFinish: latestSoloSession.topThreeFinish,
    }).xpGained;
  }, [latestSoloSession]);

  const rankProgress = getLevelProgressPercent(player?.totalXp ?? 0);
  const rankName = player?.rank?.name?.toUpperCase() ?? "NO RANK";
  const clampedRankProgress = Math.max(0, Math.min(100, rankProgress));

  if (!isSolo) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          bgcolor: "background.default",
          px: 3,
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography sx={{ color: "text.primary", mb: 2 }}>
            Session summary is available for solo mode only.
          </Typography>
          <Button variant="outlined" color="primary" onClick={() => setScreen("home")}>
            MAIN MENU
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        px: { xs: 2, md: 5 },
        py: { xs: 3, md: 4 },
        boxSizing: "border-box",
        bgcolor: "background.default",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        gap: { xs: 2.5, md: 3 },
        "&::before, &::after": {
          content: '""',
          position: "absolute",
          left: 0,
          width: "100%",
          height: "2px",
          bgcolor: "secondary.main",
          boxShadow: (theme) => `0 0 10px ${theme.palette.secondary.main}`,
        },
        "&::before": { top: 0 },
        "&::after": { bottom: 0 },
      }}
    >
      <Typography
        sx={{
          mt: { xs: 1, md: 2 },
          fontSize: { xs: "1.8rem", md: "2.6rem" },
          letterSpacing: "0.08em",
          color: "primary.main",
          textShadow: (theme) => `0 0 10px ${theme.palette.primary.main}66`,
          textAlign: "center",
        }}
      >
        GAME OVER !
      </Typography>

      <Box sx={{ width: "100%", maxWidth: 840, display: "grid", gap: 2.5 }}>
        <Box
          sx={{
            border: "3px solid",
            borderColor: "secondary.main",
            borderRadius: "10px",
            p: { xs: 1.5, md: 2 },
            bgcolor: "background.paper",
            boxShadow: (theme) => `0 0 14px ${theme.palette.secondary.main}55`,
          }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <Box sx={{ border: "1px dashed", borderColor: "secondary.main", borderRadius: 1, py: 1.25, px: 1, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", letterSpacing: "0.06em" }}>YOUR SCORE</Typography>
              <Typography
                sx={{
                  mt: 0.7,
                  fontSize: { xs: "1.6rem", md: "2rem" },
                  color: "text.primary",
                  fontWeight: 700,
                }}
              >
                {score}
              </Typography>
            </Box>

            <Box sx={{ border: "1px dashed", borderColor: "secondary.main", borderRadius: 1, py: 1.25, px: 1, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", letterSpacing: "0.06em" }}>XP GAINED</Typography>
              <Typography
                sx={{
                  mt: 0.7,
                  fontSize: { xs: "1.6rem", md: "2rem" },
                  color: "text.primary",
                  fontWeight: 700,
                }}
              >
                {xpGained}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: "background.paper",
            border: "2px solid",
            borderColor: "secondary.main",
            borderRadius: "6px",
            p: { xs: 1.5, md: 2 },
            position: "relative",
          }}
        >
          <Typography sx={{ textAlign: "center", color: "text.secondary", fontSize: "0.78rem", mb: 1 }}>RANK PROGRESS</Typography>

          <Box sx={{ width: "100%", maxWidth: 560, mx: "auto", mt: 0.4, mb: 1.5 }}>
            <Box sx={{ position: "relative", height: "14px", borderRadius: "999px", bgcolor: "#1a1a1a", border: "1px solid", borderColor: "secondary.main", overflow: "hidden" }}>
              <Box
                sx={{
                  width: `${clampedRankProgress}%`,
                  height: "100%",
                  bgcolor: "primary.main",
                  transition: "width 300ms ease",
                }}
              />

              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: `calc(${clampedRankProgress}% - 7px)`,
                  transform: "translateY(-50%)",
                  width: "14px",
                  height: "14px",
                  bgcolor: "secondary.main",
                  clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 92%, 50% 70%, 21% 92%, 32% 57%, 2% 35%, 39% 35%)",
                  filter: (theme) => `drop-shadow(0 0 4px ${theme.palette.secondary.main})`,
                }}
              />
            </Box>
          </Box>

          <Typography
            sx={{
              textAlign: "center",
              color: "primary.main",
              fontSize: { xs: "1.15rem", md: "1.45rem" },
              letterSpacing: "0.07em",
            }}
          >
            {rankName}
          </Typography>

          <Typography sx={{ position: "absolute", right: 10, bottom: 8, color: "text.secondary", fontSize: "0.62rem" }}>
            {clampedRankProgress}%
          </Typography>
        </Box>

        <Box sx={{ textAlign: "center", color: "text.secondary", fontSize: "0.72rem", lineHeight: 1.5 }}>
          <Typography sx={{ fontSize: "inherit" }}>CATEGORY: {category ?? "-"}</Typography>
          <Typography sx={{ fontSize: "inherit" }}>DIFFICULTY: {difficulty ?? "-"}</Typography>
          <Typography sx={{ fontSize: "inherit" }}>
            CORRECT ANSWERS: {correctAnswers} / {totalQuestions} ({accuracy}%)
          </Typography>
        </Box>
      </Box>

      <Box sx={{ width: "100%", maxWidth: 840, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: { xs: 0.5, md: 1 } }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => setScreen("home")}
          sx={{ py: 1.2, fontSize: { xs: "0.74rem", md: "0.88rem" } }}
        >
          MAIN MENU
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          onClick={() => setScreen("profile")}
          sx={{ py: 1.2, fontSize: { xs: "0.74rem", md: "0.88rem" } }}
        >
          VIEW PROFILE
        </Button>
      </Box>
    </Box>
  );
};

export default SessionSummaryPage;
