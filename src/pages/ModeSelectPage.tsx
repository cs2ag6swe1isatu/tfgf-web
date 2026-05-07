import { Box, Typography, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useGameStore } from "../store/gameStore";

// ─── palette (consistent with HomePage) ─────────────────────────────────────
const C = {
  bg:        "#030d03",
  bgCard:    "#071207",
  bgCardHov: "#0c1f0c",
  green:     "#39ff14",
  greenDim:  "#1a7a00",
  greenGlow: "rgba(57,255,20,0.18)",
  scanline:  "rgba(57,255,20,0.03)",
  red:       "#ff4444",
  gray:      "#888888",
};

// ─── pixel stick figure SVGs ─────────────────────────────────────────────────
const SoloFigure = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* head */}
    <circle cx="28" cy="12" r="10" fill={C.red} />
    {/* body */}
    <circle cx="28" cy="36" r="13" fill={C.gray} />
  </svg>
);

const MultiFigure = () => (
  <svg width="96" height="56" viewBox="0 0 96 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* ── left figure ── */}
    <circle cx="28" cy="12" r="10" fill={C.red} />
    <circle cx="28" cy="36" r="13" fill={C.gray} />
    {/* ── right figure ── */}
    <circle cx="68" cy="12" r="10" fill={C.red} />
    <circle cx="68" cy="36" r="13" fill={C.gray} />
  </svg>
);

// ─── mode card ────────────────────────────────────────────────────────────────
const ModeCard = ({
  label,
  figure,
  onClick,
  delay = "0s",
}: {
  label: React.ReactNode;
  figure: React.ReactNode;
  onClick: () => void;
  delay?: string;
}) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      width: { xs: "140px", sm: "180px", md: "200px" },
      height: { xs: "180px", sm: "220px", md: "240px" },
      bgcolor: C.bgCard,
      border: `1px solid ${C.greenDim}`,
      cursor: "pointer",
      position: "relative",
      transition: "all 0.15s",
      animation: `fadeSlideUp 0.4s ${delay} both`,
      // pixel corner cuts via clip-path
      clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
      "&:hover": {
        bgcolor: C.bgCardHov,
        borderColor: C.green,
        transform: "translateY(-6px) scale(1.03)",
        boxShadow: `0 0 24px ${C.greenGlow}, 0 0 48px rgba(57,255,20,0.1)`,
        "& .card-label": {
          color: C.green,
          textShadow: `0 0 10px ${C.green}`,
        },
        "& .card-corner": { borderColor: C.green },
      },
    }}
  >
    {/* inner corner accent top-right */}
    <Box className="card-corner" sx={{
      position: "absolute", top: 6, right: 6,
      width: 16, height: 16,
      borderTop: `2px solid ${C.greenDim}`,
      borderRight: `2px solid ${C.greenDim}`,
      transition: "border-color 0.15s",
    }} />
    {/* inner corner accent bottom-left */}
    <Box className="card-corner" sx={{
      position: "absolute", bottom: 6, left: 6,
      width: 16, height: 16,
      borderBottom: `2px solid ${C.greenDim}`,
      borderLeft: `2px solid ${C.greenDim}`,
      transition: "border-color 0.15s",
    }} />

    {/* figure */}
    <Box sx={{ opacity: 0.92 }}>{figure}</Box>

    {/* label */}
    <Typography
      className="card-label"
      sx={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: { xs: "9px", sm: "11px", md: "12px" },
        color: "#a8d8a8",
        letterSpacing: "0.06em",
        textAlign: "center",
        lineHeight: 1.6,
        transition: "color 0.15s, text-shadow 0.15s",
      }}
    >
      {label}
    </Typography>
  </Box>
);

// ─── main page ────────────────────────────────────────────────────────────────
const ModeSelectPage = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const setMode = useGameStore((s) => s.setMode);

  return (
    <Box sx={{
      position: "relative",
      width: "100vw",
      height: "100vh",
      bgcolor: C.bg,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: { xs: 5, sm: 6 },
    }}>

      {/* scanlines */}
      <Box sx={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(0deg,${C.scanline} 0px,${C.scanline} 1px,transparent 1px,transparent 4px)`,
      }} />

      {/* corner brackets */}
      {[
        { top: 16, left: 16,  borderTop: `2px solid ${C.greenDim}`, borderLeft:  `2px solid ${C.greenDim}` },
        { top: 16, right: 16, borderTop: `2px solid ${C.greenDim}`, borderRight: `2px solid ${C.greenDim}` },
        { bottom: 16, left: 16,  borderBottom: `2px solid ${C.greenDim}`, borderLeft:  `2px solid ${C.greenDim}` },
        { bottom: 16, right: 16, borderBottom: `2px solid ${C.greenDim}`, borderRight: `2px solid ${C.greenDim}` },
      ].map((sx, i) => (
        <Box key={i} sx={{ position: "absolute", width: 36, height: 36, zIndex: 2, ...sx }} />
      ))}

      {/* horizontal rule top */}
      <Box sx={{
        position: "absolute", top: 60, left: 40, right: 40,
        height: "1px", bgcolor: C.greenDim, opacity: 0.4, zIndex: 2,
      }} />
      {/* horizontal rule bottom */}
      <Box sx={{
        position: "absolute", bottom: 60, left: 40, right: 40,
        height: "1px", bgcolor: C.greenDim, opacity: 0.4, zIndex: 2,
      }} />

      {/* ── CHOOSE MODE title ── */}
      <Box sx={{ position: "relative", zIndex: 10, textAlign: "center", animation: "fadeSlideUp 0.35s both" }}>
        <Typography sx={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: { xs: "20px", sm: "28px", md: "36px" },
          color: C.green,
          letterSpacing: "0.06em",
          textShadow: `0 0 12px ${C.green}, 0 0 28px rgba(57,255,20,0.35)`,
        }}>
          CHOOSE MODE
        </Typography>
        <Box sx={{
          mt: 1.5,
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${C.green}, transparent)`,
          opacity: 0.6,
        }} />
      </Box>

      {/* ── mode cards ── */}
      <Box sx={{
        position: "relative", zIndex: 10,
        display: "flex",
        gap: { xs: 3, sm: 5 },
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
      }}>
        <ModeCard
          label={<>SOLO<br />PLAYER</>}
          figure={<SoloFigure />}
          onClick={() => { setMode("solo"); setScreen("category"); }}
          delay="0.1s"
        />
        <ModeCard
          label={<>MULTI-<br />PLAYER</>}
          figure={<MultiFigure />}
          onClick={() => { setMode("multiplayer"); setScreen("multiplayer-menu"); }}
          delay="0.2s"
        />
      </Box>

      {/* ── back button ── */}
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon sx={{ fontSize: "14px !important" }} />}
        onClick={() => setScreen("home")}
        sx={{
          position: "relative", zIndex: 10,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: { xs: "9px", sm: "11px" },
          letterSpacing: "0.1em",
          color: C.greenDim,
          borderColor: C.greenDim,
          bgcolor: "transparent",
          borderRadius: 0,
          px: 3,
          py: 1.2,
          animation: "fadeSlideUp 0.4s 0.3s both",
          transition: "all 0.15s",
          "&:hover": {
            color: C.green,
            borderColor: C.green,
            bgcolor: "rgba(57,255,20,0.06)",
            boxShadow: `0 0 12px rgba(57,255,20,0.2)`,
          },
        }}
      >
        BACK
      </Button>

      {/* keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Box>
  );
};

export default ModeSelectPage;
