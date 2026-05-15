import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { usePlayerStore } from "../store/playerStore";import { useSoundContext } from "../context/SoundContext";
import { getLevel } from "../utils/progression";

const C = {
  bg: "#010707",
  green: "#35E52B",
  greenGlow: "#3FFF56",
  cyan: "#00DFFF",
  purple: "#BF5FFF",
  purpleGlow: "#D180FF",
  magenta: "#FF2D78",
  magentaGlow: "#FF6FA3",
  orange: "#FF8C00",
  orangeGlow: "#FFB347",
  gold: "#FFD700",
  goldGlow: "#FFE966",
  teal: "#00E5CC",
  tealGlow: "#4FFFEE",
  btnFill: "#10363A",
  btnText: "#2DE339",
  pixelGreen: "#3BE042",
  pixelCyan: "#00DFFF",
  pixelGreenDk: "#2BAA35",
};

type SymType = "novice" | "student" | "scholar" | "professor" | "expert" | "specialist" | "genius" | "brainiac" | "sage" | "oracle";

interface RankDef {
  title: string;
  tier: string;
  xpMin: number;
  xpMax: number;
  rankIndex: number;
  symbolType: SymType;
  colorTheme: { primary: string; glow: string; secondary: string; ring: string };
}

const ALL_RANKS: RankDef[] = [
  { title: "NOVICE", tier: "1–10", xpMin: 0, xpMax: 10000, rankIndex: 0, symbolType: "novice", colorTheme: { primary: C.cyan, glow: C.pixelCyan, secondary: "#003845", ring: "rgba(0,223,255,0.25)" } },
  { title: "STUDENT", tier: "11–20", xpMin: 10001, xpMax: 20000, rankIndex: 1, symbolType: "student", colorTheme: { primary: C.green, glow: C.greenGlow, secondary: "#0A2A0A", ring: "rgba(63,255,86,0.25)" } },
  { title: "SCHOLAR", tier: "21–30", xpMin: 20001, xpMax: 30000, rankIndex: 2, symbolType: "scholar", colorTheme: { primary: C.teal, glow: C.tealGlow, secondary: "#003530", ring: "rgba(0,229,204,0.25)" } },
  { title: "PROFESSOR", tier: "31–40", xpMin: 30001, xpMax: 40000, rankIndex: 3, symbolType: "professor", colorTheme: { primary: C.purple, glow: C.purpleGlow, secondary: "#1A0A2A", ring: "rgba(191,95,255,0.25)" } },
  { title: "EXPERT", tier: "41–50", xpMin: 40001, xpMax: 50000, rankIndex: 4, symbolType: "expert", colorTheme: { primary: C.orange, glow: C.orangeGlow, secondary: "#2A1500", ring: "rgba(255,140,0,0.25)" } },
  { title: "SPECIALIST", tier: "51–60", xpMin: 50001, xpMax: 60000, rankIndex: 5, symbolType: "specialist", colorTheme: { primary: C.magenta, glow: C.magentaGlow, secondary: "#2A0015", ring: "rgba(255,45,120,0.25)" } },
  { title: "GENIUS", tier: "61–70", xpMin: 60001, xpMax: 70000, rankIndex: 6, symbolType: "genius", colorTheme: { primary: C.cyan, glow: C.pixelCyan, secondary: "#003845", ring: "rgba(0,223,255,0.3)" } },
  { title: "BRAINIAC", tier: "71–80", xpMin: 70001, xpMax: 80000, rankIndex: 7, symbolType: "brainiac", colorTheme: { primary: C.magenta, glow: "#FF0050", secondary: "#1A0010", ring: "rgba(255,0,80,0.3)" } },
  { title: "SAGE", tier: "81–90", xpMin: 80001, xpMax: 90000, rankIndex: 8, symbolType: "sage", colorTheme: { primary: C.purple, glow: "#E0A0FF", secondary: "#150020", ring: "rgba(224,160,255,0.3)" } },
  { title: "ORACLE", tier: "91–100", xpMin: 90001, xpMax: 100000, rankIndex: 9, symbolType: "oracle", colorTheme: { primary: C.gold, glow: C.goldGlow, secondary: "#1A1200", ring: "rgba(255,215,0,0.3)" } },
];

