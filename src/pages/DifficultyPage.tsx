import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";
import { Difficulty } from "../constants";
import { soloDifficultyStartConfig, sessionHistoryRuntimeLimits } from "../config/gameConfig";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:          "#010707",
  bgTint:      "#062B2B",
  green:       "#35E52B",
  greenGlow:   "#42FF5C",
  greenShadow: "#0A3D0A",
  greenNode:   "#2FAE2C",
  cyan:        "#00DFFF",
  cyanGlow:    "#00F0FF",
  btnBlue:     "#1D567B",
  btnText:     "#E5E5E5",
  backFill:    "#10363A",
  backText:    "#31D94A",
};

// ─── Circuit border SVG ───────────────────────────────────────────────────────
// Four-corner circuit frame rendered as a single full-bleed SVG overlay
function CircuitFrame() {
  const W = 1024;
  const H = 768;
  const stroke = C.cyan;
  const node = C.greenNode;
  const r = 6; // node circle radius

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 3,
        filter: `drop-shadow(0 0 4px ${C.cyanGlow})`,
      }}
      aria-hidden="true"
    >
      {/* ── Top-left corner ── */}
      <polyline points="30,90 30,30 90,30"        stroke={stroke} strokeWidth="2" fill="none" />
      <polyline points="30,30 160,30 160,60"       stroke={stroke} strokeWidth="2" fill="none" />
      <circle cx="30"  cy="30"  r={r} fill={node} />
      <circle cx="160" cy="30"  r={r} fill={node} />
      <circle cx="160" cy="60"  r={r} fill={node} />

      {/* ── Top-center ── */}
      <polyline points="420,30 420,58"             stroke={stroke} strokeWidth="2" fill="none" />
      <polyline points="380,30 604,30"             stroke={stroke} strokeWidth="2" fill="none" />
      <polyline points="604,30 604,58"             stroke={stroke} strokeWidth="2" fill="none" />
      <circle cx="420" cy="30"  r={r} fill={node} />
      <circle cx="604" cy="30"  r={r} fill={node} />

      {/* ── Top-right corner ── */}
      <polyline points={`${W-90},30 ${W-30},30 ${W-30},90`} stroke={stroke} strokeWidth="2" fill="none" />
      <polyline points={`${W-30},30 ${W-160},30 ${W-160},60`} stroke={stroke} strokeWidth="2" fill="none" />
      <circle cx={W-30}  cy="30"  r={r} fill={node} />
      <circle cx={W-160} cy="30"  r={r} fill={node} />
      <circle cx={W-160} cy="60"  r={r} fill={node} />

      {/* ── Bottom-left corner ── */}
      <polyline points={`30,${H-90} 30,${H-30} 90,${H-30}`}           stroke={stroke} strokeWidth="2" fill="none" />
      <polyline points={`30,${H-30} 160,${H-30} 160,${H-60}`}         stroke={stroke} strokeWidth="2" fill="none" />
      <circle cx="30"  cy={H-30}  r={r} fill={node} />
      <circle cx="160" cy={H-30}  r={r} fill={node} />
      <circle cx="160" cy={H-60}  r={r} fill={node} />

      {/* ── Bottom-center ── */}
      <polyline points={`420,${H-30} 420,${H-58}`}                    stroke={stroke} strokeWidth="2" fill="none" />
      <polyline points={`380,${H-30} 604,${H-30}`}                    stroke={stroke} strokeWidth="2" fill="none" />
      <polyline points={`604,${H-30} 604,${H-58}`}                    stroke={stroke} strokeWidth="2" fill="none" />
      <circle cx="420" cy={H-30}  r={r} fill={node} />
      <circle cx="604" cy={H-30}  r={r} fill={node} />

      {/* ── Bottom-right corner ── */}
      <polyline points={`${W-90},${H-30} ${W-30},${H-30} ${W-30},${H-90}`} stroke={stroke} strokeWidth="2" fill="none" />
      <polyline points={`${W-30},${H-30} ${W-160},${H-30} ${W-160},${H-60}`} stroke={stroke} strokeWidth="2" fill="none" />
      <circle cx={W-30}  cy={H-30}  r={r} fill={node} />
      <circle cx={W-160} cy={H-30}  r={r} fill={node} />
      <circle cx={W-160} cy={H-60}  r={r} fill={node} />
    </svg>
  );
}

