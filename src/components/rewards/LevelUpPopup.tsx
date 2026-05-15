import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { useGameStore } from '../../store/gameStore';

// ── Keyframes (originals preserved) ──────────────────────────────────────────
const screenFlash = keyframes`
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  100% { opacity: 0; }
`;

const rayRotate = keyframes`
  0%   { transform: rotate(0deg) scale(0.8);   opacity: 0.7; }
  100% { transform: rotate(180deg) scale(1.1); opacity: 0; }
`;

const levelPop = keyframes`
  0%   { transform: scale(0.2) translateY(20px); opacity: 0; }
  45%  { transform: scale(1.15) translateY(-8px); opacity: 1; }
  65%  { transform: scale(0.96) translateY(0px);  opacity: 1; }
  85%  { transform: scale(1.03) translateY(0px);  opacity: 1; }
  100% { transform: scale(1) translateY(0px);     opacity: 1; }
`;

const levelUpPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,234,255,0); }
  50%       { box-shadow: 0 0 0 8px rgba(0,234,255,0.2); }
`;

const arrowPulse = keyframes`
  0%, 100% { transform: translateX(0);   opacity: 1; }
  50%       { transform: translateX(5px); opacity: 0.6; }
`;

// ── Styled helpers ────────────────────────────────────────────────────────────

/** Glowing cyan corner bracket — rendered via pseudo-elements */
const CornerFrame = styled(Box)({
  position: 'absolute',
  width: 36,
  height: 36,
  '&.tl': { top: 0, left: 0, borderTop: '2px solid #00eaff', borderLeft: '2px solid #00eaff' },
  '&.tr': { top: 0, right: 0, borderTop: '2px solid #00eaff', borderRight: '2px solid #00eaff' },
  '&.bl': { bottom: 0, left: 0, borderBottom: '2px solid #00eaff', borderLeft: '2px solid #00eaff' },
  '&.br': { bottom: 0, right: 0, borderBottom: '2px solid #00eaff', borderRight: '2px solid #00eaff' },
  pointerEvents: 'none',
});

const LevelCard = styled(Box)({
  flex: '1 1 0',
  maxWidth: 240,
  background: '#060f0f',
  border: '1.5px solid rgba(0,234,255,0.55)',
  borderRadius: 14,
  boxShadow: '0 0 16px rgba(0,234,255,0.18), inset 0 0 20px rgba(0,234,255,0.04)',
  padding: '28px 20px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 4,
    border: '1px solid rgba(0,234,255,0.18)',
    borderRadius: 10,
    pointerEvents: 'none',
  },
});

const XpBarWrap = styled(Box)({
  width: '100%',
  height: 10,
  background: '#0a1a1a',
  borderRadius: 3,
  overflow: 'hidden',
  marginBottom: 4,
});

const XpBarFill = styled(Box)<{ fillpct: number }>(({ fillpct }) => ({
  height: '100%',
  width: `${fillpct}%`,
  background: '#00aaff',
  borderRadius: 3,
  boxShadow: '0 0 8px rgba(0,170,255,0.6)',
}));

const CardBadge = styled(Box)<{ variant: 'cyan' | 'purple' }>(({ variant }) => ({
  width: '100%',
  borderRadius: 4,
  padding: '8px 10px',
  textAlign: 'center',
  fontFamily: `'Share Tech Mono', 'Courier New', monospace`,
  fontSize: 10,
  letterSpacing: '1.5px',
  marginTop: 4,
  ...(variant === 'cyan'
    ? {
        border: '1.5px solid #00eaff',
        color: '#39ff14',
        background: '#001a1f',
      }
    : {
        border: '1.5px solid #b400ff',
        color: '#b400ff',
        background: '#0e001a',
        textShadow: '0 0 8px rgba(180,0,255,0.5)',
      }),
}));

// ── Props (unchanged) ─────────────────────────────────────────────────────────
interface LevelUpPopupProps {
  open: boolean;
  previousLevel: number;
  newLevel: number;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const LevelUpPopup: React.FC<LevelUpPopupProps> = ({
  open,
  previousLevel,
  newLevel,
  onClose,
}) => {
  const { clearLevelUpSession } = useGameStore();

  // ── Original timer logic — untouched ────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      onClose();
      clearLevelUpSession();
    }, 3000);
    return () => clearTimeout(timer);
  }, [open, onClose, clearLevelUpSession]);

  if (!open) return null;

  // XP display values derived from level data (adjust to your real store shape)
  const XP_PER_LEVEL = 1000;
const player       = useGameStore((s) => s.getPlayer());
const totalXp      = player.totalXp;

// XP inside the NEW level (after level-up)
const newXp        = totalXp % XP_PER_LEVEL;
const newXpGoal    = XP_PER_LEVEL;

// Previous level bar was full (that's what triggered the level-up)
const prevXp       = XP_PER_LEVEL;
const prevXpGoal   = XP_PER_LEVEL;

// XP fill % for the new level card
const newFillPct   = Math.round((newXp / newXpGoal) * 100);

// Rank band label
const ranksPerBand = 10;
const bandStart    = Math.floor((newLevel - 1) / ranksPerBand) * ranksPerBand + 1;
const bandEnd      = bandStart + ranksPerBand - 1;
const levelRange   = `LV ${bandStart}-${bandEnd}`;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.82)',
        animation: `${screenFlash} 2.4s ease both`,
      }}
    >
      {/* Rotating ray (original, invisible behind dark bg but kept for logic parity) */}
      <Box
        sx={{
          position: 'absolute',
          width: 500,
          height: 500,
          backgroundImage: `repeating-conic-gradient(
            rgba(0,234,255,0.06) 0deg 10deg,
            transparent 10deg 20deg
          )`,
          borderRadius: '50%',
          animation: `${rayRotate} 2s linear both`,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* ── Main popup ────────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          width: { xs: '95vw', sm: 720 },
          background: '#020b0b',
          borderRadius: 3,
          padding: { xs: '24px 16px 28px', sm: '32px 36px 36px' },
          animation: `${levelPop} 2.4s cubic-bezier(0.22,1,0.36,1) both,
                      ${levelUpPulse} 0.5s ease-in-out 0.5s 3`,
        }}
      >
        {/* Corner brackets */}
        <CornerFrame className="tl" />
        <CornerFrame className="tr" />
        <CornerFrame className="bl" />
        <CornerFrame className="br" />

        {/* Title */}
        <Typography
          sx={{
            fontFamily: `'Share Tech Mono', 'Courier New', monospace`,
            fontSize: 13,
            color: '#39ff14',
            letterSpacing: '3px',
            textShadow: '0 0 10px rgba(57,255,20,0.55)',
            mb: 3.5,
          }}
        >
          LEVEL PROGRESSION
        </Typography>

        {/* ── 3-column layout ──────────────────────────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 1, sm: 0 },
            mb: 4,
          }}
        >
          {/* Left card — previous level */}
          <LevelCard>
            <Typography
              sx={{
                fontFamily: `'Share Tech Mono', monospace`,
                color: '#39ff14',
                fontSize: { xs: 22, sm: 26 },
                letterSpacing: '4px',
                textShadow: '0 0 12px rgba(57,255,20,0.5)',
                mb: 0.5,
              }}
            >
              LEVEL {previousLevel}
            </Typography>

            <Typography
              sx={{
                fontFamily: `'Share Tech Mono', monospace`,
                color: '#4a9eff',
                fontSize: 11,
                letterSpacing: '2px',
                mb: 2,
              }}
            >
              {levelRange}
            </Typography>

            <Typography
              sx={{
                fontFamily: `'Share Tech Mono', monospace`,
                color: '#00eaff',
                fontSize: 10,
                letterSpacing: '2px',
                alignSelf: 'flex-start',
                mb: 0.5,
              }}
            >
              XP PROGRESS
            </Typography>

            <XpBarWrap>
              <XpBarFill fillpct={100} />
            </XpBarWrap>

            <Typography
              sx={{
                fontFamily: `'Share Tech Mono', monospace`,
                color: '#5ab8ff',
                fontSize: 10,
                alignSelf: 'flex-end',
                mb: 1.5,
              }}
            >
              {prevXp}/{prevXpGoal}
            </Typography>

            <CardBadge variant="cyan">XP GOAL REACHED!</CardBadge>
          </LevelCard>

          {/* Center — level up indicator */}
          <Box
            sx={{
              flex: '0 0 auto',
              width: { xs: 80, sm: 160 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              px: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily: `'Share Tech Mono', monospace`,
                color: '#39ff14',
                fontSize: { xs: 11, sm: 14 },
                letterSpacing: '3px',
                textShadow: '0 0 14px #39ff14',
                textAlign: 'center',
              }}
            >
              LEVEL UP!
            </Typography>

            <Typography
              sx={{
                fontFamily: `'Share Tech Mono', monospace`,
                color: '#39ff14',
                fontSize: { xs: 22, sm: 28 },
                letterSpacing: '-2px',
                textShadow: '0 0 16px #39ff14',
                animation: `${arrowPulse} 1s ease-in-out infinite`,
              }}
            >
              &gt;&gt;&gt;
            </Typography>
          </Box>

          {/* Right card — new level */}
          <LevelCard>
            <Typography
              sx={{
                fontFamily: `'Share Tech Mono', monospace`,
                color: '#39ff14',
                fontSize: { xs: 22, sm: 26 },
                letterSpacing: '4px',
                textShadow: '0 0 12px rgba(57,255,20,0.5)',
                mb: 0.5,
              }}
            >
              LEVEL {newLevel}
            </Typography>

            <Typography
              sx={{
                fontFamily: `'Share Tech Mono', monospace`,
                color: '#4a9eff',
                fontSize: 11,
                letterSpacing: '2px',
                mb: 2,
              }}
            >
              {levelRange}
            </Typography>

            <Typography
              sx={{
                fontFamily: `'Share Tech Mono', monospace`,
                color: '#00eaff',
                fontSize: 10,
                letterSpacing: '2px',
                alignSelf: 'flex-start',
                mb: 0.5,
              }}
            >
              XP PROGRESS
            </Typography>

            <XpBarWrap>
              <XpBarFill fillpct={newFillPct} />
            </XpBarWrap>

            <Typography
              sx={{
                fontFamily: `'Share Tech Mono', monospace`,
                color: '#5ab8ff',
                fontSize: 10,
                alignSelf: 'flex-end',
                mb: 1.5,
              }}
            >
              {newXp}/{newXpGoal}
            </Typography>

            <CardBadge variant="purple">NEW LEVEL UNLOCKED!</CardBadge>
          </LevelCard>
        </Box>

        {/* Continue button */}
        <Box
          component="button"
          onClick={() => {
            onClose();
            clearLevelUpSession();
          }}
          sx={{
            display: 'block',
            margin: '0 auto',
            background: '#041a1a',
            color: '#39ff14',
            border: '1.5px solid rgba(0,234,255,0.6)',
            borderRadius: 2,
            fontFamily: `'Share Tech Mono', 'Courier New', monospace`,
            fontSize: 14,
            letterSpacing: '4px',
            px: 6,
            py: 1.5,
            cursor: 'pointer',
            textShadow: '0 0 8px rgba(57,255,20,0.5)',
            boxShadow: '0 0 10px rgba(0,234,255,0.15)',
            transition: 'box-shadow 0.2s ease, transform 0.2s ease',
            pointerEvents: 'auto',
            '&:hover': {
              boxShadow: '0 0 24px rgba(0,234,255,0.55), 0 0 10px rgba(57,255,20,0.3)',
              transform: 'scale(1.04)',
            },
          }}
        >
          CONTINUE
        </Box>
      </Box>
    </Box>
  );
};