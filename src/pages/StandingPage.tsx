import { useState } from "react";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:           "#010707",
  bgFrameTint:  "#062B2B",
  green:        "#35E52B",
  greenGlow:    "#3FFF56",
  greenShadow:  "#0A3F0A",
  cyan:         "#00DFFF",
  purple:       "#BF5FFF",
  purpleGlow:   "#D180FF",
  magenta:      "#FF2D78",
  magentaGlow:  "#FF6FA3",
  orange:       "#FF8C00",
  orangeGlow:   "#FFB347",
  gold:         "#FFD700",
  goldGlow:     "#FFE966",
  teal:         "#00E5CC",
  tealGlow:     "#4FFFEE",
  btnFill:      "#10363A",
  btnText:      "#2DE339",
  pixelGreen:   "#3BE042",
  pixelCyan:    "#00DFFF",
  pixelGreenDk: "#2BAA35",
  dimText:      "#3A6B6B",
};

// ─── Rank definitions ─────────────────────────────────────────────────────────
interface RankDef {
  title: string;
  progress: string;
  colorTheme: {
    primary: string;
    glow: string;
    secondary: string;
    ring: string;
  };
  symbolType: "novice" | "student" | "scholar" | "professor" | "expert" |
              "specialist" | "genius" | "maniac" | "sage" | "oracle";
  tier: number;
}

const PAGE_ONE: RankDef[] = [
  {
    title: "NOVICE",
    progress: "0 / 1000",
    colorTheme: { primary: C.cyan, glow: C.pixelCyan, secondary: "#003845", ring: "rgba(0,223,255,0.25)" },
    symbolType: "novice",
    tier: 1,
  },
  {
    title: "STUDENT",
    progress: "1000 / 2000",
    colorTheme: { primary: C.green, glow: C.greenGlow, secondary: "#0A2A0A", ring: "rgba(63,255,86,0.25)" },
    symbolType: "student",
    tier: 2,
  },
  {
    title: "SCHOLAR",
    progress: "2000 / 3000",
    colorTheme: { primary: C.teal, glow: C.tealGlow, secondary: "#003530", ring: "rgba(0,229,204,0.25)" },
    symbolType: "scholar",
    tier: 3,
  },
  {
    title: "PROFESSOR",
    progress: "3000 / 4000",
    colorTheme: { primary: C.purple, glow: C.purpleGlow, secondary: "#1A0A2A", ring: "rgba(191,95,255,0.25)" },
    symbolType: "professor",
    tier: 4,
  },
  {
    title: "EXPERT",
    progress: "4000 / 5000",
    colorTheme: { primary: C.orange, glow: C.orangeGlow, secondary: "#2A1500", ring: "rgba(255,140,0,0.25)" },
    symbolType: "expert",
    tier: 5,
  },
];

const PAGE_TWO: RankDef[] = [
  {
    title: "SPECIALIST",
    progress: "5000 / 6000",
    colorTheme: { primary: C.magenta, glow: C.magentaGlow, secondary: "#2A0015", ring: "rgba(255,45,120,0.25)" },
    symbolType: "specialist",
    tier: 6,
  },
  {
    title: "GENIUS",
    progress: "6000 / 7000",
    colorTheme: { primary: C.cyan, glow: C.pixelCyan, secondary: "#003845", ring: "rgba(0,223,255,0.3)" },
    symbolType: "genius",
    tier: 7,
  },
  {
    title: "MANIAC",
    progress: "7000 / 8000",
    colorTheme: { primary: C.magenta, glow: "#FF0050", secondary: "#1A0010", ring: "rgba(255,0,80,0.3)" },
    symbolType: "maniac",
    tier: 8,
  },
  {
    title: "SAGE",
    progress: "8000 / 9000",
    colorTheme: { primary: C.purple, glow: "#E0A0FF", secondary: "#150020", ring: "rgba(224,160,255,0.3)" },
    symbolType: "sage",
    tier: 9,
  },
  {
    title: "ORACLE",
    progress: "9000 / 10000",
    colorTheme: { primary: C.gold, glow: C.goldGlow, secondary: "#1A1200", ring: "rgba(255,215,0,0.3)" },
    symbolType: "oracle",
    tier: 10,
  },
];

const PAGES = [PAGE_ONE, PAGE_TWO];

