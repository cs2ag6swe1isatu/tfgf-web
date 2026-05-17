import { useState, useEffect } from "react";
import { useTriviaStore, useMultiplayerStore, useGameStore } from "../store";
import { getMultiplayerPlayerId, usePlayerStore } from "../store/playerStore";
import { getAvatarSrc } from "../utils/avatar";
import { RANK_COLORS, getRankSymbolType } from "../components/ui/RankIcon";
import type { Player } from "../types/player";
import { getLastXpGained, levelFromXp } from "../progression/progressionRules";
import { getXpIntoLevel } from "../utils/progression";
import LevelUpTransition from "../components/LevelUpTransition";

interface RankTier {
  rank: number;
  name: string;
  minXp: number;
  maxXp: number;
  minLevel: number;
  maxLevel: number;
}

const RANK_TIERS: RankTier[] = [
  { rank: 1,  name: "Novice",     minXp: 0,      maxXp: 10000,  minLevel: 1,  maxLevel: 10  },
  { rank: 2,  name: "Student",    minXp: 10001,  maxXp: 20000,  minLevel: 11, maxLevel: 20  },
  { rank: 3,  name: "Scholar",    minXp: 20001,  maxXp: 30000,  minLevel: 21, maxLevel: 30  },
  { rank: 4,  name: "Professor",  minXp: 30001,  maxXp: 40000,  minLevel: 31, maxLevel: 40  },
  { rank: 5,  name: "Expert",     minXp: 40001,  maxXp: 50000,  minLevel: 41, maxLevel: 50  },
  { rank: 6,  name: "Specialist", minXp: 50001,  maxXp: 60000,  minLevel: 51, maxLevel: 60  },
  { rank: 7,  name: "Genius",     minXp: 60001,  maxXp: 70000,  minLevel: 61, maxLevel: 70  },
  { rank: 8,  name: "Brainiac",   minXp: 70001,  maxXp: 80000,  minLevel: 71, maxLevel: 80  },
  { rank: 9,  name: "Sage",       minXp: 80001,  maxXp: 90000,  minLevel: 81, maxLevel: 90  },
  { rank: 10, name: "Oracle",     minXp: 90001,  maxXp: 100000, minLevel: 91, maxLevel: 100 },
];

function getRankTier(xp: number): { tier: RankTier; pct: number } {
  const tier =
    [...RANK_TIERS].reverse().find((t) => xp >= t.minXp) ?? RANK_TIERS[0];
  const range = tier.maxXp - tier.minXp;
  const pct = range > 0
    ? Math.min(Math.round(((xp - tier.minXp) / range) * 100), 100)
    : 100;
  return { tier, pct };
}

// ─── COUNT-UP HOOK ──────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1700, active = false): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) {
      console.log(`[useCountUp] Not active, target=${target}`);
      return;
    }
    console.log(`[useCountUp] Starting animation: target=${target}, duration=${duration}ms, active=${active}`);
    let start: number | null = null;
    const anim = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(anim);
      else {
        setVal(target);
        console.log(`[useCountUp] Animation complete: final value=${target}`);
      }
    };
    requestAnimationFrame(anim);
  }, [target, duration, active]);
  return val;
}

// ─── TYPES ──────────────────────────────────────────────────────────────────────
interface PlayerResult {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  score: number;
  acc: number;
  avg: number | null;
  xp: number;
  correctCount: number;
  rank: number;
}

interface RankingEntry {
  playerId: string;
  name: string;
  score: number;
  rank: number;
  correctCount?: number;
  questionsAnswered?: number;
  accuracy?: number;
  avgTime?: number;
  xp?: number;
}

interface LobbyMemberInfo {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  level?: number;
}

