import { useEffect } from "react";
import { Box } from "@mui/material";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store";
import { getAvatarSrc } from "../utils/avatar";
import { BunnyMascot } from "../components/bunny/BunnyMascot";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import type { MultiplayerBridge, LobbyMember } from "../types/multiplayer";
import type { Question } from "../types/question";
import type { PlayerRoundAnswer } from "../rules/scoringRules";
import { mapGameStatePayloadToTriviaState } from "../utils/multiplayerSync";

const SPECTATOR_COLOR = "#A855F7";
const ANSWER_LABELS = ["A", "B", "C", "D"];

// ─── Single player panel ─────────────────────────────────────────────────────
const PlayerPanel = ({
  player,
  index,
  questions,
  currentIndex,
  phase,
  timer,
  answerTimer,
  playerScores,
  playerAnswers,
  questionLimit,
  category,
}: {
  player: LobbyMember;
  index: number;
  questions: Question[];
  currentIndex: number;
  phase: string;
  timer: number;
  answerTimer: number;
  playerScores: Record<string, number>;
  playerAnswers: Record<string, PlayerRoundAnswer[]>;
  questionLimit: number;
  category: string | null | undefined;
}) => {
  const currentQuestion = questions[currentIndex];
  const score = playerScores?.[player.id] ?? 0;
  const timerPct = answerTimer > 0 ? Math.max(0, (timer / answerTimer) * 100) : 0;
  const isScoring = phase === "scoring" || phase === "ranking";
  const playerAnswer = playerAnswers?.[player.id]?.[currentIndex]?.answer;

  const bunnyState =
    phase === "readying" ? "sleeping"
    : phase === "scoring" ? "happy"
    : phase === "answering" && timer <= 5 ? "panicked"
    : "thinking";

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      border: `2px solid ${player.isHost ? "#00E5FF" : "rgba(0,229,255,0.3)"}`,
      borderRadius: "8px",
      background: "#060A10",
      overflow: "hidden",
      minHeight: 0,
    }}>
      {/* Panel header */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 10px",
        borderBottom: "1px solid rgba(0,229,255,0.15)",
        background: "rgba(0,229,255,0.04)",
        flexShrink: 0,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Box sx={{ width: "22px", height: "22px", borderRadius: "3px", overflow: "hidden", border: "1px solid #333", flexShrink: 0 }}>
            <img src={getAvatarSrc(player.avatar || "")} alt="" style={{ width: "100%", height: "100%", imageRendering: "pixelated", objectFit: "contain" }} />
          </Box>
          <Box sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "8px", color: "#D9E600", letterSpacing: "1px", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {player.name || `PLAYER ${index + 1}`}
          </Box>
          {player.isHost && (
            <Box sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "6px", color: "#00E5FF", border: "1px solid #00E5FF", borderRadius: "2px", padding: "1px 4px" }}>
              HOST
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Box sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "7px", color: "#888" }}>
            {currentIndex + 1}/{questionLimit}
          </Box>
          <Box sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "9px", color: timer <= 5 ? "#FF0055" : "#fff" }}>
            {Math.ceil(timer)}S
          </Box>
          <Box sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "8px", color: "#35E52B" }}>
            {score} PTS
          </Box>
        </Box>
      </Box>

      {/* Timer bar */}
      <Box sx={{ height: "3px", background: "rgba(0,229,255,0.1)", flexShrink: 0 }}>
        <Box sx={{
          height: "100%",
          width: `${timerPct}%`,
          background: timer <= 5 ? "#FF0055" : "#00E5FF",
          transition: "width 1s linear, background 0.3s ease",
        }} />
      </Box>

      {/* Category */}
      <Box sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "7px", color: "#35E52B", textAlign: "center", padding: "4px 8px", flexShrink: 0 }}>
        {category ?? "TRIVIA"}
      </Box>

      {/* Question */}
      <Box sx={{
        padding: "8px 10px",
        border: "1px solid rgba(0,229,255,0.2)",
        borderRadius: "4px",
        margin: "0 8px",
        background: "rgba(0,229,255,0.02)",
        flexShrink: 0,
      }}>
        <Box sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "8px", color: "#35E52B", lineHeight: 1.8, textAlign: "center" }}>
          {currentQuestion?.text ?? "—"}
        </Box>
      </Box>

      {/* Answers */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", padding: "8px", flex: 1 }}>
        {(currentQuestion?.allAnswers ?? ["—", "—", "—", "—"]).map((answer: string, idx: number) => {
          const isCorrect = isScoring && answer === currentQuestion?.correctAnswer;
          const isPlayerSelected = isScoring && answer === playerAnswer;
          const isIncorrectSelection = isPlayerSelected && !isCorrect;
          
          return (
            <Box key={idx} sx={{
              padding: "6px 8px",
              border: `1.5px solid ${
                isCorrect ? "#35E52B" 
                : isIncorrectSelection ? "#FF0055"
                : isPlayerSelected ? "#FF00FF"
                : "rgba(0,229,255,0.3)"
              }`,
              borderRadius: "4px",
              background: 
                isCorrect ? "rgba(53,229,43,0.1)" 
                : isIncorrectSelection ? "rgba(255,0,85,0.1)"
                : isPlayerSelected ? "rgba(255,0,255,0.05)"
                : "rgba(0,229,255,0.02)",
              color: 
                isCorrect ? "#35E52B" 
                : isIncorrectSelection ? "#FF0055"
                : isPlayerSelected ? "#FF00FF"
                : "#00E5FF",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "7px",
              lineHeight: 1.6,
              pointerEvents: "none",
              userSelect: "none",
              display: "flex",
              alignItems: "flex-start",
              gap: "4px",
            }}>
              <Box component="span" sx={{ flexShrink: 0, color: "inherit", opacity: 0.7 }}>{ANSWER_LABELS[idx]}.</Box>
              <Box component="span" sx={{ wordBreak: "break-word" }}>{answer}</Box>
            </Box>
          );
        })}
      </Box>

      {/* Bottom: bunny + phase status */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 10px 6px",
        borderTop: "1px solid rgba(0,229,255,0.08)",
        flexShrink: 0,
      }}>
        <BunnyMascot state={bunnyState} size={36} />
        <Box sx={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "7px",
          color: phase === "scoring" ? "#35E52B" : phase === "answering" ? "#00E5FF" : "#555",
          letterSpacing: "1px",
        }}>
          {phase === "readying" ? "WAITING..." : phase === "answering" ? "ANSWERING" : phase === "scoring" ? "SCORED" : phase.toUpperCase()}
        </Box>
      </Box>
    </Box>
  );
};

