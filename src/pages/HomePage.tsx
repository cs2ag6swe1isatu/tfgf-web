import { useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";

const SYMBOLS = ["?", "!", "⚡", "?", "⚡", "!", "?", "⚡"];

function FloatingSymbol({
  symbol,
  style,
}: {
  symbol: string;
  style: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        fontFamily: "'Press Start 2P', monospace",
        color: "#00ff41",
        opacity: 0.18,
        fontSize: "clamp(1.2rem, 3vw, 2.2rem)",
        textShadow: "0 0 10px #00ff41, 0 0 20px #00ff41",
        userSelect: "none",
        pointerEvents: "none",
        animation: "floatSymbol 6s ease-in-out infinite",
        ...style,
      }}
    >
      {symbol}
    </span>
  );
}

const floatingPositions: { top: string; left: string; delay: string; duration: string }[] = [
  { top: "8%", left: "5%", delay: "0s", duration: "5.5s" },
  { top: "15%", left: "88%", delay: "1.2s", duration: "6.8s" },
  { top: "72%", left: "6%", delay: "0.5s", duration: "7.2s" },
  { top: "80%", left: "90%", delay: "2.1s", duration: "5.9s" },
  { top: "40%", left: "2%", delay: "1.8s", duration: "6.4s" },
  { top: "35%", left: "93%", delay: "0.9s", duration: "7s" },
  { top: "60%", left: "50%", delay: "3s", duration: "5.7s" },
  { top: "88%", left: "48%", delay: "1.5s", duration: "6.1s" },
  { top: "22%", left: "42%", delay: "2.5s", duration: "6.6s" },
  { top: "55%", left: "78%", delay: "0.3s", duration: "5.3s" },
  { top: "70%", left: "22%", delay: "2.8s", duration: "7.4s" },
  { top: "10%", left: "65%", delay: "1.6s", duration: "6.2s" },
];

