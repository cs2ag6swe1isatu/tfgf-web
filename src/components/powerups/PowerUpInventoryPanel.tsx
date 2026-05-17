import { Box, Typography } from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import { POWER_UP_CATALOGUE } from "../../types/powerups";
import type { PowerUpInventoryEntry } from "../../types/powerups";

// ─── Animations ────────────────────────────────────────────────────────────

const slotGlow = keyframes`
  0%, 100% { box-shadow: 0 0 6px #00E5FF33; }
  50%       { box-shadow: 0 0 14px #00E5FF88; }
`;

const emptyPulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 0.6; }
`;

// ─── Styled Components ──────────────────────────────────────────────────────

const PanelContainer = styled(Box)({
  width: "100%",
  border: "2px solid #00E5FF33",
  borderRadius: "8px",
  padding: "20px",
  background: "rgba(0,229,255,0.02)",
});

const PanelTitle = styled(Typography)({
  fontFamily: "'Press Start 2P', monospace",
  fontSize: "10px",
  color: "#00E5FF",
  marginBottom: "16px",
  letterSpacing: "0.1em",
});

const Grid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "12px",
});

const SlotCard = styled(Box, {
  shouldForwardProp: (p) => p !== "hasStock",
})<{ hasStock?: boolean }>(({ hasStock }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "8px",
  padding: "14px 8px",
  borderRadius: "8px",
  border: `2px solid ${hasStock ? "#00E5FF55" : "#1a2a2a"}`,
  background: hasStock ? "rgba(0,229,255,0.03)" : "rgba(0,0,0,0.2)",
  animation: hasStock ? `${slotGlow} 4s infinite` : "none",
  position: "relative",
  transition: "border-color 0.2s",
}));

const SlotIcon = styled(Typography, {
  shouldForwardProp: (p) => p !== "hasStock",
})<{ hasStock?: boolean }>(({ hasStock }) => ({
  fontSize: "28px",
  lineHeight: 1,
  opacity: hasStock ? 1 : 0.25,
  animation: hasStock ? "none" : `${emptyPulse} 2s infinite`,
  filter: hasStock ? "none" : "grayscale(1)",
}));

const SlotName = styled(Typography)({
  fontFamily: "'Press Start 2P', monospace",
  fontSize: "7px",
  color: "#888",
  textAlign: "center",
  lineHeight: 1.4,
});

const SlotDesc = styled(Typography)({
  fontFamily: "'Courier New', monospace",
  fontSize: "9px",
  color: "#555",
  textAlign: "center",
  lineHeight: 1.4,
});

const CountBadge = styled(Box, {
  shouldForwardProp: (p) => p !== "hasStock",
})<{ hasStock?: boolean }>(({ hasStock }) => ({
  position: "absolute",
  top: "6px",
  right: "8px",
  fontFamily: "'Press Start 2P', monospace",
  fontSize: "9px",
  color: hasStock ? "#35E52B" : "#2a2a2a",
  lineHeight: 1,
}));

const DailyBonusNote = styled(Box)({
  marginTop: "14px",
  padding: "10px 14px",
  borderRadius: "6px",
  border: "1px solid #35E52B33",
  background: "rgba(53,229,43,0.03)",
  display: "flex",
  alignItems: "center",
  gap: "10px",
});

// ─── Component ──────────────────────────────────────────────────────────────

interface PowerUpInventoryPanelProps {
  /** Pass localPlayer.powerUpInventory here */
  inventory: PowerUpInventoryEntry[];
  /** Whether the player already claimed today's daily bonus */
  dailyClaimed?: boolean;
}

export const PowerUpInventoryPanel = ({
  inventory,
  dailyClaimed = false,
}: PowerUpInventoryPanelProps) => {
  // Build a full display list — show all 4 power-ups even if count is 0
  const allPowerUps = Object.values(POWER_UP_CATALOGUE);

  const getCount = (id: string) =>
    inventory.find((e) => e.id === id)?.count ?? 0;

  const totalOwned = inventory.reduce((sum, e) => sum + e.count, 0);

  return (
    <PanelContainer>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <PanelTitle>POWER-UPS</PanelTitle>
        <Typography sx={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          color: totalOwned > 0 ? "#35E52B" : "#444",
        }}>
          {totalOwned} OWNED
        </Typography>
      </Box>

      <Grid>
        {allPowerUps.map((def) => {
          const count = getCount(def.id);
          const hasStock = count > 0;
          return (
            <SlotCard key={def.id} hasStock={hasStock}>
              <CountBadge hasStock={hasStock}>×{count}</CountBadge>
              <SlotIcon hasStock={hasStock}>{def.icon}</SlotIcon>
              <SlotName>{def.label}</SlotName>
              <SlotDesc>{def.description}</SlotDesc>
            </SlotCard>
          );
        })}
      </Grid>

      <DailyBonusNote>
        <Typography sx={{ fontSize: "16px" }}>
          {dailyClaimed ? "✅" : "🎁"}
        </Typography>
        <Box>
          <Typography sx={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "7px",
            color: dailyClaimed ? "#555" : "#35E52B",
            lineHeight: 1.6,
          }}>
            {dailyClaimed ? "DAILY BONUS CLAIMED" : "DAILY BONUS AVAILABLE"}
          </Typography>
          <Typography sx={{
            fontFamily: "'Courier New', monospace",
            fontSize: "10px",
            color: "#444",
            mt: 0.5,
          }}>
            {dailyClaimed
              ? "Come back tomorrow for more power-ups"
              : "Login bonus: ½ ×1 + random item ×1"}
          </Typography>
        </Box>
      </DailyBonusNote>
    </PanelContainer>
  );
};