const PIXEL_DECO = [
  { top: "6%", left: "3%", color: C.pixelGreen, delay: "0s", dur: "5s" },
  { top: "12%", left: "91%", color: C.pixelCyan, delay: "1.2s", dur: "6.5s" },
  { top: "28%", left: "1%", color: C.pixelGreenDk, delay: "0.7s", dur: "7s" },
  { top: "55%", left: "96%", color: C.pixelGreen, delay: "2s", dur: "5.5s" },
  { top: "75%", left: "4%", color: C.pixelCyan, delay: "1.5s", dur: "6s" },
  { top: "82%", left: "88%", color: C.pixelGreenDk, delay: "0.3s", dur: "7.2s" },
  { top: "18%", left: "48%", color: C.pixelGreen, delay: "2.5s", dur: "5.8s" },
  { top: "90%", left: "35%", color: C.pixelCyan, delay: "1.8s", dur: "6.3s" },
  { top: "42%", left: "93%", color: C.pixelGreenDk, delay: "0.9s", dur: "5.3s" },
  { top: "65%", left: "7%", color: C.pixelGreen, delay: "3s", dur: "6.8s" },
  { top: "5%", left: "72%", color: C.pixelCyan, delay: "1.1s", dur: "5.7s" },
  { top: "88%", left: "60%", color: C.pixelGreenDk, delay: "2.2s", dur: "7.4s" },
];

const rankIdxFromXp = (xp: number) => Math.min(9, Math.floor(xp / 10000));

function AmbientPixels() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }} aria-hidden="true">
      {PIXEL_DECO.map((p, i) => (
        <span
          key={i}
          style={{ position: "absolute", width: 7, height: 7, border: `2px solid ${p.color}`, top: p.top, left: p.left, opacity: 0.45, animation: `floatPx ${p.dur} ${p.delay} ease-in-out infinite` }}
        />
      ))}
    </div>
  );
}

