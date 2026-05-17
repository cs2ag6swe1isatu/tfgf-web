import { styled, keyframes } from "@mui/material/styles";
import spriteMap from "./BunnySprite";
import type { BunnyState } from "./bunnyStates";

interface Props {
  state: BunnyState;
  size?: number;
}

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
`;

const idleBounce = keyframes`
  0%, 100% { transform: translateY(0px) scaleY(1); }
  50% { transform: translateY(-4px) scaleY(0.95); }
`;

const fastBounce = keyframes`
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-10px) scale(1.05); }
`;

const panicShake = keyframes`
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-2px, 2px); }
  50% { transform: translate(2px, -2px); }
  75% { transform: translate(-2px, -2px); }
`;

const runBob = keyframes`
  0%, 100% { transform: translateY(0) rotate(5deg); }
  50% { transform: translateY(-3px) rotate(8deg); }
`;

const getAnimationForState = (state: BunnyState) => {
  switch (state) {
    case "sleeping": return `${float} 3s ease-in-out infinite`;
    case "panicked": return `${panicShake} 0.2s linear infinite`;
    case "hyper":
    case "winner": return `${fastBounce} 0.6s cubic-bezier(0.28, 0.84, 0.42, 1) infinite`;
    case "running": return `${runBob} 0.4s linear infinite`;
    case "sad": return "none";
    default: return `${idleBounce} 2s ease-in-out infinite`;
  }
};

const getGlowForState = (state: BunnyState) => {
  switch (state) {
    case "happy":
    case "winner":
    case "confident": return "drop-shadow(0 0 8px rgba(53, 229, 43, 0.8))";
    case "panicked":
    case "sad": return "drop-shadow(0 0 8px rgba(255, 0, 85, 0.8))";
    case "hyper": return "drop-shadow(0 0 12px rgba(255, 0, 255, 0.9))";
    case "running": return "drop-shadow(0 0 8px rgba(0, 229, 255, 0.6))";
    case "sleeping": return "drop-shadow(0 0 4px rgba(0, 229, 255, 0.3))";
    default: return "drop-shadow(0 0 6px rgba(0, 229, 255, 0.8))";
  }
};

// FIX: Style the 'img' tag directly instead of Box!
const SpriteImage = styled('img', {
  shouldForwardProp: (prop) => prop !== "mascotState",
})<{ mascotState: BunnyState }>(({ mascotState }) => ({
  imageRendering: "pixelated",
  objectFit: "contain",
  userSelect: "none",
  pointerEvents: "none",
  transition: "filter 0.3s ease",
  animation: getAnimationForState(mascotState),
  filter: getGlowForState(mascotState),
}));

export function BunnyMascot({ state, size = 96 }: Props) {
  const src = spriteMap[state] || spriteMap["idle"];
  return (
    <SpriteImage
      src={src}
      alt={`Bunny is ${state}`}
      mascotState={state}
      // sx still works perfectly for setting width/height on styled components
      sx={{ width: size, height: size }} 
    />
  );
}

export default BunnyMascot;