import React, { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useAnimationControls,
  Variants,
} from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface LevelUpTransitionProps {
  oldLevel: number;
  newLevel: number;
  oldXP: number;
  newXP: number;
  xpForOldLevel: number;
  xpForNewLevel: number;
  onContinue: () => void;
  levelRangeLabel?: string;
  /** Required for multi-level: XP threshold to complete each level index.
   *  xpThresholds[i] = total XP needed to finish level (oldLevel + i).
   *  If omitted, intermediate levels show 0/0 XP (still displays correctly). */
  xpThresholds?: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation timing (seconds)
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  overlayIn:   0.35,
  leftCardIn:  0.65,
  arrowsIn:    1.3,
  rightCardIn: 1.9,
  continueIn:  2.9,
};

// ─────────────────────────────────────────────────────────────────────────────
// Colour tokens
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:        "#050d0d",
  bgCard:    "#071212",
  cyan:      "#00ffe7",
  cyanDim:   "#00ffe740",
  cyanGlow:  "0 0 14px #00ffe7, 0 0 32px #00ffe760",
  green:     "#39ff14",
  greenGlow: "0 0 10px #39ff14, 0 0 24px #39ff1450",
  pink:      "#ff2d78",
  pinkGlow:  "0 0 10px #ff2d78, 0 0 24px #ff2d7850",
  blueBar:   "#0095ff",
  text:      "#b0fff8",
  xpLabel:   "#39ff1499",
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position:        "fixed"         as const,
    inset:           0,
    zIndex:          9999,
    backgroundColor: C.bg,
    display:         "flex",
    flexDirection:   "column"        as const,
    alignItems:      "center",
    justifyContent:  "center",
    fontFamily:      "'Orbitron', 'Share Tech Mono', monospace",
    overflow:        "hidden",
    willChange:      "opacity",
  },
  scanlines: {
    position:        "absolute"      as const,
    inset:           0,
    pointerEvents:   "none"          as const,
    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,231,0.018) 3px, rgba(0,255,231,0.018) 4px)",
    zIndex:          1,
  },
  cornerBracket: (corner: "tl" | "tr" | "bl" | "br"): React.CSSProperties => ({
    position:    "absolute"   as const,
    width:       56,
    height:      56,
    borderColor: C.cyan,
    borderStyle: "solid",
    ...(corner === "tl" && { top: 18, left: 18, borderWidth: "2.5px 0 0 2.5px" }),
    ...(corner === "tr" && { top: 18, right: 18, borderWidth: "2.5px 2.5px 0 0" }),
    ...(corner === "bl" && { bottom: 18, left: 18, borderWidth: "0 0 2.5px 2.5px" }),
    ...(corner === "br" && { bottom: 18, right: 18, borderWidth: "0 2.5px 2.5px 0" }),
    boxShadow:   C.cyanGlow,
  }),
  card: {
    width:           "clamp(200px, 28vw, 260px)",
    minHeight:       "clamp(280px, 40vh, 340px)",
    backgroundColor: C.bgCard,
    border:          `2px solid ${C.cyan}`,
    borderRadius:    16,
    boxShadow:       `inset 0 0 24px #00ffe70c, ${C.cyanGlow}`,
    display:         "flex",
    flexDirection:   "column"  as const,
    alignItems:      "center",
    justifyContent:  "center",
    padding:         "28px 20px",
    gap:             14,
    position:        "relative" as const,
    willChange:      "transform, opacity",
  },
  levelText: (color: string, glowColor: string): React.CSSProperties => ({
    fontSize:      "clamp(22px, 3.5vw, 36px)",
    fontWeight:    900,
    letterSpacing: 5,
    color,
    textShadow:    glowColor,
    fontFamily:    "'Orbitron', monospace",
    lineHeight:    1,
  }),
  rangeBadge: {
    fontSize:      10,
    letterSpacing: 4,
    color:         C.green,
    textShadow:    C.greenGlow,
    marginTop:     -6,
  } as React.CSSProperties,
  xpLabel: {
    fontSize:      9,
    letterSpacing: 3,
    color:         C.xpLabel,
    alignSelf:     "flex-start" as const,
    marginBottom:  -6,
  },
  xpBarTrack: {
    width:           "100%",
    height:          16,
    backgroundColor: "#0d1f1f",
    border:          `1px solid ${C.cyanDim}`,
    borderRadius:    4,
    overflow:        "hidden",
    position:        "relative" as const,
  },
  xpBarFill: (pct: number, color: string): React.CSSProperties => ({
    height:          "100%",
    width:           `${Math.max(0, Math.min(100, pct * 100))}%`,
    backgroundColor: color,
    boxShadow:       `0 0 8px ${color}`,
    borderRadius:    4,
    transition:      "width 1s ease",
    willChange:      "width",
  }),
  xpCount: {
    fontSize:      10,
    color:         C.text,
    letterSpacing: 1,
    alignSelf:     "flex-end" as const,
    marginTop:     -6,
  } as React.CSSProperties,
  badgeBox: (color: string, glow: string): React.CSSProperties => ({
    width:         "100%",
    border:        `1.5px solid ${color}`,
    borderRadius:  6,
    padding:       "8px 0",
    textAlign:     "center" as const,
    fontSize:      10,
    letterSpacing: 3,
    color,
    textShadow:    glow,
    boxShadow:     `inset 0 0 10px ${color}28`,
    marginTop:     4,
  }),
  continueBtn: {
    marginTop:     36,
    padding:       "13px 52px",
    fontSize:      13,
    letterSpacing: 5,
    fontFamily:    "'Orbitron', monospace",
    fontWeight:    700,
    color:         C.cyan,
    background:    "#071a1a",
    border:        `2px solid ${C.cyan}`,
    borderRadius:  8,
    cursor:        "pointer",
    boxShadow:     C.cyanGlow,
    outline:       "none",
    textTransform: "uppercase" as const,
    transition:    "background 0.2s, box-shadow 0.2s",
    willChange:    "transform, opacity",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Corner bracket
// ─────────────────────────────────────────────────────────────────────────────
const Corner: React.FC<{ pos: "tl" | "tr" | "bl" | "br" }> = ({ pos }) => (
  <motion.div
    style={styles.cornerBracket(pos)}
    initial={{ opacity: 0, scale: 0.7 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.35, ease: "easeOut" }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// XP bar — timer cleaned up via useEffect return
// ─────────────────────────────────────────────────────────────────────────────
const XPBar: React.FC<{
  current: number;
  max: number;
  color?: string;
  animated?: boolean;
}> = ({ current, max, color = C.blueBar, animated = false }) => {
  const [pct, setPct] = useState(animated ? 0 : current / max);

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => setPct(current / max), 350);
    return () => clearTimeout(timer);
  }, [animated, current, max]);

  return (
    <div style={styles.xpBarTrack}>
      <div style={styles.xpBarFill(pct, color)} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Level card
// ─────────────────────────────────────────────────────────────────────────────
const LevelCard: React.FC<{
  level: number;
  rangeLabel: string;
  currentXP: number;
  maxXP: number;
  badgeText: string;
  badgeColor: string;
  badgeGlow: string;
  levelColor: string;
  levelGlow: string;
  xpBarColor?: string;
  animateBar?: boolean;
  variants: Variants;
}> = ({
  level, rangeLabel, currentXP, maxXP,
  badgeText, badgeColor, badgeGlow,
  levelColor, levelGlow,
  xpBarColor = C.blueBar,
  animateBar = false,
  variants,
}) => (
  <motion.div style={styles.card} variants={variants} initial="hidden" animate="visible">
    {/* GPU opacity-only shimmer — no layout thrashing */}
    <motion.div
      style={{
        position:      "absolute",
        inset:         0,
        borderRadius:  14,
        background:    `radial-gradient(ellipse at 50% 0%, ${levelColor}12 0%, transparent 65%)`,
        pointerEvents: "none",
        willChange:    "opacity",
      }}
      animate={{ opacity: [0.35, 0.8, 0.35] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />

    <span style={styles.levelText(levelColor, levelGlow)}>
      LEVEL&nbsp;{level}
    </span>
    <span style={styles.rangeBadge}>{rangeLabel}</span>

    <span style={styles.xpLabel}>XP PROGRESS</span>
    <XPBar current={currentXP} max={maxXP} color={xpBarColor} animated={animateBar} />
    <span style={styles.xpCount}>
      {currentXP.toLocaleString()}/{maxXP.toLocaleString()}
    </span>

    <div style={styles.badgeBox(badgeColor, badgeGlow)}>{badgeText}</div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Animated arrows
// ─────────────────────────────────────────────────────────────────────────────
const AnimatedArrows: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 100 }}>
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: T.arrowsIn - 0.15, duration: 0.35 }}
      style={{
        fontSize:      10,
        letterSpacing: 3,
        color:         C.green,
        textShadow:    C.greenGlow,
        fontFamily:    "'Orbitron', monospace",
        fontWeight:    700,
        marginBottom:  4,
        willChange:    "opacity, transform",
      }}
    >
      LEVEL UP!
    </motion.div>

    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: [0, 1, 0.55, 1], x: 0 }}
        transition={{
          delay:   T.arrowsIn + i * 0.11,
          duration: 0.3,
          opacity: { repeat: Infinity, duration: 1.4, ease: "easeInOut" },
        }}
        style={{
          fontSize:      32,
          color:         C.green,
          textShadow:    C.greenGlow,
          lineHeight:    1,
          letterSpacing: -4,
          willChange:    "opacity, transform",
        }}
      >
        {">>>"}
      </motion.div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Glitch layer — cancelled flag prevents setState after unmount