function RankSymbol({ type, color, glow, size = 54 }: { type: SymType; color: string; glow: string; size?: number }) {
  const filter = `drop-shadow(0 0 4px ${glow}) drop-shadow(0 0 10px ${glow})`;
  const crisp = { shapeRendering: "crispEdges" as const };

  switch (type) {
    case "novice":
      return <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter, animation: "symbolSpin 12s linear infinite" }} shapeRendering="crispEdges"><rect x="8" y="8" width="44" height="2" fill={color} opacity=".6" {...crisp} /><rect x="8" y="50" width="44" height="2" fill={color} opacity=".6" {...crisp} /><rect x="8" y="8" width="2" height="44" fill={color} opacity=".6" {...crisp} /><rect x="50" y="8" width="2" height="44" fill={color} opacity=".6" {...crisp} /><rect x="16" y="16" width="28" height="2" fill={color} opacity=".35" {...crisp} /><rect x="16" y="42" width="28" height="2" fill={color} opacity=".35" {...crisp} /><rect x="16" y="16" width="2" height="28" fill={color} opacity=".35" {...crisp} /><rect x="42" y="16" width="2" height="28" fill={color} opacity=".35" {...crisp} /><rect x="26" y="26" width="8" height="8" fill={color} {...crisp} /></svg>;
    case "student":
      return <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter, animation: "symbolSpin 14s linear infinite reverse" }} shapeRendering="crispEdges"><polygon points="30,8 52,30 30,52 8,30" fill="none" stroke={color} strokeWidth="2" /><polygon points="30,16 44,30 30,44 16,30" fill="none" stroke={color} strokeWidth="1.5" opacity=".5" /><rect x="28" y="8" width="4" height="44" fill={color} opacity=".2" {...crisp} /><rect x="8" y="28" width="44" height="4" fill={color} opacity=".2" {...crisp} /><rect x="26" y="26" width="8" height="8" fill={color} {...crisp} /></svg>;
    case "scholar":
      return <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter, animation: "symbolPulse 3s ease-in-out infinite" }} shapeRendering="crispEdges"><polygon points="30,8 52,20 52,40 30,52 8,40 8,20" fill="none" stroke={color} strokeWidth="2" /><polygon points="30,16 44,24 44,36 30,44 16,36 16,24" fill="none" stroke={color} strokeWidth="1.5" opacity=".4" /><rect x="24" y="24" width="12" height="12" fill={color} opacity=".9" {...crisp} /><rect x="28" y="20" width="4" height="4" fill={color} opacity=".4" {...crisp} /><rect x="28" y="36" width="4" height="4" fill={color} opacity=".4" {...crisp} /><rect x="20" y="28" width="4" height="4" fill={color} opacity=".4" {...crisp} /><rect x="36" y="28" width="4" height="4" fill={color} opacity=".4" {...crisp} /></svg>;
    case "professor":
      return <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter, animation: "symbolSpin 16s linear infinite" }} shapeRendering="crispEdges"><rect x="6" y="6" width="48" height="2" fill={color} opacity=".25" {...crisp} /><rect x="6" y="52" width="48" height="2" fill={color} opacity=".25" {...crisp} /><rect x="6" y="6" width="2" height="48" fill={color} opacity=".25" {...crisp} /><rect x="52" y="6" width="2" height="48" fill={color} opacity=".25" {...crisp} /><polygon points="30,12 34,24 48,24 38,32 42,46 30,38 18,46 22,32 12,24 26,24" fill={color} opacity=".85" {...crisp} /></svg>;
    case "expert":
      return <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter, animation: "symbolSpin 10s linear infinite" }} shapeRendering="crispEdges"><polygon points="30,6 54,18 54,42 30,54 6,42 6,18" fill="none" stroke={color} strokeWidth="2" /><polygon points="30,14 46,23 46,37 30,46 14,37 14,23" fill="none" stroke={color} strokeWidth="1.5" opacity=".4" /><polygon points="30,22 38,26 38,34 30,38 22,34 22,26" fill={color} opacity=".9" {...crisp} /></svg>;
    case "specialist":
      return <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter, animation: "symbolSpin 9s linear infinite reverse" }} shapeRendering="crispEdges"><rect x="8" y="8" width="44" height="2" fill={color} {...crisp} /><rect x="8" y="50" width="44" height="2" fill={color} {...crisp} /><rect x="8" y="8" width="2" height="44" fill={color} {...crisp} /><rect x="50" y="8" width="2" height="44" fill={color} {...crisp} /><polygon points="30,8 35,20 48,20 38,28 42,41 30,33 18,41 22,28 12,20 25,20" fill={color} opacity=".9" {...crisp} /><rect x="27" y="27" width="6" height="6" fill="#010707" {...crisp} /></svg>;
    case "genius":
      return <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter, animation: "symbolPulse 2.5s ease-in-out infinite" }} shapeRendering="crispEdges"><polygon points="30,4 56,18 56,42 30,56 4,42 4,18" fill="none" stroke={color} strokeWidth="2" /><polygon points="30,12 50,23 50,37 30,48 10,37 10,23" fill="none" stroke={color} strokeWidth="1.5" opacity=".35" /><rect x="4" y="26" width="52" height="8" fill={color} opacity=".18" {...crisp} /><rect x="27" y="4" width="6" height="52" fill={color} opacity=".18" {...crisp} /><rect x="25" y="25" width="10" height="10" fill={color} {...crisp} /></svg>;
    case "brainiac":
      return <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter, animation: "symbolManiac 1.8s ease-in-out infinite" }} shapeRendering="crispEdges"><polygon points="30,4 34,20 50,14 40,28 56,30 40,32 50,46 34,40 30,56 26,40 10,46 20,32 4,30 20,28 10,14 26,20" fill="none" stroke={color} strokeWidth="2" /><polygon points="30,18 33,24 40,24 35,29 37,36 30,32 23,36 25,29 20,24 27,24" fill={color} opacity=".9" {...crisp} /></svg>;
    case "sage":
      return <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter, animation: "symbolSpin 20s linear infinite" }} shapeRendering="crispEdges"><rect x="6" y="6" width="48" height="2" fill={color} opacity=".22" {...crisp} /><rect x="6" y="52" width="48" height="2" fill={color} opacity=".22" {...crisp} /><rect x="6" y="6" width="2" height="48" fill={color} opacity=".22" {...crisp} /><rect x="52" y="6" width="2" height="48" fill={color} opacity=".22" {...crisp} /><rect x="11" y="11" width="4" height="4" fill={color} opacity=".8" {...crisp} /><rect x="45" y="11" width="4" height="4" fill={color} opacity=".8" {...crisp} /><rect x="11" y="45" width="4" height="4" fill={color} opacity=".8" {...crisp} /><rect x="45" y="45" width="4" height="4" fill={color} opacity=".8" {...crisp} /><rect x="24" y="24" width="12" height="12" fill={color} opacity=".9" {...crisp} /></svg>;
    case "oracle":
      return <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter, animation: "symbolOracle 4s ease-in-out infinite" }} shapeRendering="crispEdges"><rect x="6" y="6" width="48" height="2" fill={color} opacity=".8" {...crisp} /><rect x="6" y="52" width="48" height="2" fill={color} opacity=".8" {...crisp} /><rect x="6" y="6" width="2" height="48" fill={color} opacity=".8" {...crisp} /><rect x="52" y="6" width="2" height="48" fill={color} opacity=".8" {...crisp} /><rect x="14" y="14" width="32" height="2" fill={color} opacity=".5" {...crisp} /><rect x="14" y="44" width="32" height="2" fill={color} opacity=".5" {...crisp} /><rect x="14" y="14" width="2" height="32" fill={color} opacity=".5" {...crisp} /><rect x="44" y="14" width="2" height="32" fill={color} opacity=".5" {...crisp} /><rect x="28" y="26" width="4" height="8" fill={color} {...crisp} /><rect x="26" y="28" width="8" height="4" fill={color} {...crisp} /></svg>;
    default:
      return null;
  }
}

