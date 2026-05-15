import { motion } from "framer-motion";
import XPBar from "./XPBar";

interface ProgressionPanelProps {
  level: number;
  rank: string;
  currentXP: number;
  maxXP: number;
}

export default function ProgressionPanel({
  level,
  rank,
  currentXP,
  maxXP,
}: ProgressionPanelProps) {
  return (
    <motion.div
      className="w-full relative rounded-xl p-4 md:p-6"
      style={{
        background:
          "linear-gradient(180deg, rgba(10, 10, 30, 0.9) 0%, rgba(5, 5, 20, 0.95) 100%)",
        border: "1.5px solid rgba(0, 223, 255, 0.35)",
      }}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* L-shaped cyberpunk corner accents */}
      {/* Top-left */}
      <div
        className="absolute"
        style={{
          top: "-1px",
          left: "-1px",
          width: "20px",
          height: "20px",
          borderTop: "2px solid #00FFFF",
          borderLeft: "2px solid #00FFFF",
          boxShadow: "-1px -1px 8px rgba(0, 255, 255, 0.3)",
        }}
      />
      {/* Top-right */}
      <div
        className="absolute"
        style={{
          top: "-1px",
          right: "-1px",
          width: "20px",
          height: "20px",
          borderTop: "2px solid #00FFFF",
          borderRight: "2px solid #00FFFF",
          boxShadow: "1px -1px 8px rgba(0, 255, 255, 0.3)",
        }}
      />
      {/* Bottom-left */}
      <div
        className="absolute"
        style={{
          bottom: "-1px",
          left: "-1px",
          width: "20px",
          height: "20px",
          borderBottom: "2px solid #00FFFF",
          borderLeft: "2px solid #00FFFF",
          boxShadow: "-1px 1px 8px rgba(0, 255, 255, 0.3)",
        }}
      />
      {/* Bottom-right */}
      <div
        className="absolute"
        style={{
          bottom: "-1px",
          right: "-1px",
          width: "20px",
          height: "20px",
          borderBottom: "2px solid #00FFFF",
          borderRight: "2px solid #00FFFF",
          boxShadow: "1px 1px 8px rgba(0, 255, 255, 0.3)",
        }}
      />

      {/* Content: Flex on larger screens, stacked on mobile */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        {/* Left: Level display */}
        <div className="flex-shrink-0 text-center md:text-left">
          <span
            className="block text-xs tracking-widest mb-1"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              color: "#00DFFF",
              textShadow: "0 0 8px rgba(0, 223, 255, 0.4)",
            }}
          >
            LEVEL
          </span>
          <motion.span
            className="block"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "clamp(2rem, 6vw, 4rem)",
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 1,
              textShadow:
                "0 0 10px rgba(255,255,255,0.5), 0 0 30px rgba(0, 255, 255, 0.3), 0 0 60px rgba(0, 255, 255, 0.15)",
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.6,
              delay: 0.9,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {level}
          </motion.span>
        </div>

        {/* Right content */}
        <div className="flex-1 space-y-3 md:space-y-4">
          {/* Rank badge */}
          <div className="flex items-center justify-center md:justify-start gap-3">
            <motion.div
              className="px-3 py-1.5 rounded-md"
              style={{
                background:
                  "linear-gradient(135deg, rgba(128, 0, 255, 0.3), rgba(200, 0, 255, 0.15))",
                border: "1px solid rgba(180, 0, 255, 0.5)",
                boxShadow: "0 0 15px rgba(180, 0, 255, 0.3)",
              }}
              initial={{ opacity: 0, scale: 0.5, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 1.0,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span
                className="tracking-widest"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "clamp(0.5rem, 1.2vw, 0.7rem)",
                  color: "#C084FC",
                  textShadow:
                    "0 0 10px rgba(192, 132, 252, 0.5), 0 0 20px rgba(192, 132, 252, 0.25)",
                }}
              >
                CURRENT RANK: {rank}
              </span>
            </motion.div>
          </div>

          {/* XP Progress */}
          <XPBar currentXP={currentXP} maxXP={maxXP} />
        </div>
      </div>
    </motion.div>
  );
}