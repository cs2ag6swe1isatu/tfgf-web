import { motion } from "framer-motion";

const glitchKeyframes = {
  "0%, 90%, 100%": {
    textShadow:
      "2px 2px 0 #FF4545, -2px -2px 0 #00FFFF, 0 0 20px #FF4545, 0 0 40px #00FFFF",
    x: 0,
  },
  "92%": {
    textShadow:
      "4px 2px 0 #FF4545, -4px -2px 0 #00FFFF, 0 0 30px #FF4545, 0 0 60px #00FFFF",
    x: -2,
  },
  "94%": {
    textShadow:
      "-4px -2px 0 #FF4545, 4px 2px 0 #00FFFF, 0 0 30px #FF4545, 0 0 60px #00FFFF",
    x: 2,
  },
  "96%": {
    textShadow: "0 0 0 #FF4545, 0 0 0 #00FFFF, 0 0 0 #FF4545, 0 0 0 #00FFFF",
    opacity: 0.6,
  },
  "98%": {
    textShadow:
      "2px 2px 0 #FF4545, -2px -2px 0 #00FFFF, 0 0 20px #FF4545, 0 0 40px #00FFFF",
    opacity: 1,
  },
};

// Subtle flicker using CSS class
const flickerStyle = `
  @keyframes crt-flicker {
    0%, 100% { opacity: 1; }
    3% { opacity: 0.92; }
    6% { opacity: 1; }
    7% { opacity: 0.85; }
    8% { opacity: 1; }
    54% { opacity: 0.95; }
    55% { opacity: 1; }
  }
`;

export default function ResultHeader() {
  return (
    <>
      <style>{flickerStyle}</style>
      <div className="w-full flex justify-center items-center relative z-10 mb-4 md:mb-6">
        <motion.h1
          className="text-center select-none"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "clamp(1.5rem, 6vw, 3.5rem)",
            fontWeight: 900,
            letterSpacing: "0.15em",
            lineHeight: 1.2,
            color: "#FF4545",
          }}
          initial={{ opacity: 0, y: -50, scale: 0.8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <motion.span
            style={{
              display: "block",
              background: "linear-gradient(180deg, #FF4545 0%, #FF6B6B 40%, #FFD700 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter:
                "drop-shadow(0 0 10px rgba(255,69,69,0.6)) drop-shadow(0 0 30px rgba(255,69,69,0.3)) drop-shadow(0 0 60px rgba(0,255,255,0.2))",
              animation: "crt-flicker 4s infinite",
            }}
            animate={glitchKeyframes}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.9, 0.92, 0.94, 0.96, 0.98, 1],
            }}
          >
            GAME
            <br className="sm:hidden" />
            {" "}OVER!
          </motion.span>
        </motion.h1>
      </div>
    </>
  );
}