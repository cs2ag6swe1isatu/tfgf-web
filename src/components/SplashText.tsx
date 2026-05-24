import { useMemo } from "react";
import { SPLASH_TEXTS } from "../utils/easterEggs";

export default function SplashText() {
  const splash = useMemo(() => {
    const index = Math.floor(Math.random() * SPLASH_TEXTS.length);
    return SPLASH_TEXTS[index];
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "100%",
        left: "100%",
        zIndex: 12,
        pointerEvents: "none",
        transform: "translate(-32%, -48%) rotate(-35deg) scale(0.65)",
        transformOrigin: "center",
        textAlign: "center",
        maxWidth: "min(42vw, 380px)",
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "0.25rem 0.75rem",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "clamp(0.9rem, 1.8vw, 1.65rem)",
          lineHeight: 1.15,
          color: "#fff9a8",
          textShadow: "0 0 8px rgba(255,255,255,0.25), 0 0 16px rgba(18,255,102,0.65), 2px 2px 0 #0f4f15",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          transform: "skew(-8deg)",
          borderRadius: "999px",
          animation: "splashHue 8s linear infinite",
        }}
      >
        {splash}
      </div>
    </div>
  );
}
