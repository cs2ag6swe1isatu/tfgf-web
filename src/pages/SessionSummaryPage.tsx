import { useMemo } from "react";
import { Typography, Box, Button } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useGameStore, useTriviaStore, usePlayerStore, useMultiplayerStore } from "../store";
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
  const rankings = useTriviaStore((state) => state.rankings);
  const playerScores = useTriviaStore((state) => state.playerScores);
  const lobbyPlayers = useMultiplayerStore((state) => state.players);

  const player = usePlayerStore((state) => state.player ?? state.getPlayer());
  const localPlayer = usePlayerStore((state) => state.getPlayer());

  const isSolo = gameConfig.mode === "solo";
  const isMultiplayer = gameConfig.mode === "multiplayer";

  const displayedScore = useMemo(() => {
    if (isSolo) return score;
    const rankingScore = rankings.find((entry) => entry.playerId === localPlayer.id)?.score;
    if (typeof rankingScore === "number") return rankingScore;
    return playerScores[localPlayer.id] ?? score;
  }, [isSolo, score, rankings, playerScores, localPlayer.id]);

  const latestSession = useMemo(
    () =>
      [...(player?.gameHistory ?? [])]
        .reverse()
        .find((session) => session.mode === (isMultiplayer ? "multiplayer" : "solo")) ?? null,
    [player, isMultiplayer]
  );

  const xpGained = useMemo(() => {
    if (!latestSession) return 0;
    return buildSessionDelta({
      mode: latestSession.mode,
      category: latestSession.category,
      difficulty: latestSession.difficulty,
      totalQuestions: latestSession.totalQuestions,
      correctAnswers: latestSession.correctAnswers,
      score: latestSession.score,
      questions: latestSession.questions,
      userAnswers: latestSession.userAnswers,
      timeTaken: latestSession.timeTaken,
      timePerQuestion: latestSession.timePerQuestion,
      mastered: latestSession.mastered,
      won: latestSession.won,
      topThreeFinish: latestSession.topThreeFinish,
    }).xpGained;
  }, [latestSession]);

  const rankProgress = getLevelProgressPercent(player?.totalXp ?? 0);
  const rankName = player?.rank?.name?.toUpperCase() ?? "NO RANK";
  const clampedRankProgress = Math.max(0, Math.min(100, rankProgress));

  const placementRows = useMemo(() => {
    if (!isMultiplayer) return [];

    const byPlayerId = new Map<string, { playerId: string; name: string; score: number }>();

    rankings.forEach((entry) => {
      byPlayerId.set(entry.playerId, {
        playerId: entry.playerId,
        name: entry.name,
        score: entry.score,
      });
    });

    lobbyPlayers.forEach((player) => {
      const existing = byPlayerId.get(player.id);
      byPlayerId.set(player.id, {
        playerId: player.id,
        name: existing?.name ?? player.name,
        score: playerScores[player.id] ?? existing?.score ?? 0,
      });
    });

    const existingLocal = byPlayerId.get(localPlayer.id);
    byPlayerId.set(localPlayer.id, {
      playerId: localPlayer.id,
      name: existingLocal?.name ?? localPlayer.name,
      score: playerScores[localPlayer.id] ?? existingLocal?.score ?? 0,
    });

    return Array.from(byPlayerId.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((entry, index) => ({
      rank: index + 1,
      name: entry.playerId === localPlayer.id ? "YOU" : entry.name.toUpperCase(),
      score: entry.score,
    }));
  }, [isMultiplayer, rankings, lobbyPlayers, localPlayer.id, localPlayer.name, playerScores]);

  const renderRankIndicator = (rank: number) => {
    return (
      <Box
        sx={{
          minWidth: 24,
          height: 24,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: "1px solid",
          borderColor: "secondary.main",
          color: "text.primary",
          bgcolor: (theme) => alpha(theme.palette.secondary.main, rank <= 3 ? 0.18 : 0.1),
          fontSize: "0.72rem",
          lineHeight: 1,
        }}
      >
        {rank}
      </Box>
    );
  };

  if (!isSolo && !isMultiplayer) {
    return null;
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        px: { xs: 2, md: 4 },
        py: { xs: 2, md: 2.5 },
        boxSizing: "border-box",
        bgcolor: "background.default",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        gap: { xs: 1.5, md: 1.6 },
      }}
    >
      <Typography
        sx={{
          mt: 0.2,
          fontSize: { xs: "1.8rem", md: "2.3rem" },
          letterSpacing: "0.08em",
          color: "error.main",
          textShadow: (theme) => `0 0 10px ${alpha(theme.palette.error.main, 0.6)}`,
          textAlign: "center",
        }}
      >
        GAME OVER !
      </Typography>

      {!isSolo && (
        <Box sx={{ position: "relative", width: "fit-content", mt: -0.6 }}>
          <Typography
            sx={{
              color: "secondary.main",
              fontSize: { xs: "1rem", md: "1.1rem" },
              letterSpacing: "0.06em",
              textShadow: (theme) => `0 0 8px ${alpha(theme.palette.secondary.main, 0.5)}`,
            }}
          >
            PLACEMENTS
          </Typography>
          <Box
            sx={{
              position: "absolute",
              top: -9,
              left: 0,
              width: 16,
              height: 10,
              bgcolor: "secondary.main",
              transform: "rotate(-12deg)",
              boxShadow: (theme) => `0 0 6px ${alpha(theme.palette.secondary.main, 0.5)}`,
              clipPath: "polygon(0% 100%, 12% 36%, 28% 100%, 50% 26%, 72% 100%, 88% 36%, 100% 100%)",
            }}
          />
        </Box>
      )}

      <Box sx={{ width: "100%", maxWidth: 860, display: "grid", gap: 1.5, flex: 1, minHeight: 0 }}>
        {!isSolo && (
          <Box
            sx={{
              border: "2px solid",
              borderColor: "secondary.main",
              p: { xs: 1, md: 1.2 },
              bgcolor: "background.paper",
              boxShadow: (theme) => `0 0 16px ${alpha(theme.palette.secondary.main, 0.35)}`,
              display: "grid",
              gap: 0.8,
              alignContent: "center",
            }}
          >
            {placementRows.map((row) => {
              const rowOpacity = [0.3, 0.24, 0.18, 0.14, 0.1][row.rank - 1] ?? 0.1;
              return (
                <Box
                  key={row.rank}
                  sx={{
                    minHeight: { xs: 42, md: 46 },
                    px: 1.2,
                    py: 0.6,
                    bgcolor: (theme) => alpha(theme.palette.secondary.main, rowOpacity),
                    border: "1px solid",
                    borderColor: (theme) => alpha(theme.palette.secondary.main, 0.45),
                    display: "grid",
                    gridTemplateColumns: "24px 28px 1fr auto auto",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  {renderRankIndicator(row.rank)}
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                    }}
                  />
                  <Typography sx={{ color: "text.primary", fontSize: { xs: "0.72rem", md: "0.8rem" }, letterSpacing: "0.03em" }}>
                    {row.name}
                  </Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: { xs: "0.72rem", md: "0.84rem" }, minWidth: 36, textAlign: "right" }}>
                    {row.score}
                  </Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.5rem", letterSpacing: "0.04em", minWidth: 16, textAlign: "right" }}>
                    XP
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              border: "2px dashed",
              borderColor: "secondary.main",
              py: 1.2,
              px: 1,
              textAlign: "center",
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 96,
            }}
          >
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", letterSpacing: "0.06em" }}>YOUR SCORE</Typography>
            <Typography
              sx={{
                mt: 0.4,
                fontSize: { xs: "1.5rem", md: "1.8rem" },
                color: "text.primary",
                fontWeight: 700,
              }}
            >
              {displayedScore}
            </Typography>
          </Box>

          <Box
            sx={{
              border: "2px dashed",
              borderColor: "secondary.main",
              py: 1.2,
              px: 1,
              textAlign: "center",
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 96,
            }}
          >
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", letterSpacing: "0.06em" }}>XP GAINED</Typography>
            <Typography
              sx={{
                mt: 0.4,
                fontSize: { xs: "1.5rem", md: "1.8rem" },
                color: "text.primary",
                fontWeight: 700,
              }}
            >
              {xpGained}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: "background.paper",
            border: "2px solid",
            borderColor: "secondary.main",
            p: { xs: 1.1, md: 1.2 },
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: 120,
          }}
        >
          <Typography sx={{ textAlign: "center", color: "text.secondary", fontSize: "0.72rem", mb: 0.8, letterSpacing: "0.05em" }}>
            RANK PROGRESS
          </Typography>

          <Box sx={{ width: "100%", maxWidth: 620, mx: "auto", mt: 0.2, mb: 1 }}>
            <Box
              sx={{
                position: "relative",
                height: "16px",
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.14),
                border: "1px solid",
                borderColor: "secondary.main",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  width: `${clampedRankProgress}%`,
                  height: "100%",
                  bgcolor: "secondary.main",
                  transition: "width 300ms ease",
                }}
              />

              <Typography
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: `clamp(0%, calc(${clampedRankProgress}% - 12px), calc(100% - 28px))`,
                  transform: "translateY(-50%)",
                  color: "text.primary",
                  fontSize: "0.58rem",
                  lineHeight: 1,
                }}
              >
                {clampedRankProgress}%
              </Typography>
            </Box>
          </Box>

          <Typography
            sx={{
              textAlign: "center",
              color: "text.primary",
              fontSize: { xs: "1.05rem", md: "1.3rem" },
              letterSpacing: "0.07em",
            }}
          >
            {rankName}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ width: "100%", maxWidth: 860, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 0.3 }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => setScreen("home")}
          sx={{
            py: 1,
            fontSize: { xs: "0.72rem", md: "0.82rem" },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          MAIN MENU
        </Button>

        <Button
          variant="outlined"
          color="primary"
          onClick={() => setScreen("profile")}
          sx={{
            py: 1,
            fontSize: { xs: "0.72rem", md: "0.82rem" },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          VIEW PROFILE
        </Button>
      </Box>
    </Box>
  );
};

export default SessionSummaryPage;