function ArrowBtn({ dir, disabled, onClick }: { dir: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="arrow-btn"
      aria-label={dir === "left" ? "Previous page" : "Next page"}
      style={{ width: 44, height: 160, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.2 : 1, flexShrink: 0, outline: "none", padding: 0, transition: "opacity 0.15s" }}
    >
      <span
        style={{
          display: "block",
          width: 0,
          height: 0,
          borderTop: "16px solid transparent",
          borderBottom: "16px solid transparent",
          ...(dir === "right" ? { borderLeft: `26px solid ${C.cyan}` } : { borderRight: `26px solid ${C.cyan}` }),
          filter: disabled ? "none" : `drop-shadow(0 0 6px ${C.cyan})`,
          transition: "filter 0.15s",
        }}
      />
    </button>
  );
}

function RankCard({ rank, isActive, isUnlocked, pct }: { rank: RankDef; isActive: boolean; isUnlocked: boolean; pct: number }) {
  const { colorTheme } = rank;
  return (
    <div
      className="peek-card"
      style={{
        position: "relative",
        background: `linear-gradient(145deg,${colorTheme.secondary} 0%,#010707 100%)`,
        border: `1.5px solid ${isActive ? colorTheme.glow : isUnlocked ? colorTheme.primary : `${colorTheme.primary}44`}`,
        borderRadius: 4,
        padding: "clamp(10px,1.6vw,18px) clamp(7px,1.1vw,12px) clamp(8px,1.3vw,14px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "clamp(6px,0.9vw,10px)",
        minHeight: "clamp(140px,21vw,200px)",
        overflow: "hidden",
        transition: "transform 0.18s,box-shadow 0.18s",
        boxShadow: isActive ? `0 0 22px ${colorTheme.ring},0 0 40px ${colorTheme.ring}` : `0 0 8px ${colorTheme.ring}`,
        opacity: isUnlocked ? 1 : 0.48,
      }}
    >
      {(["top", "bottom"] as const).flatMap((v) =>
        (["left", "right"] as const).map((h) => (
          <span key={v + h} style={{ position: "absolute", [v]: 0, [h]: 0, width: 9, height: 9, [`border${v.charAt(0).toUpperCase() + v.slice(1)}`]: `2px solid ${colorTheme.glow}`, [`border${h.charAt(0).toUpperCase() + h.slice(1)}`]: `2px solid ${colorTheme.glow}` }} />
        )),
      )}
      {isActive && <span style={{ position: "absolute", top: 5, left: 7, fontFamily: "'Press Start 2P',monospace", fontSize: 6, color: colorTheme.glow, textShadow: `0 0 6px ${colorTheme.glow}`, letterSpacing: "0.1em", animation: "titleGlow 2s ease-in-out infinite" }}>★ NOW</span>}
      {!isUnlocked && <span style={{ position: "absolute", top: 5, right: 7, fontFamily: "'Press Start 2P',monospace", fontSize: 7, opacity: 0.4 }}>🔒</span>}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,transparent 0%,${colorTheme.ring} 50%,transparent 100%)`, animation: `scanSweep ${3} ease-in-out infinite`, pointerEvents: "none", opacity: 0.08 }} />
      <div style={{ position: "relative", zIndex: 2, marginTop: 4 }}>
        <RankSymbol type={rank.symbolType} color={isUnlocked ? colorTheme.primary : `${colorTheme.primary}66`} glow={colorTheme.glow} size={44} />
      </div>
      <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(6px,0.85vw,9px)", color: isUnlocked ? colorTheme.primary : `${colorTheme.primary}66`, letterSpacing: "0.12em", textAlign: "center", textShadow: isUnlocked ? `0 0 8px ${colorTheme.glow},0 0 16px ${colorTheme.glow}` : "none", position: "relative", zIndex: 2 }}>
        {rank.title}
      </span>
      <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(5px,0.6vw,7px)", color: colorTheme.primary, opacity: 0.45, letterSpacing: "0.07em", textAlign: "center", position: "relative", zIndex: 2 }}>
        {rank.xpMin.toLocaleString()}–{rank.xpMax.toLocaleString()} XP
      </span>
      <div style={{ width: "100%", position: "relative", zIndex: 2 }}>
        <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,.05)", border: `1px solid ${colorTheme.primary}55`, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${colorTheme.primary},${colorTheme.glow})`, boxShadow: `0 0 6px ${colorTheme.glow}`, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(5px,0.58vw,6px)", color: colorTheme.primary, textAlign: "center", opacity: 0.5, marginTop: 3, letterSpacing: "0.07em" }}>
          {isUnlocked ? `${pct}%` : "LOCKED"}
        </div>
      </div>
    </div>
  );
}