// ─── Main SpectatorView ───────────────────────────────────────────────────────
const SpectatorView = () => {
  const players = useMultiplayerStore((s) => s.players);
  const setScreen = useGameStore((s) => s.setScreen);
  const tokens = useResponsiveScale();
  const isCompactViewport = tokens.isCompact;

  const questions   = useTriviaStore((s) => s.questions);
  const currentIndex = useTriviaStore((s) => s.currentIndex);
  const phase       = useTriviaStore((s) => s.phase);
  const timer       = useTriviaStore((s) => s.timer);
  const answerTimer = useTriviaStore((s) => s.answerTimer);
  const playerScores = useTriviaStore((s) => s.playerScores);
  const playerAnswers = useTriviaStore((s) => s.playerAnswers);
  const questionLimit = useTriviaStore((s) => s.questionLimit);
  const category    = useTriviaStore((s) => s.category);

  const activePlayers = players.filter((p) => p.role !== "spectator");

  useEffect(() => {
    const bridge = (window as unknown as { multiplayer?: MultiplayerBridge }).multiplayer;
    if (!bridge) return;
    bridge.onGameStateSync("SpectatorView", (payload) => {
      const mapped = mapGameStatePayloadToTriviaState(payload);
      useTriviaStore.setState(mapped as Partial<import("../store").TriviaState>);
    });
    return () => { bridge.offGameStateSync?.("SpectatorView"); };
  }, []);

  useEffect(() => {
    if (phase === "end") setScreen("multiplayer-results");
  }, [phase, setScreen]);

  // Grid columns: 1 → 1col, 2 → 2col, 3-4 → 2x2, 5+ → 3col
  const cols =
    activePlayers.length === 1 ? 1
    : activePlayers.length === 2 ? 2
    : activePlayers.length <= 4 ? 2
    : 3;

  return (
    <Box sx={{
      width: "100%",
      height: "100%",
      minHeight: "100vh",
      backgroundColor: "#020408",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      overflow: "hidden",
    }}>

      {/* Header */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isCompactViewport ? "6px 10px" : "8px 16px",
        borderBottom: `1px solid rgba(168,85,247,0.25)`,
        background: "rgba(2,4,8,0.98)",
        flexShrink: 0,
      }}>
        <Box sx={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: isCompactViewport ? "3px 8px" : "4px 10px",
          border: `1.5px solid ${SPECTATOR_COLOR}`,
          borderRadius: "4px",
          background: "rgba(168,85,247,0.08)",
          color: SPECTATOR_COLOR,
          fontSize: isCompactViewport ? "7px" : "9px",
          letterSpacing: "2px",
        }}>
          👁 SPECTATOR MODE
        </Box>

        <Box sx={{ fontSize: isCompactViewport ? "7px" : "9px", color: "#00E5FF", letterSpacing: "2px" }}>
          {phase === "answering" ? `ANSWERING — ${Math.ceil(timer)}S` : phase?.toUpperCase()}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: isCompactViewport ? "8px" : "12px" }}>
          <Box sx={{ fontSize: isCompactViewport ? "7px" : "8px", color: "rgba(168,85,247,0.6)", letterSpacing: "1px" }}>
            {activePlayers.length} PLAYER{activePlayers.length !== 1 ? "S" : ""}
          </Box>
          <button
            onClick={() => setScreen("multiplayer-menu")}
            style={{
              background: "transparent",
              color: SPECTATOR_COLOR,
              border: `1px solid ${SPECTATOR_COLOR}`,
              padding: isCompactViewport ? "3px 8px" : "4px 12px",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: isCompactViewport ? "6px" : "8px",
              cursor: "pointer",
              borderRadius: "4px",
              letterSpacing: "1px",
            }}
          >
            LEAVE
          </button>
        </Box>
      </Box>

      {/* Player grid */}
      <Box sx={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: isCompactViewport ? "6px" : "10px",
        padding: isCompactViewport ? "6px" : "10px",
        overflow: "auto",
        alignContent: "start",
      }}>
        {activePlayers.map((player, idx) => (
          <PlayerPanel
            key={player.id}
            player={player}
            index={idx}
            questions={questions}
            currentIndex={currentIndex}
            phase={phase}
            timer={timer}
            answerTimer={answerTimer}
            playerScores={playerScores}
            playerAnswers={playerAnswers}
            questionLimit={questionLimit}
            category={category}
          />
        ))}

        {activePlayers.length === 0 && (
          <Box sx={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(168,85,247,0.4)",
            fontSize: isCompactViewport ? "8px" : "10px",
            letterSpacing: "2px",
            height: "200px",
          }}>
            WAITING FOR PLAYERS...
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SpectatorView;
