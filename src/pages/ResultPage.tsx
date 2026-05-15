import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, LinearProgress, GlobalStyles } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";
import { usePlayerStore } from "../store/playerStore";
import { getLevelProgressPercent } from "../utils/progression";
import { formatScore, formatXP, formatAccuracy } from "../utils/formatters";
import RankIcon, { RANK_ICON_KEYFRAMES, RANK_COLORS, getRankSymbolType } from "../components/ui/RankIcon";
import { keyframes, styled } from "@mui/material/styles";
import { LevelUpPopup } from "../components/rewards/LevelUpPopup";

// ─── Cyberpunk Arcade Keyframes ─────────────────────────────────────────────────

const scanline = keyframes`
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
`;

const glitch = keyframes`
  0%, 90%, 100% {
    text-shadow: 2px 2px 0 #ff0040, -2px -2px 0 #00ffff, 0 0 20px #ff0040, 0 0 40px #00ffff;
    transform: translate(0);
  }
  92% {
    text-shadow: 4px 2px 0 #ff0040, -4px -2px 0 #00ffff, 0 0 30px #ff0040, 0 0 60px #00ffff;
    transform: translate(-2px, 1px);
  }
  94% {
    text-shadow: -4px -2px 0 #ff0040, 4px 2px 0 #00ffff, 0 0 30px #ff0040, 0 0 60px #00ffff;
    transform: translate(2px, -1px);
  }
  96% {
    text-shadow: 0 0 0 #ff0040, 0 0 0 #00ffff, 0 0 0 #ff0040, 0 0 0 #00ffff;
    opacity: 0.6;
  }
  98% {
    text-shadow: 2px 2px 0 #ff0040, -2px -2px 0 #00ffff, 0 0 20px #ff0040, 0 0 40px #00ffff;
    opacity: 1;
  }
`;

const neonPulse = keyframes`
  0%, 100% {
    box-shadow:
      0 0 8px rgba(0,223,255,0.5),
      0 0 16px rgba(0,223,255,0.3),
      0 0 32px rgba(0,223,255,0.15),
      inset 0 0 8px rgba(0,223,255,0.1);
    border-color: rgba(0,223,255,0.8);
  }
  50% {
    box-shadow:
      0 0 16px rgba(0,223,255,0.7),
      0 0 32px rgba(0,223,255,0.5),
      0 0 64px rgba(0,223,255,0.25),
      inset 0 0 12px rgba(0,223,255,0.2);
    border-color: rgba(0,223,255,1);
  }
`;

const statCardGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 0 6px rgba(0,229,255,0.25),
      inset 0 0 6px rgba(0,229,255,0.05);
    border-color: rgba(0,229,255,0.4);
  }
  50% {
    box-shadow:
      0 0 14px rgba(0,229,255,0.5),
      inset 0 0 10px rgba(0,229,255,0.1);
    border-color: rgba(0,229,255,0.7);
  }
`;

const floatIn = keyframes`
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const slideDownNeon = keyframes`
  from { opacity: 0; transform: translateY(-50px) scale(0.8); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const starSpin = keyframes`
  0%   { transform: scale(0) rotate(-180deg); opacity: 0; filter: hue-rotate(0deg); }
  50%  { transform: scale(1.4) rotate(20deg); opacity: 1; filter: hue-rotate(90deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; filter: hue-rotate(0deg); }
`;

const rankPop = keyframes`
  0%   { opacity: 0; transform: scale(0.5) translateY(15px); filter: blur(6px); }
  60%  { opacity: 1; transform: scale(1.15) translateY(-5px); filter: blur(0); }
  100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
`;

const xpBarGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 8px rgba(57,255,20,0.4), 0 0 16px rgba(57,255,20,0.2);
  }
  50% {
    box-shadow: 0 0 16px rgba(57,255,20,0.7), 0 0 32px rgba(57,255,20,0.3), 0 0 48px rgba(57,255,20,0.15);
  }
`;

const buttonGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 10px rgba(0,223,255,0.4), 0 0 0 2px rgba(0,223,255,0.6);
  }
  50% {
    box-shadow: 0 0 24px rgba(0,223,255,0.8), 0 0 0 2px rgba(0,223,255,1), 0 0 48px rgba(0,223,255,0.3);
  }