// ─── Ambient pixel decorations ────────────────────────────────────────────────
const PIXEL_DECO = [
  { top: "6%",  left: "3%",   color: C.pixelGreen,  delay: "0s",   dur: "5s"   },
  { top: "12%", left: "91%",  color: C.pixelCyan,   delay: "1.2s", dur: "6.5s" },
  { top: "28%", left: "1%",   color: C.pixelGreenDk,delay: "0.7s", dur: "7s"   },
  { top: "55%", left: "96%",  color: C.pixelGreen,  delay: "2s",   dur: "5.5s" },
  { top: "75%", left: "4%",   color: C.pixelCyan,   delay: "1.5s", dur: "6s"   },
  { top: "82%", left: "88%",  color: C.pixelGreenDk,delay: "0.3s", dur: "7.2s" },
  { top: "18%", left: "48%",  color: C.pixelGreen,  delay: "2.5s", dur: "5.8s" },
  { top: "90%", left: "35%",  color: C.pixelCyan,   delay: "1.8s", dur: "6.3s" },
  { top: "42%", left: "93%",  color: C.pixelGreenDk,delay: "0.9s", dur: "5.3s" },
  { top: "65%", left: "7%",   color: C.pixelGreen,  delay: "3s",   dur: "6.8s" },
  { top: "5%",  left: "72%",  color: C.pixelCyan,   delay: "1.1s", dur: "5.7s" },
  { top: "88%", left: "60%",  color: C.pixelGreenDk,delay: "2.2s", dur: "7.4s" },
];