export default function HomePage() {
  const setScreen = useGameStore((state) => state.setScreen);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    let frame: number;
    let tick = 0;
    const glitch = () => {
      tick++;
      if (tick % 180 === 0) {
        el.style.transform = `translate(${Math.random() * 4 - 2}px, 0)`;
        el.style.textShadow =
          "4px 0 #ff003c, -4px 0 #00f0ff, 0 0 24px #00ff41, 0 0 48px #00ff41";
        setTimeout(() => {
          el.style.transform = "translate(0,0)";
          el.style.textShadow =
            "0 0 12px #00ff41, 0 0 32px #00ff41, 0 0 64px #00ff41";
        }, 80);
      }
      frame = requestAnimationFrame(glitch);
    };
    frame = requestAnimationFrame(glitch);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        @keyframes floatSymbol {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.18; }
          50% { transform: translateY(-22px) scale(1.08); opacity: 0.28; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 10px #00ff41, 0 0 30px #00ff41, 0 0 60px #00ff41; }
          50% { box-shadow: 0 0 20px #00ff41, 0 0 60px #00ff41, 0 0 100px #00ff41; }
        }
        @keyframes borderFlicker {
          0%, 96%, 100% { opacity: 1; }
          97% { opacity: 0.5; }
          98% { opacity: 1; }
          99% { opacity: 0.7; }
        }
        @keyframes subtitleBlink {
          0%, 49%, 100% { opacity: 1; }
          50%, 99% { opacity: 0; }
        }

        .play-btn {
          background: #00ff41;
          color: #000;
          border: none;
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(0.75rem, 2vw, 1rem);
          letter-spacing: 0.1em;
          padding: 18px 56px;
          cursor: pointer;
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
          animation: pulseGlow 2.2s ease-in-out infinite;
          transition: transform 0.08s, filter 0.08s;
          text-transform: uppercase;
        }
        .play-btn:hover {
          transform: scale(1.06);
          filter: brightness(1.15);
        }
        .play-btn:active {
          transform: scale(0.96);
        }

        .secondary-btn {
          background: transparent;
          color: #00ff41;
          border: 1.5px solid #00ff41;
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(0.55rem, 1.4vw, 0.72rem);
          letter-spacing: 0.08em;
          padding: 14px 0;
          width: 180px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-transform: uppercase;
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
          box-shadow: 0 0 8px rgba(0,255,65,0.3), inset 0 0 8px rgba(0,255,65,0.05);
          transition: box-shadow 0.15s, background 0.15s, transform 0.08s;
          animation: borderFlicker 8s step-end infinite;
        }
        .secondary-btn:hover {
          background: rgba(0, 255, 65, 0.08);
          box-shadow: 0 0 18px rgba(0,255,65,0.7), inset 0 0 12px rgba(0,255,65,0.1);
          transform: translateY(-2px);
        }
        .secondary-btn:active {
          transform: scale(0.97);
        }

        .scanline {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: rgba(0, 255, 65, 0.06);
          animation: scanline 6s linear infinite;
          pointer-events: none;
          z-index: 10;
        }
        .crt-overlay {
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.08) 2px,
            rgba(0,0,0,0.08) 4px
          );
          pointer-events: none;
          z-index: 9;
        }
      `}</style>

      <div className="scanline" />
      <div className="crt-overlay" />

      {floatingPositions.map((pos, i) => (
        <FloatingSymbol
          key={i}
          symbol={SYMBOLS[i % SYMBOLS.length]}
          style={{
            top: pos.top,
            left: pos.left,
            animationDelay: pos.delay,
            animationDuration: pos.duration,
          }}
        />
      ))}

      <div style={styles.content}>
        <div style={styles.titleWrapper}>
          <p style={styles.eyebrow}>▶ TRIVIA ARCADE ◀</p>
          <h1 ref={titleRef} style={styles.title}>
            Think Fast,{"\n"}Guess Faster
          </h1>
          <p style={styles.subtitle}>
            <span style={{ animation: "subtitleBlink 1.1s step-end infinite" }}>▌</span>
            {" "}{" "}
            <span style={{ animation: "subtitleBlink 1.1s step-end infinite 0.55s" }}>▌</span>
          </p>
        </div>

        <button className="play-btn" onClick={() => setScreen("mode-select")}>
          ▶ &nbsp; PLAY
        </button>

        <div style={styles.secondaryRow}>
          <button className="secondary-btn" onClick={() => setScreen("settings")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="square">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
            </svg>
            Settings
          </button>

          <button className="secondary-btn" onClick={() => setScreen("profile")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="square">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Profile
          </button>

          <button className="secondary-btn" onClick={() => setScreen("standing")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="square">
              <path d="M3 20h18M7 20V10M12 20V4M17 20v-6"/>
            </svg>
            Standing
          </button>
        </div>

        <p style={styles.version}>VER 1.0.0 &nbsp;·&nbsp; © 2025</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    fontFamily: "'Press Start 2P', monospace",
  },
  content: {
    position: "relative",
    zIndex: 5,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2.8rem",
  },
  titleWrapper: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },
  eyebrow: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: "clamp(0.5rem, 1.2vw, 0.65rem)",
    color: "#00ff41",
    letterSpacing: "0.25em",
    opacity: 0.7,
    margin: 0,
  },
  title: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: "clamp(1.6rem, 5vw, 3.2rem)",
    color: "#00ff41",
    textShadow: "0 0 12px #00ff41, 0 0 32px #00ff41, 0 0 64px #00ff41",
    lineHeight: 1.55,
    whiteSpace: "pre-line",
    textAlign: "center",
    margin: 0,
    letterSpacing: "0.04em",
    transition: "text-shadow 0.1s, transform 0.1s",
  },
  subtitle: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: "clamp(0.45rem, 1vw, 0.58rem)",
    color: "#00ff41",
    letterSpacing: "0.2em",
    opacity: 0.55,
    margin: 0,
  },
  secondaryRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1.2rem",
    justifyContent: "center",
  },
  version: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: "0.45rem",
    color: "#00ff41",
    opacity: 0.3,
    letterSpacing: "0.15em",
    margin: 0,
  },
};
