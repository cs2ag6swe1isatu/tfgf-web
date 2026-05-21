import { useEffect, useRef, useState, useCallback } from "react";
import { useGameStore } from "../store/gameStore";
import { useSoundContext } from "../context/SoundContext";

// ─── Particle helpers ──────────────────────────────────────────────────────────

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  char: string;
  color: string;
  animDelay: number;
  driftX: number;
  driftY: number;
  rot: number;
}

const BURST_COLORS = ["#1FC11A", "#32D64B", "#3DFF63", "#00E5FF", "#FF6B00", "#FF003C"];
const BURST_CHARS = ["⚡", "?", "✦", "⬥", "★"];

function generateBurstParticles(count = 30): BurstParticle[] {
  const particles: BurstParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 80 + Math.random() * 120;
    particles.push({
      id: i,
      x: 50,
      y: 50,
      char: BURST_CHARS[Math.floor(Math.random() * BURST_CHARS.length)],
      color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
      animDelay: 0,
      driftX: Math.cos(angle) * dist,
      driftY: Math.sin(angle) * dist,
      rot: Math.random() * 360,
    });
  }
  return particles;
}

// ─── Intro Cutscene ────────────────────────────────────────────────────────────

const PHRASE_1 = "THINK FAST...";
const PHRASE_2 = "GUESS FASTER";
const TYPE_SPEED_MS = 60; // ms per character
const PAUSE_BETWEEN_PHRASES = 600; // ms pause before phrase 2 starts
const BURST_DELAY_AFTER_PHRASE2 = 400;

type CutscenePhase =
  | "fade-in"
  | "typing-1"
  | "wait-1"
  | "typing-2"
  | "burst"
  | "done";

