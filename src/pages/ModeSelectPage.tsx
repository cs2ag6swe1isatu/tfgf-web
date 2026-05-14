import { useGameStore } from "../store/gameStore";
import { useSoundContext } from "../context/SoundContext";

// ─── Palette (spec-accurate) ──────────────────────────────────────────────────
const C = {
  bg:          "#010808",
  bgCard:      "#020808",
  borderOuter: "#072B2A",
  green:       "#33E02A",
  greenGlow:   "#2CFF55",
  greenShadow: "#0C450F",
  cyan:        "#00E5FF",
  cyanCard:    "#00DFFF",
  cyanNode:    "#4FFBFF",
  cyanGreen:   "#20F0C8",
  nodeGreen:   "#32D64B",
  // solo avatar
  avatarPink:      "#FF3D7A",
  avatarHighlight: "#FFD7E4",
  avatarBody:      "#D81B60",
  avatarShirt:     "#E4D400",
  // multi back figure
  avatarGray:    "#CFCFE3",
  avatarGrayDrk: "#8D8DA1",
};

// ─── Corner circuit decoration ────────────────────────────────────────────────
function CornerCircuit({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  const isTL = position === "tl";
  const isTR = position === "tr";
  const isBL = position === "bl";
  const isBR = position === "br";

  const LINE = C.cyan;
  const NODE = C.nodeGreen;
  const HOLLOW = C.cyanNode;

  // Arm lengths
  const H = 48; // horizontal arm
  const V = 48; // vertical arm

  return (
    <svg
      width={H + 24}
      height={V + 24}
      viewBox={`0 0 ${H + 24} ${V + 24}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        ...(isTL ? { top: 16, left: 16 } : {}),
        ...(isTR ? { top: 16, right: 16, transform: "scaleX(-1)" } : {}),
        ...(isBL ? { bottom: 16, left: 16, transform: "scaleY(-1)" } : {}),
        ...(isBR ? { bottom: 16, right: 16, transform: "scale(-1,-1)" } : {}),
        filter: `drop-shadow(0 0 6px ${LINE})`,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {/* Vertical arm */}
      <line x1="8" y1="8" x2="8" y2={V + 8} stroke={LINE} strokeWidth="2" />
      {/* Horizontal arm */}
      <line x1="8" y1="8" x2={H + 8} y2="8" stroke={LINE} strokeWidth="2" />
      {/* Hollow pixel square on horizontal arm */}
      <rect x={H - 2} y="3" width="10" height="10" stroke={HOLLOW} strokeWidth="1.5" fill="none" />
      {/* Filled green node at corner origin */}
      <rect x="3" y="3" width="10" height="10" fill={NODE} />
      {/* Small hollow square mid vertical */}
      <rect x="3" y={V - 4} width="10" height="10" stroke={HOLLOW} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ─── 8-bit pixel avatar — Solo ────────────────────────────────────────────────
function SoloAvatar() {
  return (
    <svg width="64" height="72" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* head */}
      <rect x="20" y="2"  width="24" height="24" fill={C.avatarPink} />
      {/* face highlight */}
      <rect x="24" y="6"  width="8"  height="6"  fill={C.avatarHighlight} />
      {/* neck */}
      <rect x="28" y="26" width="8"  height="6"  fill={C.avatarBody} />
      {/* body/shirt */}
      <rect x="14" y="32" width="36" height="24" fill={C.avatarShirt} />
      {/* shirt detail */}
      <rect x="20" y="36" width="24" height="4"  fill={C.avatarBody} />
      {/* shoulders */}
      <rect x="8"  y="32" width="8"  height="16" fill={C.avatarBody} />
      <rect x="48" y="32" width="8"  height="16" fill={C.avatarBody} />
      {/* pixel shadow on head */}
      <rect x="20" y="24" width="24" height="4"  fill={C.avatarBody} opacity="0.4" />
    </svg>
  );
}

// ─── 8-bit pixel avatar — Multi ───────────────────────────────────────────────
function MultiAvatar() {
  return (
    <svg width="96" height="72" viewBox="0 0 96 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* ── back figure (gray/lavender) ── */}
      <rect x="42" y="4"  width="22" height="22" fill={C.avatarGray} />
      <rect x="46" y="8"  width="7"  height="5"  fill="#fff" opacity="0.5" />
      <rect x="48" y="26" width="7"  height="5"  fill={C.avatarGrayDrk} />
      <rect x="36" y="31" width="32" height="22" fill={C.avatarGrayDrk} />
      <rect x="30" y="31" width="7"  height="14" fill={C.avatarGrayDrk} opacity="0.7" />
      <rect x="68" y="31" width="7"  height="14" fill={C.avatarGrayDrk} opacity="0.7" />

      {/* ── front figure (pink/yellow) ── */}
      <rect x="14" y="2"  width="24" height="24" fill={C.avatarPink} />
      <rect x="18" y="6"  width="8"  height="6"  fill={C.avatarHighlight} />
      <rect x="22" y="26" width="8"  height="6"  fill={C.avatarBody} />
      <rect x="8"  y="32" width="36" height="24" fill={C.avatarShirt} />
      <rect x="14" y="36" width="24" height="4"  fill={C.avatarBody} />
      <rect x="2"  y="32" width="8"  height="16" fill={C.avatarBody} />
      <rect x="44" y="32" width="8"  height="16" fill={C.avatarBody} />
      <rect x="14" y="24" width="24" height="4"  fill={C.avatarBody} opacity="0.4" />
    </svg>
  );
}

// ─── Mode card ────────────────────────────────────────────────────────────────
function ModeCard({
  label,
  avatar,
  onClick,
  onMouseEnter,
  animDelay = "0s",
}: {
  label: React.ReactNode;
  avatar: React.ReactNode;
  onClick: () => void;
  onMouseEnter?: () => void;
  animDelay?: string;
}) {
  return (
    <div
      className="mode-card"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        width: 220,
        height: 260,
        background: C.bgCard,
        border: `2px solid ${C.cyanCard}`,
        borderRadius: 10,
        cursor: "pointer",
        position: "relative",
        animation: `cardIn 0.4s ${animDelay} both`,
        transition: "transform 0.15s, box-shadow 0.15s",
        boxShadow: `0 0 12px rgba(0,229,255,0.35), 0 0 24px rgba(0,229,255,0.12), inset 0 0 12px rgba(0,229,255,0.04)`,
      }}
    >
      {/* avatar */}
      <div style={{ opacity: 0.95 }}>{avatar}</div>

      {/* label */}
      <span
        className="card-label"
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 11,
          color: C.cyanGreen,
          textShadow: `0 0 8px ${C.cyanGreen}, 0 0 18px rgba(32,240,200,0.4)`,
          letterSpacing: "0.06em",
          textAlign: "center",
          lineHeight: 1.7,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ModeSelectPage() {
  const { playSound } = useSoundContext();
  const setScreen = useGameStore((s) => s.setScreen);
  const setMode   = useGameStore((s) => s.setMode);

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        @keyframes titleGlow {
          0%,100% {
            text-shadow:
              0 0 8px ${C.greenGlow}, 0 0 20px ${C.greenGlow}, 0 0 40px ${C.green},
              3px 3px 0 ${C.greenShadow}, -1px -1px 0 ${C.greenShadow},
               1px -1px 0 ${C.greenShadow}, -1px  1px 0 ${C.greenShadow};
          }
          50% {
            text-shadow:
              0 0 16px ${C.greenGlow}, 0 0 40px ${C.greenGlow}, 0 0 70px ${C.green},
              3px 3px 0 ${C.greenShadow}, -1px -1px 0 ${C.greenShadow},
               1px -1px 0 ${C.greenShadow}, -1px  1px 0 ${C.greenShadow};
          }
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes navGlow {
          0%,100% { box-shadow: 0 0 10px rgba(0,223,255,0.35), 0 0 20px rgba(0,223,255,0.12); }
          50%      { box-shadow: 0 0 16px rgba(0,223,255,0.55), 0 0 32px rgba(0,223,255,0.22); }
        }

        .mode-card:hover {
          transform: translateY(-6px) scale(1.03) !important;
          box-shadow:
            0 0 24px rgba(0,229,255,0.7),
            0 0 48px rgba(0,229,255,0.3),
            inset 0 0 16px rgba(0,229,255,0.08) !important;
        }
        .mode-card:active {
          transform: scale(0.97) !important;
        }

        .back-btn:hover {
          background: rgba(0,223,255,0.06) !important;
          box-shadow: 0 0 14px rgba(0,223,255,0.45) !important;
          color: ${C.cyan} !important;
          border-color: ${C.cyan} !important;
        }
        .back-btn:active {
          transform: scale(0.97);
        }

        .scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px, transparent 3px,
            rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px
          );
          pointer-events: none;
          z-index: 2;
        }
      `}</style>

      {/* CRT scanlines */}
      <div className="scanlines" aria-hidden="true" />

      {/* Corner circuit decorations */}
      <CornerCircuit position="tl" />
      <CornerCircuit position="tr" />
      <CornerCircuit position="bl" />
      <CornerCircuit position="br" />

      {/* ── Main content ── */}
      <main style={styles.content}>

        {/* Title block */}
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>CHOOSE MODE</h1>
        </div>

        {/* Mode cards */}
        <div style={styles.cardRow}>
          <ModeCard
            label={<>SOLO<br />PLAYER</>}
            avatar={<SoloAvatar />}
            onClick={() => { setMode("solo"); setScreen("category");playSound("select"); }}
            onMouseEnter={() => { playSound("hover"); }}
            animDelay="0.1s"
          />
          <ModeCard
            label={<>MULTI-<br />PLAYER</>}
            avatar={<MultiAvatar />}
            onClick={() => { setMode("multiplayer"); setScreen("multiplayer-menu"); playSound("select"); }}
            onMouseEnter={() => { playSound("hover"); }}
            animDelay="0.2s"
          />
        </div>

        {/* Back button */}
        <button
          className="back-btn"
          onClick={() => {setScreen("home"); playSound("select");}}
          onMouseEnter={() => { playSound("hover"); }}

          style={styles.backBtn}
        >
          BACK
        </button>

      </main>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "relative",
    width: "100%",
    minHeight: "100%",
    background: C.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    fontFamily: "'Press Start 2P', monospace",
  },

  // mirrors HomePage `content` exactly — full-height flex column, centered
  content: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    width: "100%",
    minHeight: "100%",
    paddingTop: 80,
    paddingBottom: 60,
  },

  titleBlock: {
    textAlign: "center",
    marginBottom: 52,
  },
  title: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: "clamp(1.4rem, 3.5%, 2.4rem)",
    color: C.green,
    margin: 0,
    letterSpacing: "0.06em",
    animation: "titleGlow 2.5s ease-in-out infinite",
  },

  cardRow: {
    display: "flex",
    gap: 40,
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 52,
  },

  backBtn: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 11,
    letterSpacing: "0.1em",
    color: C.nodeGreen,
    background: "#10353A",
    border: `2px solid ${C.cyanCard}`,
    borderRadius: 8,
    padding: "14px 40px",
    cursor: "pointer",
    animation: "navGlow 3s ease-in-out infinite",
    transition: "background 0.15s, box-shadow 0.15s, color 0.15s, border-color 0.15s",
    outline: "none",
    textShadow: `0 0 8px ${C.nodeGreen}`,
  },
};
