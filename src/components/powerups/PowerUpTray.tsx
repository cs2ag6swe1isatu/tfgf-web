import { Box, Typography, Tooltip } from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import { usePowerUpStore } from "../../store/powerUpStore";
import { POWER_UP_CATALOGUE } from "../../types/powerups";
import type { PowerUpId } from "../../types/powerups";

// ─── Animations ────────────────────────────────────────────────────────────

const slotPulse = keyframes`
  0%, 100% { box-shadow: 0 0 6px #00E5FF44; }
  50%       { box-shadow: 0 0 14px #00E5FFaa; }
`;

const dropBounce = keyframes`
  0%   { transform: translateY(-10px) scale(0.8); opacity: 0; }
  60%  { transform: translateY(3px) scale(1.1); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
`;

// ─── Styled Components ──────────────────────────────────────────────────────

const TrayContainer = styled(Box)({
  position: "absolute",
  right: "15px",
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  alignItems: "center",
  zIndex: 20,
});

const SectionLabel = styled(Typography)({
  fontFamily: "'Press Start 2P', monospace",
  fontSize: "6px",
  color: "#00E5FF66",
  letterSpacing: "0.08em",
  textAlign: "center",
  writingMode: "vertical-rl",
  transform: "rotate(180deg)",
  marginBottom: "2px",
});

const SlotWrapper = styled(Box, {
  shouldForwardProp: (p) => p !== "available",
})<{ available?: boolean }>(({ available }) => ({
  position: "relative",
  width: "44px",
  height: "52px",
  borderRadius: "6px",
  border: `2px solid ${available ? "#00E5FF" : "#1a2a2a"}`,
  background: available ? "rgba(0,229,255,0.04)" : "rgba(0,0,0,0.3)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  cursor: available ? "pointer" : "not-allowed",
  transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s",
  animation: available ? `${slotPulse} 3s infinite` : "none",

  "&:hover": available
    ? {
        borderColor: "#35E52B",
        background: "rgba(53,229,43,0.06)",
        boxShadow: "0 0 14px rgba(53,229,43,0.4)",
        transform: "scale(1.06)",
      }
    : {},
}));

const IconLabel = styled(Typography)({
  fontFamily: "'Press Start 2P', monospace",
  fontSize: "16px",
  lineHeight: 1,
  userSelect: "none",
  animation: `${dropBounce} 0.4s cubic-bezier(0.4,0,0.2,1) both`,
});

const SlotLabel = styled(Typography)({
  fontFamily: "'Press Start 2P', monospace",
  fontSize: "5px",
  color: "#555",
  marginTop: "3px",
  lineHeight: 1,
  textAlign: "center",
});

const CountBadge = styled(Box, {
  shouldForwardProp: (p) => p !== "available",
})<{ available?: boolean }>(({ available }) => ({
  position: "absolute",
  top: "3px",
  right: "5px",
  fontFamily: "'Press Start 2P', monospace",
  fontSize: "8px",
  color: available ? "#35E52B" : "#333",
  lineHeight: 1,
}));

// ─── Single Slot ───────────────────────────────────────────────────────────

interface PowerUpSlotProps {
  id: PowerUpId;
  questionIndex: number;
  onActivate: (id: PowerUpId) => void;
}

const PowerUpSlot = ({ id, questionIndex, onActivate }: PowerUpSlotProps) => {
  const def = POWER_UP_CATALOGUE[id];
  const count = usePowerUpStore((s) => s.getCount(id));
  const canUse = usePowerUpStore((s) => s.canUse(id, questionIndex));

  if (count === 0) return null;

  return (
    <Tooltip
      title={
        <Box>
          <Typography sx={{ fontFamily: "'Press Start 2P', monospace", fontSize: "9px", color: "#35E52B" }}>
            {def.label}
          </Typography>
          <Typography sx={{ fontFamily: "'Courier New', monospace", fontSize: "10px", color: "#aaa", mt: 0.5 }}>
            {def.description}
          </Typography>
          {!canUse && (
            <Typography sx={{ fontFamily: "'Courier New', monospace", fontSize: "9px", color: "#FF0055", mt: 0.5 }}>
              Already used this question
            </Typography>
          )}
        </Box>
      }
      placement="left"
      arrow
    >
      <SlotWrapper
        available={canUse}
        onClick={() => { if (canUse) onActivate(id); }}
      >
        <IconLabel>{def.icon}</IconLabel>
        <SlotLabel>{def.label}</SlotLabel>
        <CountBadge available={canUse}>×{count}</CountBadge>
      </SlotWrapper>
    </Tooltip>
  );
};

// ─── Tray ───────────────────────────────────────────────────────────────────

interface PowerUpTrayProps {
  questionIndex: number;
  onActivate: (id: PowerUpId) => void;
}

/**
 * Vertical tray absolutely positioned on the right edge of GameScreen.
 * GameScreen already has position: "relative" so this just works.
 */
export const PowerUpTray = ({ questionIndex, onActivate }: PowerUpTrayProps) => {
  const inventory = usePowerUpStore((s) => s.sessionInventory);
  const hasAny = inventory.some((e) => e.count > 0);

  if (!hasAny) return null;

  return (
    <TrayContainer>
      <SectionLabel>ITEMS</SectionLabel>
      {inventory.map((entry) =>
        entry.count > 0 ? (
          <PowerUpSlot
            key={entry.id}
            id={entry.id}
            questionIndex={questionIndex}
            onActivate={onActivate}
          />
        ) : null
      )}
    </TrayContainer>
  );
};
