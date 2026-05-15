import { motion } from "framer-motion";

interface NeonButtonProps {
  label: string;
  onClick: () => void;
  color?: string;
  delay?: number;
}

export default function NeonButton({
  label,
  onClick,
  color = "#00FFFF",
  delay = 0,
}: NeonButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="flex-1 relative overflow-hidden rounded-lg px-4 py-3 md:py-4 text-center"
      style={{
        background:
          "linear-gradient(180deg, rgba(0, 40, 80, 0.8) 0%, rgba(0, 20, 50, 0.9) 100%)",
        border: `1.5px solid ${color}99`,
        boxShadow: `0 0 12px ${color}40, inset 0 0 12px ${color}08`,
        cursor: "pointer",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: 0.9 + delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        scale: 1.05,
        background:
          "linear-gradient(180deg, rgba(0, 60, 120, 0.9) 0%, rgba(0, 30, 70, 1) 100%)",
        borderColor: color,
        boxShadow: `0 0 24px ${color}80, inset 0 0 20px ${color}15`,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Top glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-70"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />

      {/* Shimmer sweep on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}22, transparent)`,
          left: "-100%",
          width: "60%",
          height: "100%",
        }}
        whileHover={{ left: "160%" }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />

      {/* Pulsing border glow */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        animate={{
          boxShadow: [
            `0 0 8px ${color}30, inset 0 0 6px ${color}05`,
            `0 0 18px ${color}60, inset 0 0 12px ${color}12`,
            `0 0 8px ${color}30, inset 0 0 6px ${color}05`,
          ],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <span
        className="relative z-10 tracking-widest"
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "clamp(0.65rem, 1.5vw, 0.9rem)",
          color: color,
          textShadow: `0 0 8px ${color}80, 0 0 16px ${color}40`,
        }}
      >
        {label}
      </span>
    </motion.button>
  );
}