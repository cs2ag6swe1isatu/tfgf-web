import { useEffect, useRef, useMemo } from "react";
import { useGameStore } from "../store/gameStore";

// ─── Floating background particle ───────────────────────────────────────────
function FloatingParticle({
  type,
  style,
}: {
  type: "square" | "qmark" | "bolt";
  style: React.CSSProperties;
}) {
  const content =
    type === "square" ? null : type === "qmark" ? "?" : "⚡";

  if (type === "square") {
    return (
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 8,
          height: 8,
          border: "2px solid",
          borderColor: style.color as string,
          opacity: 0.35,
          animation: "floatPx 6s ease-in-out infinite",
          pointerEvents: "none",
          userSelect: "none",
          ...style,
        }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 14,
        opacity: 0.18,
        color: type === "qmark" ? "#32D64B" : "#3DFF63",
        animation: "floatPx 6s ease-in-out infinite",
        pointerEvents: "none",
        userSelect: "none",
        ...style,
      }}
    >
      {content}
    </span>
  );
}

// ─── Background decoration generator ────────────────────────────────────────
const SQUARE_COLORS = ["#21C74B", "#39A52A", "#3CCD48", "#32D64B", "#1FC11A"];

function useParticles(count = 55) {
  return useMemo(() => {
    const particles: Array<{
      id: number;
      type: "square" | "qmark" | "bolt";
      style: React.CSSProperties;
    }> = [];
    const rng = (seed: number) => {
      // deterministic pseudo-random so SSR matches
      let s = seed;
      return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
      };
    };
    for (let i = 0; i < count; i++) {
      const rand = rng(i * 7 + 13);
      const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand(), r5 = rand();
      const typeRoll = r1;
      const type: "square" | "qmark" | "bolt" =
        typeRoll < 0.5 ? "square" : typeRoll < 0.75 ? "qmark" : "bolt";
      particles.push({
        id: i,
        type,
        style: {
          left: `${r2 * 100}%`,
          top: `${r3 * 100}%`,
          animationDelay: `${r4 * 8}s`,
          animationDuration: `${4 + r5 * 5}s`,
          color:
            type === "square"
              ? SQUARE_COLORS[Math.floor(r1 * SQUARE_COLORS.length)]
              : undefined,
        },
      });
    }
    return particles;
  }, [count]);
}

