import React from "react";

// ─── Rank symbol types ─────────────────────────────────────────────────────────
export type RankSymbolType =
  | "novice"
  | "student"
  | "scholar"
  | "professor"
  | "expert"
  | "specialist"
  | "genius"
  | "brainiac"
  | "sage"
  | "oracle";

// ─── Color theme shape ────────────────────────────────────────────────────────
export interface RankColorTheme {
  primary: string;
  glow: string;
  secondary: string;
  ring: string;
}

// ─── Props ─────────────────────────────────────────────────────────────────────
export interface RankIconProps {
  type: RankSymbolType;
  color: string;
  glow: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Rank icon pixel-art SVG component ────────────────────────────────────────
const RankIcon: React.FC<RankIconProps> = ({
  type,
  color,
  glow,
  size = 54,
  className,
  style,
}) => {
  const glowFilter = `drop-shadow(0 0 4px ${glow}) drop-shadow(0 0 10px ${glow})`;
  const px = { shapeRendering: "crispEdges" as const };

  // Each symbol variant matches the StandingPage RankSymbol implementation
  const renderSymbol = () => {
    switch (type) {
      case "novice":
        return (
          <svg
            viewBox="0 0 60 60"
            width={size}
            height={size}
            className={className}
            style={{ filter: glowFilter, animation: "rankIconSpin 12s linear infinite", ...style }}
            shapeRendering="crispEdges"
          >
            <rect x="8" y="8" width="44" height="2" fill={color} opacity="0.6" {...px}/>
            <rect x="8" y="50" width="44" height="2" fill={color} opacity="0.6" {...px}/>
            <rect x="8" y="8" width="2" height="44" fill={color} opacity="0.6" {...px}/>
            <rect x="50" y="8" width="2" height="44" fill={color} opacity="0.6" {...px}/>
            <rect x="16" y="16" width="28" height="2" fill={color} opacity="0.35" {...px}/>
            <rect x="16" y="42" width="28" height="2" fill={color} opacity="0.35" {...px}/>
            <rect x="16" y="16" width="2" height="28" fill={color} opacity="0.35" {...px}/>
            <rect x="42" y="16" width="2" height="28" fill={color} opacity="0.35" {...px}/>
            <rect x="28" y="12" width="4" height="2" fill={color} opacity="0.8" {...px}/>
            <rect x="26" y="14" width="8" height="2" fill={color} opacity="0.8" {...px}/>
            <rect x="24" y="16" width="12" height="2" fill={color} opacity="0.8" {...px}/>
            <rect x="24" y="42" width="12" height="2" fill={color} opacity="0.4" {...px}/>
            <rect x="26" y="44" width="8" height="2" fill={color} opacity="0.4" {...px}/>
            <rect x="28" y="46" width="4" height="2" fill={color} opacity="0.4" {...px}/>
            <rect x="26" y="26" width="8" height="8" fill={color} {...px}/>
          </svg>
        );

      case "student":
        return (
          <svg
            viewBox="0 0 60 60"
            width={size}
            height={size}
            className={className}
            style={{ filter: glowFilter, animation: "rankIconSpin 14s linear infinite reverse", ...style }}
            shapeRendering="crispEdges"
          >
            <polygon points="30,8 52,30 30,52 8,30" fill="none" stroke={color} strokeWidth="2" {...px}/>
            <polygon points="30,16 44,30 30,44 16,30" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" {...px}/>
            <rect x="28" y="8" width="4" height="44" fill={color} opacity="0.2" {...px}/>
            <rect x="8" y="28" width="44" height="4" fill={color} opacity="0.2" {...px}/>
            <rect x="26" y="26" width="8" height="8" fill={color} {...px}/>
          </svg>
        );

      case "scholar":
        return (
          <svg
            viewBox="0 0 60 60"
            width={size}
            height={size}
            className={className}
            style={{ filter: glowFilter, animation: "rankIconPulse 3s ease-in-out infinite", ...style }}
            shapeRendering="crispEdges"
          >
            <polygon points="30,8 52,20 52,40 30,52 8,40 8,20" fill="none" stroke={color} strokeWidth="2" {...px}/>
            <polygon points="30,16 44,24 44,36 30,44 16,36 16,24" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" {...px}/>
            <rect x="24" y="24" width="12" height="12" fill={color} opacity="0.9" {...px}/>
            <rect x="28" y="20" width="4" height="4" fill={color} opacity="0.4" {...px}/>
            <rect x="28" y="36" width="4" height="4" fill={color} opacity="0.4" {...px}/>
            <rect x="20" y="28" width="4" height="4" fill={color} opacity="0.4" {...px}/>
            <rect x="36" y="28" width="4" height="4" fill={color} opacity="0.4" {...px}/>
          </svg>
        );

      case "professor":
        return (
          <svg
            viewBox="0 0 60 60"
            width={size}
            height={size}
            className={className}
            style={{ filter: glowFilter, animation: "rankIconSpin 16s linear infinite", ...style }}
            shapeRendering="crispEdges"
          >
            <rect x="6" y="6" width="48" height="2" fill={color} opacity="0.25" {...px}/>
            <rect x="6" y="52" width="48" height="2" fill={color} opacity="0.25" {...px}/>
            <rect x="6" y="6" width="2" height="48" fill={color} opacity="0.25" {...px}/>
            <rect x="52" y="6" width="2" height="48" fill={color} opacity="0.25" {...px}/>
            <rect x="12" y="12" width="36" height="2" fill={color} opacity="0.4" {...px}/>
            <rect x="12" y="46" width="36" height="2" fill={color} opacity="0.4" {...px}/>
            <rect x="12" y="12" width="2" height="36" fill={color} opacity="0.4" {...px}/>
            <rect x="46" y="12" width="2" height="36" fill={color} opacity="0.4" {...px}/>
            <polygon points="30,12 34,24 48,24 38,32 42,46 30,38 18,46 22,32 12,24 26,24" fill={color} opacity="0.85" {...px}/>
          </svg>
        );

      case "expert":
        return (
          <svg
            viewBox="0 0 60 60"
            width={size}
            height={size}
            className={className}
            style={{ filter: glowFilter, animation: "rankIconSpin 10s linear infinite", ...style }}
            shapeRendering="crispEdges"
          >
            <polygon points="30,6 54,18 54,42 30,54 6,42 6,18" fill="none" stroke={color} strokeWidth="2" {...px}/>
            <polygon points="30,14 46,23 46,37 30,46 14,37 14,23" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" {...px}/>
            <polygon points="30,22 38,26 38,34 30,38 22,34 22,26" fill={color} opacity="0.9" {...px}/>
            <rect x="28" y="6" width="4" height="8" fill={color} strokeWidth="0" {...px}/>
            <rect x="28" y="46" width="4" height="8" fill={color} strokeWidth="0" {...px}/>
            <rect x="6" y="16" width="8" height="4" fill={color} strokeWidth="0" {...px}/>
            <rect x="46" y="36" width="8" height="4" fill={color} strokeWidth="0" {...px}/>
            <rect x="6" y="36" width="8" height="4" fill={color} strokeWidth="0" opacity="0.6" {...px}/>
            <rect x="46" y="16" width="8" height="4" fill={color} strokeWidth="0" opacity="0.6" {...px}/>
          </svg>
        );

      case "specialist":
        return (
          <svg
            viewBox="0 0 60 60"
            width={size}
            height={size}
            className={className}
            style={{ filter: glowFilter, animation: "rankIconSpin 9s linear infinite reverse", ...style }}
            shapeRendering="crispEdges"
          >
            <rect x="8" y="8" width="44" height="2" fill={color} {...px}/>
            <rect x="8" y="50" width="44" height="2" fill={color} {...px}/>
            <rect x="8" y="8" width="2" height="44" fill={color} {...px}/>
            <rect x="50" y="8" width="2" height="44" fill={color} {...px}/>
            <rect x="16" y="16" width="8" height="2" fill={color} opacity="0.6" {...px}/>
            <rect x="36" y="16" width="8" height="2" fill={color} opacity="0.6" {...px}/>
            <rect x="16" y="42" width="8" height="2" fill={color} opacity="0.6" {...px}/>
            <rect x="36" y="42" width="8" height="2" fill={color} opacity="0.6" {...px}/>
            <rect x="16" y="16" width="2" height="8" fill={color} opacity="0.6" {...px}/>
            <rect x="42" y="16" width="2" height="8" fill={color} opacity="0.6" {...px}/>
            <rect x="16" y="36" width="2" height="8" fill={color} opacity="0.6" {...px}/>
            <rect x="42" y="36" width="2" height="8" fill={color} opacity="0.6" {...px}/>
            <polygon points="30,8 35,20 48,20 38,28 42,41 30,33 18,41 22,28 12,20 25,20" fill={color} opacity="0.9" {...px}/>
            <rect x="27" y="27" width="6" height="6" fill="#010707" {...px}/>
          </svg>
        );

      case "genius":
        return (
          <svg
            viewBox="0 0 60 60"
            width={size}
            height={size}
            className={className}
            style={{ filter: glowFilter, animation: "rankIconPulse 2.5s ease-in-out infinite", ...style }}
            shapeRendering="crispEdges"
          >
            <polygon points="30,4 56,18 56,42 30,56 4,42 4,18" fill="none" stroke={color} strokeWidth="2" {...px}/>
            <polygon points="30,12 50,23 50,37 30,48 10,37 10,23" fill="none" stroke={color} strokeWidth="1.5" opacity="0.35" {...px}/>
            <rect x="4" y="26" width="52" height="8" fill={color} opacity="0.18" {...px}/>
            <rect x="27" y="4" width="6" height="52" fill={color} opacity="0.18" {...px}/>
            <rect x="25" y="25" width="10" height="10" fill={color} {...px}/>
          </svg>
        );

      case "brainiac":
        return (
          <svg
            viewBox="0 0 60 60"
            width={size}
            height={size}
            className={className}
            style={{ filter: glowFilter, animation: "rankIconManiac 1.8s ease-in-out infinite", ...style }}
            shapeRendering="crispEdges"
          >
            <rect x="10" y="10" width="8" height="2" fill={color} opacity="0.35" {...px}/>
            <rect x="42" y="10" width="8" height="2" fill={color} opacity="0.35" {...px}/>
            <rect x="10" y="48" width="8" height="2" fill={color} opacity="0.35" {...px}/>
            <rect x="42" y="48" width="8" height="2" fill={color} opacity="0.35" {...px}/>
            <rect x="10" y="10" width="2" height="8" fill={color} opacity="0.35" {...px}/>
            <rect x="48" y="10" width="2" height="8" fill={color} opacity="0.35" {...px}/>
            <rect x="10" y="42" width="2" height="8" fill={color} opacity="0.35" {...px}/>
            <rect x="48" y="42" width="2" height="8" fill={color} opacity="0.35" {...px}/>
            <polygon points="30,4 34,20 50,14 40,28 56,30 40,32 50,46 34,40 30,56 26,40 10,46 20,32 4,30 20,28 10,14 26,20" fill="none" stroke={color} strokeWidth="2" {...px}/>
            <polygon points="30,18 33,24 40,24 35,29 37,36 30,32 23,36 25,29 20,24 27,24" fill={color} opacity="0.9" {...px}/>
          </svg>
        );

      case "sage":
        return (
          <svg
            viewBox="0 0 60 60"
            width={size}
            height={size}
            className={className}
            style={{ filter: glowFilter, animation: "rankIconSpin 20s linear infinite", ...style }}
            shapeRendering="crispEdges"
          >
            <rect x="6" y="6" width="48" height="2" fill={color} opacity="0.22" {...px}/>
            <rect x="6" y="52" width="48" height="2" fill={color} opacity="0.22" {...px}/>
            <rect x="6" y="6" width="2" height="48" fill={color} opacity="0.22" {...px}/>
            <rect x="52" y="6" width="2" height="48" fill={color} opacity="0.22" {...px}/>
            <rect x="12" y="12" width="36" height="2" fill={color} opacity="0.5" {...px}/>
            <rect x="12" y="46" width="36" height="2" fill={color} opacity="0.5" {...px}/>
            <rect x="12" y="12" width="2" height="36" fill={color} opacity="0.5" {...px}/>
            <rect x="46" y="12" width="2" height="36" fill={color} opacity="0.5" {...px}/>
            <rect x="18" y="18" width="24" height="2" fill={color} opacity="0.4" {...px}/>
            <rect x="18" y="40" width="24" height="2" fill={color} opacity="0.4" {...px}/>
            <rect x="18" y="18" width="2" height="24" fill={color} opacity="0.4" {...px}/>
            <rect x="40" y="18" width="2" height="24" fill={color} opacity="0.4" {...px}/>
            <rect x="11" y="11" width="4" height="4" fill={color} opacity="0.8" {...px}/>
            <rect x="45" y="11" width="4" height="4" fill={color} opacity="0.8" {...px}/>
            <rect x="11" y="45" width="4" height="4" fill={color} opacity="0.8" {...px}/>
            <rect x="45" y="45" width="4" height="4" fill={color} opacity="0.8" {...px}/>
            <rect x="28" y="10" width="4" height="4" fill={color} opacity="0.8" {...px}/>
            <rect x="28" y="46" width="4" height="4" fill={color} opacity="0.8" {...px}/>
            <rect x="10" y="28" width="4" height="4" fill={color} opacity="0.8" {...px}/>
            <rect x="46" y="28" width="4" height="4" fill={color} opacity="0.8" {...px}/>
            <rect x="24" y="24" width="12" height="12" fill={color} opacity="0.9" {...px}/>
          </svg>
        );

      case "oracle":
        return (
          <svg
            viewBox="0 0 60 60"
            width={size}
            height={size}
            className={className}
            style={{ filter: glowFilter, animation: "rankIconOracle 4s ease-in-out infinite", ...style }}
            shapeRendering="crispEdges"
          >
            <rect x="6" y="6" width="48" height="2" fill={color} opacity="0.8" {...px}/>
            <rect x="6" y="52" width="48" height="2" fill={color} opacity="0.8" {...px}/>
            <rect x="6" y="6" width="2" height="48" fill={color} opacity="0.8" {...px}/>
            <rect x="52" y="6" width="2" height="48" fill={color} opacity="0.8" {...px}/>
            <rect x="14" y="14" width="32" height="2" fill={color} opacity="0.5" {...px}/>
            <rect x="14" y="44" width="32" height="2" fill={color} opacity="0.5" {...px}/>
            <rect x="14" y="14" width="2" height="32" fill={color} opacity="0.5" {...px}/>
            <rect x="44" y="14" width="2" height="32" fill={color} opacity="0.5" {...px}/>
            <rect x="22" y="22" width="16" height="2" fill={color} opacity="0.8" {...px}/>
            <rect x="22" y="36" width="16" height="2" fill={color} opacity="0.8" {...px}/>
            <rect x="22" y="22" width="2" height="16" fill={color} opacity="0.8" {...px}/>
            <rect x="36" y="22" width="2" height="16" fill={color} opacity="0.8" {...px}/>
            <rect x="28" y="8" width="4" height="6" fill={color} opacity="0.5" {...px}/>
            <rect x="28" y="46" width="4" height="6" fill={color} opacity="0.5" {...px}/>
            <rect x="8" y="28" width="6" height="4" fill={color} opacity="0.5" {...px}/>
            <rect x="46" y="28" width="6" height="4" fill={color} opacity="0.5" {...px}/>
            <rect x="14" y="14" width="4" height="4" fill={color} opacity="0.5" {...px}/>
            <rect x="42" y="14" width="4" height="4" fill={color} opacity="0.5" {...px}/>
            <rect x="14" y="42" width="4" height="4" fill={color} opacity="0.5" {...px}/>
            <rect x="42" y="42" width="4" height="4" fill={color} opacity="0.5" {...px}/>
            <rect x="26" y="26" width="8" height="8" fill={color} {...px}/>
          </svg>
        );

      default:
        return null;
    }
  };

  return renderSymbol();
};

// ─── Animation keyframes (export as string for global injection) ───────────────
export const RANK_ICON_KEYFRAMES = `
@keyframes rankIconSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes rankIconPulse {
  0%,100% { transform: scale(1); }
  50%      { transform: scale(1.1); }
}
@keyframes rankIconManiac {
  0%,100% { transform: rotate(0deg) scale(1); }
  25%      { transform: rotate(8deg) scale(1.06); }
  75%      { transform: rotate(-8deg) scale(1.06); }
}
@keyframes rankIconOracle {
  0%     { transform: rotate(0deg); filter: brightness(1); }
  50%    { transform: rotate(180deg); filter: brightness(1.5); }
  100%   { transform: rotate(360deg); filter: brightness(1); }
}
`;

// ─── Color palettes from StandingPage for each rank type ──────────────────────
export const RANK_COLORS: Record<RankSymbolType, RankColorTheme> = {
  novice:     { primary: "#00DFFF", glow: "#00DFFF", secondary: "#003845", ring: "rgba(0,223,255,0.25)" },
  student:    { primary: "#35E52B", glow: "#3FFF56", secondary: "#0A2A0A", ring: "rgba(63,255,86,0.25)" },
  scholar:    { primary: "#00E5CC", glow: "#4FFFEE", secondary: "#003530", ring: "rgba(0,229,204,0.25)" },
  professor:  { primary: "#BF5FFF", glow: "#D180FF", secondary: "#1A0A2A", ring: "rgba(191,95,255,0.25)" },
  expert:     { primary: "#FF8C00", glow: "#FFB347", secondary: "#2A1500", ring: "rgba(255,140,0,0.25)" },
  specialist: { primary: "#FF2D78", glow: "#FF6FA3", secondary: "#2A0015", ring: "rgba(255,45,120,0.25)" },
  genius:     { primary: "#00DFFF", glow: "#00DFFF", secondary: "#003845", ring: "rgba(0,223,255,0.3)" },
  brainiac:   { primary: "#FF2D78", glow: "#FF0050", secondary: "#1A0010", ring: "rgba(255,0,80,0.3)" },
  sage:       { primary: "#BF5FFF", glow: "#E0A0FF", secondary: "#150020", ring: "rgba(224,160,255,0.3)" },
  oracle:     { primary: "#FFD700", glow: "#FFE966", secondary: "#1A1200", ring: "rgba(255,215,0,0.3)" },
};

// ─── Rank name → symbol type mapping ──────────────────────────────────────────
export function getRankSymbolType(rankName: string): RankSymbolType {
  const normalized = rankName.trim().toLowerCase();
  return RANK_SYMBOL_TYPES.includes(normalized as RankSymbolType)
    ? (normalized as RankSymbolType)
    : "novice";
}

const RANK_SYMBOL_TYPES: RankSymbolType[] = [
  "novice", "student", "scholar", "professor", "expert",
  "specialist", "genius", "brainiac", "sage", "oracle",
];

export default RankIcon;
