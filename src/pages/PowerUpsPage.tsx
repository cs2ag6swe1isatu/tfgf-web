import { useGameStore } from "../store/gameStore";
import { usePlayerStore } from "../store/playerStore";
import { useSoundContext } from "../context/SoundContext";
import { PowerUpInventoryPanel } from "../components/powerups/PowerUpInventoryPanel";

export default function PowerUpsPage() {
  const { playSound } = useSoundContext();
  const setScreen = useGameStore((s) => s.setScreen);
  const localPlayer = usePlayerStore((s) => s.getPlayer());
  const claimDailyPowerUps = usePlayerStore((s) => s.claimDailyPowerUps);

  const isDailyBonusClaimed = (() => {
    const last = localPlayer.lastDailyPowerUpClaimDate;
    if (!last) return false;
    const now = new Date();
    return (
      last.getFullYear() === now.getFullYear() &&
      last.getMonth() === now.getMonth() &&
      last.getDate() === now.getDate()
    );
  })();

  return (
    <div style={styles.root}>
      <div style={styles.content}>
        <h1 style={styles.title}>POWER-UPS</h1>

        <div style={{ width: "100%", maxWidth: 520 }}>
          <PowerUpInventoryPanel
            inventory={localPlayer.powerUpInventory ?? []}
            dailyClaimed={isDailyBonusClaimed}
          />
        </div>

        <button
          style={{
            ...styles.claimBtn,
            ...(isDailyBonusClaimed ? styles.claimBtnDisabled : {}),
          }}
          disabled={isDailyBonusClaimed}
          onClick={() => {
            const claimed = claimDailyPowerUps();
            if (claimed) {
              playSound("select");
            }
          }}
          onMouseEnter={() => {
            if (!isDailyBonusClaimed) playSound("hover");
          }}
        >
          {isDailyBonusClaimed ? "DAILY CLAIM COMPLETE" : "CLAIM DAILY BONUS"}
        </button>

        <button
          style={styles.backBtn}
          onClick={() => { setScreen("mode-select"); playSound("select"); }}
          onMouseEnter={() => { playSound("hover"); }}
        >
          ← BACK
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "relative",
    width: "100%",
    minHeight: "100%",
    background: "#010808",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Press Start 2P', monospace",
  },
  content: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 32,
    width: "100%",
    maxWidth: 600,
    padding: "60px 24px",
  },
  title: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: "clamp(1.2rem, 3%, 2rem)",
    color: "#33E02A",
    margin: 0,
    textShadow: "0 0 8px #2CFF55, 0 0 20px #33E02A",
  },
  backBtn: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 11,
    letterSpacing: "0.1em",
    color: "#2DE62A",
    background: "#021212",
    border: "2px solid #00E5FF",
    borderRadius: 8,
    padding: "14px 40px",
    cursor: "pointer",
    outline: "none",
    textShadow: "0 0 8px #2DE62A",
    boxShadow: "0 0 12px rgba(0,229,255,0.35)",
  },
  claimBtn: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 10,
    letterSpacing: "0.08em",
    color: "#0B1D0B",
    background: "#35E52B",
    border: "2px solid #74FF5C",
    borderRadius: 8,
    padding: "14px 26px",
    cursor: "pointer",
    outline: "none",
    textShadow: "none",
    boxShadow: "0 0 14px rgba(53,229,43,0.35)",
  },
  claimBtnDisabled: {
    color: "#3B4D3B",
    background: "#152115",
    border: "2px solid #2A3A2A",
    cursor: "not-allowed",
    boxShadow: "none",
  },
};