`;

const buttonPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
`;

const counterSlide = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Root wrapper ─────────────────────────────────────────────────────────────

const ScaleRoot = styled(Box)({
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  background: "#0a0a0f",
});

// ─── Component ────────────────────────────────────────────────────────────────

const ResultPage: React.FC = () => {
  const setScreen   = useGameStore((s) => s.setScreen);
  const storedRes   = useGameStore((s) => s.resolution);
  const score       = useTriviaStore((s) => s.score ?? 0);
  const questions   = useTriviaStore((s) => s.questions);
  const userAnswers = useTriviaStore((s) => s.userAnswers ?? []);

  const playerTotalXp = usePlayerStore((s) => s.getPlayer().totalXp);

  // ── XP gained: read from gameStore (set by QuestionPage end handler) ───────
  const xpGained = useGameStore((s) => s.lastSessionXpGained);

  // ── Level-up popup state from the store ──────────────────────────────────
  const levelUpSession      = useGameStore((s) => s.levelUpSession);
  const clearLevelUpSession = useGameStore((s) => s.clearLevelUpSession);

  const [popupOpen, setPopupOpen] = useState(false);
  const popupLevels = useRef({ prev: 1, next: 1 });

  useEffect(() => {
    if (levelUpSession.showLevelUpPopup && !popupOpen) {
      popupLevels.current = {
        prev: levelUpSession.sessionStartLevel,
        next: levelUpSession.sessionEndLevel,
      };
      setPopupOpen(true);
    }
  }, [levelUpSession.showLevelUpPopup]);

  const handlePopupClose = () => {
    setPopupOpen(false);
    clearLevelUpSession();
  };

  // Pull rank from player store
  const player          = usePlayerStore((s) => s.getPlayer());
  const playerRankTitle = player.rank.name.toUpperCase();
  const rankSymbolType  = getRankSymbolType(player.rank.name);
  const rankColors      = RANK_COLORS[rankSymbolType];

  // Compute layout from the user's stored resolution
  const base = {
    w: 1280, h: 720,
    header: 62, stat: 62, label: 15, btn: 18,
    padV: 34, padH: 52, statMinH: 168, gap: 22, rankTitle: 32,
  };

  const layoutScale = Math.min(storedRes.width / base.w, storedRes.height / base.h);

  const L = {
    w:        storedRes.width,
    h:        storedRes.height,
    header:   Math.max(20, Math.round(base.header   * layoutScale)),
    stat:     Math.max(20, Math.round(base.stat     * layoutScale)),
    label:    Math.max(8,  Math.round(base.label    * layoutScale)),
    btn:      Math.max(8,  Math.round(base.btn      * layoutScale)),
    pad:      `${Math.max(10, Math.round(base.padV  * layoutScale))}px ${Math.max(15, Math.round(base.padH * layoutScale))}px`,
    statMinH: Math.max(80, Math.round(base.statMinH * layoutScale)),
    gap:      Math.max(8,  Math.round(base.gap      * layoutScale)),
    rankTitle:Math.max(16, Math.round(base.rankTitle* layoutScale)),
  } as const;

  const totalQ  = questions.length;
  const correct = questions.reduce(
    (acc: number, q: any, i: number) =>
      acc + (userAnswers[i] === q.correctAnswer ? 1 : 0),
    0
  );
  // Accuracy: float with 2 decimal places — use the raw ratio, not rounded integer
  const rawAccuracy = totalQ > 0 ? (correct / totalQ) * 100 : 0;
  const rankProg = getLevelProgressPercent(playerTotalXp);

  return (
    <ScaleRoot>
      {/* ── Level-up popup ── */}
      <LevelUpPopup
        open={popupOpen}
        previousLevel={popupLevels.current.prev}
        newLevel={popupLevels.current.next}
        onClose={handlePopupClose}
      />

      <Box
        sx={{
          width:      "100%",
          height:     "100%",
          position:   "relative",
          flexShrink: 0,
          overflow:   "hidden",
          fontFamily: `'Press Start 2P', monospace`,

          background: `
            radial-gradient(ellipse at 50% 0%,
              #1a0a2e 0%,
              #0d0d1a 30%,
              #0a0a0f 60%,
              #0d0d0d 80%,
              #0a0a1a 100%
            )
          `,

          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        L.pad,
          boxSizing:      "border-box",

          // CRT scanline overlay (pseudo-element)
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 223, 255, 0.03) 2px,
              rgba(0, 223, 255, 0.03) 4px
            )`,
            pointerEvents: "none",
            zIndex: 20,
          },

          // Animated scanline beam
          "&::after": {
            content: '""',
            position: "absolute",
            left: 0, right: 0,
            height: "80px",
            background: "linear-gradient(transparent, rgba(0, 160, 255, 0.04) 50%, transparent)",
            animation: `${scanline} 8s linear infinite`,
            pointerEvents: "none",
            zIndex: 21,
          },
        }}
      >
        {/* Rank icon keyframes */}
        <GlobalStyles styles={{ [RANK_ICON_KEYFRAMES]: {} }} />

        {/* Vignette overlay */}
        <Box sx={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none",
          zIndex: 19,
        }} />

        {/* Grid line overlay for cyberpunk feel */}
        <Box sx={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 223, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 223, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
          zIndex: 18,
        }} />

        {/* ── GAME OVER HEADER ─────────────────────────────────────────── */}
        <Box sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          zIndex: 5,
          animation: `${slideDownNeon} 0.6s cubic-bezier(0.22,1,0.36,1) both`,
        }}>
          <Typography sx={{
            fontFamily: `'Press Start 2P', monospace`,
            fontSize:   `${L.header}px`,
            fontWeight: 900,
            color:      "#ff0040",
            letterSpacing: "6px",
            textAlign:  "center",
            lineHeight: 1.2,
            background: "linear-gradient(180deg, #ff0040 0%, #ff2060 40%, #00ffff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "none",
            filter: "drop-shadow(2px 2px 0px #ff0040) drop-shadow(-2px -2px 0px #00ffff) drop-shadow(0 0 20px rgba(255,0,64,0.6)) drop-shadow(0 0 40px rgba(0,255,255,0.3))",
            animation: `${glitch} 6s ease-in-out 1.5s infinite`,
            userSelect: "none",
          }}>
            GAME OVER
          </Typography>
        </Box>

        {/* ── STATS PANEL (4 animated cards) ─────────────────────────────── */}
        <Box sx={{
          width: "100%",
          border: "2px solid rgba(0,223,255,0.6)",
          borderRadius: "12px",
          background: "rgba(10, 10, 30, 0.85)",
          backdropFilter: "blur(4px)",
          padding: `${L.gap}px`,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: `${L.gap}px`,
          position: "relative",
          zIndex: 5,
          animation: `${neonPulse} 4s ease-in-out infinite, ${fadeIn} 0.5s ease 0.3s both`,
          "&::before, &::after": {
            content: '""',
            position: "absolute",
            width: "8px", height: "8px",
            background: "#00DFFF",
            boxShadow: "0 0 10px #00DFFF, 0 0 20px #00DFFF, 0 0 30px #00DFFF",
          },
          "&::before": { top: "-4px", left: "-4px" },
          "&::after":  { top: "-4px", right: "-4px" },
          "& > :nth-last-of-type(1)::before, & > :nth-last-of-type(2)::before": {
            content: '""',
            position: "absolute",
            width: "8px", height: "8px",
            background: "#00DFFF",
            boxShadow: "0 0 10px #00DFFF, 0 0 20px #00DFFF, 0 0 30px #00DFFF",
          },
        }}>
          {/* YOUR SCORE */}
          <Box sx={{
            border: "1.5px solid rgba(0,229,255,0.4)",
            borderRadius: "10px",
            background: "linear-gradient(180deg, rgba(0, 40, 80, 0.6) 0%, rgba(0, 20, 40, 0.8) 100%)",
            minHeight: `${L.statMinH}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 12px",
            position: "relative",
            overflow: "hidden",
            animation: `${statCardGlow} 3s ease-in-out infinite, ${floatIn} 0.4s ease 0.35s both`,
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0, left: 0,
              right: 0,
              height: "2px",
              background: "linear-gradient(90deg, transparent, #00E5FF, transparent)",
              opacity: 0.6,
            },
          }}>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: "#00E5FF",
              fontSize: `${L.label}px`,
              mb: 2,
              textAlign: "center",
              letterSpacing: "2px",
              textShadow: "0 0 10px rgba(0,229,255,0.4)",
            }}>
              SCORE
            </Typography>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: "#FFFFFF",
              fontSize: `${L.stat}px`,
              lineHeight: 1,
              textShadow: "0 0 15px rgba(255,255,255,0.4), 0 0 30px rgba(0,229,255,0.2)",
            }}>
              {formatScore(score)}
            </Typography>
          </Box>

          {/* XP GAINED */}
          <Box sx={{
            border: "1.5px solid rgba(0,229,255,0.4)",
            borderRadius: "10px",
            background: "linear-gradient(180deg, rgba(0, 40, 80, 0.6) 0%, rgba(0, 20, 40, 0.8) 100%)",
            minHeight: `${L.statMinH}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 12px",
            position: "relative",
            overflow: "hidden",
            animation: `${statCardGlow} 3s ease-in-out 0.15s infinite, ${floatIn} 0.4s ease 0.45s both`,
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0, left: 0,
              right: 0,
              height: "2px",
              background: "linear-gradient(90deg, transparent, #00E5FF, transparent)",
              opacity: 0.6,
            },
          }}>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: "#00E5FF",
              fontSize: `${L.label}px`,
              mb: 2,
              textAlign: "center",
              letterSpacing: "2px",
              textShadow: "0 0 10px rgba(0,229,255,0.4)",
            }}>
              XP GAINED
            </Typography>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: "#39FF14",
              fontSize: `${L.stat}px`,
              lineHeight: 1,
              textShadow: "0 0 15px rgba(57,255,20,0.5), 0 0 30px rgba(57,255,20,0.2)",
            }}>
              +{formatXP(xpGained)}
            </Typography>
          </Box>

          {/* ACCURACY */}
          <Box sx={{
            border: "1.5px solid rgba(0,229,255,0.4)",
            borderRadius: "10px",
            background: "linear-gradient(180deg, rgba(0, 40, 80, 0.6) 0%, rgba(0, 20, 40, 0.8) 100%)",
            minHeight: `${L.statMinH}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 12px",
            position: "relative",
            overflow: "hidden",
            animation: `${statCardGlow} 3s ease-in-out 0.3s infinite, ${floatIn} 0.4s ease 0.55s both`,
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0, left: 0,
              right: 0,
              height: "2px",
              background: "linear-gradient(90deg, transparent, #00E5FF, transparent)",
              opacity: 0.6,
            },
          }}>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: "#00E5FF",
              fontSize: `${L.label}px`,
              mb: 2,
              textAlign: "center",
              letterSpacing: "2px",
              textShadow: "0 0 10px rgba(0,229,255,0.4)",
            }}>
              ACCURACY
            </Typography>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: "#FFFFFF",
              fontSize: `${L.stat}px`,
              lineHeight: 1,
              textShadow: "0 0 15px rgba(255,255,255,0.4), 0 0 30px rgba(0,229,255,0.2)",
            }}>
              {formatAccuracy(rawAccuracy)}
            </Typography>
          </Box>

          {/* CORRECT ANSWERS (Avg Time) */}
          <Box sx={{
            border: "1.5px solid rgba(0,229,255,0.4)",
            borderRadius: "10px",
            background: "linear-gradient(180deg, rgba(0, 40, 80, 0.6) 0%, rgba(0, 20, 40, 0.8) 100%)",
            minHeight: `${L.statMinH}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 12px",
            position: "relative",
            overflow: "hidden",
            animation: `${statCardGlow} 3s ease-in-out 0.45s infinite, ${floatIn} 0.4s ease 0.65s both`,
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0, left: 0,
              right: 0,
              height: "2px",
              background: "linear-gradient(90deg, transparent, #00E5FF, transparent)",
              opacity: 0.6,
            },
          }}>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: "#00E5FF",
              fontSize: `${L.label}px`,
              mb: 2,
              textAlign: "center",
              letterSpacing: "2px",
              textShadow: "0 0 10px rgba(0,229,255,0.4)",
            }}>
              CORRECT
            </Typography>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: "#FFFFFF",
              fontSize: `${L.stat}px`,
              lineHeight: 1,
              textShadow: "0 0 15px rgba(255,255,255,0.4), 0 0 30px rgba(0,229,255,0.2)",
            }}>
              {correct}/{totalQ}
            </Typography>
          </Box>
        </Box>

        {/* ── RANK & XP SECTION ──────────────────────────────────────────── */}
        <Box sx={{
          width: "100%",
          background: "linear-gradient(180deg, rgba(10, 10, 30, 0.9) 0%, rgba(5, 5, 20, 0.95) 100%)",
          border: "1.5px solid rgba(0,223,255,0.35)",
          borderRadius: "10px",
          padding: `${L.gap}px ${L.gap + 6}px`,
          display: "flex",
          flexDirection: "column",
          gap: `${Math.round(L.gap * 0.65)}px`,
          position: "relative",
          zIndex: 5,
          animation: `${neonPulse} 5s ease-in-out 0.5s infinite, ${floatIn} 0.5s ease 0.7s both`,
        }}>
          {/* XP Section Header */}
          <Typography sx={{
            fontFamily: `'Press Start 2P', monospace`,
            color: "#00DFFF",
            fontSize: `${L.label}px`,
            textAlign: "center",
            letterSpacing: "3px",
            textShadow: "0 0 12px rgba(0,223,255,0.4)",
          }}>
            XP PROGRESS
          </Typography>

          {/* XP Progress Bar */}
          <Box sx={{ display: "flex", alignItems: "center", gap: `${Math.round(L.gap * 0.55)}px` }}>
            <StarIcon sx={{
              color: "#FFD42A",
              fontSize: `${Math.round(L.header * 0.58)}px`,
              filter: "drop-shadow(0 0 8px rgba(255,212,42,0.65)) drop-shadow(0 0 20px rgba(255,212,42,0.3))",
              flexShrink: 0,
              animation: `${starSpin} 0.7s cubic-bezier(0.22,1,0.36,1) 0.75s both`,
            }} />

            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={rankProg}
                sx={{
                  height: `${Math.round(L.gap * 0.9)}px`,
                  borderRadius: "99px",
                  backgroundColor: "rgba(0, 223, 255, 0.1)",
                  border: "1px solid rgba(0, 223, 255, 0.2)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#39FF14",
                    borderRadius: "99px",
                    boxShadow: "0 0 8px rgba(57,255,20,0.6), 0 0 20px rgba(57,255,20,0.3)",
                    animation: `${xpBarGlow} 2s ease-in-out infinite`,
                  },
                }}
              />
            </Box>

            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: "#39FF14",
              fontSize: `${Math.round(L.label * 0.85)}px`,
              minWidth: "52px",
              textAlign: "right",
              flexShrink: 0,
              textShadow: "0 0 8px rgba(57,255,20,0.4)",
              animation: `${counterSlide} 0.4s ease 1s both`,
            }}>
              {rankProg}%
            </Typography>
          </Box>

          {/* Rank badge section with level + animated icon */}
          <Box sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            padding: `${Math.round(L.gap * 0.3)}px 0`,
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0, left: "10%",
              right: "10%",
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(0,223,255,0.3), transparent)",
            },
          }}>
            <RankIcon
              type={rankSymbolType}
              color={rankColors.primary}
              glow={rankColors.glow}
              size={Math.max(28, Math.round(L.rankTitle * 1.3))}
              style={{ flexShrink: 0, filter: `drop-shadow(0 0 8px ${rankColors.glow}) drop-shadow(0 0 20px ${rankColors.glow})` }}
            />
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: rankColors.primary,
              fontSize: `${L.rankTitle}px`,
              textAlign: "center",
              letterSpacing: "3px",
              textShadow: `0 0 14px ${rankColors.glow}, 0 0 28px ${rankColors.glow}, 0 0 42px ${rankColors.glow}`,
              animation: `${rankPop} 0.65s cubic-bezier(0.22,1,0.36,1) 1s both`,
            }}>
              {playerRankTitle}
            </Typography>
          </Box>
        </Box>

        {/* ── NAV BUTTONS (Cyberpunk Style) ──────────────────────────────── */}
        <Box sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          gap: `${L.gap}px`,
          position: "relative",
          zIndex: 5,
          animation: `${floatIn} 0.5s ease 0.9s both`,
        }}>
          <Button
            onClick={() => setScreen("home")}
            disableRipple={false}
            sx={{
              flex: 1,
              height: `${Math.round(L.gap * 3.3)}px`,
              borderRadius: "8px",
              background: "linear-gradient(180deg, rgba(0, 40, 80, 0.8) 0%, rgba(0, 20, 50, 0.9) 100%)",
              border: "1.5px solid rgba(0,223,255,0.6)",
              boxShadow: "0 0 12px rgba(0,223,255,0.3), inset 0 0 12px rgba(0,223,255,0.05)",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.2s ease",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0, left: 0,
                right: 0,
                height: "2px",
                background: "linear-gradient(90deg, transparent, #00DFFF, transparent)",
                opacity: 0.7,
              },
              "&::after": {
                content: '""',
                position: "absolute",
                top: 0, left: "-100%",
                width: "60%", height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.15), transparent)",
                transition: "left 0.5s ease",
              },
              "&:hover": {
                background: "linear-gradient(180deg, rgba(0, 60, 120, 0.9) 0%, rgba(0, 30, 70, 1) 100%)",
                borderColor: "#00DFFF",
                animation: `${buttonGlow} 1.2s ease-in-out infinite`,
                "&::after": { left: "160%" },
                "& .MuiTypography-root": {
                  animation: `${buttonPulse} 0.6s ease-in-out infinite`,
                },
              },
            }}
          >
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: "#39FF14",
              fontSize: `${L.btn}px`,
              letterSpacing: "2px",
              textShadow: "0 0 8px rgba(57,255,20,0.5), 0 0 16px rgba(57,255,20,0.2)",
              userSelect: "none",
              transition: "all 0.2s ease",
            }}>
              MAIN MENU
            </Typography>
          </Button>

          <Button
            onClick={() => setScreen("profile")}
            disableRipple={false}
            sx={{
              flex: 1,
              height: `${Math.round(L.gap * 3.3)}px`,
              borderRadius: "8px",
              background: "linear-gradient(180deg, rgba(0, 40, 80, 0.8) 0%, rgba(0, 20, 50, 0.9) 100%)",
              border: "1.5px solid rgba(0,223,255,0.6)",
              boxShadow: "0 0 12px rgba(0,223,255,0.3), inset 0 0 12px rgba(0,223,255,0.05)",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.2s ease",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0, left: 0,
                right: 0,
                height: "2px",
                background: "linear-gradient(90deg, transparent, #00DFFF, transparent)",
                opacity: 0.7,
              },
              "&::after": {
                content: '""',
                position: "absolute",
                top: 0, left: "-100%",
                width: "60%", height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.15), transparent)",
                transition: "left 0.5s ease",
              },
              "&:hover": {
                background: "linear-gradient(180deg, rgba(0, 60, 120, 0.9) 0%, rgba(0, 30, 70, 1) 100%)",
                borderColor: "#00DFFF",
                animation: `${buttonGlow} 1.2s ease-in-out infinite`,
                "&::after": { left: "160%" },
                "& .MuiTypography-root": {
                  animation: `${buttonPulse} 0.6s ease-in-out infinite`,
                },
              },
            }}
          >
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: "#00DFFF",
              fontSize: `${L.btn}px`,
              letterSpacing: "2px",
              textShadow: "0 0 8px rgba(0,223,255,0.5), 0 0 16px rgba(0,223,255,0.2)",
              userSelect: "none",
              transition: "all 0.2s ease",
            }}>
              PROFILE
            </Typography>
          </Button>
        </Box>
      </Box>
    </ScaleRoot>
  );
};

export default ResultPage;