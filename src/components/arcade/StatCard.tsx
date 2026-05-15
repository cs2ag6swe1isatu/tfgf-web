import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  valueColor?: string;
  delay?: number;
}

export default function StatCard({
  label,
  value,
  valueColor = "#FFFFFF",
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl flex flex-col items-center justify-center px-4 py-5 md:py-8"
      style={{
        border: "1.5px solid rgba(0, 229, 255, 0.4)",
        background:
          "linear-gradient(180deg, rgba(0, 40, 80, 0.6) 0%, rgba(0, 20, 40, 0.8) 100%)",
        minHeight: "clamp(80px, 18vw, 168px)",
      }}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: 0.3 + delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Top glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-60"
        style={{
          background:
            "linear-gradient(90deg, transparent, #00E5FF, transparent)",
        }}
      />

      {/* Neon glow pulse */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{
          boxShadow: [
            "0 0 6px rgba(0,229,255,0.25), inset 0 0 6px rgba(0,229,255,0.05)",
            "0 0 14px rgba(0,229,255,0.5), inset 0 0 10px rgba(0,229,255,0.1)",
            "0 0 6px rgba(0,229,255,0.25), inset 0 0 6px rgba(0,229,255,0.05)",
          ],
          borderColor: [
            "rgba(0,229,255,0.4)",
            "rgba(0,229,255,0.7)",
            "rgba(0,229,255,0.4)",
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay: delay,
          ease: "easeInOut",
        }}
      />

      {/* Label */}
      <span
        className="mb-2 text-center tracking-wider"
        style={{
          fontFamily: "'Press Start 2P', monospace",
          color: "#00E5FF",
          fontSize: "clamp(0.5rem, 1.5vw, 0.85rem)",
          textShadow: "0 0 10px rgba(0,229,255,0.4)",
        }}
      >
        {label}
      </span>

      {/* Value */}
      <motion.span
        style={{
          fontFamily: "'Press Start 2P', monospace",
          color: valueColor,
          fontSize: "clamp(1.2rem, 4.5vw, 2.8rem)",
          lineHeight: 1,
          textShadow: `0 0 15px ${valueColor}40, 0 0 30px ${valueColor}20`,
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 + delay }}
      >
        {value}
      </motion.span>
    </motion.div>
  );
}