// ─── PLAYER DATA BUILDER ────────────────────────────────────────────────────────
function buildPlayerResults(
  rankings: RankingEntry[],
  lobbyMembers: LobbyMemberInfo[],
  localPlayerId: string,
  questions: Array<{ correctAnswer: string }>,
  localAnswers: Array<string | undefined>,
  localAvgTime: number,
): PlayerResult[] {
  const playerMap = new Map<string, { name: string; avatar: string; isHost: boolean }>();
  lobbyMembers.forEach((p) => {
    playerMap.set(p.id, { name: p.name, avatar: p.avatar ?? "Detective.png", isHost: p.isHost });
  });
  if (!playerMap.has(localPlayerId)) {
    playerMap.set(localPlayerId, { name: "You", avatar: "Detective.png", isHost: false });
  }

  const localAnswered = localAnswers
    .map((answer, index) => (answer ? { answer, index } : null))
    .filter((entry): entry is { answer: string; index: number } => entry !== null);

  const localCorrectCount = localAnswered.reduce((count, entry) => {
    const question = questions[entry.index];
    return count + (question && entry.answer === question.correctAnswer ? 1 : 0);
  }, 0);

  const totalQuestions = questions.length;
  const localAccuracy = totalQuestions > 0
    ? Math.round((localCorrectCount / totalQuestions) * 100)
    : 0;

  return rankings
    .map((entry) => {
      const info = playerMap.get(entry.playerId);
      if (!info) return null;

      const isLocalPlayer = entry.playerId === localPlayerId;
      const correctCount = entry.correctCount ?? (isLocalPlayer ? localCorrectCount : 0);
      const acc = entry.accuracy ?? (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0);
      const avg = entry.avgTime ?? (isLocalPlayer ? localAvgTime : null);
      const xp = entry.xp ?? 0;

      // Diagnostic: log fallback values for local player
      if (isLocalPlayer) {
        console.log('[buildPlayerResults] Local player:', {
          id: entry.playerId.slice(0, 8),
          name: info.name,
          hostProvidedAccuracy: entry.accuracy,
          hostProvidedCorrectCount: entry.correctCount,
          hostProvidedQuestionsAnswered: entry.questionsAnswered,
          localCorrectCount,
          localAnswersCount: localAnswers.filter(a => !!a).length,
          calculatedAccuracy: acc,
          fallbackUsed: !entry.accuracy,
        });
      }

      return {
        id: entry.playerId,
        name: info.name,
        avatar: info.avatar,
        isHost: info.isHost,
        score: entry.score,
        acc,
        avg,
        xp,
        correctCount,
        rank: entry.rank,
      };
    })
    .filter((p): p is PlayerResult => p !== null)
    .sort((a, b) => a.rank - b.rank);
}

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "clamp(12px,1.2vw,14px)",
      color: "#00DFFF",
      textShadow: "0 0 7px #00DFFF",
      borderBottom: "1px solid #00DFFF44",
      paddingBottom: 6,
      marginBottom: 12,
      letterSpacing: ".18em",
    }}>{children}</div>
  );
}

