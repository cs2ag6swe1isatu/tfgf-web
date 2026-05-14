import { useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import { useGameStore } from "../store";

const fall = keyframes`
  0% {
    transform: translateY(-12vh) rotate(0deg);
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  100% {
    transform: translateY(112vh) rotate(440deg);
    opacity: 0;
  }
`;

const flicker = keyframes`
  0%, 100% { opacity: 1; }
  48% { opacity: 0.82; }
  50% { opacity: 0.96; }
  53% { opacity: 0.88; }
`;

const ConfettiLayer = styled(Box)({
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  pointerEvents: "none",
  zIndex: 1,
});

const ConfettiPiece = styled("span")({
  position: "absolute",
  top: 0,
  display: "block",
  borderRadius: "1px",
  animationName: `${fall}`,
  animationTimingFunction: "linear",
  animationIterationCount: "infinite",
  filter: "drop-shadow(0 0 4px rgba(0, 0, 0, 0.45))",
});

const FrameCorner = styled(Box)<{ top?: boolean; right?: boolean }>(({ top, right }) => ({
  position: "absolute",
  width: "44px",
  height: "44px",
  borderColor: "#2cff39",
  borderStyle: "solid",
  borderWidth: top ? "2px 0 0 2px" : "0 0 2px 2px",
  top: top ? "clamp(1rem, 4vw, 2rem)" : "auto",
  bottom: top ? "auto" : "clamp(1rem, 4vw, 2rem)",
  left: right ? "auto" : "clamp(1rem, 4vw, 2rem)",
  right: right ? "clamp(1rem, 4vw, 2rem)" : "auto",
  boxShadow: "0 0 10px rgba(44, 255, 57, 0.6)",
  zIndex: 2,
}));

const AchievementUnlockPage = () => {
  const achievementUnlockQueue = useGameStore((state) => state.achievementUnlockQueue);
  const postUnlockScreen = useGameStore((state) => state.postUnlockScreen);
  const setScreen = useGameStore((state) => state.setScreen);

  const activeAchievement = achievementUnlockQueue[0];

  useEffect(() => {
    if (activeAchievement) return;

    const target = postUnlockScreen ?? "result";
    const { clearAchievementUnlocks } = useGameStore.getState();
    clearAchievementUnlocks();
    setScreen(target);
  }, [activeAchievement, postUnlockScreen, setScreen]);

  const confetti = useMemo(() => {
    const colors = ["#00e5ff", "#ffe400", "#35e52b", "#ff8a00", "#b95cff", "#ff4ad8", "#0c8cd3"];
    return Array.from({ length: 64 }, (_, index) => {
      const left = Math.random() * 100;
      const size = 4 + Math.round(Math.random() * 10);
      const duration = 4 + Math.random() * 4;
      const delay = -Math.random() * 5;
      const rotate = Math.round(Math.random() * 60);
      const color = colors[index % colors.length];
      const shape = index % 5 === 0 ? "50%" : "1px";

      return {
        id: `${index}-${left.toFixed(2)}`,
        left,
        size,
        duration,
        delay,
        rotate,
        color,
        shape,
      };
    });
  }, []);

  const handleDismiss = () => {
    const state = useGameStore.getState();
    const isLastUnlock = state.achievementUnlockQueue.length <= 1;

    if (isLastUnlock) {
      const target = state.postUnlockScreen ?? "result";
      state.clearAchievementUnlocks();
      state.setScreen(target);
      return;
    }

    state.dismissCurrentAchievementUnlock();
  };

  if (!activeAchievement) {
    return null; 
  }

  return (
    <Box
      onClick={handleDismiss}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleDismiss();
        }
      }}
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(circle at 50% -10%, #063f57 0%, #052a3d 25%, #032433 55%, #031f2a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        cursor: "pointer",
        px: 2,
      }}
      aria-label="Dismiss achievement unlock"
    >
      <ConfettiLayer>
        {confetti.map((piece) => (
          <ConfettiPiece
            key={piece.id}
            style={{
              left: `${piece.left}%`,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              borderRadius: piece.shape,
              background: piece.color,
              transform: `rotate(${piece.rotate}deg)`,
              animationDuration: `${piece.duration}s`,
              animationDelay: `${piece.delay}s`,
            }}
          />
        ))}
      </ConfettiLayer>

      <FrameCorner top />
      <FrameCorner top right />
      <FrameCorner />
      <FrameCorner right />

      <Box
        sx={{
          position: "relative",
          zIndex: 3,
          width: "min(90vw, 420px)",
          border: "2px solid rgba(0, 223, 255, 0.5)",
          borderRadius: "8px",
          p: { xs: 2.5, sm: 3 },
          background: "rgba(2, 22, 32, 0.86)",
          boxShadow: "0 0 0 1px rgba(0, 223, 255, 0.2), 0 0 26px rgba(0, 223, 255, 0.2)",
          textAlign: "center",
          backdropFilter: "blur(2px)",
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: { xs: "0.58rem", sm: "0.68rem" },
            color: "#35e52b",
            letterSpacing: "0.08em",
            mb: 2,
            textShadow: "0 0 8px rgba(53, 229, 43, 0.65)",
            animation: `${flicker} 3.6s ease-in-out infinite`,
          }}
        >
          ACHIEVEMENT UNLOCKED!
        </Typography>

        <Box
          component="img"
          src={activeAchievement.icon}
          alt={activeAchievement.name}
          sx={{
            width: { xs: 120, sm: 150 },
            height: { xs: 120, sm: 150 },
            objectFit: "cover",
            imageRendering: "pixelated",
            border: "2px solid rgba(0, 223, 255, 0.5)",
            borderRadius: "4px",
            boxShadow: "0 0 16px rgba(0, 223, 255, 0.34)",
            mb: 2,
            background: "rgba(0, 0, 0, 0.22)",
          }}
        />

        <Typography
          sx={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: { xs: "1.15rem", sm: "1.45rem" },
            color: "#f3dc4b",
            letterSpacing: "0.06em",
            mb: 1.25,
            textShadow: "0 0 10px rgba(243, 220, 75, 0.45)",
            textTransform: "uppercase",
          }}
        >
          {activeAchievement.name}
        </Typography>

        <Typography
          sx={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: { xs: "0.55rem", sm: "0.62rem" },
            color: "#31d5c2",
            lineHeight: 1.7,
            maxWidth: "30ch",
            mx: "auto",
            textShadow: "0 0 8px rgba(49, 213, 194, 0.38)",
          }}
        >
          {activeAchievement.description}
        </Typography>

        <Typography
          sx={{
            mt: 2.5,
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "0.45rem",
            color: "rgba(181, 246, 255, 0.75)",
            letterSpacing: "0.06em",
          }}
        >
          TAP OR CLICK ANYWHERE TO CONTINUE
        </Typography>
      </Box>
    </Box>
  );
};

export default AchievementUnlockPage;
