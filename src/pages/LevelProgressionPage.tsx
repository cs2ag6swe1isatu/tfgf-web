// File: LevelProgressionScreen.tsx
import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, animate } from "framer-motion";

// ── helpers ──────────────────────────────────────────────────────────────────
const XP_PER_LEVEL = 1000;
const MAX_LEVEL = 100;

const levelFromXp = (xp: number) =>
  Math.min(Math.floor(xp / XP_PER_LEVEL) + 1, MAX_LEVEL);

const levelRange = (level: number): [number, number] => [
  (level - 1) * XP_PER_LEVEL + 1,
  level * XP_PER_LEVEL,
];

const xpProgress = (xp: number) => xp % XP_PER_LEVEL || (xp > 0 && xp % XP_PER_LEVEL === 0 ? XP_PER_LEVEL : 0);

type Rank = {
  label: string;
  color: string;
  glow: string;
};

const RANKS: Rank[] = [
  { label: "NOVICE",     color: "#00ff88", glow: "#00ff88" },
  { label: "STUDENT",    color: "#4488ff", glow: "#4488ff" },
  { label: "SCHOLAR",    color: "#aa44ff", glow: "#aa44ff" },
  { label: "PROFESSOR",  color: "#ffd700", glow: "#ffd700" },
  { label: "EXPERT",     color: "#ff8800", glow: "#ff8800" },
  { label: "SPECIALIST", color: "#00ccaa", glow: "#00ccaa" },
  { label: "GENIUS",     color: "#ff44cc", glow: "#ff44cc" },
  { label: "BRAINIAC",   color: "#ff3333", glow: "#ff3333" },
  { label: "SAGE",       color: "#ffffff", glow: "#ddddff" },
  { label: "ORACLE",     color: "#aaeeff", glow: "#00ffff" },
];

const rankFromLevel = (level: number): Rank =>
  RANKS[Math.min(Math.floor((level - 1) / 10), 9)];

// ── sub-components ────────────────────────────────────────────────────────────
function CyberpunkCorners({ color = "#00ffff" }: { color?: string }) {
  const s = { position: "absolute" as const, width: 16, height: 16 };
  const border = `2px solid ${color}`;
  return (
    <>
      <span style={{ ...s, top: 0,    left: 0,  borderTop: border, borderLeft: border }} />
      <span style={{ ...s, top: 0,    right: 0, borderTop: border, borderRight: border }} />
      <span style={{ ...s, bottom: 0, left: 0,  borderBottom: border, borderLeft: border }} />
      <span style={{ ...s, bottom: 0, right: 0, borderBottom: border, borderRight: border }} />
    </>
  );
}

