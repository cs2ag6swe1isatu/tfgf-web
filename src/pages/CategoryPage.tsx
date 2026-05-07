import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { Category, CATEGORIES } from "../constants";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:           "#010707",
  bgFrameTint:  "#062B2B",
  green:        "#35E52B",
  greenGlow:    "#3FFF56",
  greenShadow:  "#0A3F0A",
  cyan:         "#00DFFF",
  folderBody:   "#58CBCD",
  folderOutline:"#008C8F",
  folderTab:    "#C5D7D9",
  folderInner:  "#1AA5A8",
  folderText:   "#030707",
  btnFill:      "#10363A",
  btnText:      "#2DE339",
  pixelGreen:   "#3BE042",
  pixelCyan:    "#00DFFF",
  pixelGreenDk: "#2BAA35",
};

// ─── Categories: 6 on page 0, POP CULTURE on page 1 ─────────────────────────
const ALL_CATEGORIES: Category[] = [
  "General Knowledge",
  "Science and Technology",
  "History",
  "Geography",
  "Mathematics",
  "Language and Literature",
  "Pop Culture",
];
const PAGES = [
  ALL_CATEGORIES.slice(0, 6),
  ALL_CATEGORIES.slice(6),
];

// ─── Ambient pixel decorations ────────────────────────────────────────────────
const PIXEL_DECO = [
  { top: "6%",  left: "3%",   color: C.pixelGreen,  delay: "0s",   dur: "5s"   },
  { top: "12%", left: "91%",  color: C.pixelCyan,   delay: "1.2s", dur: "6.5s" },
  { top: "28%", left: "1%",   color: C.pixelGreenDk,delay: "0.7s", dur: "7s"   },
  { top: "55%", left: "96%",  color: C.pixelGreen,  delay: "2s",   dur: "5.5s" },
  { top: "75%", left: "4%",   color: C.pixelCyan,   delay: "1.5s", dur: "6s"   },
  { top: "82%", left: "88%",  color: C.pixelGreenDk,delay: "0.3s", dur: "7.2s" },
  { top: "18%", left: "48%",  color: C.pixelGreen,  delay: "2.5s", dur: "5.8s" },
  { top: "90%", left: "35%",  color: C.pixelCyan,   delay: "1.8s", dur: "6.3s" },
  { top: "42%", left: "93%",  color: C.pixelGreenDk,delay: "0.9s", dur: "5.3s" },
  { top: "65%", left: "7%",   color: C.pixelGreen,  delay: "3s",   dur: "6.8s" },
  { top: "5%",  left: "72%",  color: C.pixelCyan,   delay: "1.1s", dur: "5.7s" },
  { top: "88%", left: "60%",  color: C.pixelGreenDk,delay: "2.2s", dur: "7.4s" },
];