function CurrentRankPage({ totalXp, onNext }: { totalXp: number; onNext: () => void }) {
  const rankIdx = rankIdxFromXp(totalXp);
  const rank = ALL_RANKS[rankIdx];
  const { colorTheme, symbolType, title, tier } = rank;
  const isMax = rankIdx >= ALL_RANKS.length - 1;
  const xpRange = rank.xpMax - rank.xpMin;
  const xpInRank = Math.max(0, totalXp - rank.xpMin);
  const pct = isMax ? 100 : Math.min(100, Math.floor((xpInRank / xpRange) * 100));
  const level = getLevel(totalXp);  const xpToGo = isMax ? 0 : rank.xpMax - totalXp + 1;
  const nextRank = isMax ? null : ALL_RANKS[rankIdx + 1];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", animation: "fadeUp 0.4s both" }}>
      <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(7px,0.9vw,10px)", color: C.cyan, letterSpacing: "0.35em", textShadow: `0 0 10px ${C.cyan}`, marginBottom: 12, opacity: 0.75 }}>
        ◈ CURRENT RANK ◈
      </div>
      <div className="hero-card" style={{ position: "relative", width: "clamp(230px,52vw,460px)", background: `linear-gradient(145deg,${colorTheme.secondary} 0%,#010707 60%,#020C10 100%)`, border: `2px solid ${colorTheme.primary}`, borderRadius: 6, boxShadow: `0 0 40px ${colorTheme.ring},0 0 80px ${colorTheme.ring},inset 0 0 30px rgba(0,0,0,.7)`, padding: "clamp(18px,2.8vw,32px) clamp(20px,3.5vw,44px) clamp(14px,2.2vw,26px)", display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(8px,1.3vw,14px)", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "clamp(10px,1.4vw,16px)", left: "clamp(10px,1.4vw,18px)", fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(6px,0.75vw,9px)", color: colorTheme.primary, opacity: 0.55, letterSpacing: "0.1em" }}>RANK {rankIdx + 1}</div>
        <div style={{ position: "absolute", top: "clamp(10px,1.4vw,16px)", right: "clamp(10px,1.4vw,18px)", fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(6px,0.75vw,9px)", color: colorTheme.primary, opacity: 0.55, letterSpacing: "0.1em" }}>LV.{level}</div>
        <div style={{ position: "relative", zIndex: 2, marginTop: 6 }}>
          <RankSymbol type={symbolType} color={colorTheme.primary} glow={colorTheme.glow} size={78} />
        </div>
        <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(12px,2.4vw,20px)", color: colorTheme.primary, letterSpacing: "0.12em", textAlign: "center", textShadow: `0 0 12px ${colorTheme.glow},0 0 28px ${colorTheme.glow},0 0 50px ${colorTheme.glow}`, position: "relative", zIndex: 2, animation: "heroTitleGlow 2.2s ease-in-out infinite" }}>
          {title}
        </div>
        <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(6px,0.8vw,9px)", color: colorTheme.primary, opacity: 0.55, letterSpacing: "0.2em", textAlign: "center", position: "relative", zIndex: 2 }}>
          LEVELS {tier}
        </div>
        <div style={{ width: "100%", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(5px,0.72vw,8px)", color: colorTheme.primary, opacity: 0.7 }}>{totalXp.toLocaleString()} XP</span>
            <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(5px,0.72vw,8px)", color: colorTheme.primary, opacity: 0.7 }}>{isMax ? "MAX" : `${rank.xpMax.toLocaleString()} XP`}</span>
          </div>
          <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,.05)", border: `1.5px solid ${colorTheme.primary}`, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${colorTheme.primary},${colorTheme.glow})`, boxShadow: `0 0 10px ${colorTheme.glow},0 0 20px ${colorTheme.glow}`, transition: "width 1s ease", borderRadius: 1 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 5, fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(5px,0.72vw,8px)", color: colorTheme.glow, textShadow: `0 0 6px ${colorTheme.glow}`, letterSpacing: "0.1em" }}>
            {isMax ? "★ MAX RANK ACHIEVED ★" : `${pct}% — ${xpToGo.toLocaleString()} XP TO NEXT`}
          </div>
        </div>
        {!isMax && nextRank && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", border: `1px solid ${nextRank.colorTheme.primary}`, borderRadius: 3, background: `${nextRank.colorTheme.secondary}88`, position: "relative", zIndex: 2, animation: "fadeUp 0.5s 0.3s both" }}>
            <RankSymbol type={nextRank.symbolType} color={nextRank.colorTheme.primary} glow={nextRank.colorTheme.glow} size={22} />
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(5px,0.65vw,7px)", color: C.cyan, opacity: 0.6, letterSpacing: "0.2em" }}>NEXT RANK</span>
              <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(6px,0.75vw,9px)", color: nextRank.colorTheme.primary, textShadow: `0 0 6px ${nextRank.colorTheme.glow}`, letterSpacing: "0.1em" }}>{nextRank.title}</span>
            </div>
          </div>
        )}
      </div>
      <button className="hint-btn" onClick={onNext} style={{ marginTop: 14, fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(6px,0.75vw,8px)", color: C.cyan, background: "transparent", border: `1px solid ${C.cyan}44`, borderRadius: 3, padding: "7px 16px", cursor: "pointer", letterSpacing: "0.18em", opacity: 0.6, transition: "opacity 0.2s,border-color 0.2s", outline: "none" }}>
        VIEW ALL RANKS ▶
      </button>
    </div>
  );
}

const PER_SLIDE = 3;

function AllRanksPage({ totalXp }: { totalXp: number }) {
  const currentRankIdx = rankIdxFromXp(totalXp);
  const [slide, setSlide] = useState(() => Math.floor(currentRankIdx / PER_SLIDE));
  const totalSlides = Math.ceil(ALL_RANKS.length / PER_SLIDE);
  const visible = ALL_RANKS.slice(slide * PER_SLIDE, slide * PER_SLIDE + PER_SLIDE);

  useEffect(() => {
    setSlide(Math.floor(currentRankIdx / PER_SLIDE));
  }, [currentRankIdx]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", animation: "fadeUp 0.4s both" }}>
      <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(7px,0.9vw,10px)", color: C.cyan, letterSpacing: "0.3em", textShadow: `0 0 10px ${C.cyan}`, marginBottom: 14, opacity: 0.75 }}>◈ ALL RANKS ◈</div>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(4px,1vw,12px)", width: "100%", maxWidth: 880, padding: "0 clamp(6px,1.5vw,20px)" }}>
        <ArrowBtn dir="left" disabled={slide === 0} onClick={() => setSlide((s) => s - 1)} />
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${PER_SLIDE},1fr)`, gap: "clamp(8px,1.3vw,18px)" }}>
          {visible.map((rank, i) => {
            const isActive = rank.rankIndex === currentRankIdx;
            const isUnlocked = totalXp >= rank.xpMin;
            const xpRange = rank.xpMax - rank.xpMin;
            const xpIn = Math.max(0, totalXp - rank.xpMin);
            const pct = isUnlocked ? Math.min(100, Math.floor((xpIn / xpRange) * 100)) : 0;
            return <RankCard key={rank.title} rank={rank} isActive={isActive} isUnlocked={isUnlocked} pct={pct} />;
          })}
        </div>
        <ArrowBtn dir="right" disabled={slide === totalSlides - 1} onClick={() => setSlide((s) => s + 1)} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button key={i} onClick={() => setSlide(i)} aria-label={`Go to page ${i + 1}`} style={{ width: i === slide ? 18 : 8, height: 8, borderRadius: 4, background: i === slide ? C.cyan : `${C.cyan}44`, border: "none", cursor: "pointer", transition: "width 0.2s,background 0.2s", padding: 0, outline: "none" }} />
        ))}
      </div>
    </div>
  );
}

export default function StandingPage() {
  const { playSound } = useSoundContext();
  const setScreen = useGameStore((s) => s.setScreen);
const totalXp = usePlayerStore((s) => s.getPlayer().totalXp);
  const [page, setPage] = useState(0);

  const pageLabel = useMemo(() => (page === 0 ? "YOUR CURRENT STANDING" : "RANK PROGRESSION TREE"), [page]);

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "'Press Start 2P',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes floatPx{0%,100%{transform:translateY(0) rotate(0deg);opacity:.45}50%{transform:translateY(-12px) rotate(45deg);opacity:.7}}
        @keyframes titleGlow{0%,100%{text-shadow:0 0 8px #3FFF56,0 0 20px #3FFF56,0 0 40px #35E52B,3px 3px 0 #0A3F0A,-1px -1px 0 #0A3F0A,1px -1px 0 #0A3F0A,-1px 1px 0 #0A3F0A}50%{text-shadow:0 0 16px #3FFF56,0 0 38px #3FFF56,0 0 65px #35E52B,3px 3px 0 #0A3F0A,-1px -1px 0 #0A3F0A,1px -1px 0 #0A3F0A,-1px 1px 0 #0A3F0A}}
        @keyframes heroTitleGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.4)}}
        @keyframes cardIn{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes navGlow{0%,100%{box-shadow:0 0 10px rgba(0,223,255,.35),0 0 20px rgba(0,223,255,.12)}50%{box-shadow:0 0 16px rgba(0,223,255,.55),0 0 32px rgba(0,223,255,.22)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanSweep{0%{transform:translateY(-100%)}100%{transform:translateY(200%)}}
        @keyframes ringPulse{0%,100%{transform:translate(-50%,-54%) scale(1);opacity:.22}50%{transform:translate(-50%,-54%) scale(1.12);opacity:.45}}
        @keyframes symbolSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes symbolPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        @keyframes symbolManiac{0%,100%{transform:rotate(0deg) scale(1)}25%{transform:rotate(8deg) scale(1.06)}75%{transform:rotate(-8deg) scale(1.06)}}
        @keyframes symbolOracle{0%{transform:rotate(0deg);filter:brightness(1)}50%{transform:rotate(180deg);filter:brightness(1.5)}100%{transform:rotate(360deg);filter:brightness(1)}}
        @keyframes subtleGrid{0%,100%{opacity:.04}50%{opacity:.07}}
        .scanlines{position:absolute;inset:0;background:repeating-linear-gradient(to bottom,transparent 0,transparent 3px,rgba(0,0,0,.08) 3px,rgba(0,0,0,.08) 4px);pointer-events:none;z-index:2}
        .bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,223,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,223,255,.04) 1px,transparent 1px);background-size:44px 44px;pointer-events:none;z-index:0;animation:subtleGrid 6s ease-in-out infinite}
        .arrow-btn:hover span{filter:drop-shadow(0 0 12px #00DFFF) drop-shadow(0 0 20px #00DFFF)!important}
        .back-btn:hover{background:rgba(0,223,255,.08)!important;border-color:#00DFFF!important;color:#00DFFF!important;box-shadow:0 0 14px rgba(0,223,255,.4)!important}
        .back-btn:active{transform:scale(.97)}
        .hint-btn:hover{opacity:1!important;border-color:${C.cyan}!important}
        .peek-card:hover{transform:translateY(-4px) scale(1.03)!important}
      `}</style>
      <div className="bg-grid" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <AmbientPixels />
      <main style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", width: "100%", minHeight: "100%", paddingTop: "clamp(28px,4.5vw,56px)", paddingBottom: "clamp(20px,3.5vw,44px)", gap: 0 }}>
        <div style={{ textAlign: "center", marginBottom: "clamp(10px,1.8vw,28px)", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeUp 0.35s both" }}>
          <h1 style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(0.8rem,2.2vw,1.55rem)", color: C.green, margin: 0, letterSpacing: "0.07em", animation: "titleGlow 2.5s ease-in-out infinite" }}>STANDING / RANKS</h1>
          <p style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(6px,0.78vw,9px)", color: C.cyan, letterSpacing: "0.28em", opacity: 0.55, textShadow: `0 0 8px ${C.cyan}`, marginTop: 7, marginBottom: 0, animation: "fadeUp 0.45s 0.1s both" }}>{pageLabel}</p>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: "clamp(10px,1.8vw,22px)", animation: "fadeUp 0.3s 0.1s both" }}>
          {["MY RANK", "ALL RANKS"].map((label, i) => (
            <button key={label} className="hint-btn" onClick={() => { setPage(i); playSound("select"); }} style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(6px,0.7vw,8px)", color: page === i ? C.bg : C.cyan, background: page === i ? C.cyan : "transparent", border: `1.5px solid ${C.cyan}`, borderRadius: 3, padding: "5px clamp(9px,1.3vw,16px)", cursor: "pointer", letterSpacing: "0.12em", transition: "background 0.15s,color 0.15s", boxShadow: page === i ? `0 0 14px ${C.cyan}66` : undefined, outline: "none", opacity: page === i ? 1 : 0.7 }}>{label}</button>
          ))}
        </div>
        <div style={{ width: "100%", display: "flex", justifyContent: "center", flex: 1 }}>
          {page === 0 ? <CurrentRankPage totalXp={totalXp} onNext={() => setPage(1)} /> : <AllRanksPage totalXp={totalXp} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 880, paddingLeft: "clamp(10px,3.5vw,60px)", paddingRight: "clamp(10px,3.5vw,60px)", flexWrap: "wrap", gap: 10, marginTop: "clamp(12px,2.2vw,28px)", animation: "fadeUp 0.4s 0.3s both" }}>
          <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: 10, color: C.cyan, letterSpacing: "0.15em", textShadow: `0 0 8px ${C.cyan}`, opacity: 0.7 }}>{page + 1}/2</span>
          <button className="back-btn" onClick={() => { setScreen("home"); playSound("select"); }} onMouseEnter={() => playSound("hover")} style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(8px,0.95vw,11px)", color: C.btnText, background: C.btnFill, border: `1.5px solid ${C.green}`, borderRadius: 3, padding: "clamp(8px,1vw,12px) clamp(14px,2vw,28px)", cursor: "pointer", letterSpacing: "0.14em", boxShadow: "0 0 10px rgba(53,229,43,.25)", transition: "background .15s,border-color .15s,color .15s,box-shadow .15s", animation: "navGlow 3s ease-in-out infinite", outline: "none" }}>BACK</button>
        </div>

      </main>
    </div>
  );
}