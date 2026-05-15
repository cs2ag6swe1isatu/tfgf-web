import { motion } from "framer-motion";

interface XPBarProps {
  currentXP: number;
  maxXP: number;
}

export default function XPBar({ currentXP, maxXP }: XPBarProps) {
  const percentage = Math.min((currentXP / maxXP) * 100, 100);

  return (
    <div className="w-full">
      {/* Progress Bar Container */}
      <div
        className="w-full rounded-full overflow-hidden relative"
        style={{
          height: "clamp(16px, 3vw, 28px)",
          backgroundColor: "rgba(0, 223, 255, 0.1)",
          border: "1px solid rgba(0, 223, 255, 0.25)",
        }}
      >
        {/* Animated fill */}
        <motion.div
          className="h-full rounded-full relative"
          style={{
            background:
              "linear-gradient(90deg, #00BFFF 0%, #00FFFF 50%, #0088FF 100%)",
          }}
          initial={{ width: "0%" }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 1.5,
            delay: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Glow effect on bar */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: [
                "0 0 8px rgba(0, 255, 255, 0.4), inset 0 0 6px rgba(0, 255, 255, 0.2)",
                "0 0 16px rgba(0, 255, 255, 0.7), inset 0 0 12px rgba(0, 255, 255, 0.3)",
                "0 0 8px rgba(0, 255, 255, 0.4), inset 0 0 6px rgba(0, 255, 255, 0.2)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
            }}
            animate={{
              left: ["-100%", "200%"],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: 0.8,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </div>

      {/* XP labels */}
      <div className="flex justify-between mt-2 md:mt-3">
        <span
          className="text-xs md:text-sm tracking-wider"
          style={{
            fontFamily: "'VT323', 'Share Tech Mono', monospace",
            color: "#00FFFF",
            textShadow: "0 0 8px rgba(0, 255, 255, 0.4)",
          }}
        >
          {currentXP.toLocaleString()} / {maxXP.toLocaleString()} XP
        </span>
        <span
          className="text-xs md:text-sm tracking-wider"
          style={{
            fontFamily: "'VT323', 'Share Tech Mono', monospace",
            color: "#FFD700",
            textShadow: "0 0 8px rgba(255, 215, 0, 0.4)",
          }}
        >
          {maxXP - currentXP > 0
            ? `${(maxXP - currentXP).toLocaleString()} XP TO NEXT LEVEL`
            : "MAX LEVEL!"}
        </span>
      </div>
    </div>
  );
}