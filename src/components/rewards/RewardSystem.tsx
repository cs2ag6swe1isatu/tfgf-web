import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';

const scorePop = keyframes`
  0%   { transform: scale(0.4) translateY(0px);    opacity: 0; }
  40%  { transform: scale(1.25) translateY(-10px); opacity: 1; }
  65%  { transform: scale(0.95) translateY(-18px); opacity: 1; }
  100% { transform: scale(1.05) translateY(-40px); opacity: 0; }
`;

const xpSlide = keyframes`
  0%   { transform: translateY(20px) scale(0.8);  opacity: 0; }
  30%  { transform: translateY(-6px) scale(1.05); opacity: 1; }
  70%  { transform: translateY(-20px) scale(1);   opacity: 1; }
  100% { transform: translateY(-50px) scale(0.95); opacity: 0; }
`;

const streakImpact = keyframes`
  0%   { transform: scale(0.3) rotate(-6deg); opacity: 0; }
  30%  { transform: scale(1.3) rotate(2deg);  opacity: 1; }
  50%  { transform: scale(0.92) rotate(-1deg); opacity: 1; }
  70%  { transform: scale(1.06) rotate(0deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg);    opacity: 0; }
`;

const screenFlash = keyframes`
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  100% { opacity: 0; }
`;

const barGlow = keyframes`
  0%   { box-shadow: 0 0 4px rgba(0,229,255,0.4); }
  50%  { box-shadow: 0 0 16px rgba(0,229,255,0.9), 0 0 32px rgba(0,229,255,0.4); }
  100% { box-shadow: 0 0 4px rgba(0,229,255,0.4); }
`;

const levelPop = keyframes`
  0%   { transform: scale(0.2) translateY(20px); opacity: 0; }
  45%  { transform: scale(1.15) translateY(-8px); opacity: 1; }
  65%  { transform: scale(0.96) translateY(0px);  opacity: 1; }
  85%  { transform: scale(1.03) translateY(0px);  opacity: 1; }
  100% { transform: scale(1) translateY(0px);     opacity: 0; }
`;

const rayRotate = keyframes`
  0%   { transform: rotate(0deg) scale(0.8);   opacity: 0.7; }
  100% { transform: rotate(180deg) scale(1.1); opacity: 0; }
`;

const confettiFall = keyframes`
  0%   { transform: translateY(0) rotate(0deg);     opacity: 1; }
  100% { transform: translateY(80px) rotate(720deg); opacity: 0; }
`;

const floatUp = keyframes`
  0%   { transform: translateY(0px);   opacity: 1; }
  100% { transform: translateY(-60px); opacity: 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { text-shadow: 0 0 8px currentColor, 0 0 16px currentColor; }
  50%       { text-shadow: 0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor; }
`;

const shakeX = keyframes`
  0%, 100% { transform: translateX(0); }
  15%  { transform: translateX(-8px); }
  30%  { transform: translateX(8px); }
  45%  { transform: translateX(-5px); }
  60%  { transform: translateX(5px); }
  75%  { transform: translateX(-2px); }
  90%  { transform: translateX(2px); }
`;

const levelUpPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,212,42,0); }
  50%       { box-shadow: 0 0 0 8px rgba(255,212,42,0.3); }
