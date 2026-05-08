import { Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { Globe, MapPin } from "pixelarticons/react";
import { keyframes, styled } from "@mui/material/styles";

// ─── Keyframes ───────────────────────────────────────────────────────────────

const radarSpin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const radarPing = keyframes`
  0%   { transform: scale(0.6); opacity: 0.7; }
  100% { transform: scale(2.4); opacity: 0; }
`;

const scanline = keyframes`
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
`;

const titleGlow = keyframes`
  0%, 100% { text-shadow: 0 0 10px #42FF5C, 0 0 22px #35E52B55, 2px 2px 0 #0A3F0A; }
  50%       { text-shadow: 0 0 18px #42FF5C, 0 0 40px #35E52B88, 2px 2px 0 #0A3F0A; }
`;

const neonFlicker = keyframes`
  0%, 100% { opacity: 1; }
  92%       { opacity: 1; }
  93%       { opacity: 0.6; }
  94%       { opacity: 1; }
  96%       { opacity: 0.75; }
  97%       { opacity: 1; }
`;

const panelGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 12px rgba(0,229,255,0.45), 0 0 28px rgba(0,229,255,0.2),
                inset 0 0 16px rgba(0,10,20,0.6);
  }
  50% {
    box-shadow: 0 0 22px rgba(0,229,255,0.7), 0 0 48px rgba(0,229,255,0.3),
                inset 0 0 20px rgba(0,10,20,0.6);
  }
`;

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-28px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeScaleIn = keyframes`
  from { opacity: 0; transform: scale(0.88); }
  to   { opacity: 1; transform: scale(1); }
`;

const iconFloat = keyframes`
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
`;

const btnHoverGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(0,223,255,0.35); }
  50%       { box-shadow: 0 0 22px rgba(0,223,255,0.7), 0 0 44px rgba(0,223,255,0.2); }
`;

const sweepLine = keyframes`
  0%   { transform: rotate(0deg); opacity: 0.6; }
  8%   { opacity: 0.9; }
  100% { transform: rotate(360deg); opacity: 0.6; }
`;

// ─── Layout config ────────────────────────────────────────────────────────────

const LAYOUTS = {
  "1280x720": { w: 1280, h: 720,  titlePx: 50, iconPx: 130, btnLabelPx: 20, backPx: 14, panelGap: 32, panelPad: "36px 28px", backW: "220px", backH: "62px" },
  "1152x768": { w: 1152, h: 768,  titlePx: 50, iconPx: 128, btnLabelPx: 19, backPx: 13, panelGap: 30, panelPad: "36px 28px", backW: "210px", backH: "60px" },
  "1024x768": { w: 1024, h: 768,  titlePx: 45, iconPx: 120, btnLabelPx: 18, backPx: 12, panelGap: 28, panelPad: "32px 24px", backW: "200px", backH: "58px" },
  "1024x600": { w: 1024, h: 600,  titlePx: 40, iconPx: 96,  btnLabelPx: 15, backPx: 11, panelGap: 22, panelPad: "24px 20px", backW: "180px", backH: "52px" },
  "600x600":  { w: 600,  h: 600,  titlePx: 30, iconPx: 80,  btnLabelPx: 12, backPx: 10, panelGap: 16, panelPad: "20px 16px", backW: "150px", backH: "48px" },
} as const;

type RatioKey = keyof typeof LAYOUTS;



// ─── Radar background ─────────────────────────────────────────────────────────