// ─────────────────────────────────────────────────────────────────────────────
const GlitchLayer: React.FC = () => {
  const controls = useAnimationControls();

  useEffect(() => {
    let cancelled = false;

    const fireGlitch = async () => {
      while (!cancelled) {
        await new Promise<void>((r) => setTimeout(r, 1200 + Math.random() * 2300));
        if (cancelled) break;
        await controls.start({
          opacity:    [0, 0.16, 0, 0.08, 0],
          x:          [0, -4, 3, -1, 0],
          transition: { duration: 0.14, ease: "linear" },
        });
      }
    };

    fireGlitch();
    return () => { cancelled = true; };
  }, [controls]);

  return (
    <motion.div
      animate={controls}
      style={{
        position:      "absolute",
        inset:         0,
        background:    `linear-gradient(180deg, ${C.pink}10 0%, transparent 40%, ${C.cyan}08 100%)`,
        pointerEvents: "none",
        zIndex:        2,
        willChange:    "opacity, transform",
      }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Queue step shape — one level-up transition to display
// ─────────────────────────────────────────────────────────────────────────────
interface LevelUpStep {
  fromLevel: number;
  toLevel:   number;
  /** XP shown on the left (from) card — always full */
  fromXP:    number;
  /** XP shown on the right (to) card */
  toCurrentXP: number;
  /** Max XP for the right (to) card */
  toMaxXP:   number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build the full queue of level-up steps from props
// ─────────────────────────────────────────────────────────────────────────────
function buildLevelUpQueue(
  oldLevel:      number,
  newLevel:      number,
  xpForOldLevel: number,
  xpForNewLevel: number,
  xpThresholds?: number[],
): LevelUpStep[] {
  const steps: LevelUpStep[] = [];
  const totalLevelsGained = newLevel - oldLevel;

  for (let i = 0; i < totalLevelsGained; i++) {
    const fromLevel = oldLevel + i;
    const toLevel   = oldLevel + i + 1;
    const isLast    = i === totalLevelsGained - 1;

    // XP shown on the left (from) card — the threshold to complete fromLevel.
    // For the very first step use xpForOldLevel; for intermediate steps use
    // xpThresholds if provided, otherwise fall back to xpForOldLevel.
    const fromXP = i === 0
      ? xpForOldLevel
      : xpThresholds?.[i] ?? xpForOldLevel;

    // XP shown on the right (to) card.
    // Only the final step shows the real carry-over XP; intermediate steps
    // show a "freshly unlocked" bar at 0 / threshold.
    const toMaxXP      = isLast ? xpForNewLevel : (xpThresholds?.[i + 1] ?? xpForNewLevel);
    const toCurrentXP  = isLast ? 0 : 0; // always starts at 0 when unlocked

    steps.push({ fromLevel, toLevel, fromXP, toCurrentXP, toMaxXP });
  }

  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const LevelUpTransition: React.FC<LevelUpTransitionProps> = ({
  oldLevel,
  newLevel,
  oldXP,
  newXP,
  xpForOldLevel,
  xpForNewLevel,
  onContinue,
  levelRangeLabel = "LV 1-10",
  xpThresholds,
}) => {
  // ── Queue state ────────────────────────────────────────────────────────────
  const [queue]              = useState<LevelUpStep[]>(() =>
    buildLevelUpQueue(oldLevel, newLevel, xpForOldLevel, xpForNewLevel, xpThresholds)
  );
  const [queueIndex, setQueueIndex] = useState(0);
  const [showContinue, setShowContinue] = useState(false);
  // Key to remount cards when stepping through queue (re-triggers entry anim)
  const [stepKey, setStepKey] = useState(0);

  const currentStep = queue[queueIndex];
  const isLastStep  = queueIndex === queue.length - 1;

  // ── Show continue button after animation completes ─────────────────────────
  useEffect(() => {
    setShowContinue(false);
    const timer = setTimeout(() => setShowContinue(true), T.continueIn * 1000);
    return () => clearTimeout(timer);
  }, [queueIndex]); // reset timer each time we advance the queue

  // ── Advance queue or finish ────────────────────────────────────────────────
  const handleContinue = () => {
    if (!isLastStep) {
      setQueueIndex((idx) => idx + 1);
      setStepKey((k) => k + 1);
    } else {
      onContinue();
    }
  };

  // ── Queue counter label (only shown when >1 level gained) ─────────────────
  const multiLevel = queue.length > 1;

  const leftCardVariants: Variants = {
    hidden:  { opacity: 0, x: -70, scale: 0.9 },
    visible: {
      opacity: 1, x: 0, scale: 1,
      transition: { delay: T.leftCardIn, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const rightCardVariants: Variants = {
    hidden:  { opacity: 0, x: 70, scale: 0.9 },
    visible: {
      opacity: 1, x: 0, scale: 1,
      transition: { delay: T.rightCardIn, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <AnimatePresence>
      <motion.div
        style={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: T.overlayIn }}
      >
        {/* Scanlines */}
        <div style={styles.scanlines} />

        {/* Glitch */}
        <GlitchLayer />

        {/* Corners */}
        {(["tl", "tr", "bl", "br"] as const).map((pos) => (
          <Corner key={pos} pos={pos} />
        ))}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          style={{
            position:      "absolute",
            top:           22,
            left:          0,
            right:         0,
            textAlign:     "center",
            fontSize:      12,
            letterSpacing: 8,
            color:         C.cyan,
            textShadow:    C.cyanGlow,
            fontWeight:    700,
            zIndex:        10,
            willChange:    "opacity, transform",
          }}
        >
          LEVEL PROGRESSION
          {/* Step counter badge — only when multiple levels gained */}
          {multiLevel && (
            <span style={{
              marginLeft:    16,
              fontSize:      9,
              letterSpacing: 3,
              color:         C.pink,
              textShadow:    C.pinkGlow,
              verticalAlign: "middle",
            }}>
              [{queueIndex + 1}/{queue.length}]
            </span>
          )}
        </motion.div>

        {/* Cards row — keyed so cards remount & re-animate on each queue step */}
        <div
          key={stepKey}
          style={{
            display:       "flex",
            flexDirection: "row",
            alignItems:    "center",
            gap:           0,
            zIndex:        10,
            position:      "relative",
            padding:       "0 12px",
            maxWidth:      "100vw",
          }}
        >
          {/* Left card — previous level, bar full */}
          <LevelCard
            level={currentStep.fromLevel}
            rangeLabel={levelRangeLabel}
            currentXP={currentStep.fromXP}
            maxXP={currentStep.fromXP}
            badgeText="XP GOAL REACHED!"
            badgeColor={C.cyan}
            badgeGlow={C.cyanGlow}
            levelColor={C.green}
            levelGlow={C.greenGlow}
            xpBarColor={C.blueBar}
            animateBar={false}
            variants={leftCardVariants}
          />

          {/* Center arrows */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: T.arrowsIn - 0.25, duration: 0.3 }}
            style={{ zIndex: 5, padding: "0 6px", willChange: "opacity" }}
          >
            <AnimatedArrows />
          </motion.div>

          {/* Right card — newly unlocked level */}
          <LevelCard
            level={currentStep.toLevel}
            rangeLabel={levelRangeLabel}
            currentXP={currentStep.toCurrentXP}
            maxXP={currentStep.toMaxXP}
            badgeText="NEW LEVEL UNLOCKED!"
            badgeColor={C.pink}
            badgeGlow={C.pinkGlow}
            levelColor={C.green}
            levelGlow={C.greenGlow}
            xpBarColor={C.blueBar}
            animateBar={true}
            variants={rightCardVariants}
          />
        </div>

        {/* Continue button */}
        <AnimatePresence>
          {showContinue && (
            <motion.button
              key={`btn-${queueIndex}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={styles.continueBtn}
              onClick={handleContinue}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.background = "#0d2a2a";
                btn.style.boxShadow  = "0 0 24px #00ffe7, 0 0 50px #00ffe760";
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.background = "#071a1a";
                btn.style.boxShadow  = C.cyanGlow;
              }}
            >
              {/* Label hints there are more levels to show */}
              {isLastStep ? "CONTINUE" : "NEXT LEVEL >>>"}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Vignette */}
        <div
          style={{
            position:      "absolute",
            inset:         0,
            background:    "radial-gradient(ellipse at 50% 50%, transparent 28%, #000000c0 100%)",
            pointerEvents: "none",
            zIndex:        0,
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default LevelUpTransition;