function PlayerRow({ player, isYou, medals, delay, ready }: {
  player: PlayerResult;
  isYou: boolean;
  medals: string[];
  delay: number;
  ready: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const isFirst = player.rank === 1;

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [ready, delay]);

  return (
    <div
      className="lb-hover-row"
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "9px 10px",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "clamp(10px,.95vw,10px)",
        cursor: "default",
        borderLeft: isYou ? "3px solid #00DFFF" : isFirst ? "3px solid #C9562E" : "3px solid transparent",
        background: isFirst
          ? "linear-gradient(90deg,#C9562E3a 0%,#C9562E18 55%,transparent 100%)"
          : "#10363A1a",
        border: isFirst ? "1px solid #C9562E77" : "1px solid #00DFFF18",
        boxShadow: isFirst ? "0 0 14px #C9562E2a" : "none",
        animation: isFirst ? "wglow 2.8s ease-in-out infinite" : "none",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-18px)",
        transition: "opacity .38s ease, transform .38s ease",
      }}
    >
      <span style={{ width: 36, color: isFirst ? "#D9E600" : "#00DFFF", fontSize: player.rank <= 3 ? 12 : 7 }}>
        {player.rank <= 3 ? medals[player.rank - 1] : `#${player.rank}`}
      </span>
      <span style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={getAvatarSrc(player.avatar)} alt="" style={{ width: 24, height: 24, imageRendering: "pixelated", objectFit: "contain" }} />
      </span>
      <span style={{ flex: 1.5, color: isFirst ? "#D9E600" : isYou ? "#00DFFF" : "#E5E5E5" }}>
        {player.name}{isYou ? " ★" : ""}
      </span>
      <span style={{ width: 52 }}>
        <span style={{
          fontSize: 10, padding: "7px 10px",
          border: "1px solid",
          borderColor: player.isHost ? "#D9E60055" : "#00DFFF33",
          color: player.isHost ? "#D9E600" : "#00DFFF88",
          background: player.isHost ? "#D9E60011" : "transparent",
          letterSpacing: ".1em",
        }}>
          {player.isHost ? "HOST" : "CLIENT"}
        </span>
      </span>
      <span style={{ width: 62, textAlign: "right", color: isFirst ? "#C9562E" : "#35E52B" }}>{player.score}</span>
      <span style={{ width: 50, textAlign: "right", color: "#D9E600" }}>{player.acc}%</span>
      <span style={{ width: 50, textAlign: "right", color: "#00DFFF" }}>{player.avg !== null ? `${player.avg}s` : "—"}</span>
      <span style={{ width: 50, textAlign: "right", color: "#35E52B88" }}>{player.xp}</span>
    </div>
  );
}

