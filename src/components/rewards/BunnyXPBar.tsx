import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import spriteMap from '../bunny/BunnySprite'; // Adjust import path to your Sprite Map

interface BunnyXPBarProps {
  oldXP: number;
  newXP: number;
  xpPerLevel: number;
  level: number;
  animate: boolean;
  levelUp: boolean;
}

const neonPulse = keyframes`
  0%, 100% { box-shadow: 0 0 5px #00E5FF, 0 0 10px #00E5FF; }
  50% { box-shadow: 0 0 10px #00E5FF, 0 0 20px #00E5FF; }
`;

const Track = styled(Box)({
  position: 'relative',
  width: '100%',
  height: '6px',
  backgroundColor: 'rgba(0, 20, 40, 0.8)',
  border: '1px solid #00E5FF',
  borderRadius: '3px',
  boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.8)',
  overflow: 'visible',
});

const Fill = styled(Box)<{ progress: number; isAnimating: boolean }>(({ progress, isAnimating }) => ({
  height: '100%',
  backgroundColor: '#00E5FF',
  borderRadius: '2px',
  width: `${progress}%`,
  transition: isAnimating ? 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
  animation: `${neonPulse} 2s infinite`,
  position: 'relative',
}));

export const BunnyXPBar: React.FC<BunnyXPBarProps> = ({ oldXP, newXP, xpPerLevel, level, animate, levelUp }) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  const startPercent = (oldXP % xpPerLevel) / xpPerLevel * 100;
  const endPercent = (newXP % xpPerLevel) / xpPerLevel * 100;

 useEffect(() => {
    if (!animate) {
      setDisplayProgress(endPercent);
      return;
    }
    if (levelUp) {
      setDisplayProgress(100);
      const resetTimer = setTimeout(() => {
        setDisplayProgress(0);
        const finalTimer = setTimeout(() => setDisplayProgress(endPercent), 50);
        return () => clearTimeout(finalTimer);
      }, 1500);
      return () => clearTimeout(resetTimer);
    } else {
      setDisplayProgress(endPercent);
    }
  }, [animate, levelUp, startPercent, endPercent]);

  return (
    <Box sx={{ position: 'relative', width: '100%', mt: 1, mb: 3 }}>
      <Box 
        sx={{ 
          position: 'absolute', 
          top: '-18px', 
          left: `calc(${displayProgress}% - 16px)`, 
          transition: animate ? 'left 1.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          zIndex: 10 
        }}
      >
        <img 
          src={spriteMap['running']} 
          alt="XP Progress" 
          style={{ width: '32px', height: '32px', imageRendering: 'pixelated', filter: 'drop-shadow(0 0 4px #00E5FF)' }} 
        />
      </Box>
      <Track>
        <Fill progress={displayProgress} isAnimating={animate} />
      </Track>
    </Box>
  );
};