function AmbientPixels() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }} aria-hidden="true">
      {PIXEL_DECO.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            width: 7,
            height: 7,
            border: `2px solid ${p.color}`,
            top: p.top,
            left: p.left,
            opacity: 0.45,
            animation: `floatPx ${p.dur} ${p.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Pixel folder card ────────────────────────────────────────────────────────
function FolderCard({
  label,
  onClick,
  animDelay,
}: {
  label: string;
  onClick: () => void;
  animDelay: string;
}) {
  // Split long labels at & or after first word for multi-line
  const lines = label.includes("&")
    ? label.split(" & ").map((s, i, a) => (i < a.length - 1 ? s + " &" : s))
    : label.includes(" ")
    ? (() => {
        const words = label.split(" ");
        const mid = Math.ceil(words.length / 2);
        return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
      })()
    : [label];

  return (
    <div
      className="folder-card"
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        cursor: "pointer",
        animation: `cardIn 0.35s ${animDelay} both`,
        marginTop: 16, // room for the tab above
      }}
    >
      {/* Folder tab */}
      <div
        className="folder-tab"
        style={{
          position: "absolute",
          top: -16,
          left: -2,
          width: "42%",
          height: 16,
          background: C.folderTab,
          border: `2px solid ${C.folderOutline}`,
          borderBottom: "none",
          borderRadius: "4px 4px 0 0",
          transition: "background 0.12s, border-color 0.12s",
          zIndex: 2,
        }}
      />
      {/* Folder body */}
      <div
        className="folder-body"
        style={{
          position: "relative",
          height: 120,
          background: C.folderBody,
          border: `2px solid ${C.folderOutline}`,
          borderRadius: "0 4px 4px 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 12px",
          transition: "background 0.12s, border-color 0.12s",
          zIndex: 1,
          // inner shadow strip at top
          boxShadow: `inset 0 4px 0 ${C.folderInner}`,
        }}
      >
        {/* Label */}
        <span
          className="folder-label"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 9,
            color: C.folderText,
            textAlign: "center",
            lineHeight: 1.9,
            letterSpacing: "0.02em",
            transition: "color 0.12s",
            userSelect: "none",
          }}
        >
          {lines.map((line, i) => (
            <span key={i} style={{ display: "block" }}>{line}</span>
          ))}
        </span>
      </div>
    </div>
  );
}

// ─── Arrow nav button ─────────────────────────────────────────────────────────
function ArrowBtn({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="arrow-btn"
      aria-label={direction === "left" ? "Previous page" : "Next page"}
      style={{
        width: 44,
        height: 160,
        background: "transparent",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.2 : 1,
        flexShrink: 0,
        outline: "none",
        padding: 0,
        transition: "opacity 0.15s",
      }}
    >
      {/* Triangle arrow */}
      <span
        style={{
          display: "block",
          width: 0,
          height: 0,
          borderTop: "16px solid transparent",
          borderBottom: "16px solid transparent",
          ...(direction === "right"
            ? { borderLeft: `26px solid ${C.cyan}` }
            : { borderRight: `26px solid ${C.cyan}` }),
          filter: disabled ? "none" : `drop-shadow(0 0 6px ${C.cyan})`,
          transition: "filter 0.15s",
        }}
      />
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CategoryPage() {
  const [page, setPage] = useState(0);
  const setScreen     = useGameStore((s) => s.setScreen);
  const setCategory   = useGameStore((s) => s.setCategory);
  const setScreenModal = useGameStore((s) => s.setModalScreen);
  const mode          = useGameStore((s) => s.gameConfig.mode);

  const currentCategories = PAGES[page];
  const totalPages = PAGES.length;

  const handleSelect = (cat: Category) => {
    setCategory(cat);
    mode === "solo" ? setScreen("difficulty") : setScreenModal(null);
  };

  const handleBack = () => {
    mode === "solo" ? setScreen("mode-select") : setScreenModal(null);
  };

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        @keyframes floatPx {
          0%,100% { transform: translateY(0) rotate(0deg); opacity: 0.45; }
          50%      { transform: translateY(-12px) rotate(45deg); opacity: 0.7; }
        }
        @keyframes titleGlow {
          0%,100% {
            text-shadow:
              0 0 8px #3FFF56, 0 0 20px #3FFF56, 0 0 40px #35E52B,
              3px 3px 0 #0A3F0A, -1px -1px 0 #0A3F0A,
              1px -1px 0 #0A3F0A, -1px 1px 0 #0A3F0A;
          }
          50% {
            text-shadow:
              0 0 16px #3FFF56, 0 0 38px #3FFF56, 0 0 65px #35E52B,
              3px 3px 0 #0A3F0A, -1px -1px 0 #0A3F0A,
              1px -1px 0 #0A3F0A, -1px 1px 0 #0A3F0A;
          }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes navGlow {
          0%,100% { box-shadow: 0 0 10px rgba(0,223,255,0.35), 0 0 20px rgba(0,223,255,0.12); }
          50%      { box-shadow: 0 0 16px rgba(0,223,255,0.55), 0 0 32px rgba(0,223,255,0.22); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .folder-card:hover .folder-body {
          background: #7ADFE1 !important;
          border-color: #00DFFF !important;
          box-shadow: inset 0 4px 0 #2BBEC1, 0 0 14px rgba(0,223,255,0.45) !important;
        }
        .folder-card:hover .folder-tab {
          background: #E0F5F5 !important;
          border-color: #00DFFF !important;
        }
        .folder-card:hover .folder-label {
          color: #010707 !important;
        }
        .folder-card:active .folder-body {
          transform: scale(0.97);
        }

        .arrow-btn:hover span {
          filter: drop-shadow(0 0 10px #00DFFF) !important;
          border-left-color: #fff !important;
          border-right-color: #fff !important;
        }

        .back-btn:hover {
          background: rgba(0,223,255,0.08) !important;
          border-color: #00DFFF !important;
          color: #00DFFF !important;
          box-shadow: 0 0 14px rgba(0,223,255,0.4) !important;
        }
        .back-btn:active { transform: scale(0.97); }

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

      {/* Ambient pixels */}
      <AmbientPixels />

      {/* ── Main content — mirrors HomePage content wrapper exactly ── */}
      <main style={styles.content}>

        {/* Title */}
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>SELECT CATEGORY</h1>
        </div>

        {/* Grid + arrows row */}
        <div style={styles.gridRow}>

          {/* Left arrow */}
          <ArrowBtn
            direction="left"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          />

          {/* 3×2 folder grid */}
          <div style={styles.grid}>
            {currentCategories.map((cat, i) => (
              <div key={cat} style={styles.gridCell}>
                <FolderCard
                  label={cat}
                  onClick={() => handleSelect(cat as Category)}
                  animDelay={`${i * 0.055}s`}
                />
              </div>
            ))}
          </div>

          {/* Right arrow */}
          <ArrowBtn
            direction="right"
            disabled={page === totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          />

        </div>

        {/* Page indicator + back button row */}
        <div style={styles.footerRow}>
          <span style={styles.pageIndicator}>
            {page + 1}/{totalPages}
          </span>
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
    minHeight: "100vh",
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
    minHeight: "100vh",
    paddingTop: 64,
    paddingBottom: 48,
  },

  titleBlock: {
    textAlign: "center",
    marginBottom: 40,
    animation: "fadeUp 0.35s both",
  },
  title: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: "clamp(1.1rem, 2.8vw, 1.9rem)",
    color: C.green,
    margin: 0,
    letterSpacing: "0.06em",
    animation: "titleGlow 2.5s ease-in-out infinite",
  },

  // Arrow + grid horizontal row
  gridRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    maxWidth: 860,
    paddingLeft: 24,
    paddingRight: 24,
    marginBottom: 36,
  },

  // 3-column grid
  grid: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gridTemplateRows: "repeat(2, auto)",
    gap: "28px 24px",
  },
  gridCell: {
    // no extra styles needed — FolderCard handles its own sizing
  },

  // Footer row: page indicator left, back button right
  footerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 860,
    paddingLeft: 68,  // align with grid left edge (arrow width + gap)
    paddingRight: 68, // align with grid right edge
    animation: "fadeUp 0.4s 0.3s both",
  },
  pageIndicator: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 11,
    color: C.cyan,
    letterSpacing: "0.15em",
    textShadow: `0 0 8px ${C.cyan}`,
    opacity: 0.75,
  },
  backBtn: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 11,
    letterSpacing: "0.1em",
    color: C.btnText,
    background: C.btnFill,
    border: `2px solid ${C.cyan}`,
    borderRadius: 8,
    padding: "12px 32px",
    cursor: "pointer",
    animation: "navGlow 3s ease-in-out infinite",
    transition: "background 0.15s, box-shadow 0.15s, color 0.15s, border-color 0.15s",
    outline: "none",
    textShadow: `0 0 8px ${C.btnText}`,
  },
};