`;

export interface RewardData {
  score: number;
  xp: number;
  streak: number;
  oldXP: number;
  newXP: number;
  oldLevel: number;
  newLevel: number;
  xpPerLevel: number;
  buttonRef?: React.RefObject<HTMLElement>;
}

interface StreakTier {
  label: string;
  color: string;
  glowColor: string;
  flashColor: string;
  flashOpacity: number;
}

function getStreakTier(streak: number): StreakTier | null {
  if (streak >= 10) return {
    label: '🔥 GODLIKE!',
    color: '#FF4500',
    glowColor: 'rgba(255,69,0,0.7)',
    flashColor: 'rgba(255,69,0,0.18)',
    flashOpacity: 0.18,
  };
  if (streak >= 5) return {
    label: `${streak}× COMBO!`,
    color: '#FFD60A',
    glowColor: 'rgba(255,214,10,0.7)',
    flashColor: 'rgba(255,214,10,0.12)',
    flashOpacity: 0.12,
  };
  if (streak >= 2) return {
    label: `${streak} STREAK!`,
    color: '#7CFC00',
    glowColor: 'rgba(124,252,0,0.6)',
    flashColor: 'rgba(124,252,0,0.1)',
    flashOpacity: 0.1,
  };
  return null;
}

const CONFETTI_COLORS = ['#FFD60A','#00E5FF','#7CFC00','#FF4FD8','#FFFFFF','#FF8C00'];

const ConfettiParticles: React.FC<{ count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }).map((_, i) => {
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const left  = 20 + Math.random() * 60;
      const delay = Math.random() * 0.4;
      const dur   = 0.6 + Math.random() * 0.5;
      const size  = 4 + Math.random() * 6;
      return (
        <Box key={i} sx={{
          position: 'absolute',
          left: `${left}%`,
          top: '30%',
          width: `${size}px`,
          height: `${size}px`,
          background: color,
          borderRadius: Math.random() > 0.5 ? '50%' : '0',
          animation: `${confettiFall} ${dur}s ease-in ${delay}s both`,
          pointerEvents: 'none',
        }} />
      );
    })}
  </>
);

export const FloatingMicroText: React.FC<{
  score: number;
  anchorRef?: React.RefObject<HTMLElement>;
}> = ({ score, anchorRef }) => {
  const [pos, setPos] = useState({ top: '50%', left: '50%' });

  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top:  `${rect.top + rect.height / 2}px`,
        left: `${rect.left + rect.width / 2}px`,
      });
    }
  }, [anchorRef]);

  return (
    <Box sx={{
      position: 'fixed',
      top: pos.top,
      left: pos.left,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
    }}>
      <Typography sx={{
        fontFamily: `'Press Start 2P', monospace`,
        fontSize: '14px',
        color: '#FFD60A',
        lineHeight: 1,
        animation: `${floatUp} 0.9s ease-out both`,
        textShadow: '0 0 8px rgba(255,214,10,0.8)',
      }}>+{score}</Typography>
    </Box>
  );
};

export const ScorePopup: React.FC<{ score: number; visible: boolean }> = ({ score, visible }) => {
  if (!visible) return null;
  return (
    <Box sx={{
      position: 'absolute',
      top: '36%',
      left: '50%',
      transform: 'translateX(-110%)',
      pointerEvents: 'none',
      zIndex: 1000,
      animation: `${scorePop} 1s cubic-bezier(0.22,1,0.36,1) both`,
    }}>
      <Typography sx={{
        fontFamily: `'Press Start 2P', monospace`,
        fontSize: 'clamp(28px, 5vw, 52px)',
        color: '#FFFFFF',
        letterSpacing: '2px',
        whiteSpace: 'nowrap',
        textShadow: `
          0 0 12px rgba(255,214,10,0.9),
          0 0 28px rgba(255,214,10,0.6),
          2px 2px 0 #8C6A00
        `,
        animation: `${pulseGlow} 0.4s ease-in-out 0.2s 2`,
      }}>
        +{score} SCORE
      </Typography>
    </Box>
  );
};

export const XPPopup: React.FC<{ xp: number; visible: boolean }> = ({ xp, visible }) => {
  if (!visible) return null;
  return (
    <Box sx={{
      position: 'absolute',
      top: '36%',
      left: '50%',
      transform: 'translateX(10%)',
      pointerEvents: 'none',
      zIndex: 999,
      animation: `${xpSlide} 0.9s cubic-bezier(0.22,1,0.36,1) both`,
    }}>
      <Typography sx={{
        fontFamily: `'Press Start 2P', monospace`,
        fontSize: 'clamp(14px, 2.2vw, 26px)',
        color: '#00E5FF',
        letterSpacing: '2px',
        whiteSpace: 'nowrap',
        textShadow: `
          0 0 10px rgba(0,229,255,0.9),
          0 0 24px rgba(0,229,255,0.5),
          2px 2px 0 #005F99
        `,
      }}>
        +{xp} XP
      </Typography>
    </Box>
  );
};

export const StreakBanner: React.FC<{ streak: number; visible: boolean }> = ({ streak, visible }) => {
  if (!visible) return null;
  const tier = getStreakTier(streak);
  if (!tier) return null;
  return (
    <>
      <Box sx={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 998,
        background: tier.flashColor,
        animation: `${screenFlash} 0.5s ease-out both`,
      }} />
      <Box sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 1001,
        animation: `${streakImpact} 1.1s cubic-bezier(0.22,1,0.36,1) both, ${shakeX} 0.4s ease-out 0.05s`,
        whiteSpace: 'nowrap',
      }}>
        <Typography sx={{
          fontFamily: `'Press Start 2P', monospace`,
          fontSize: 'clamp(22px, 4vw, 44px)',
          color: tier.color,
          letterSpacing: '3px',
          textShadow: `0 0 16px ${tier.glowColor}, 0 0 32px ${tier.glowColor}, 2px 2px 0 rgba(0,0,0,0.5)`,
          animation: `${pulseGlow} 0.3s ease-in-out 0.3s 3`,
        }}>
          {tier.label}
        </Typography>
      </Box>
    </>
  );
};

export const XPBarAnimate: React.FC<{
  oldXP: number;
  newXP: number;
  xpPerLevel: number;
  level: number;
  animate: boolean;
}> = ({ oldXP, newXP, xpPerLevel, level, animate }) => {
  const xpInLevel = xpPerLevel > 0 ? xpPerLevel : 1000;
  const oldPct = Math.min(100, ((oldXP % xpInLevel) / xpInLevel) * 100);
  const newPct = Math.min(100, ((newXP % xpInLevel) / xpInLevel) * 100);
  const [displayPct, setDisplayPct] = useState(oldPct);

  useEffect(() => {
  if (!animate) return;  // ← just do nothing when animate is false
  const start = performance.now();
    const duration = 800;
    const from = oldPct;
    const to   = newPct < from ? 100 : newPct;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPct(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(tick);
      else setDisplayPct(newPct < from ? newPct : to);
    };
    requestAnimationFrame(tick);
  }, [animate, oldPct, newPct]);

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
        <Typography sx={{
          fontFamily: `'Press Start 2P', monospace`,
          fontSize: '10px',
          color: '#8ECFFF',
        }}>LV {level}</Typography>
        <Typography sx={{
          fontFamily: `'Press Start 2P', monospace`,
          fontSize: '10px',
          color: '#8ECFFF',
        }}>{Math.round(newXP % xpInLevel)}/{xpInLevel} XP</Typography>
      </Box>
      <Box sx={{
        width: '100%',
        height: '14px',
        borderRadius: '99px',
        background: '#0A1A2E',
        border: '1.5px solid rgba(0,229,255,0.3)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <Box sx={{
          position: 'absolute',
          top: 0, left: 0, bottom: 0,
          width: `${displayPct}%`,
          background: 'linear-gradient(90deg, #0096C7 0%, #00E5FF 60%, #BFFFFF 100%)',
          borderRadius: '99px',
          transition: 'none',
          animation: animate ? `${barGlow} 0.8s ease-in-out` : 'none',
        }}>
          {animate && (
            <Box sx={{
              position: 'absolute',
              top: 0, right: 0, bottom: 0,
              width: '30%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5))',
              borderRadius: '99px',
              animation: `${barGlow} 0.6s ease-out`,
            }} />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export const LevelUpModal: React.FC<{
  level: number;
  visible: boolean;
  onDone: () => void;
}> = ({ level, visible, onDone }) => {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      zIndex: 9000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <Box sx={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        animation: `${screenFlash} 2.4s ease both`,
      }} />
      <Box sx={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        backgroundImage: `repeating-conic-gradient(
          rgba(255,212,42,0.18) 0deg 10deg,
          transparent 10deg 20deg
        )`,
        borderRadius: '50%',
        animation: `${rayRotate} 2s linear both`,
        zIndex: 1,
      }} />
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        <ConfettiParticles count={24} />
      </Box>
      <Box sx={{
        position: 'relative',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '32px 48px',
        background: 'linear-gradient(135deg, #0A2A6E, #041440)',
        border: '2.5px solid #FFD60A',
        borderRadius: '20px',
        boxShadow: '0 0 40px rgba(255,214,10,0.5), 0 0 80px rgba(255,214,10,0.2)',
        animation: `${levelPop} 2.4s cubic-bezier(0.22,1,0.36,1) both, ${levelUpPulse} 0.5s ease-in-out 0.5s 3`,
      }}>
        <Typography sx={{
          fontFamily: `'Press Start 2P', monospace`,
          fontSize: 'clamp(14px, 2.5vw, 22px)',
          color: '#FFD60A',
          letterSpacing: '4px',
          textShadow: '0 0 16px rgba(255,214,10,0.8)',
        }}>LEVEL UP!</Typography>
        <Typography sx={{
          fontFamily: `'Press Start 2P', monospace`,
          fontSize: 'clamp(32px, 6vw, 64px)',
          color: '#FFFFFF',
          letterSpacing: '2px',
          textShadow: '0 0 24px rgba(255,255,255,0.6), 2px 2px 0 #8C6A00',
          lineHeight: 1,
        }}>{level}</Typography>
      </Box>
    </Box>
  );
};

interface RewardState {
  active: boolean;
  data: RewardData | null;
  showScore: boolean;
  showXP: boolean;
  showStreak: boolean;
  showXPBar: boolean;
  showLevelUp: boolean;
  showMicro: boolean;
}

const DEFAULT_STATE: RewardState = {
  active: false,
  data: null,
  showScore: false,
  showXP: false,
  showStreak: false,
  showXPBar: false,
  showLevelUp: false,
  showMicro: false,
};

export function useRewardSystem() {
  const [state, setState] = useState<RewardState>(DEFAULT_STATE);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  }, []);

  const trigger = useCallback((data: RewardData) => {
    clearTimers();
    setState(DEFAULT_STATE);

    const t = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timerRefs.current.push(id);
    };

    const hasStreak = getStreakTier(data.streak) !== null;
    const leveledUp = data.newLevel > data.oldLevel;

    setState(s => ({ ...s, active: true, data }));

    t(() => setState(s => ({ ...s, showScore: true, showMicro: true })), 100);
    t(() => setState(s => ({ ...s, showScore: false, showMicro: false })), 950);

    t(() => setState(s => ({ ...s, showXP: true })), 350);
    t(() => setState(s => ({ ...s, showXP: false })), 1250);

    if (hasStreak) {
      t(() => setState(s => ({ ...s, showStreak: true })), 550);
      t(() => setState(s => ({ ...s, showStreak: false })), 1650);
    }

    t(() => setState(s => ({ ...s, showXPBar: true })), 700);

    if (leveledUp) {
      t(() => setState(s => ({ ...s, showLevelUp: true })), 1200);
    }

    t(() => setState(DEFAULT_STATE), leveledUp ? 3600 : 1700);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return { state, trigger };
}

export const RewardOverlay: React.FC<{
  rewardState: RewardState;
  onLevelUpDone: () => void;
  xpPerLevel: number;
}> = ({ rewardState, onLevelUpDone, xpPerLevel }) => {
  const { data, showScore, showXP, showStreak, showLevelUp, showMicro } = rewardState;
  if (!data) return null;
  return (
    <>
      {showMicro && !showScore && !showXP && (
        <FloatingMicroText
          score={data.score}
          anchorRef={data.buttonRef}
        />
      )}
      <ScorePopup score={data.score} visible={showScore} />
      <XPPopup    xp={data.xp}       visible={showXP}    />
      <StreakBanner streak={data.streak} visible={showStreak} />
      <LevelUpModal
        level={data.newLevel}
        visible={showLevelUp}
        onDone={onLevelUpDone}
      />
    </>
  );
};
