import React from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { usePlayerStore } from '../../store/playerStore';
import { RANK_COLORS, getRankSymbolType } from '../ui/RankIcon';

const barGlow = keyframes`
  0%   { box-shadow: 0 0 4px rgba(0,229,255,0.4); }
  50%  { box-shadow: 0 0 16px rgba(0,229,255,0.9), 0 0 32px rgba(0,229,255,0.4); }
  100% { box-shadow: 0 0 4px rgba(0,229,255,0.4); }
`;

const XPProgressBar: React.FC = () => {
  const player = usePlayerStore((s) => s.getPlayer());
  
  if (!player) {
    return null;
  }
  
  const { totalXp, level } = player;

  // FIX 4: Always use 1000 as the level size (fixed by spec).
  // Previously used player.xpToNextLevel as the denominator, which is the
  // *remaining* XP to next level — a shrinking number — giving wrong percentages.
  const XP_PER_LEVEL = 1000;
  const currentLevelXP = totalXp % XP_PER_LEVEL;
  const progressPercent = Math.min(100, Math.max(0, (currentLevelXP / XP_PER_LEVEL) * 100));
  
  // Determine rank from level
  const rankSymbolType = getRankSymbolType(
    ["novice","student","scholar","professor","expert","specialist","genius","brainiac","sage","oracle"][Math.min(9, Math.floor((level - 1) / 10))]
  );
  const rankTheme = RANK_COLORS[rankSymbolType];
  const badgeColor = rankTheme.primary;
  
  return (
    <Box sx={{ width: '100%', position: 'relative', mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: `2px solid ${badgeColor}`,
              background: 'rgba(10,26,46,0.8)',
              boxShadow: `0 0 12px ${badgeColor}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '20px',
                color: '#FFFFFF',
                fontWeight: 'bold',
              }}
            >
              {level}
            </Typography>
          </Box>
        </Box>
        <Typography sx={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '11px',
          color: '#8ECFFF',
          mr: 2,
        }}>
          {currentLevelXP} / {XP_PER_LEVEL} XP
        </Typography>
      </Box>
      
      <Box sx={{
        width: '100%',
        height: '12px',
        borderRadius: '99px',
        background: '#0A1A2E',
        border: '1.5px solid rgba(0,229,255,0.3)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <Box sx={{
          position: 'absolute',
          top: 0, left: 0, bottom: 0,
          width: `${progressPercent}%`,
          background: 'linear-gradient(90deg, #0096C7 0%, #00E5FF 60%, #BFFFFF 100%)',
          borderRadius: '99px',
          transition: 'none',
          animation: `${barGlow} 2s ease-in-out infinite`,
        }}>
          <Box sx={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0,
            width: '30%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5))',
            borderRadius: '99px',
            animation: `${barGlow} 1.5s ease-out`,
          }} />
        </Box>
      </Box>
    </Box>
  );
};

export default XPProgressBar;