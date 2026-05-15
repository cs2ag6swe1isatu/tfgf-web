import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArcadeBackground,
  ResultHeader,
  StatsGrid,
  ProgressionPanel,
  NeonButton,
} from "../components/arcade";
import { formatAccuracy } from "../utils/formatters";

// ── Mock data for the demo ─────────────────────────────────────────────────
// In production, these would come from the game/trivia stores.
const MOCK_DATA = {
  score: 1250,
  xpGained: 350,
  correct: 14,
  totalQuestions: 15,
  avgTime: "2.4s",
  level: 3,
  rank: "NOVICE",
  currentXP: 750,
  maxXP: 1000,
};

export default function ArcadeResultScreen() {
  const [score] = useState(MOCK_DATA.score);
  const [xpGained] = useState(MOCK_DATA.xpGained);
  const [correct] = useState(MOCK_DATA.correct);
  const [total] = useState(MOCK_DATA.totalQuestions);
  const [avgTime] = useState(MOCK_DATA.avgTime);
  const [level] = useState(MOCK_DATA.level);
  const [rank] = useState(MOCK_DATA.rank);
  const [currentXP] = useState(MOCK_DATA.currentXP);
  const [maxXP] = useState(MOCK_DATA.maxXP);

  // Compute accuracy percentage
  const accuracyPct = total > 0 ? (correct / total) * 100 : 0;
  const accuracyDisplay = formatAccuracy(accuracyPct);

  // Button handlers (demo — just log)
  const handleMainMenu = () => {
    console.log("MAIN MENU");
  };
  const handleViewProfile = () => {
    console.log("VIEW PROFILE");
  };

  // Container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <div
      className="relative w-full h-full min-h-screen overflow-y-auto overflow-x-hidden"
      style={{ fontFamily: "'Press Start 2P', 'VT323', monospace" }}
    >
      {/* Background layer */}
      <ArcadeBackground />

      {/* Main content */}
      <motion.div
        className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 py-6 md:px-8 md:py-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Content container — max width for layout control */}
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 md:gap-6">
          {/* ── HEADER ─────────────────────────────────── */}
          <ResultHeader />

          {/* ── STATS GRID ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <StatsGrid
              score={score}
              xpGained={xpGained}
              accuracy={accuracyDisplay}
              avgTime={avgTime}
            />
          </motion.div>

          {/* ── PROGRESSION PANEL ────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <ProgressionPanel
              level={level}
              rank={rank}
              currentXP={currentXP}
              maxXP={maxXP}
            />
          </motion.div>

          {/* ── FOOTER BUTTONS ──────────────────────────── */}
          <motion.div
            className="w-full flex flex-col sm:flex-row gap-3 md:gap-4 pt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.0 }}
          >
            <NeonButton
              label="MAIN MENU"
              onClick={handleMainMenu}
              color="#39FF14"
              delay={0}
            />
            <NeonButton
              label="VIEW PROFILE"
              onClick={handleViewProfile}
              color="#00FFFF"
              delay={0.1}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}