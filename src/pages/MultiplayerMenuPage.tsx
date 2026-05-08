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
  "1280x720": { w: 1280, h: 720,  titlePx: 44, iconPx: 130, btnLabelPx: 20, backPx: 14, panelGap: 32, panelPad: "36px 28px", backW: "220px", backH: "62px" },
  "1152x768": { w: 1152, h: 768,  titlePx: 42, iconPx: 128, btnLabelPx: 19, backPx: 13, panelGap: 30, panelPad: "36px 28px", backW: "210px", backH: "60px" },
  "1024x768": { w: 1024, h: 768,  titlePx: 38, iconPx: 120, btnLabelPx: 18, backPx: 12, panelGap: 28, panelPad: "32px 24px", backW: "200px", backH: "58px" },
  "1024x600": { w: 1024, h: 600,  titlePx: 30, iconPx: 96,  btnLabelPx: 15, backPx: 11, panelGap: 22, panelPad: "24px 20px", backW: "180px", backH: "52px" },
  "600x600":  { w: 600,  h: 600,  titlePx: 22, iconPx: 80,  btnLabelPx: 12, backPx: 10, panelGap: 16, panelPad: "20px 16px", backW: "150px", backH: "48px" },
} as const;

type RatioKey = keyof typeof LAYOUTS;