// ─── Icon SVGs ───────────────────────────────────────────────────────────────
function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="4" stroke="#00E5FF" strokeWidth="2" />
      <path
        d="M14 2v3M14 23v3M2 14h3M23 14h3M5.3 5.3l2.1 2.1M20.6 20.6l2.1 2.1M5.3 22.7l2.1-2.1M20.6 7.4l2.1-2.1"
        stroke="#00E5FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="9" r="5" stroke="#00E5FF" strokeWidth="2" />
      <path
        d="M4 24c0-5.5 4.5-9 10-9s10 3.5 10 9"
        stroke="#00E5FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StandingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="11" y="8"  width="6" height="14" rx="1" stroke="#00E5FF" strokeWidth="2" />
      <rect x="3"  y="13" width="6" height="9"  rx="1" stroke="#00E5FF" strokeWidth="2" />
      <rect x="19" y="16" width="6" height="6"  rx="1" stroke="#00E5FF" strokeWidth="2" />
      <text x="5.5" y="19.5" fontFamily="monospace" fontSize="4" fill="#00E5FF" textAnchor="middle">2</text>
      <text x="14"  y="14.5" fontFamily="monospace" fontSize="4" fill="#00E5FF" textAnchor="middle">1</text>
      <text x="22"  y="22.5" fontFamily="monospace" fontSize="4" fill="#00E5FF" textAnchor="middle">3</text>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const setScreen = useGameStore((state) => state.setScreen);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const particles = useParticles(55);

  // Periodic glitch effect on title
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    let frame: number;
    let tick = 0;

    const glitch = () => {
      tick++;
      if (tick % 200 === 0) {
        el.style.transform = `translate(${Math.random() * 4 - 2}px, 0)`;
        el.style.textShadow =
          "4px 0 #ff003c, -4px 0 #00f0ff, 0 0 20px #18FF3A, 0 0 40px #0dcc2a, 3px 3px 0 #083B0A";
        setTimeout(() => {
          el.style.transform = "translate(0, 0)";
          el.style.textShadow =
            "0 0 8px #18FF3A, 0 0 20px #18FF3A, 0 0 40px #0dcc2a, 3px 3px 0 #083B0A, -1px -1px 0 #083B0A, 1px -1px 0 #083B0A, -1px 1px 0 #083B0A";
        }, 80);
      }
      frame = requestAnimationFrame(glitch);
    };

    frame = requestAnimationFrame(glitch);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div style={styles.root}>
      {/* ── Global keyframes ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        @keyframes floatPx {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.35; }
          50%       { transform: translateY(-14px) rotate(45deg); opacity: 0.6; }
        }
        @keyframes titleGlow {
          0%, 100% {
            text-shadow:
              0 0 8px #18FF3A, 0 0 20px #18FF3A, 0 0 40px #0dcc2a,
              3px 3px 0 #083B0A, -1px -1px 0 #083B0A,
              1px -1px 0 #083B0A, -1px 1px 0 #083B0A;
          }
          50% {
            text-shadow:
              0 0 16px #18FF3A, 0 0 40px #18FF3A, 0 0 70px #0dcc2a,
              3px 3px 0 #083B0A, -1px -1px 0 #083B0A,
              1px -1px 0 #083B0A, -1px 1px 0 #083B0A;
          }
        }
        @keyframes iconPulse {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50%       { opacity: 0.9;  transform: scale(1.08); }
        }
        @keyframes playPulse {
          0%, 100% {
            box-shadow:
              0 0 20px #00FFB7, 0 0 40px rgba(0,255,183,0.3),
              inset 0 2px 0 rgba(255,255,255,0.12),
              inset 0 -2px 0 rgba(0,0,0,0.25);
          }
          50% {
            box-shadow:
              0 0 32px #00FFB7, 0 0 64px rgba(0,255,183,0.5),
              inset 0 2px 0 rgba(255,255,255,0.12),
              inset 0 -2px 0 rgba(0,0,0,0.25);
          }
        }
        @keyframes navGlow {
          0%, 100% {
            box-shadow:
              0 0 12px rgba(0,229,255,0.4), 0 0 24px rgba(0,229,255,0.15),
              inset 0 0 12px rgba(0,229,255,0.05);
          }
          50% {
            box-shadow:
              0 0 18px rgba(0,229,255,0.6), 0 0 36px rgba(0,229,255,0.25),
              inset 0 0 16px rgba(0,229,255,0.08);
          }
        }
        @keyframes scanlineMove {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        .play-btn:hover  { transform: scale(1.05) !important; }
        .play-btn:active { transform: scale(0.97) !important; }

        .nav-btn:hover  { transform: translateY(-3px) !important;
          box-shadow: 0 0 20px rgba(0,229,255,0.7), 0 0 40px rgba(0,229,255,0.3),
                      inset 0 0 16px rgba(0,229,255,0.08) !important; }
        .nav-btn:active { transform: translateY(0) scale(0.98) !important; }

        .nav-btn:nth-child(2) { animation-delay: 0.5s !important; }
        .nav-btn:nth-child(3) { animation-delay: 1s !important; }
      `}</style>

      {/* ── Scanline overlay ── */}
      {/* <div style={styles.scanlineOverlay} aria-hidden="true" /> */}
      {/* <div style={styles.scanlineBeam}  aria-hidden="true" /> */}

      {/* ── Floating BG particles ── */}
      <div style={styles.bgLayer} aria-hidden="true">
        {particles.map((p) => (
          <FloatingParticle key={p.id} type={p.type} style={p.style} />
        ))}
      </div>

      {/* ── Decorative icons flanking the title ── */}
      <div style={styles.decoLayer} aria-hidden="true">
        {/* Question marks — corners */}
        {[
          { top: 140, left: 180 },
          { top: 140, right: 180 },
          { top: 330, left: 160 },
          { top: 330, right: 160 },
        ].map((pos, i) => (
          <span
            key={`qm-${i}`}
            style={{
              ...styles.decoIcon,
              ...pos,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            ?
          </span>
        ))}
        {/* Lightning bolts */}
        {[
          { top: 120, right: 220 },
          { top: 360, left: 195 },
          { top: 360, right: 200 },
        ].map((pos, i) => (
          <span
            key={`bolt-${i}`}
            style={{
              ...styles.decoIcon,
              ...styles.decoBolt,
              ...pos,
              animationDelay: `${i * 0.6 + 0.3}s`,
            }}
          >
            ⚡
          </span>
        ))}
      </div>

      {/* ── Main content ── */}
      <main style={styles.content}>

        {/* Title block */}
        <div style={styles.titleBlock}>
          <h1 ref={titleRef} style={styles.title}>
            THINK FAST,
            <br />
            GUESS FASTER
          </h1>
        </div>

        {/* Play button */}
        <button
          className="play-btn"
          style={styles.playBtn}
          onClick={() => setScreen("mode-select")}
          aria-label="Play"
        >
          <span style={styles.playTriangle} />
        </button>

        {/* Bottom nav row */}
        <nav style={styles.navRow} aria-label="Main navigation">
          <button
            className="nav-btn"
            style={styles.navBtn}
            onClick={() => setScreen("settings")}
          >
            <GearIcon />
            <span style={styles.navLabel}>SETTINGS</span>
          </button>

          <button
            className="nav-btn"
            style={styles.navBtn}
            onClick={() => setScreen("profile")}
          >
            <ProfileIcon />
            <span style={styles.navLabel}>PROFILE</span>
          </button>

          <button
            className="nav-btn"
            style={styles.navBtn}
            onClick={() => setScreen("standing")}
          >
            <StandingIcon />
            <span style={styles.navLabel}>STANDING</span>
          </button>
        </nav>
      </main>
    </div>
  );
}