function AmbientPixels() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }} aria-hidden="true">
      {PIXEL_DECO.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            width: 7,
            height: 7,
            border: `2px solid ${p.color}`,
            top: p.top,
            left: p.left,
            opacity: 0.45,
            animation: `floatPx ${p.dur} ${p.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Circuit overlay (decorative SVG) ─────────────────────────────────────────
function CircuitOverlay() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1, opacity: 0.06 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* horizontal rails */}
      <line x1="0" y1="15%" x2="100%" y2="15%" stroke={C.cyan} strokeWidth="1" strokeDasharray="6 14" />
      <line x1="0" y1="85%" x2="100%" y2="85%" stroke={C.cyan} strokeWidth="1" strokeDasharray="6 14" />
      {/* vertical rails */}
      <line x1="4%" y1="0" x2="4%" y2="100%" stroke={C.green} strokeWidth="1" strokeDasharray="4 12" />
      <line x1="96%" y1="0" x2="96%" y2="100%" stroke={C.green} strokeWidth="1" strokeDasharray="4 12" />
      {/* corner brackets TL */}
      <polyline points="2%,3% 2%,8% 8%,8%" fill="none" stroke={C.cyan} strokeWidth="1.5" />
      {/* corner brackets TR */}
      <polyline points="98%,3% 98%,8% 92%,8%" fill="none" stroke={C.cyan} strokeWidth="1.5" />
      {/* corner brackets BL */}
      <polyline points="2%,97% 2%,92% 8%,92%" fill="none" stroke={C.cyan} strokeWidth="1.5" />
      {/* corner brackets BR */}
      <polyline points="98%,97% 98%,92% 92%,92%" fill="none" stroke={C.cyan} strokeWidth="1.5" />
    </svg>
  );
}

// ─── Rank symbol SVGs ─────────────────────────────────────────────────────────
function RankSymbol({ type, color, glow }: { type: RankDef["symbolType"]; color: string; glow: string }) {
  const glowFilter = `drop-shadow(0 0 4px ${glow}) drop-shadow(0 0 10px ${glow})`;
  const px = { shapeRendering: "crispEdges" as const };

  switch (type) {
    case "novice":
      // Pixel ring + arrow up/down + center block
      return (
        <svg viewBox="0 0 60 60" width="54" height="54" style={{ filter: glowFilter, animation: "symbolSpin 12s linear infinite" }} shapeRendering="crispEdges">
          {/* Outer stepped square ring */}
          <rect x="8" y="8" width="44" height="2" fill={color} opacity="0.6" {...px}/>
          <rect x="8" y="50" width="44" height="2" fill={color} opacity="0.6" {...px}/>
          <rect x="8" y="8" width="2" height="44" fill={color} opacity="0.6" {...px}/>
          <rect x="50" y="8" width="2" height="44" fill={color} opacity="0.6" {...px}/>
          {/* Inner pixel ring */}
          <rect x="16" y="16" width="28" height="2" fill={color} opacity="0.35" {...px}/>
          <rect x="16" y="42" width="28" height="2" fill={color} opacity="0.35" {...px}/>
          <rect x="16" y="16" width="2" height="28" fill={color} opacity="0.35" {...px}/>
          <rect x="42" y="16" width="2" height="28" fill={color} opacity="0.35" {...px}/>
          {/* Arrow up (pixel) */}
          <rect x="28" y="12" width="4" height="2" fill={color} opacity="0.8" {...px}/>
          <rect x="26" y="14" width="8" height="2" fill={color} opacity="0.8" {...px}/>
          <rect x="24" y="16" width="12" height="2" fill={color} opacity="0.8" {...px}/>
          {/* Arrow down (pixel) */}
          <rect x="24" y="42" width="12" height="2" fill={color} opacity="0.4" {...px}/>
          <rect x="26" y="44" width="8" height="2" fill={color} opacity="0.4" {...px}/>
          <rect x="28" y="46" width="4" height="2" fill={color} opacity="0.4" {...px}/>
          {/* Center block */}
          <rect x="26" y="26" width="8" height="8" fill={color} {...px}/>
        </svg>
      );
    case "student":
      // Pixel diamond (rotated square via polygon) + cross lines + center block
      return (
        <svg viewBox="0 0 60 60" width="54" height="54" style={{ filter: glowFilter, animation: "symbolSpin 14s linear infinite reverse" }} shapeRendering="crispEdges">
          {/* Outer pixel diamond */}
          <polygon points="30,8 52,30 30,52 8,30" fill="none" stroke={color} strokeWidth="2" {...px}/>
          {/* Inner pixel diamond */}
          <polygon points="30,16 44,30 30,44 16,30" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" {...px}/>
          {/* Cross lines (pixel steps) */}
          <rect x="28" y="8" width="4" height="44" fill={color} opacity="0.2" {...px}/>
          <rect x="8" y="28" width="44" height="4" fill={color} opacity="0.2" {...px}/>
          {/* Center block */}
          <rect x="26" y="26" width="8" height="8" fill={color} {...px}/>
        </svg>
      );
    case "scholar":
      // Pixel hexagon (flat-top) + inner hex outline + center block
      return (
        <svg viewBox="0 0 60 60" width="54" height="54" style={{ filter: glowFilter, animation: "symbolPulse 3s ease-in-out infinite" }} shapeRendering="crispEdges">
          <polygon points="30,8 52,20 52,40 30,52 8,40 8,20" fill="none" stroke={color} strokeWidth="2" {...px}/>
          <polygon points="30,16 44,24 44,36 30,44 16,36 16,24" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" {...px}/>
          {/* Pixel square center */}
          <rect x="24" y="24" width="12" height="12" fill={color} opacity="0.9" {...px}/>
          {/* Pixel dot ring */}
          <rect x="28" y="20" width="4" height="4" fill={color} opacity="0.4" {...px}/>
          <rect x="28" y="36" width="4" height="4" fill={color} opacity="0.4" {...px}/>
          <rect x="20" y="28" width="4" height="4" fill={color} opacity="0.4" {...px}/>
          <rect x="36" y="28" width="4" height="4" fill={color} opacity="0.4" {...px}/>
        </svg>
      );
    case "professor":
      // Pixel star (10-pt) + stepped square ring
      return (
        <svg viewBox="0 0 60 60" width="54" height="54" style={{ filter: glowFilter, animation: "symbolSpin 16s linear infinite" }} shapeRendering="crispEdges">
          {/* Stepped square outer ring */}
          <rect x="6" y="6" width="48" height="2" fill={color} opacity="0.25" {...px}/>
          <rect x="6" y="52" width="48" height="2" fill={color} opacity="0.25" {...px}/>
          <rect x="6" y="6" width="2" height="48" fill={color} opacity="0.25" {...px}/>
          <rect x="52" y="6" width="2" height="48" fill={color} opacity="0.25" {...px}/>
          {/* Dashed inner square */}
          <rect x="12" y="12" width="36" height="2" fill={color} opacity="0.4" {...px}/>
          <rect x="12" y="46" width="36" height="2" fill={color} opacity="0.4" {...px}/>
          <rect x="12" y="12" width="2" height="36" fill={color} opacity="0.4" {...px}/>
          <rect x="46" y="12" width="2" height="36" fill={color} opacity="0.4" {...px}/>
          {/* Pixel 10-point star */}
          <polygon points="30,12 34,24 48,24 38,32 42,46 30,38 18,46 22,32 12,24 26,24" fill={color} opacity="0.85" {...px}/>
        </svg>
      );
    case "expert":
      // Pixel hexagon + inner hex + center block + pixel spikes
      return (
        <svg viewBox="0 0 60 60" width="54" height="54" style={{ filter: glowFilter, animation: "symbolSpin 10s linear infinite" }} shapeRendering="crispEdges">
          <polygon points="30,6 54,18 54,42 30,54 6,42 6,18" fill="none" stroke={color} strokeWidth="2" {...px}/>
          <polygon points="30,14 46,23 46,37 30,46 14,37 14,23" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" {...px}/>
          {/* Pixel center hexagon filled */}
          <polygon points="30,22 38,26 38,34 30,38 22,34 22,26" fill={color} opacity="0.9" {...px}/>
          {/* Pixel spikes (top, bottom, BL, TR) */}
          <rect x="28" y="6" width="4" height="8" fill={color} strokeWidth="0" {...px}/>
          <rect x="28" y="46" width="4" height="8" fill={color} strokeWidth="0" {...px}/>
          <rect x="6" y="16" width="8" height="4" fill={color} strokeWidth="0" {...px}/>
          <rect x="46" y="36" width="8" height="4" fill={color} strokeWidth="0" {...px}/>
          <rect x="6" y="36" width="8" height="4" fill={color} strokeWidth="0" opacity="0.6" {...px}/>
          <rect x="46" y="16" width="8" height="4" fill={color} strokeWidth="0" opacity="0.6" {...px}/>
        </svg>
      );
    case "specialist":
      // Pixel square ring (outer) + pixel square ring (inner dashed) + 10-pt star + dark center block
      return (
        <svg viewBox="0 0 60 60" width="54" height="54" style={{ filter: glowFilter, animation: "symbolSpin 9s linear infinite reverse" }} shapeRendering="crispEdges">
          {/* Outer pixel square ring */}
          <rect x="8" y="8" width="44" height="2" fill={color} {...px}/>
          <rect x="8" y="50" width="44" height="2" fill={color} {...px}/>
          <rect x="8" y="8" width="2" height="44" fill={color} {...px}/>
          <rect x="50" y="8" width="2" height="44" fill={color} {...px}/>
          {/* Inner dashed pixel ring */}
          <rect x="16" y="16" width="8" height="2" fill={color} opacity="0.6" {...px}/>
          <rect x="36" y="16" width="8" height="2" fill={color} opacity="0.6" {...px}/>
          <rect x="16" y="42" width="8" height="2" fill={color} opacity="0.6" {...px}/>
          <rect x="36" y="42" width="8" height="2" fill={color} opacity="0.6" {...px}/>
          <rect x="16" y="16" width="2" height="8" fill={color} opacity="0.6" {...px}/>
          <rect x="42" y="16" width="2" height="8" fill={color} opacity="0.6" {...px}/>
          <rect x="16" y="36" width="2" height="8" fill={color} opacity="0.6" {...px}/>
          <rect x="42" y="36" width="2" height="8" fill={color} opacity="0.6" {...px}/>
          {/* Pixel star */}
          <polygon points="30,8 35,20 48,20 38,28 42,41 30,33 18,41 22,28 12,20 25,20" fill={color} opacity="0.9" {...px}/>
          {/* Dark center block */}
          <rect x="27" y="27" width="6" height="6" fill="#010707" {...px}/>
        </svg>
      );
    case "genius":
      // Pixel large hexagon + inner hex + pixel bar + center block + cross
      return (
        <svg viewBox="0 0 60 60" width="54" height="54" style={{ filter: glowFilter, animation: "symbolPulse 2.5s ease-in-out infinite" }} shapeRendering="crispEdges">
          <polygon points="30,4 56,18 56,42 30,56 4,42 4,18" fill="none" stroke={color} strokeWidth="2" {...px}/>
          <polygon points="30,12 50,23 50,37 30,48 10,37 10,23" fill="none" stroke={color} strokeWidth="1.5" opacity="0.35" {...px}/>
          {/* Pixel horizontal band */}
          <rect x="4" y="26" width="52" height="8" fill={color} opacity="0.18" {...px}/>
          {/* Pixel vertical bar */}
          <rect x="27" y="4" width="6" height="52" fill={color} opacity="0.18" {...px}/>
          {/* Center block */}
          <rect x="25" y="25" width="10" height="10" fill={color} {...px}/>
        </svg>
      );
    case "maniac":
      // Pixel 16-pt burst star + inner pixel star + stepped square ring
      return (
        <svg viewBox="0 0 60 60" width="54" height="54" style={{ filter: glowFilter, animation: "symbolManiac 1.8s ease-in-out infinite" }} shapeRendering="crispEdges">
          {/* Stepped square ring (dashed feel) */}
          <rect x="10" y="10" width="8" height="2" fill={color} opacity="0.35" {...px}/>
          <rect x="42" y="10" width="8" height="2" fill={color} opacity="0.35" {...px}/>
          <rect x="10" y="48" width="8" height="2" fill={color} opacity="0.35" {...px}/>
          <rect x="42" y="48" width="8" height="2" fill={color} opacity="0.35" {...px}/>
          <rect x="10" y="10" width="2" height="8" fill={color} opacity="0.35" {...px}/>
          <rect x="48" y="10" width="2" height="8" fill={color} opacity="0.35" {...px}/>
          <rect x="10" y="42" width="2" height="8" fill={color} opacity="0.35" {...px}/>
          <rect x="48" y="42" width="2" height="8" fill={color} opacity="0.35" {...px}/>
          {/* 16-pt burst */}
          <polygon points="30,4 34,20 50,14 40,28 56,30 40,32 50,46 34,40 30,56 26,40 10,46 20,32 4,30 20,28 10,14 26,20" fill="none" stroke={color} strokeWidth="2" {...px}/>
          {/* Inner pixel star */}
          <polygon points="30,18 33,24 40,24 35,29 37,36 30,32 23,36 25,29 20,24 27,24" fill={color} opacity="0.9" {...px}/>
        </svg>
      );
    case "sage":
      // Pixel square rings + pixel dots at cardinal/diagonal + center block
      return (
        <svg viewBox="0 0 60 60" width="54" height="54" style={{ filter: glowFilter, animation: "symbolSpin 20s linear infinite" }} shapeRendering="crispEdges">
          {/* Outer pixel square ring */}
          <rect x="6" y="6" width="48" height="2" fill={color} opacity="0.22" {...px}/>
          <rect x="6" y="52" width="48" height="2" fill={color} opacity="0.22" {...px}/>
          <rect x="6" y="6" width="2" height="48" fill={color} opacity="0.22" {...px}/>
          <rect x="52" y="6" width="2" height="48" fill={color} opacity="0.22" {...px}/>
          {/* Mid pixel square ring (dashed) */}
          <rect x="12" y="12" width="36" height="2" fill={color} opacity="0.5" strokeDasharray="4 4" {...px}/>
          <rect x="12" y="46" width="36" height="2" fill={color} opacity="0.5" {...px}/>
          <rect x="12" y="12" width="2" height="36" fill={color} opacity="0.5" {...px}/>
          <rect x="46" y="12" width="2" height="36" fill={color} opacity="0.5" {...px}/>
          {/* Inner pixel square ring */}
          <rect x="18" y="18" width="24" height="2" fill={color} opacity="0.4" {...px}/>
          <rect x="18" y="40" width="24" height="2" fill={color} opacity="0.4" {...px}/>
          <rect x="18" y="18" width="2" height="24" fill={color} opacity="0.4" {...px}/>
          <rect x="40" y="18" width="2" height="24" fill={color} opacity="0.4" {...px}/>
          {/* Pixel dots at corners of mid ring */}
          <rect x="11" y="11" width="4" height="4" fill={color} opacity="0.8" {...px}/>
          <rect x="45" y="11" width="4" height="4" fill={color} opacity="0.8" {...px}/>
          <rect x="11" y="45" width="4" height="4" fill={color} opacity="0.8" {...px}/>
          <rect x="45" y="45" width="4" height="4" fill={color} opacity="0.8" {...px}/>
          <rect x="28" y="10" width="4" height="4" fill={color} opacity="0.8" {...px}/>
          <rect x="28" y="46" width="4" height="4" fill={color} opacity="0.8" {...px}/>
          <rect x="10" y="28" width="4" height="4" fill={color} opacity="0.8" {...px}/>
          <rect x="46" y="28" width="4" height="4" fill={color} opacity="0.8" {...px}/>
          {/* Center block */}
          <rect x="24" y="24" width="12" height="12" fill={color} opacity="0.9" {...px}/>
        </svg>
      );
    case "oracle":
      // Pixel square rings (3) + pixel cross spokes + center block
      return (
        <svg viewBox="0 0 60 60" width="54" height="54" style={{ filter: glowFilter, animation: "symbolOracle 4s ease-in-out infinite" }} shapeRendering="crispEdges">
          {/* Outer pixel square ring */}
          <rect x="6" y="6" width="48" height="2" fill={color} opacity="0.8" {...px}/>
          <rect x="6" y="52" width="48" height="2" fill={color} opacity="0.8" {...px}/>
          <rect x="6" y="6" width="2" height="48" fill={color} opacity="0.8" {...px}/>
          <rect x="52" y="6" width="2" height="48" fill={color} opacity="0.8" {...px}/>
          {/* Mid pixel square ring */}
          <rect x="14" y="14" width="32" height="2" fill={color} opacity="0.5" {...px}/>
          <rect x="14" y="44" width="32" height="2" fill={color} opacity="0.5" {...px}/>
          <rect x="14" y="14" width="2" height="32" fill={color} opacity="0.5" {...px}/>
          <rect x="44" y="14" width="2" height="32" fill={color} opacity="0.5" {...px}/>
          {/* Inner pixel square ring */}
          <rect x="22" y="22" width="16" height="2" fill={color} opacity="0.8" {...px}/>
          <rect x="22" y="36" width="16" height="2" fill={color} opacity="0.8" {...px}/>
          <rect x="22" y="22" width="2" height="16" fill={color} opacity="0.8" {...px}/>
          <rect x="36" y="22" width="2" height="16" fill={color} opacity="0.8" {...px}/>
          {/* Pixel spokes (8-directional, card/diag) */}
          <rect x="28" y="8" width="4" height="6" fill={color} opacity="0.5" {...px}/>
          <rect x="28" y="46" width="4" height="6" fill={color} opacity="0.5" {...px}/>
          <rect x="8" y="28" width="6" height="4" fill={color} opacity="0.5" {...px}/>
          <rect x="46" y="28" width="6" height="4" fill={color} opacity="0.5" {...px}/>
          <rect x="14" y="14" width="4" height="4" fill={color} opacity="0.5" {...px}/>
          <rect x="42" y="14" width="4" height="4" fill={color} opacity="0.5" {...px}/>
          <rect x="14" y="42" width="4" height="4" fill={color} opacity="0.5" {...px}/>
          <rect x="42" y="42" width="4" height="4" fill={color} opacity="0.5" {...px}/>
          {/* Center block */}
          <rect x="26" y="26" width="8" height="8" fill={color} {...px}/>
        </svg>
      );
    default:
      return null;
  }
}

// ─── Rank card component ──────────────────────────────────────────────────────
function RankCard({ rank, animDelay }: { rank: RankDef; animDelay: string }) {
  const { title, progress, colorTheme, symbolType, tier } = rank;
  return (
    <div
      className="rank-card"
      data-color={colorTheme.primary}
      style={{
        position: "relative",
        cursor: "default",
        animation: `cardIn 0.38s ${animDelay} both`,
        background: `linear-gradient(145deg, ${colorTheme.secondary} 0%, #010707 100%)`,
        border: `1.5px solid ${colorTheme.primary}`,
        borderRadius: 4,
        padding: "20px 16px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        minHeight: 188,
        overflow: "hidden",
        transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
        boxShadow: `0 0 12px ${colorTheme.ring}, inset 0 0 18px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Corner nicks */}
      <span style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: `2px solid ${colorTheme.glow}`, borderLeft: `2px solid ${colorTheme.glow}` }} />
      <span style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, borderTop: `2px solid ${colorTheme.glow}`, borderRight: `2px solid ${colorTheme.glow}` }} />
      <span style={{ position: "absolute", bottom: 0, left: 0, width: 10, height: 10, borderBottom: `2px solid ${colorTheme.glow}`, borderLeft: `2px solid ${colorTheme.glow}` }} />
      <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderBottom: `2px solid ${colorTheme.glow}`, borderRight: `2px solid ${colorTheme.glow}` }} />

      {/* Tier tag */}
      <span style={{
        position: "absolute",
        top: 8,
        right: 12,
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 7,
        color: colorTheme.primary,
        opacity: 0.5,
        letterSpacing: "0.1em",
      }}>
        LVL.{String(tier).padStart(2, "0")}
      </span>

      {/* Animated ring backdrop */}
      <div style={{
        position: "absolute",
        width: 90,
        height: 90,
        borderRadius: "50%",
        border: `1px solid ${colorTheme.ring}`,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -60%)",
        animation: "ringPulse 3s ease-in-out infinite",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        width: 72,
        height: 72,
        borderRadius: "50%",
        border: `1px solid ${colorTheme.ring}`,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -60%)",
        animation: "ringPulse 3s 0.8s ease-in-out infinite",
        pointerEvents: "none",
        opacity: 0.5,
      }} />

      {/* Symbol */}
      <div style={{ position: "relative", zIndex: 2, marginTop: 4 }}>
        <RankSymbol type={symbolType} color={colorTheme.primary} glow={colorTheme.glow} />
      </div>

      {/* Title */}
      <span style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 9,
        color: colorTheme.primary,
        letterSpacing: "0.14em",
        textAlign: "center",
        textShadow: `0 0 8px ${colorTheme.glow}, 0 0 16px ${colorTheme.glow}`,
        position: "relative",
        zIndex: 2,
      }}>
        {title}
      </span>

      {/* Progress bar container */}
      <div style={{ width: "100%", position: "relative", zIndex: 2 }}>
        <div style={{
          width: "100%",
          height: 4,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${colorTheme.primary}`,
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 5,
        }}>
          <div style={{
            width: "0%",
            height: "100%",
            background: `linear-gradient(90deg, ${colorTheme.primary}, ${colorTheme.glow})`,
            boxShadow: `0 0 6px ${colorTheme.glow}`,
          }} />
        </div>
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 7,
          color: colorTheme.primary,
          textAlign: "center",
          opacity: 0.65,
          letterSpacing: "0.1em",
        }}>
          {progress}
        </div>
      </div>
    </div>
  );
}