function detectRatio(): RatioKey {
  if (typeof window === "undefined") return "1024x768";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw <= 600)               return "600x600";
  if (vw <= 1024 && vh <= 600) return "1024x600";
  if (vw <= 1024)              return "1024x768";
  if (vw <= 1152)              return "1152x768";
  return "1280x720";
}

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
  const setScreen    = useGameStore((state) => state.setScreen);
  const setLobbyRole = useMultiplayerStore((state) => state.setLobbyRole);

  const L = LAYOUTS[detectRatio()];

  const handleHostGame = () => {
    setLobbyRole("host");
    setScreen("multiplayer-lobby");
  };

  const handleJoinGame = () => {
    setLobbyRole("client");
    setScreen("multiplayer-discovery");
  };

  return (
    <Box sx={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      background: "#010707",
    }}>
      {/* ── Fixed canvas ──────────────────────────────────────────────── */}
      <Box sx={{
        width:      `${L.w}px`,
        height:     `${L.h}px`,
        position:   "relative",
        flexShrink: 0,
        overflow:   "hidden",
        fontFamily: `'Press Start 2P', monospace`,

        background: `
          radial-gradient(ellipse at 50% 50%,
            #071919 0%,
            #010707 55%,
            #010707 100%
          )
        `,

        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "44px 48px 40px",
        boxSizing:      "border-box",

        // CRT scanlines
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.09) 2px,
            rgba(0,0,0,0.09) 4px
          )`,
          pointerEvents: "none",
          zIndex: 30,
        },
        // Moving sweep
        "&::after": {
          content: '""',
          position: "absolute",
          left: 0, right: 0,
          height: "90px",
          background: "linear-gradient(transparent, rgba(0,220,255,0.022) 50%, transparent)",
          animation: `${scanline} 8s linear infinite`,
          pointerEvents: "none",
          zIndex: 31,
        },
      }}>
        {/* Vignette */}
        <Box sx={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.72) 100%)",
          pointerEvents: "none",
          zIndex: 25,
        }} />

        {/* Radar rings background */}
        <RadarBg size={Math.min(L.w, L.h) * 1.05} />

        {/* Animated sweep arm */}
        <RadarSweep size={Math.min(L.w, L.h) * 1.05} />

        {/* Radar ping blips */}
        <RadarPing x="32%" y="38%" delay="0s" />
        <RadarPing x="68%" y="42%" delay="1.5s" />
        <RadarPing x="50%" y="28%" delay="0.8s" />

        {/* ── TITLE ──────────────────────────────────────────────────── */}
        <Box sx={{
          position:  "relative",
          zIndex: 10,
          textAlign: "center",
          animation: `${slideDown} 0.55s cubic-bezier(0.22,1,0.36,1) both`,
        }}>
          <Typography sx={{
            fontFamily: `'Press Start 2P', monospace`,
            fontSize:   `${L.titlePx}px`,
            color:      "#35E52B",
            letterSpacing: "4px",
            lineHeight: 1.2,
            animation:  `${titleGlow} 3s ease-in-out infinite, ${neonFlicker} 7s ease-in-out 2s infinite`,
            userSelect: "none",
          }}>
            MULTIPLAYER
          </Typography>
        </Box>

        {/* ── ACTION PANELS ──────────────────────────────────────────── */}
        <Box sx={{
          display: "flex",
          gap:     `${L.panelGap}px`,
          width:   "100%",
          position: "relative",
          zIndex: 10,
          animation: `${fadeScaleIn} 0.55s cubic-bezier(0.22,1,0.36,1) 0.2s both`,
        }}>
          {/* HOST GAME */}
          <Button
            onClick={handleHostGame}
            data-sfx="navigate"
            disableRipple={false}
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: `${Math.round(L.panelGap * 0.65)}px`,
              padding: L.panelPad,
              borderRadius: "18px",
              border: "2px solid #00E5FF",
              background: "rgba(0,5,15,0.75)",
              boxShadow: "0 0 14px rgba(0,229,255,0.45), 0 0 32px rgba(0,229,255,0.2), inset 0 0 20px rgba(0,10,20,0.5)",
              animation: `${panelGlow} 3.5s ease-in-out infinite`,
              transition: "all 0.18s ease",
              position: "relative",
              overflow: "hidden",

              // Shimmer on hover
              "&::after": {
                content: '""',
                position: "absolute",
                top: 0, left: "-100%",
                width: "60%", height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.08), transparent)",
                transition: "left 0.45s ease",
              },

              "&:hover": {
                border: "2px solid #35E52B",
                background: "rgba(0,15,8,0.85)",
                boxShadow: "0 0 22px rgba(53,229,43,0.5), 0 0 48px rgba(53,229,43,0.2), inset 0 0 20px rgba(0,10,0,0.5)",
                "& .panel-icon": { animation: `${iconFloat} 1.4s ease-in-out infinite` },
                "& .panel-label": { textShadow: "0 0 14px #42FF5C, 0 0 28px #35E52B66" },
                "&::after": { left: "160%" },
              },
            }}
          >
            {/* Icon */}
            <Box className="panel-icon" sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GlobeIcon size={L.iconPx} />
            </Box>

            {/* Label */}
            <Typography
              className="panel-label"
              sx={{
                fontFamily: `'Press Start 2P', monospace`,
                fontSize:   `${L.btnLabelPx}px`,
                color:      "#35E52B",
                letterSpacing: "2px",
                textShadow: "0 0 8px #42FF5C, 2px 2px 0 #0A3F0A",
                textAlign:  "center",
                transition: "text-shadow 0.18s ease",
                userSelect: "none",
              }}
            >
              HOST GAME
            </Typography>
          </Button>

          {/* JOIN GAME */}
          <Button
            onClick={handleJoinGame}
            data-sfx="navigate"
            disableRipple={false}
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: `${Math.round(L.panelGap * 0.65)}px`,
              padding: L.panelPad,
              borderRadius: "18px",
              border: "2px solid #00E5FF",
              background: "rgba(0,5,15,0.75)",
              boxShadow: "0 0 14px rgba(0,229,255,0.45), 0 0 32px rgba(0,229,255,0.2), inset 0 0 20px rgba(0,10,20,0.5)",
              animation: `${panelGlow} 3.5s ease-in-out 0.5s infinite`,
              transition: "all 0.18s ease",
              position: "relative",
              overflow: "hidden",

              "&::after": {
                content: '""',
                position: "absolute",
                top: 0, left: "-100%",
                width: "60%", height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.08), transparent)",
                transition: "left 0.45s ease",
              },

              "&:hover": {
                border: "2px solid #35E52B",
                background: "rgba(0,15,8,0.85)",
                boxShadow: "0 0 22px rgba(53,229,43,0.5), 0 0 48px rgba(53,229,43,0.2), inset 0 0 20px rgba(0,10,0,0.5)",
                "& .panel-icon": { animation: `${iconFloat} 1.4s ease-in-out infinite` },
                "& .panel-label": { textShadow: "0 0 14px #42FF5C, 0 0 28px #35E52B66" },
                "&::after": { left: "160%" },
              },
            }}
          >
            {/* Icon */}
            <Box className="panel-icon" sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MapPinIcon size={L.iconPx} />
            </Box>

            {/* Label */}
            <Typography
              className="panel-label"
              sx={{
                fontFamily: `'Press Start 2P', monospace`,
                fontSize:   `${L.btnLabelPx}px`,
                color:      "#35E52B",
                letterSpacing: "2px",
                textShadow: "0 0 8px #42FF5C, 2px 2px 0 #0A3F0A",
                textAlign:  "center",
                transition: "text-shadow 0.18s ease",
                userSelect: "none",
              }}
            >
              JOIN GAME
            </Typography>
          </Button>
        </Box>

        {/* ── BACK BUTTON ────────────────────────────────────────────── */}
        <Box sx={{
          display: "flex",
          justifyContent: "center",
          position: "relative",
          zIndex: 10,
          animation: `${slideUp} 0.5s ease 0.4s both`,
        }}>
          <Button
            onClick={() => setScreen("mode-select")}
            data-sfx="navigate"
            disableRipple={false}
            sx={{
              width:        L.backW,
              height:       L.backH,
              borderRadius: "14px",
              background:   "#10363A",
              border:       "1.5px solid #00DFFF",
              boxShadow:    "0 0 10px rgba(0,223,255,0.35)",
              transition:   "all 0.15s ease",
              position:     "relative",
              overflow:     "hidden",

              "&::after": {
                content: '""',
                position: "absolute",
                top: 0, left: "-100%",
                width: "60%", height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.1), transparent)",
                transition: "left 0.4s ease",
              },

              "&:hover": {
                background: "#164249",
                animation: `${btnHoverGlow} 1s ease-in-out infinite`,
                "&::after": { left: "160%" },
              },
            }}
          >
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              fontSize:   `${L.backPx}px`,
              color:      "#31D94A",
              letterSpacing: "3px",
              textShadow: "0 0 8px rgba(49,217,74,0.5)",
              userSelect: "none",
            }}>
              BACK
            </Typography>
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default MultiplayerMenuPage;