// ─── Difficulty button ────────────────────────────────────────────────────────
function DiffBtn({
  label,
  onClick,
  animDelay,
}: {
  label: string;
  onClick: () => void;
  animDelay: string;
}) {
  return (
    <button
      className="diff-btn"
      onClick={onClick}
      style={{
        width: 210,
        height: 76,
        background: C.btnBlue,
        border: `2px solid ${C.cyan}`,
        borderRadius: 10,
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 16,
        letterSpacing: "0.08em",
        color: C.btnText,
        cursor: "pointer",
        outline: "none",
        animation: `btnIn 0.35s ${animDelay} both, diffGlow 2.8s ${animDelay} ease-in-out infinite`,
        transition: "transform 0.1s, background 0.1s, color 0.1s",
        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
      }}
    >
      {label}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DifficultyPage() {
  const mode        = useGameStore((s) => s.gameConfig.mode);
  const category    = useGameStore((s) => s.gameConfig.category) || "General Knowledge";
  const setDifficulty  = useGameStore((s) => s.setDifficulty);
  const setScreen      = useGameStore((s) => s.setScreen);
  const setScreenModal = useGameStore((s) => s.setModalScreen);
  const startGame   = useTriviaStore((s) => s.startGame);
  const resetGame   = useTriviaStore((s) => s.resetGame);

  const handleSelect = (difficulty: Difficulty) => {
    setDifficulty(difficulty);
    if (mode === "solo") {
      resetGame();
      startGame({
        category,
        difficulty,
        mode: "solo",
        ...soloDifficultyStartConfig,
        ...sessionHistoryRuntimeLimits,
      });
      setScreen("question");
    } else {
      setScreenModal(null);
    }
  };

  const handleBack = () => {
    mode === "solo" ? setScreen("category") : setScreenModal(null);
  };

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        @keyframes titleGlow {
          0%,100% {
            text-shadow:
              0 0 8px #42FF5C, 0 0 20px #42FF5C, 0 0 40px #35E52B,
              3px 3px 0 #0A3D0A, -1px -1px 0 #0A3D0A,
              1px -1px 0 #0A3D0A, -1px  1px 0 #0A3D0A;
          }
          50% {
            text-shadow:
              0 0 16px #42FF5C, 0 0 38px #42FF5C, 0 0 65px #35E52B,
              3px 3px 0 #0A3D0A, -1px -1px 0 #0A3D0A,
              1px -1px 0 #0A3D0A, -1px  1px 0 #0A3D0A;
          }
        }
        @keyframes btnIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes diffGlow {
          0%,100% { box-shadow: 0 0 10px rgba(0,223,255,0.35), 0 0 22px rgba(0,223,255,0.12), inset 0 0 10px rgba(0,223,255,0.05); }
          50%      { box-shadow: 0 0 18px rgba(0,223,255,0.55), 0 0 38px rgba(0,223,255,0.22), inset 0 0 14px rgba(0,223,255,0.09); }
        }
        @keyframes navGlow {
          0%,100% { box-shadow: 0 0 10px rgba(0,223,255,0.35), 0 0 20px rgba(0,223,255,0.12); }
          50%      { box-shadow: 0 0 16px rgba(0,223,255,0.55), 0 0 32px rgba(0,223,255,0.22); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
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

        .diff-btn:hover {
          background: #2A7FAF !important;
          box-shadow: 0 0 24px rgba(0,223,255,0.7), 0 0 48px rgba(0,223,255,0.3), inset 0 0 14px rgba(0,223,255,0.1) !important;
          transform: translateY(-4px) !important;
          border-color: #4FFBFF !important;
        }
        .diff-btn:active {
          transform: scale(0.96) !important;
        }

        .back-btn:hover {
          background: rgba(0,223,255,0.08) !important;
          border-color: #00DFFF !important;
          color: #00DFFF !important;
          box-shadow: 0 0 14px rgba(0,223,255,0.4) !important;
        }
        .back-btn:active { transform: scale(0.97); }
      `}</style>

      {/* CRT scanlines */}
      <div className="scanlines" aria-hidden="true" />

      {/* Circuit frame */}
      <CircuitFrame />

      {/* ── Main content — mirrors HomePage content wrapper exactly ── */}
      <main style={styles.content}>

        {/* Title — two stacked lines */}
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>
            SELECT<br />DIFFICULTY
          </h1>
        </div>

        {/* Difficulty buttons row */}
        <div style={styles.btnRow}>
          {(["EASY", "MEDIUM", "HARD"] as const).map((label, i) => (
            <DiffBtn
              key={label}
              label={label}
              onClick={() => handleSelect(label.toLowerCase() as Difficulty)}
              animDelay={`${i * 0.08}s`}
            />
          ))}
        </div>

        {/* Footer — back button lower-right */}
        <div style={styles.footer}>
          <button
            className="back-btn"
            onClick={handleBack}
            style={styles.backBtn}
          >
            BACK
          </button>
        </div>

      </main>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  // Matches HomePage root exactly
  root: {
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: "100%",
    background: C.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    fontFamily: "'Press Start 2P', monospace",
  },

  // Matches HomePage content wrapper exactly
  content: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    width: "100%",
    height: "100%",
    minHeight: "100%",
    paddingTop: 80,
    paddingBottom: 60,
  },

  titleBlock: {
    textAlign: "center",
    marginBottom: 64,
    animation: "fadeUp 0.35s both",
  },
  title: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: "clamp(1.4rem, 3.2vw, 2.2rem)",
    color: C.green,
    margin: 0,
    lineHeight: 1.65,
    letterSpacing: "0.06em",
    textAlign: "center",
    animation: "titleGlow 2.5s ease-in-out infinite",
  },

  // Three difficulty buttons in a row
  btnRow: {
    display: "flex",
    gap: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 80,
    flexWrap: "wrap",
  },

  // Footer pushes back button to lower-right
  footer: {
    width: "100%",
    maxWidth: 860,
    display: "flex",
    justifyContent: "flex-end",
    paddingRight: 68,
    animation: "fadeUp 0.4s 0.28s both",
  },
  backBtn: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 11,
    letterSpacing: "0.1em",
    color: C.backText,
    background: C.backFill,
    border: `2px solid ${C.cyan}`,
    borderRadius: 8,
    padding: "12px 32px",
    cursor: "pointer",
    animation: "navGlow 3s ease-in-out infinite",
    transition: "background 0.15s, box-shadow 0.15s, color 0.15s, border-color 0.15s",
    outline: "none",
    textShadow: `0 0 8px ${C.backText}`,
  },
};