// ─── Style definitions ────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: "100%",
    background: "#010707",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    fontFamily: "'Press Start 2P', monospace",
  },

  // CRT scanlines
  scanlineOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
    pointerEvents: "none",
    zIndex: 99,
  },
  scanlineBeam: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "rgba(0,255,65,0.06)",
    animation: "scanlineMove 6s linear infinite",
    pointerEvents: "none",
    zIndex: 100,
  },

  bgLayer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
  },

  // Decorative flanking icons
  decoLayer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 5,
  },
  decoIcon: {
    position: "absolute",
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 28,
    color: "#32D64B",
    textShadow: "0 0 12px #32D64B, 0 0 24px #1aff40",
    opacity: 0.7,
    animation: "iconPulse 3s ease-in-out infinite",
    userSelect: "none",
  } as React.CSSProperties,
  decoBolt: {
    color: "#3DFF63",
    textShadow: "0 0 14px #3DFF63, 0 0 28px #1aff50",
    fontSize: 24,
  } as React.CSSProperties,

  // Content layout
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
    marginBottom: 52,
  },
  title: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: "clamp(1.8rem, 4.2vw, 2.8rem)",
    color: "#1FC11A",
    lineHeight: 1.55,
    letterSpacing: "0.05em",
    margin: 0,
    whiteSpace: "pre-line",
    textAlign: "center",
    textShadow:
      "0 0 8px #18FF3A, 0 0 20px #18FF3A, 0 0 40px #0dcc2a, 3px 3px 0 #083B0A, -1px -1px 0 #083B0A, 1px -1px 0 #083B0A, -1px 1px 0 #083B0A",
    animation: "titleGlow 2.5s ease-in-out infinite",
    transition: "text-shadow 0.1s, transform 0.1s",
  },

  // Play button
  playBtn: {
    width: 200,
    height: 72,
    background: "#39AA21",
    border: "3px solid #1D5D13",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    animation: "playPulse 2s ease-in-out infinite",
    marginBottom: 52,
    transition: "transform 0.1s",
    outline: "none",
  },
  playTriangle: {
    display: "block",
    width: 0,
    height: 0,
    borderTop: "20px solid transparent",
    borderBottom: "20px solid transparent",
    borderLeft: "32px solid #DADADA",
    filter: "drop-shadow(0 0 4px rgba(218,218,218,0.5))",
    marginLeft: 6,
  },

  // Nav row
  navRow: {
    display: "flex",
    gap: 24,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  navBtn: {
    width: 210,
    height: 62,
    background: "#021212",
    border: "2px solid #00E5FF",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    cursor: "pointer",
    animation: "navGlow 3s ease-in-out infinite",
    transition: "transform 0.1s, box-shadow 0.1s",
    outline: "none",
  },
  navLabel: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 10,
    color: "#2DE62A",
    textShadow: "0 0 8px #2DE62A, 0 0 16px rgba(45,230,42,0.4)",
    letterSpacing: "0.08em",
    userSelect: "none",
  },
};