const RadarBg = ({ size }: { size: number }) => {
  const rings = [0.18, 0.30, 0.42, 0.54, 0.66, 0.78, 0.90];
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.48;

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${size} ${size}`}
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: `${size}px`,
        height: `${size}px`,
        pointerEvents: "none",
        zIndex: 1,
        opacity: 0.55,
      }}
    >
      {/* Static rings */}
      {rings.map((ratio, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={maxR * ratio}
          fill="none"
          stroke="#00DFFF"
          strokeWidth={i === rings.length - 1 ? 1.5 : 0.8}
          strokeOpacity={0.35 + i * 0.03}
        />
      ))}

      {/* Cross-hair lines */}
      <line x1={cx} y1={cy - maxR * 0.92} x2={cx} y2={cy + maxR * 0.92}
        stroke="#00DFFF" strokeWidth={0.6} strokeOpacity={0.2} />
      <line x1={cx - maxR * 0.92} y1={cy} x2={cx + maxR * 0.92} y2={cy}
        stroke="#00DFFF" strokeWidth={0.6} strokeOpacity={0.2} />
      <line x1={cx - maxR * 0.65} y1={cy - maxR * 0.65} x2={cx + maxR * 0.65} y2={cy + maxR * 0.65}
        stroke="#00DFFF" strokeWidth={0.4} strokeOpacity={0.12} />
      <line x1={cx + maxR * 0.65} y1={cy - maxR * 0.65} x2={cx - maxR * 0.65} y2={cy + maxR * 0.65}
        stroke="#00DFFF" strokeWidth={0.4} strokeOpacity={0.12} />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={3} fill="#00DFFF" fillOpacity={0.6} />
    </Box>
  );
};

// Animated radar sweep arm (separate element for performance)
const RadarSweep = ({ size }: { size: number }) => {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.44;

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${size} ${size}`}
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: `${size}px`,
        height: `${size}px`,
        pointerEvents: "none",
        zIndex: 2,
        animation: `${sweepLine} 4s linear infinite`,
        transformOrigin: "center",
        opacity: 0.5,
      }}
    >
      <defs>
        <radialGradient id="sweepGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#00DFFF" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#00DFFF" stopOpacity="0.0" />
        </radialGradient>
        <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#00DFFF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#00DFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Sweep arm */}
      <line
        x1={cx} y1={cy}
        x2={cx + r} y2={cy}
        stroke="#00DFFF"
        strokeWidth={1.5}
        strokeOpacity={0.6}
      />
      {/* Sweep trail cone */}
      <path
        d={`M ${cx} ${cy} L ${cx + r} ${cy - 18} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="#00DFFF"
        fillOpacity={0.06}
      />
    </Box>
  );
};

// Radar ping pulse
const RadarPing = ({ x, y, delay }: { x: string; y: string; delay: string }) => (
  <Box
    sx={{
      position: "absolute",
      left: x, top: y,
      transform: "translate(-50%, -50%)",
      width: "10px", height: "10px",
      borderRadius: "50%",
      border: "1.5px solid #00DFFF",
      animation: `${radarPing} 3s ease-out ${delay} infinite`,
      zIndex: 3,
      pointerEvents: "none",
    }}
  />
);

// ─── Globe icon (SVG pixel-art) ───────────────────────────────────────────────

const GlobeIcon = ({ size }: { size: number }) => (
  <Box
    component="svg"
    viewBox="0 0 64 64"
    sx={{ width: size, height: size, flexShrink: 0 }}
  >
    {/* Outer ring */}
    <circle cx="32" cy="32" r="28" fill="#1A2F6B" stroke="#4D7CFF" strokeWidth="3" />
    {/* Globe grid lines */}
    <ellipse cx="32" cy="32" rx="14" ry="28" fill="none" stroke="#35E52B" strokeWidth="1.8" strokeOpacity="0.7" />
    <ellipse cx="32" cy="32" rx="28" ry="10" fill="none" stroke="#35E52B" strokeWidth="1.8" strokeOpacity="0.7" />
    <ellipse cx="32" cy="32" rx="28" ry="20" fill="none" stroke="#35E52B" strokeWidth="1.2" strokeOpacity="0.4" />
    {/* Vertical axis */}
    <line x1="32" y1="4" x2="32" y2="60" stroke="#35E52B" strokeWidth="1.6" strokeOpacity="0.7" />
    {/* Horizontal axis */}
    <line x1="4" y1="32" x2="60" y2="32" stroke="#35E52B" strokeWidth="1.6" strokeOpacity="0.7" />
    {/* Center dot */}
    <circle cx="32" cy="32" r="3" fill="#35E52B" />
    {/* Outer glow ring */}
    <circle cx="32" cy="32" r="30" fill="none" stroke="#4D7CFF" strokeWidth="1" strokeOpacity="0.4" />
  </Box>
);

// ─── MapPin icon (SVG pixel-art) ──────────────────────────────────────────────

const MapPinIcon = ({ size }: { size: number }) => (
  <Box
    component="svg"
    viewBox="0 0 64 64"
    sx={{ width: size, height: size, flexShrink: 0 }}
  >
    {/* Pin body */}
    <path
      d="M32 6 C18 6 10 16 10 26 C10 40 32 60 32 60 C32 60 54 40 54 26 C54 16 46 6 32 6 Z"
      fill="#D93232"
      stroke="#6A1111"
      strokeWidth="2"
    />
    {/* Highlight */}
    <path
      d="M26 12 C22 15 18 20 18 26 C18 30 20 34 23 38"
      fill="none"
      stroke="#FF6464"
      strokeWidth="3"
      strokeLinecap="round"
      strokeOpacity="0.7"
    />
    {/* Inner circle */}
    <circle cx="32" cy="26" r="9" fill="#010707" />
    <circle cx="32" cy="26" r="5" fill="#FFDADA" />
    {/* Signal rings */}
    <circle cx="32" cy="26" r="12" fill="none" stroke="#FF6464" strokeWidth="1.5" strokeOpacity="0.35" />
    <circle cx="32" cy="26" r="16" fill="none" stroke="#D93232" strokeWidth="1" strokeOpacity="0.2" />
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const MultiplayerMenuPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const setLobbyRole = useMultiplayerStore((state) => state.setLobbyRole);

  // 1. Hook up the layout config
  const layout = LAYOUTS["1024x768"]; 

  const handleHostGame = () => {
    setLobbyRole("host");
    setScreen("multiplayer-lobby");
  };

  const handleJoinGame = () => {
    setLobbyRole("client");
    setScreen("multiplayer-discovery");
  };

  const radarSize = typeof window !== "undefined"
    ? Math.min(window.innerWidth, window.innerHeight) * 1.05
    : 1024;

  return (
    <Box sx={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      background: "#010707",
    }}>
      <Box sx={{
        width: `${layout.w}px`,
        height: `${layout.h}px`,
        position: "relative",
        flexShrink: 0,
        overflow: "hidden",
        fontFamily: `'Press Start 2P', monospace`,
        background: `radial-gradient(ellipse at 50% 50%, #071919 0%, #010707 55%, #010707 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "44px 48px 60px", // Increased bottom padding
        boxSizing: "border-box",

        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.09) 2px, rgba(0,0,0,0.09) 4px)`,
          pointerEvents: "none",
          zIndex: 30,
        },
      }}>
        {/* Vignette */}
        <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.72) 100%)", pointerEvents: "none", zIndex: 25 }} />

        <RadarBg size={radarSize} />
        <RadarSweep size={radarSize} />

        {/* --- TITLE --- */}
        <Box sx={{ position: "relative", zIndex: 10, textAlign: "center", animation: `${slideDown} 0.55s ease both` }}>
          <Typography sx={{
            fontFamily: `'Press Start 2P', monospace`,
            fontSize: `${layout.titlePx}px`, // Fixed
            color: "#35E52B",
            letterSpacing: "4px",
            animation: `${titleGlow} 3s ease-in-out infinite`,
          }}>
            MULTIPLAYER
          </Typography>
        </Box>

        {/* --- ACTION PANELS --- */}
        <Box sx={{
          display: "flex",
          gap: `${layout.panelGap}px`, // Fixed
          width: "100%",
          maxWidth: "900px",
          position: "relative",
          zIndex: 10,
        }}>
          {/* HOST BUTTON */}
          <Button
            onClick={handleHostGame}
            sx={{
              flex: 1,
              flexDirection: "column",
              gap: "24px",
              padding: layout.panelPad, // Fixed
              borderRadius: "18px",
              border: "2px solid #00E5FF",
              background: "rgba(0,5,15,0.75)",
              animation: `${panelGlow} 3.5s ease-in-out infinite`,
              "&:hover": {
                border: "2px solid #35E52B",
                background: "rgba(0,15,8,0.85)",
              }
            }}
          >
            <GlobeIcon size={layout.iconPx} /> 
            <Typography sx={{ fontSize: `${layout.btnLabelPx}px`, color: "#35E52B" }}>
              HOST GAME
            </Typography>
          </Button>

          {/* JOIN BUTTON */}
          <Button
            onClick={handleJoinGame}
            sx={{
              flex: 1,
              flexDirection: "column",
              gap: "24px",
              padding: layout.panelPad, // Fixed
              borderRadius: "18px",
              border: "2px solid #00E5FF",
              background: "rgba(0,5,15,0.75)",
              animation: `${panelGlow} 3.5s ease-in-out 0.5s infinite`,
              "&:hover": {
                border: "2px solid #35E52B",
                background: "rgba(0,15,8,0.85)",
              }
            }}
          >
            <MapPinIcon size={layout.iconPx} />
            <Typography sx={{ fontSize: `${layout.btnLabelPx}px`, color: "#35E52B" }}>
              JOIN GAME
            </Typography>
          </Button>
        </Box>

        {/* --- BACK BUTTON --- */}
        <Box sx={{ position: "relative", zIndex: 10 }}>
          <Button
            onClick={() => setScreen("mode-select")}
            sx={{
              width: layout.backW, // Fixed
              height: layout.backH, // Fixed
              borderRadius: "14px",
              background: "#10363A",
              border: "1.5px solid #00DFFF",
              "&:hover": { background: "#164249" }
            }}
          >
            <Typography sx={{ fontSize: `${layout.backPx}px`, color: "#31D94A" }}>
              BACK
            </Typography>
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default MultiplayerMenuPage;