function StatCard({ label, value, unit, accent }: {
  label: string;
  value: string | number;
  unit: string;
  accent: string;
}) {
  return (
    <div
      className="stat-hover"
      style={{
        border: `2px solid ${accent}`,
        background: "#031533cc",
        padding: "13px 11px",
        textAlign: "center",
        boxShadow: `0 0 11px ${accent}44, inset 0 0 18px ${accent}0d`,
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <div style={{ fontSize: "10px", letterSpacing: ".12em", color: accent, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: "clamp(20px,2.8vw,28px)", color: "#E5E5E5", textShadow: "0 0 9px #fff3" }}>
        {value}<span style={{ fontSize: 12, marginLeft: 2, color: accent }}>{unit}</span>
      </div>
    </div>
  );
}

function CyberButton({ label, onClick, red }: {
  label: string;
  onClick: () => void;
  red?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const base = red ? "#E33232" : "#00DFFF";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "12px 22px",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "clamp(10px,1.1vw,12px)",
        letterSpacing: ".12em",
        border: `2px solid ${base}`,
        color: hover ? (red ? "#fff" : "#000") : base,
        background: hover ? base : "transparent",
        boxShadow: hover ? `0 0 22px ${base}, 0 0 8px ${base}` : `0 0 7px ${base}55`,
        transform: hover ? "scale(1.04)" : "scale(1)",
        transition: "all .14s ease",
        cursor: "pointer",
        outline: "none",
      }}
    >
      {label}
    </button>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function MultiplayerResults() {
  const [ready, setReady] = useState(false);
  const [progWidth, setProgWidth] = useState(0);

  const triviaRankings = useTriviaStore((s) => s.rankings);
  const triviaQuestions = useTriviaStore((s) => s.questions);
  const triviaAvgTime = useTriviaStore((s) => s.avgTime);
  const triviaUserAnswers = useTriviaStore((s) => s.userAnswers);

  const gameConfig = useGameStore((s) => s.gameConfig);
  const localPlayer = usePlayerStore((s) => s.getPlayer());
  const lobbyPlayers = useMultiplayerStore((s) => s.players);

  const setScreen = useGameStore((s) => s.setScreen);
  const resetTrivia = useTriviaStore((s) => s.resetGame);
  const resetPlayerStatuses = useMultiplayerStore((s) => s.resetPlayerStatuses);
  const resetMultiplayer = useMultiplayerStore((s) => s.resetMultiplayer);

  const localMpId = getMultiplayerPlayerId(localPlayer.id);

  const category = gameConfig?.category ?? "TRIVIA";
  const difficulty = gameConfig?.difficulty ?? "medium";
  const totalQuestions = triviaQuestions.length || gameConfig?.questionLimit || 15;

  const players = buildPlayerResults(
    triviaRankings,
    lobbyPlayers,
    localMpId,
    triviaQuestions,
    triviaUserAnswers,
    triviaAvgTime,
  );

  const you = players.find((p) => p.id === localMpId);

  const localXp = localPlayer?.totalXp ?? 0;

  // ── Diagnostic logging ────────────────────────────────────────────────────
  useEffect(() => {
    console.log('[MultiplayerResults] Component mounted / updated', {
      youId: you?.id?.slice(0, 8),
      youScore: you?.score,
      youAcc: you?.acc,
      youCorrectCount: you?.correctCount,
      youXp: you?.xp,
      youRank: you?.rank,
      triviaRankingsLength: triviaRankings.length,
      triviaQuestionsLength: triviaQuestions.length,
      triviaUserAnswersLength: triviaUserAnswers.length,
      triviaAvgTime,
      totalQuestions,
      ready,
    });
    console.log('[MultiplayerResults] Host ranking entry', 
      triviaRankings.find(r => r.playerId === you?.id)
    );
    console.log('[MultiplayerResults] All player results:', 
      players.map(p => ({ 
        name: p.name.slice(0, 8), 
        score: p.score, 
        acc: p.acc, 
        correctCount: p.correctCount, 
        xp: p.xp 
      }))
    );
  }, [you, triviaRankings, triviaQuestions, triviaUserAnswers, triviaAvgTime, totalQuestions, ready, players]);

  // ── Cinematic level-up transition state ──────────────────────────────────
  const [showLevelUp, setShowLevelUp] = useState(false);
  const xpGainedThisGame = getLastXpGained() || you?.xp || 0;
  const xpBeforeGame = localXp - xpGainedThisGame;
  const oldLevel = levelFromXp(xpBeforeGame);
  const newLevel = localPlayer?.level ?? oldLevel;

  useEffect(() => {
    if (newLevel > oldLevel) {
      setShowLevelUp(true);
    }
  }, [newLevel, oldLevel]);

  const { tier, pct: rankPct } = getRankTier(localXp);
  const rankSym = getRankSymbolType(tier.name);
  const rankTheme = RANK_COLORS[rankSym];

  const medals = ["🥇", "🥈", "🥉"];

  const scoreDisplay = useCountUp(you?.score || 0, 1800, ready);
  const xpDisplay = useCountUp(getLastXpGained() || you?.xp || 0, 2000, ready);
  const accDisplay = useCountUp(you?.acc || 0, 1400, ready);

  useEffect(() => {
    const t = setTimeout(() => {
      console.log('[MultiplayerResults] Setting ready=true after 480ms delay');
      console.log('[MultiplayerResults] Count-up targets:', {
        scoreTarget: you?.score || 0,
        xpTarget: getLastXpGained() || you?.xp || 0,
        accTarget: you?.acc || 0,
      });
      setReady(true);
      setTimeout(() => setProgWidth(rankPct), 300);
    }, 480);
    return () => clearTimeout(t);
  }, [rankPct, you?.score, you?.xp, you?.acc]);

  const handleBackToLobby = () => {
    // Reset player statuses from 'results'/'playing' back to 'lobby' so the
    // lobby page renders them correctly (green ready dots, not status badges).
    resetPlayerStatuses();
    resetTrivia();
    setScreen("multiplayer-lobby");
  };

   const handleExitLobby = () => {
    resetTrivia();
    resetMultiplayer();
    setScreen("home");
  };
  // ── Ready state change logging ────────────────────────────────────────────
  useEffect(() => {
    console.log('[MultiplayerResults] Ready state changed:', {
      ready,
      scoreDisplay,
      xpDisplay,
      accDisplay,
      youAcc: you?.acc,
      youScore: you?.score,
      youXp: you?.xp,
    });
  }, [ready, scoreDisplay, xpDisplay, accDisplay, you?.acc, you?.score, you?.xp]);

  return (
    <div style={s.root}>
      <div style={s.scanlines} />
      {[
        { top: 12, left: 12 },
        { top: 12, right: 12, transform: "scaleX(-1)" },
        { bottom: 12, left: 12, transform: "scaleY(-1)" },
        { bottom: 12, right: 12, transform: "scale(-1,-1)" },
      ].map((c, i) => (
        <div key={i} style={{ ...s.corner, ...c }} />
      ))}

      <div style={s.wrap}>
        {/* HEADER */}
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <div style={s.goTxt}>GAME OVER!</div>
          <div style={s.gameSub}>THINK FAST, GUESS FASTER — MULTIPLAYER RESULTS</div>
        </div>

        {/* MATCH INFO */}
        <div>
          <SectionTitle>▶ MATCH INFORMATION</SectionTitle>
          <div style={s.matchPanel}>
            <div style={s.matchGrid}>
              {[
                ["CATEGORY", category.toUpperCase()],
                ["DIFFICULTY", difficulty.toUpperCase()],
                ["PLAYERS", players.length],
                ["QUESTIONS", totalQuestions],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={s.miLbl}>{lbl}</span>
                  <span style={s.miVal}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* YOUR PLACE */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={s.placeLbl}>YOUR PLACE!</div>
          <div style={s.placeBox}>
            <div style={s.placeTop}>TOP</div>
            <div style={s.placeNum}>{you?.rank ?? "—"}</div>
          </div>
        </div>

        {/* LEADERBOARD */}
        <div>
          <SectionTitle>▶ PLACEMENTS</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={s.lbHdr}>
              <span style={{ width: 36 }}>#</span>
              <span style={{ width: 28 }}></span>
              <span style={{ flex: 1.5 }}>PLAYER</span>
              <span style={{ width: 52 }}>ROLE</span>
              <span style={{ width: 62, textAlign: "right" }}>SCORE</span>
              <span style={{ width: 50, textAlign: "right" }}>ACC%</span>
              <span style={{ width: 50, textAlign: "right" }}>AVG T</span>
              <span style={{ width: 50, textAlign: "right" }}>XP</span>
            </div>
            {players.map((p, i) => (
              <PlayerRow
                key={p.id}
                player={p}
                isYou={p.id === localMpId}
                medals={medals}
                delay={450 + i * 140}
                ready={ready}
              />
            ))}
          </div>
        </div>

        {/* STATS */}
        <div>
          <SectionTitle>▶ YOUR PERFORMANCE</SectionTitle>
          <div style={s.statsGrid}>
            <StatCard label="YOUR SCORE" value={ready ? scoreDisplay : 0} unit="pts" accent="#00DFFF" />
            <StatCard label="XP GAINED"  value={ready ? xpDisplay   : 0} unit="xp"  accent="#35E52B" />
            <StatCard label="ACCURACY"   value={ready ? accDisplay   : 0} unit="%"   accent="#D9E600" />
            <StatCard label="CORRECT"    value={ready ? (you?.correctCount ?? 0) : 0} unit={`/${totalQuestions}`} accent="#C9562E" />
          </div>
        </div>

        {/* RANK PROGRESS */}
        <div>
          <SectionTitle>▶ RANK PROGRESS</SectionTitle>
          <div style={s.rankPanel}>
            {/* Tier badge row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ ...s.rankTierBadge, background: rankTheme.primary, color: "#010707", textShadow: `0 0 6px ${rankTheme.glow}` }}>RANK {tier.rank}</span>
                <span style={{ ...s.rankName, color: rankTheme.primary, textShadow: `0 0 8px ${rankTheme.glow}` }}>{tier.name.toUpperCase()}</span>
              </div>
              <span style={{ ...s.rankPct, color: rankTheme.primary, textShadow: `0 0 6px ${rankTheme.glow}` }}>{rankPct}%</span>
            </div>
            {/* Level range */}
            <div style={{ marginBottom: 10 }}>
              <span style={s.rankSub}>
                LEVELS {tier.minLevel}–{tier.maxLevel} &nbsp;·&nbsp; {tier.minXp.toLocaleString()}–{tier.maxXp.toLocaleString()} XP
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ ...s.progTrack, border: `1px solid ${rankTheme.primary}44` }}>
              <div style={{ ...s.progBar, width: `${progWidth}%`, background: `linear-gradient(90deg,${rankTheme.primary}aa,${rankTheme.glow})`, boxShadow: `0 0 10px ${rankTheme.glow}` }} />
              <div style={{ ...s.progGem, left: `calc(${progWidth}% - 7px)`, color: rankTheme.primary, textShadow: `0 0 7px ${rankTheme.glow}` }}>⬟</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={s.rankSub}>XP: {localXp.toLocaleString()}</span>
              <span style={s.rankSub}>NEXT RANK: {tier.maxXp.toLocaleString()} XP</span>
            </div>
          </div>
        </div>

        {/* BUTTONS */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", paddingTop: 4, paddingBottom: 20 }}>
          <CyberButton label="◀ BACK TO LOBBY" onClick={handleBackToLobby} />
          <CyberButton label="EXIT LOBBY ✕" onClick={handleExitLobby} red />
        </div>
      </div>

      <style>{globalCSS}</style>

      {/* ── Cinematic level-up transition ──────────────────────────────── */}
      {showLevelUp && (
  <LevelUpTransition
    oldLevel={oldLevel}
    newLevel={newLevel}
    oldXP={getXpIntoLevel(xpBeforeGame)}
    newXP={getXpIntoLevel(localXp)}
    xpForOldLevel={1000}
    xpForNewLevel={1000}
    levelRangeLabel={`LV ${Math.floor((oldLevel - 1) / 10) * 10 + 1}–${Math.floor((oldLevel - 1) / 10) * 10 + 10}`}
    onContinue={() => setShowLevelUp(false)}
  />
)}
    </div>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  root: {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  overflowY: 'auto' as const,
  background: "linear-gradient(155deg,#041D49 0%,#031533 35%,#08235A 65%,#062B2B 100%)",
  fontFamily: "'Press Start 2P', monospace",
  color: "#E5E5E5",
  overflowX: "hidden",
  padding: "24px 14px 52px",
  zIndex: 999,
},
  scanlines: {
    position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
    background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.055) 2px,rgba(0,0,0,0.055) 4px)",
  },
  corner: {
    position: "fixed", width: 32, height: 32, zIndex: 10, pointerEvents: "none",
    borderTop: "2px solid #00DFFF", borderLeft: "2px solid #00DFFF",
    filter: "drop-shadow(0 0 5px #00DFFF)",
  },
  wrap: {
    position: "relative", zIndex: 2,
    maxWidth: 880, margin: "0 auto",
    display: "flex", flexDirection: "column", gap: 22,
  },
  goTxt: {
    fontSize: "clamp(25px,4.5vw,44px)",
    color: "#E33232",
    textShadow: "0 0 8px #E33232,0 0 24px #E33232,3px 3px 0 #7a0000",
    letterSpacing: ".1em",
    animation: "pred 2.4s ease-in-out infinite",
    display: "inline-block",
  },
  gameSub: {
    fontSize: "clamp(10px,1.1vw,12px)",
    color: "#00DFFF",
    textShadow: "0 0 6px #00DFFF",
    marginTop: 9,
    letterSpacing: ".28em",
  },
  matchPanel: {
    border: "2px solid #00DFFF",
    boxShadow: "0 0 18px #00DFFF44,inset 0 0 24px #00DFFF0d",
    background: "#031533dd",
    padding: "14px 18px",
  },
  matchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
    gap: 10,
  },
  miLbl: { fontSize: "10px", color: "#00DFFF88", letterSpacing: ".18em" },
  miVal: { fontSize: "clamp(12px,1.4vw,14px)", color: "#35E52B", textShadow: "0 0 6px #35E52B" },
  placeLbl: { fontSize: "clamp(12px,1.5vw,14px)", color: "#D9E600", textShadow: "0 0 9px #D9E600", letterSpacing: ".2em" },
  placeBox: {
    border: "2px solid #00DFFF",
    boxShadow: "0 0 18px #00DFFF44,inset 0 0 24px #00DFFF0d",
    background: "#031533ee",
    padding: "12px 40px",
    display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4,
  },
  placeTop: { fontSize: "clamp(10px,1.1vw,12px)", color: "#00DFFF", letterSpacing: ".28em" },
  placeNum: {
    fontSize: "clamp(30px,6.5vw,54px)",
    color: "#D9E600",
    textShadow: "0 0 18px #D9E600,0 0 36px #D9E600aa",
    lineHeight: 1,
  },
  lbHdr: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: "10px", color: "#00DFFF77",
    padding: "0 10px 5px",
    borderBottom: "1px solid #00DFFF1a",
    letterSpacing: ".1em",
    fontFamily: "'Press Start 2P', monospace",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
    gap: 13,
  },
  rankPanel: { background: "#10363A3a", border: "1px solid #00DFFF2a", padding: "14px 16px", boxShadow: "0 0 12px rgba(0,223,255,0.12)" },
  rankTierBadge: {
    fontSize: "10px",
    color: "#031533",
    background: "#D9E600",
    padding: "3px 7px",
    letterSpacing: ".1em",
    fontFamily: "'Press Start 2P', monospace",
  },
  rankName: { fontSize: "clamp(10px,1.4vw,12px)", fontFamily: "'Press Start 2P', monospace" },
  rankPct: { fontSize: "clamp(10px,1.4vw,12px)", fontFamily: "'Press Start 2P', monospace" },
  progTrack: { height: 16, background: "#041D4955", position: "relative", overflow: "visible", marginBottom: 8 },
  progBar: { height: "100%", width: 0, transition: "width 1.5s cubic-bezier(.4,0,.2,1)" },
  progGem: { position: "absolute", top: -5, fontSize: 16, lineHeight: 1, transition: "left 1.5s cubic-bezier(.4,0,.2,1)" },
  rankSub: { fontSize: "10px ", color: "#8ecfda", letterSpacing: ".08em", fontFamily: "'Press Start 2P', monospace" },
};

const globalCSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: auto !important; min-height: 100%; overflow: 'hidden', !important; overflow-x: hidden; }
@keyframes pred {
  0%,100% { text-shadow: 0 0 8px #E33232, 0 0 24px #E33232, 3px 3px 0 #7a0000; }
  50% { text-shadow: 0 0 18px #E33232, 0 0 50px #E33232, 0 0 80px #E3323277, 3px 3px 0 #7a0000; }
}
@keyframes wglow {
  0%,100% { box-shadow: 0 0 14px #C9562E2a; }
  50% { box-shadow: 0 0 26px #C9562E66, 0 0 4px #C9562E inset; }
}
.lb-hover-row:hover {
  background: linear-gradient(90deg, #00DFFF1f, #00DFFF0d 60%, transparent) !important;
  border-left-color: #00DFFF !important;
  box-shadow: 0 0 9px #00DFFF28;
}
.stat-hover:hover { transform: scale(1.03); }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: #031533; }
::-webkit-scrollbar-thumb { background: #00DFFF44; }
`;
