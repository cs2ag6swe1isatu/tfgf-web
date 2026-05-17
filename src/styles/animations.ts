import { keyframes } from "@mui/material/styles";

// Bunny Keyframes
export const bunnyHop = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px) scaleY(1.05); }
`;
export const bunnyBreathe = keyframes`
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.95) translateY(2px); }
`;
export const bunnyShake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px) rotate(-5deg); }
  75% { transform: translateX(3px) rotate(5deg); }
`;
export const floatZzz = keyframes`
  0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  50% { opacity: 1; transform: translate(10px, -15px) scale(1); }
  100% { opacity: 0; transform: translate(20px, -30px) scale(1.5); }
`;

// Emote Keyframes
export const emoteFloat = keyframes`
  0% { opacity: 0; transform: translateY(10px) scale(0.5); }
  20% { opacity: 1; transform: translateY(-15px) scale(1.2); }
  40% { transform: translateY(-10px) scale(1); }
  80% { opacity: 1; transform: translateY(-25px) scale(1); }
  100% { opacity: 0; transform: translateY(-40px) scale(0.8); }
`;