// ─── Arrow nav button ─────────────────────────────────────────────────────────
function ArrowBtn({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="arrow-btn"
      aria-label={direction === "left" ? "Previous page" : "Next page"}
      style={{
        width: 44,
        height: 160,
        background: "transparent",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.15 : 1,
        flexShrink: 0,
        outline: "none",
        padding: 0,
        transition: "opacity 0.15s",
      }}
    >
      <span
        style={{
          display: "block",
          width: 0,
          height: 0,
          borderTop: "16px solid transparent",
          borderBottom: "16px solid transparent",
          ...(direction === "right"
            ? { borderLeft: `26px solid ${C.cyan}` }
            : { borderRight: `26px solid ${C.cyan}` }),
          filter: disabled ? "none" : `drop-shadow(0 0 6px ${C.cyan})`,
          transition: "filter 0.15s",
        }}
      />
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RankingPage() {
  const [page, setPage] = useState(0);

  const currentRanks = PAGES[page];
  const totalPages = PAGES.length;

  const handleBack = () => window.history.back();

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        @keyframes floatPx {
          0%,100% { transform: translateY(0) rotate(0deg); opacity: 0.45; }
          50%      { transform: translateY(-12px) rotate(45deg); opacity: 0.7; }
        }
        @keyframes titleGlow {
          0%,100% {
            text-shadow:
              0 0 8px #3FFF56, 0 0 20px #3FFF56, 0 0 40px #35E52B,
              3px 3px 0 #0A3F0A, -1px -1px 0 #0A3F0A,
              1px -1px 0 #0A3F0A, -1px 1px 0 #0A3F0A;
          }
          50% {
            text-shadow:
              0 0 16px #3FFF56, 0 0 38px #3FFF56, 0 0 65px #35E52B,
              3px 3px 0 #0A3F0A, -1px -1px 0 #0A3F0A,
              1px -1px 0 #0A3F0A, -1px 1px 0 #0A3F0A;
          }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes navGlow {
          0%,100% { box-shadow: 0 0 10px rgba(0,223,255,0.35), 0 0 20px rgba(0,223,255,0.12); }
          50%      { box-shadow: 0 0 16px rgba(0,223,255,0.55), 0 0 32px rgba(0,223,255,0.22); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ringPulse {
          0%,100% { transform: translate(-50%, -60%) scale(1); opacity: 0.3; }
          50%      { transform: translate(-50%, -60%) scale(1.12); opacity: 0.55; }
        }
        @keyframes symbolSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes symbolPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.1); }
        }
        @keyframes symbolManiac {
          0%,100% { transform: rotate(0deg) scale(1); }
          25%      { transform: rotate(8deg) scale(1.06); }
          75%      { transform: rotate(-8deg) scale(1.06); }
        }
        @keyframes symbolOracle {
          0%     { transform: rotate(0deg); filter: brightness(1); }
          50%    { transform: rotate(180deg); filter: brightness(1.5); }
          100%   { transform: rotate(360deg); filter: brightness(1); }
        }
        @keyframes subtleGrid {
          0%,100% { opacity: 0.04; }
          50%      { opacity: 0.07; }
        }

        .rank-card:hover {
          transform: translateY(-5px) scale(1.03) !important;
        }
        .rank-card:hover {
          box-shadow: 0 0 28px var(--card-glow, rgba(0,223,255,0.4)),
                      0 0 50px var(--card-glow-dk, rgba(0,223,255,0.15)),
                      inset 0 0 18px rgba(0,0,0,0.6) !important;
          border-color: var(--card-border, #00DFFF) !important;
        }

        .arrow-btn:hover span {
          filter: drop-shadow(0 0 12px #00DFFF) drop-shadow(0 0 20px #00DFFF) !important;
        }
        .arrow-btn:hover span[style*="borderLeft"] {
          border-left-color: #fff !important;
        }
        .arrow-btn:hover span[style*="borderRight"] {
          border-right-color: #fff !important;
        }

        .back-btn:hover {
          background: rgba(0,223,255,0.08) !important;
          border-color: #00DFFF !important;
          color: #00DFFF !important;
          box-shadow: 0 0 14px rgba(0,223,255,0.4) !important;
        }
        .back-btn:active { transform: scale(0.97); }

        .scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px, transparent 3px,
            rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px
          );
          pointer-events: none;
          z-index: 2;
        }

        .bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,223,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,223,255,0.04) 1px, transparent 1px);
          background-size: 44px 44px;
          pointer-events: none;
          z-index: 0;
          animation: subtleGrid 6s ease-in-out infinite;
        }

        .subtitle-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: ${C.cyan};
          letter-spacing: 0.28em;
          opacity: 0.55;
          text-shadow: 0 0 8px ${C.cyan};
          margin-top: 6px;
          animation: fadeUp 0.45s 0.1s both;
        }
      `}</style>

      {/* Background grid */}
      <div className="bg-grid" aria-hidden="true" />

      {/* CRT scanlines */}
      <div className="scanlines" aria-hidden="true" />

      {/* Circuit overlay */}
      <CircuitOverlay />

      {/* Ambient pixels */}
      <AmbientPixels />

      {/* ── Main content ── */}
      <main style={styles.content}>

        {/* Title block */}
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>STANDING / RANKS</h1>
          <p className="subtitle-label">
            {page === 0 ? "TIER I — LOWER RANKS" : "TIER II — HIGHER RANKS"}
          </p>
        </div>

        {/* Grid + arrows row */}
        <div style={styles.gridRow}>

          <ArrowBtn
            direction="left"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          />

          {/* 5-card grid (3 + 2 centered) */}
          <div style={styles.grid}>
            {/* Top row: 3 cards */}
            <div style={styles.topRow}>
              {currentRanks.slice(0, 3).map((rank, i) => (
                <div key={rank.title} style={styles.gridCell}>
                  <RankCard rank={rank} animDelay={`${i * 0.06}s`} />
                </div>
              ))}
            </div>
            {/* Bottom row: 2 cards centered */}
            <div style={styles.bottomRow}>
              {currentRanks.slice(3, 5).map((rank, i) => (
                <div key={rank.title} style={styles.gridCell}>
                  <RankCard rank={rank} animDelay={`${(i + 3) * 0.06}s`} />
                </div>
              ))}
            </div>
          </div>

          <ArrowBtn
            direction="right"
            disabled={page === totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          />

        </div>

        {/* Page indicator + back button row */}
        <div style={styles.footerRow}>
          <span style={styles.pageIndicator}>
            {page + 1}/{totalPages}
          </span>
          <button
            className="back-btn"
            onClick={() => setScreen("home")}
            style={styles.backBtn}
          >
            BACK
          </button>
        </div>

      </main>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "relative",
    width: "100%",
    minHeight: "100%",
    background: C.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    fontFamily: "'Press Start 2P', monospace",
  },

  content: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    width: "100%",
    minHeight: "100%",
    paddingTop: 56,
    paddingBottom: 44,
  },

  titleBlock: {
    textAlign: "center",
    marginBottom: 36,
    animation: "fadeUp 0.35s both",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  title: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: "clamp(1rem, 2.6vw, 1.75rem)",
    color: C.green,
    margin: 0,
    letterSpacing: "0.07em",
    animation: "titleGlow 2.5s ease-in-out infinite",
  },

  gridRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    maxWidth: 900,
    paddingLeft: 20,
    paddingRight: 20,
    marginBottom: 32,
  },

  grid: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 22,
  },
  topRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20,
  },
  bottomRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 20,
    maxWidth: "66.66%",
    margin: "0 auto",
    width: "100%",
  },
  gridCell: {},

  footerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 900,
    paddingLeft: 68,
    paddingRight: 68,
    animation: "fadeUp 0.4s 0.3s both",
  },
  pageIndicator: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 10,
    color: C.cyan,
    letterSpacing: "0.15em",
    textShadow: `0 0 8px ${C.cyan}`,
    opacity: 0.7,
  },
  dotRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  backBtn: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 9,
    color: C.btnText,
    background: C.btnFill,
    border: `1.5px solid ${C.green}`,
    borderRadius: 3,
    padding: "8px 18px",
    cursor: "pointer",
    letterSpacing: "0.14em",
    boxShadow: `0 0 10px rgba(53,229,43,0.25)`,
    transition: "background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s",
  },
};