interface ProgressBarProps {
  pct: number;
  color: string;
  glow: string;
  animate?: boolean;
}
function ProgressBar({ pct, color, glow, animate: doAnim = false }: ProgressBarProps) {
  const [width, setWidth] = useState(doAnim ? 0 : pct);
  useEffect(() => {
    if (!doAnim) return;
    const t = setTimeout(() => setWidth(pct), 400);
    return () => clearTimeout(t);
  }, [pct, doAnim]);
  return (
    <div style={{
      position: "relative", height: 10, background: "rgba(255,255,255,0.06)",
      borderRadius: 6, border: `1px solid ${color}44`, overflow: "hidden",
    }}>
      <motion.div
        style={{ height: "100%", borderRadius: 6, background: color, boxShadow: `0 0 12px ${glow}` }}
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
      />
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
interface LevelProgressionScreenProps {
  xp: number;
  previousXp: number;
  onContinue?: () => void;
}

export default function LevelProgressionScreen({
  xp,
  previousXp,
  onContinue,
}: LevelProgressionScreenProps) {

  const curLevel = levelFromXp(xp);
  const prevLevel = levelFromXp(previousXp);
  const nextLevel = Math.min(curLevel + 1, MAX_LEVEL);

  // FIX: Guard — only render this screen when a level-up actually occurred.
  // Caller is responsible for gating, but we also protect here.
  const leveledUp = curLevel > prevLevel;

  const curRank = rankFromLevel(curLevel);
  const nextRank = rankFromLevel(nextLevel);

  const [curLo, curHi] = levelRange(curLevel);
  const [nextLo, nextHi] = levelRange(nextLevel);

  const progress = ((xp - (curLevel - 1) * XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
  const progressPct = Math.min(progress, 100);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") onContinue?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onContinue]);

  const cardBase: React.CSSProperties = {
    position: "relative",
    background: "rgba(0,20,30,0.85)",
    borderRadius: 12,
    padding: "clamp(16px,3vw,32px)",
    border: "1px solid rgba(0,255,255,0.25)",
    backdropFilter: "blur(8px)",
    flex: "1 1 0",
    minWidth: 0,
    maxWidth: 320,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#010d13",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "clamp(12px,3vh,40px) clamp(12px,4vw,60px)",
      fontFamily: "'Courier New', monospace",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* ambient glow bg */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(0,255,200,0.04) 0%, transparent 70%)",
      }} />

      {/* scanlines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
      }} />

      {/* title bar */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          width: "100%", maxWidth: 900,
          border: "1px solid rgba(0,255,255,0.3)",
          padding: "10px clamp(16px,3vw,28px)",
          marginBottom: "clamp(16px,4vh,40px)",
          position: "relative",
          background: "rgba(0,255,200,0.03)",
        }}
      >
        <CyberpunkCorners />
        <span style={{
          color: "#00ff88",
          fontSize: "clamp(12px,1.6vw,18px)",
          fontWeight: 700,
          letterSpacing: "0.25em",
          textShadow: "0 0 12px #00ff88",
        }}>
          LEVEL PROGRESSION
        </span>
      </motion.div>

      {/* cards row */}
      <div style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "clamp(12px,3vw,40px)",
        width: "100%",
        maxWidth: 900,
        marginBottom: "clamp(24px,5vh,56px)",
      }}>

        {/* LEFT CARD */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={cardBase}
        >
          <motion.div
            animate={{ boxShadow: [`0 0 18px ${curRank.glow}44`, `0 0 36px ${curRank.glow}88`, `0 0 18px ${curRank.glow}44`] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0, borderRadius: 12, pointerEvents: "none" }}
          />
          <CyberpunkCorners color={curRank.color} />

          <div style={{ textAlign: "center", marginBottom: "clamp(12px,2.5vh,24px)" }}>
            <motion.div
              animate={{ textShadow: [`0 0 10px ${curRank.glow}`, `0 0 30px ${curRank.glow}`, `0 0 10px ${curRank.glow}`] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ color: curRank.color, fontSize: "clamp(22px,3.5vw,42px)", fontWeight: 900, letterSpacing: "0.12em" }}
            >
              LEVEL {curLevel}
            </motion.div>
            <div style={{ color: "rgba(0,255,255,0.6)", fontSize: "clamp(9px,1.1vw,13px)", letterSpacing: "0.2em", marginTop: 4 }}>
              LV {curLo}–{curHi}
            </div>
            <div style={{
              display: "inline-block", marginTop: 8,
              padding: "2px 12px", border: `1px solid ${curRank.color}66`,
              color: curRank.color, fontSize: "clamp(9px,1vw,11px)", letterSpacing: "0.2em",
              background: `${curRank.color}11`,
            }}>
              {curRank.label}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ color: "rgba(0,255,255,0.5)", fontSize: "clamp(8px,0.9vw,10px)", letterSpacing: "0.2em", marginBottom: 6 }}>
              XP PROGRESS
            </div>
            <ProgressBar pct={progressPct} color={curRank.color} glow={curRank.glow} animate />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <span style={{ color: "rgba(0,255,255,0.5)", fontSize: "clamp(8px,0.9vw,10px)" }}>
                {xp}/{curLevel * XP_PER_LEVEL}
              </span>
            </div>
          </div>

          {/* FIX: Removed redundant showLevelUp wrapper — this screen only mounts when leveled up */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            style={{
              border: `1px solid ${curRank.color}66`,
              padding: "clamp(6px,1.2vh,10px)",
              textAlign: "center",
              color: curRank.color,
              fontSize: "clamp(9px,1vw,12px)",
              letterSpacing: "0.2em",
              background: `${curRank.color}0d`,
              boxShadow: `0 0 12px ${curRank.glow}33`,
            }}
          >
            XP GOAL REACHED!
          </motion.div>
        </motion.div>

        {/* CENTER */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {/* FIX: Removed nested redundant showLevelUp motion.div wrapper */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], textShadow: ["0 0 12px #00ff88", "0 0 30px #00ff88", "0 0 12px #00ff88"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              color: "#00ff88", fontSize: "clamp(11px,1.5vw,18px)",
              fontWeight: 900, letterSpacing: "0.25em", textAlign: "center",
            }}
          >
            LEVEL UP!
          </motion.div>

          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                animate={{ x: [0, 6, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                style={{
                  color: "#00ff88",
                  fontSize: "clamp(18px,2.5vw,32px)",
                  textShadow: "0 0 16px #00ff88, 0 0 32px #00ff88",
                  display: "block",
                }}
              >
                ›
              </motion.span>
            ))}
          </div>
        </div>

        {/* RIGHT CARD */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          style={cardBase}
        >
          <motion.div
            animate={{ boxShadow: [`0 0 18px ${nextRank.glow}33`, `0 0 36px ${nextRank.glow}66`, `0 0 18px ${nextRank.glow}33`] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0, borderRadius: 12, pointerEvents: "none" }}
          />
          <CyberpunkCorners color={nextRank.color} />

          <div style={{ textAlign: "center", marginBottom: "clamp(12px,2.5vh,24px)" }}>
            <motion.div
              animate={{ textShadow: [`0 0 10px ${nextRank.glow}`, `0 0 30px ${nextRank.glow}`, `0 0 10px ${nextRank.glow}`] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              style={{ color: nextRank.color, fontSize: "clamp(22px,3.5vw,42px)", fontWeight: 900, letterSpacing: "0.12em" }}
            >
              LEVEL {nextLevel}
            </motion.div>
            <div style={{ color: "rgba(0,255,255,0.6)", fontSize: "clamp(9px,1.1vw,13px)", letterSpacing: "0.2em", marginTop: 4 }}>
              LV {nextLo}–{nextHi}
            </div>
            <div style={{
              display: "inline-block", marginTop: 8,
              padding: "2px 12px", border: `1px solid ${nextRank.color}66`,
              color: nextRank.color, fontSize: "clamp(9px,1vw,11px)", letterSpacing: "0.2em",
              background: `${nextRank.color}11`,
            }}>
              {nextRank.label}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ color: "rgba(0,255,255,0.5)", fontSize: "clamp(8px,0.9vw,10px)", letterSpacing: "0.2em", marginBottom: 6 }}>
              XP PROGRESS
            </div>
            <ProgressBar pct={0} color={nextRank.color} glow={nextRank.glow} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <span style={{ color: "rgba(0,255,255,0.5)", fontSize: "clamp(8px,0.9vw,10px)" }}>
                {xp}/{nextLevel * XP_PER_LEVEL}
              </span>
            </div>
          </div>

          {/* FIX: Removed redundant showLevelUp wrapper */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.7, 1] }}
            transition={{ delay: 1.2, duration: 0.8 }}
            style={{
              border: `1px solid ${nextRank.color}66`,
              padding: "clamp(6px,1.2vh,10px)",
              textAlign: "center",
              color: nextRank.color,
              fontSize: "clamp(9px,1vw,12px)",
              letterSpacing: "0.2em",
              background: `${nextRank.color}0d`,
              boxShadow: `0 0 12px ${nextRank.glow}33`,
            }}
          >
            NEW LEVEL UNLOCKED!
          </motion.div>
        </motion.div>
      </div>

      {/* CONTINUE button */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        style={{ width: "100%", maxWidth: 900, display: "flex", justifyContent: "center" }}
      >
        <motion.button
          onClick={onContinue}
          whileHover={{ scale: 1.05, boxShadow: "0 0 32px #00ffff99" }}
          whileTap={{ scale: 0.96 }}
          style={{
            background: "transparent",
            border: "2px solid #00ffff",
            color: "#00ffff",
            padding: "clamp(10px,1.8vh,16px) clamp(40px,6vw,80px)",
            fontSize: "clamp(12px,1.4vw,16px)",
            fontWeight: 700,
            letterSpacing: "0.3em",
            fontFamily: "'Courier New', monospace",
            cursor: "pointer",
            position: "relative",
            boxShadow: "0 0 16px #00ffff55",
            textShadow: "0 0 8px #00ffff",
          }}
        >
          <CyberpunkCorners color="#00ffff" />
          CONTINUE
        </motion.button>
      </motion.div>

      {/* bottom frame corners */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ position: "absolute", bottom: "clamp(12px,3vh,28px)", left: "clamp(12px,3vw,28px)", width: 40, height: 40, borderBottom: "2px solid rgba(0,255,255,0.4)", borderLeft: "2px solid rgba(0,255,255,0.4)" }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ position: "absolute", bottom: "clamp(12px,3vh,28px)", right: "clamp(12px,3vw,28px)", width: 40, height: 40, borderBottom: "2px solid rgba(0,255,255,0.4)", borderRight: "2px solid rgba(0,255,255,0.4)" }}
      />
    </div>
  );
}