export default function IntroCutscene() {
  const updateSettings = useGameStore((s) => s.updateSettings);
  const { playSound } = useSoundContext();

  const [phase, setPhase] = useState<CutscenePhase>("fade-in");
  const [typedChars1, setTypedChars1] = useState(0);
  const [typedChars2, setTypedChars2] = useState(0);
  const [fadeInDone, setFadeInDone] = useState(false);
  const [burstParticles] = useState(() => generateBurstParticles(40));
  const [showBurst, setShowBurst] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fade-in timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setFadeInDone(true);
      setPhase("typing-1");
    }, 800);
    return () => clearTimeout(t);
  }, []);

  // ── Typewriter for phrase 1 ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "typing-1") return;
    if (typedChars1 < PHRASE_1.length) {
      const t = setTimeout(() => {
        setTypedChars1((c) => c + 1);
        // Play a tiny tick sound on each character (every few chars to avoid audio spam)
        if (typedChars1 % 2 === 0) playSound("hover");
      }, TYPE_SPEED_MS);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setPhase("wait-1"), 200);
      return () => clearTimeout(t);
    }
  }, [phase, typedChars1, playSound]);

  // ── Wait then start typing phrase 2 ───────────────────────────────────────
  useEffect(() => {
    if (phase !== "wait-1") return;
    const t = setTimeout(() => setPhase("typing-2"), PAUSE_BETWEEN_PHRASES);
    return () => clearTimeout(t);
  }, [phase]);

  // ── Typewriter for phrase 2 ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "typing-2") return;
    if (typedChars2 < PHRASE_2.length) {
      const t = setTimeout(() => {
        setTypedChars2((c) => c + 1);
        if (typedChars2 % 2 === 0) playSound("hover");
      }, TYPE_SPEED_MS);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setPhase("burst"), BURST_DELAY_AFTER_PHRASE2);
      return () => clearTimeout(t);
    }
  }, [phase, typedChars2, playSound]);

  // ── Burst animation trigger ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "burst") return;
    const t = setTimeout(() => {
      setShowBurst(true);
      playSound("select");
    }, 100);
    // Then after burst plays, go to "done" so the button appears
    const t2 = setTimeout(() => {
      setPhase("done");
    }, 1800);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [phase, playSound]);

  // ── Dismiss ───────────────────────────────────────────────────────────────
  const handleDismiss = useCallback(() => {
    if (dismissed) return;
    setDismissed(true);
    playSound("select");
    updateSettings({ hasSeenIntro: true });
  }, [dismissed, playSound, updateSettings]);

  // Keyboard dismiss
  useEffect(() => {
    if (phase !== "done") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, handleDismiss]);

  return (
    <div
      ref={containerRef}
      onClick={handleDismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#010707",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Press Start 2P', monospace",
        opacity: fadeInDone ? 1 : 0,
        transition: "opacity 0.6s ease",
        cursor: phase === "done" ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      {/* ── Global keyframes ── */}
      <style>{`
        @keyframes burstParticle {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
          }
          15% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--dx), var(--dy), 0) rotate(${360}deg) scale(0.3);
          }
        }
        @keyframes scanlineMove {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes buttonPulse {
          0%, 100% {
            box-shadow: 0 0 20px #00FFB7, 0 0 40px rgba(0,255,183,0.3);
          }
          50% {
            box-shadow: 0 0 32px #00FFB7, 0 0 64px rgba(0,255,183,0.5);
          }
        }
        @keyframes blinkCursor {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }
      `}</style>

      {/* ── Scanline overlay ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(0,255,65,0.04)",
          animation: "scanlineMove 6s linear infinite",
          pointerEvents: "none",
          zIndex: 11,
        }}
      />

      {/* ── Decorative corner question marks ── */}
      {fadeInDone && (
        <>
          {[{ top: 60, left: 60 }, { top: 60, right: 60 }, { top: "calc(100% - 100px)", left: 60 }, { top: "calc(100% - 100px)", right: 60 }].map(
            (pos, i) => (
              <span
                key={`corner-${i}`}
                style={{
                  position: "absolute",
                  ...pos,
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 28,
                  color: "#32D64B",
                  textShadow: "0 0 12px #32D64B, 0 0 24px #1aff40",
                  opacity: 0.25,
                  animation: `burstParticle 0s`,
                  transition: "opacity 0.5s ease",
                  transitionDelay: `${i * 0.2}s`,
                  userSelect: "none",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              >
                ?
              </span>
            )
          )}
        </>
      )}

      {/* ── Title area ── */}
      <div
        style={{
          position: "relative",
          zIndex: 20,
          textAlign: "center",
        }}
      >
        {/* Phrase 1 */}
        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
              color: "#1FC11A",
              textShadow:
                "0 0 8px #18FF3A, 0 0 20px #18FF3A, 0 0 40px #0dcc2a, 3px 3px 0 #083B0A",
              letterSpacing: "0.05em",
              visibility: phase === "fade-in" ? "hidden" : "visible",
            }}
          >
            {PHRASE_1.slice(0, typedChars1)}
            {(phase === "typing-1" && typedChars1 < PHRASE_1.length) && (
              <span style={{ animation: "blinkCursor 0.6s step-end infinite", color: "#3DFF63" }}>▌</span>
            )}
          </span>
        </div>

        {/* Phrase 2 spacer + line */}
        <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {(phase === "typing-2" || phase === "wait-1" || phase === "burst" || phase === "done") && (
            <span
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
                color: "#3DFF63",
                textShadow:
                  "0 0 8px #3DFF63, 0 0 20px #3DFF63, 0 0 40px #1aff50, 3px 3px 0 #0a4a1a",
                letterSpacing: "0.08em",
              }}
            >
              {PHRASE_2.slice(0, typedChars2)}
              {(phase === "typing-2" && typedChars2 < PHRASE_2.length) && (
                <span style={{ animation: "blinkCursor 0.6s step-end infinite", color: "#3DFF63" }}>▌</span>
              )}
            </span>
          )}
        </div>

        {/* ── Burst particles ── */}
        {showBurst && (
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 0,
              height: 0,
              zIndex: 25,
              pointerEvents: "none",
            }}
          >
            {burstParticles.map((p) => (
              <span
                key={p.id}
                style={{
                  position: "absolute",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 18,
                  color: p.color,
                  textShadow: `0 0 8px ${p.color}`,
                  left: 0,
                  top: 0,
                  animation: "burstParticle 1.5s ease-out forwards",
                  animationDelay: `${p.id * 15}ms`,
                  ["--dx" as string]: `${p.driftX}px`,
                  ["--dy" as string]: `${p.driftY}px`,
                }}
              >
                {p.char}
              </span>
            ))}
          </div>
        )}

        {/* ── Dismiss button ── */}
        {phase === "done" && (
          <div style={{ marginTop: 60 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              onMouseEnter={() => playSound("hover")}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 14,
                color: "#0A1A0A",
                background: "#39AA21",
                border: "3px solid #1D5D13",
                borderRadius: 10,
                padding: "16px 48px",
                cursor: "pointer",
                animation: "buttonPulse 2s ease-in-out infinite",
                textTransform: "uppercase",
                outline: "none",
                letterSpacing: "0.1em",
                transition: "transform 0.1s",
              }}
              onPointerEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
              }}
              onPointerLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
              }}
            >
              START
            </button>
            <div
              style={{
                marginTop: 14,
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 8,
                color: "#1FC11A44",
                letterSpacing: "0.1em",
              }}
            >
              PRESS ENTER
            </div>
          </div>
        )}
      </div>
    </div>
  );
}