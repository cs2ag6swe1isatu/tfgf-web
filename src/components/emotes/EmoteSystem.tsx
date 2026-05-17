import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { EmoteId, EMOTE_DICTIONARY, EmotePayload } from '../../types/emotes';
import carrotIcon from "../../assets/carrot_icon.png"; 

// ─── Keyframes ─────────────────────────────────────────────────────────────

// FIX: Make the emotes float much higher into the center of the screen
const floatUpAndFade = keyframes`
  0%   { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
  10%  { transform: translate(-50%, -50px) scale(1.5); opacity: 1; }
  20%  { transform: translate(-50%, -70px) scale(1.2); opacity: 1; }
  80%  { transform: translate(-50%, -200px) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -250px) scale(0.8); opacity: 0; }
`;

const MenuContainer = styled(Box)({
  position: 'relative',
  display: 'inline-flex',
  justifyContent: 'center',
  alignItems: 'center',
});

const EmoteMenu = styled(Box)<{ isVisible: boolean }>(({ isVisible }) => ({
  position: 'absolute',
  bottom: '100%', 
  right: 0,
  display: 'flex',
  gap: '8px',
  padding: '12px',
  marginBottom: '15px', // Gap above the carrot
  backgroundColor: 'rgba(0, 20, 40, 0.95)',
  border: '1px solid #00E5FF',
  borderRadius: '8px',
  boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
  opacity: isVisible ? 1 : 0,
  transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
  pointerEvents: isVisible ? 'auto' : 'none',
  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  zIndex: 100,
}));

const EmoteButton = styled(Box)<{ disabled: boolean }>(({ disabled }) => ({
  width: '40px',
  height: '40px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '24px',
  backgroundColor: 'rgba(0, 229, 255, 0.1)',
  border: '1px solid #00E5FF',
  borderRadius: '4px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  transition: 'all 0.1s ease',
  '&:hover': {
    backgroundColor: disabled ? '' : 'rgba(53, 229, 43, 0.2)',
    borderColor: disabled ? '' : '#35E52B',
    transform: disabled ? '' : 'scale(1.1) translateY(-2px)',
    boxShadow: disabled ? '' : '0 0 10px #35E52B',
  }
}));

const CarrotTrigger = styled(Box)<{ onCooldown: boolean }>(({ onCooldown }) => ({
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  backgroundColor: onCooldown ? "#333" : "#4DB6AC",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  boxShadow: onCooldown ? "none" : "0 0 15px rgba(77, 182, 172, 0.5)",
  cursor: onCooldown ? "wait" : "pointer",
  transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s, background-color 0.3s",
  filter: onCooldown ? "grayscale(100%)" : "none",
  "&:hover": {
    transform: onCooldown ? "none" : "scale(1.1) rotate(5deg)",
    boxShadow: onCooldown ? "none" : "0 0 25px rgba(77, 182, 172, 0.9)",
  }
}));

const FloatingEmote = styled(Typography)({
  position: 'absolute',
  left: '50%',
  bottom: '100%',
  fontSize: '48px', // Made them bigger so they are easier to see!
  pointerEvents: 'none',
  zIndex: 150,
  filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))',
  animation: `${floatUpAndFade} 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
});

// ─── Exported Components ───────────────────────────────────────────────────

export const EmoteControls = ({ sendEmote, isOnCooldown }: { sendEmote: (id: EmoteId) => void, isOnCooldown: boolean }) => {
  // FIX: Using onClick instead of Hover fixes the out-of-bounds menu cancellation
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (id: EmoteId) => {
    if (!isOnCooldown) {
      sendEmote(id);
      setIsOpen(false); // Close menu on click
    }
  };

  return (
    <MenuContainer>
      <EmoteMenu isVisible={isOpen}>
        {(Object.keys(EMOTE_DICTIONARY) as EmoteId[]).map((id) => (
          <EmoteButton 
            key={id} 
            disabled={isOnCooldown} 
            onClick={(e) => { e.stopPropagation(); handleSelect(id); }}
            title={EMOTE_DICTIONARY[id].sound}
          >
            {EMOTE_DICTIONARY[id].icon}
          </EmoteButton>
        ))}
      </EmoteMenu>

      <CarrotTrigger 
        onCooldown={isOnCooldown} 
        onClick={() => setIsOpen(!isOpen)} // Toggle menu on click
      >
        <img 
          src={carrotIcon} 
          alt="Emotes" 
          style={{ width: '50px', height: '50px', imageRendering: 'pixelated', transform: 'rotate(15deg)' }} 
        />
      </CarrotTrigger>
    </MenuContainer>
  );
};

export const PlayerEmoteOverlay = ({ playerId, emotes }: { playerId: string, emotes: Record<string, EmotePayload[]> }) => {
  const activeForPlayer = emotes[playerId] || [];
  if (activeForPlayer.length === 0) return null;

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 0 }}>
      {activeForPlayer.map((emote) => (
        <FloatingEmote key={emote.uniqueId}>
          {EMOTE_DICTIONARY[emote.emoteId]?.icon}
        </FloatingEmote>
      ))}
    </Box>
  );
};