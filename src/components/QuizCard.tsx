import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  LinearProgress,
  Box,
  styled,
  keyframes,
  Fade
} from '@mui/material';
import particleOverlay from './fx/particleOverlay';

// --- Theme & Constants ---

const THEME = {
  primary: '#00ff9d',
  primaryDim: 'rgba(0, 255, 157, 0.1)',
  primaryGlow: 'rgba(0, 255, 157, 0.5)',
  error: '#ff3333',
  errorDim: 'rgba(255, 51, 51, 0.1)',
  bgDark: '#0d0d0d',
  bgPanel: '#111111',
  bgHover: '#1a1a1a', 
  textMain: '#e0e0e0',
  textMuted: '#999999', 
  border: '#333333',
  borderDim: '#222222',
};

// --- Animations ---

const flicker = keyframes({
  '0%': { opacity: 0.97 },
  '10%': { opacity: 0.9 },
  '20%': { opacity: 0.98 },
  '50%': { opacity: 0.95 },
  '80%': { opacity: 0.9 },
  '100%': { opacity: 1 },
});

const pulse = keyframes({
  '0%': { boxShadow: `0 0 5px ${THEME.primary}33` },
  '50%': { boxShadow: `0 0 12px ${THEME.primary}99` },
  '100%': { boxShadow: `0 0 5px ${THEME.primary}33` },
});

const blink = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0 },
});

const glitch = keyframes({
  '0%': { transform: 'translate(0)' },
  '20%': { transform: 'translate(-0px, 1px)', textShadow: `1px 0 ${THEME.error}, -1px 0 #00ffff` },
  '40%': { transform: 'translate(-0px, -1px)', textShadow: `1px 0 ${THEME.error}, -1px 0 #00ffff` },
  '60%': { transform: 'translate(0px, 1px)', textShadow: `-1px 0 ${THEME.error}, 1px 0 #00ffff` },
  '80%': { transform: 'translate(0px, -1px)', textShadow: `-1px 0 ${THEME.error}, 1px 0 #00ffff` },
  '100%': { transform: 'translate(0)', textShadow: 'none' },
});

const shake = keyframes({
  '0%, 100%': { transform: 'translateX(0)' },
  '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
  '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
});

const scanlineScroll = keyframes({
  '0%': { transform: 'translateY(-100vh)' },
  '100%': { transform: 'translateY(100vh)' },
});

// --- Custom Styled Components ---

const TerminalCard = styled(Card)(() => ({
  position: 'relative',
  maxWidth: 550,
  margin: 'auto',
  marginTop: 32,
  backgroundColor: THEME.bgDark,
  color: THEME.textMain,
  border: `1px solid ${THEME.border}`,
  borderRadius: 4,
  boxShadow: `0 0 25px ${THEME.primary}22`,
  overflow: 'hidden',
  
  // Accessibility: Disable animation for users who prefer reduced motion
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${flicker} 8s infinite linear`,
  },

  // CRT Scanlines
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)`,
    pointerEvents: 'none',
    zIndex: 10,
  },

  // Moving Scanline
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '50px',
    background: `linear-gradient(0deg, transparent, ${THEME.primary}15, transparent)`,
    opacity: 0.3,
    pointerEvents: 'none',
    zIndex: 11,
    '@media (prefers-reduced-motion: no-preference)': {
      animation: `${scanlineScroll} 8s linear infinite`,
    },
  },
}));

const GlitchText = styled(Typography)(() => ({
  textShadow: `0 0 5px ${THEME.primary}66`,
  display: 'inline-block',
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${glitch} 4s infinite linear`,
  },
}));

// Helper to determine button styles based on state
const getButtonStyles = ({ $isSelected, $isCorrect, $isWrong, $isRevealed, $isOther }: any) => {
  // 1. Revealed & Correct
  if ($isCorrect && $isRevealed) {
    return {
      borderColor: THEME.primary,
      backgroundColor: `${THEME.primary}22`,
      color: THEME.primary,
      boxShadow: `0 0 15px ${THEME.primary}44 inset`,
      textShadow: `0 0 5px ${THEME.primary}`,
      opacity: 1,
    };
  }
  // 2. Revealed & Wrong
  if ($isWrong && $isRevealed) {
    return {
      borderColor: THEME.error,
      backgroundColor: THEME.errorDim,
      color: THEME.error,
      textDecoration: 'line-through',
      animation: `${shake} 0.5s ease-in-out`,
      opacity: 1,
    };
  }
  // 3. Revealed & Unselected (Fade out the others)
  if ($isRevealed && $isOther) {
    return {
      opacity: 0.4,
      filter: 'blur(1px)',
      cursor: 'default',
    };
  }
  // 4. Selected (waiting for reveal)
  if ($isSelected && !$isRevealed) {
    return {
      borderColor: THEME.primary,
      backgroundColor: THEME.primaryDim,
      color: THEME.primary,
    };
  }
  // 5. Default
  return {};
};

const ActionButton = styled(Button, {
  shouldForwardProp: (prop) => 
    !['$isSelected', '$isCorrect', '$isWrong', '$isRevealed', '$isOther'].includes(prop as string),
})<{
  $isSelected?: boolean; 
  $isCorrect?: boolean; 
  $isWrong?: boolean;
  $isRevealed?: boolean;
  $isOther?: boolean; // True if this is NOT the selected option but reveal happened
}>((props) => ({
  fontWeight: 'bold',
  letterSpacing: 1.5,
  padding: '14px',
  border: `1px solid ${THEME.border}`,
  transition: 'all 0.2s ease-out',
  fontFamily: '"Fira Code", "Courier New", Courier, monospace',
  backgroundColor: THEME.bgPanel,
  color: THEME.textMuted,
  textTransform: 'none',
  boxShadow: 'none',
  borderRadius: 2,
  justifyContent: 'flex-start',
  position: 'relative',
  overflow: 'hidden',
  
  ...getButtonStyles(props),

  // Hover State (only if not revealed)
  ...( !props.$isRevealed && {
    '&:hover': {
      backgroundColor: THEME.bgHover,
      borderColor: THEME.primary,
      color: THEME.primary,
      transform: 'skewX(-2deg) scale(1.01)',
      boxShadow: `0 0 10px ${THEME.primary}33`,
    },
    '&:active':{
      transform: 'scale(0.98)',
    }
  }),
}));

const HealthBar = styled(LinearProgress)(() => ({
  height: 8,
  borderRadius: 0,
  backgroundColor: THEME.border,
  transition: 'value 0.5s ease-in-out', // Animate health changes
  '.MuiLinearProgress-bar': {
    borderRadius: 0,
    backgroundImage: `linear-gradient(90deg, #00cc7a 0%, ${THEME.primary} 100%)`,
    boxShadow: `0 0 10px ${THEME.primary}99`,
    transition: 'transform 0.5s ease-in-out',
  },
}));

// --- Types ---

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizCardProps {
  level?: string;
  question?: string;
  options?: Option[];
  health?: number;
  onAnswer?: (option: Option) => void;
}

export default function QuizCard({
  level = "LEVEL 01 - SYSTEM BREACH",
  question = "IDENTIFY THE CORRECT OUTPUT: ECHO $((2 + 2))",
  options = [],
  health = 85,
  onAnswer
}: QuizCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  const currentOptions: Option[] = useMemo(() => options.length > 0 ? options : [
    { id: 'A', text: '0x04', isCorrect: false },
    { id: 'B', text: '4', isCorrect: true },
    { id: 'C', text: 'SEGMENTATION FAULT', isCorrect: false },
  ], [options]);

  const onAnswerRef = useRef(onAnswer);
  useEffect(() => {
    onAnswerRef.current = onAnswer;
  }, [onAnswer]);

  const handleSelect = useCallback((option: Option) => {
    if (isRevealed) return;

    setSelectedAnswer(option.id);
    setIsRevealed(true);
    
    if (onAnswerRef.current) {
      onAnswerRef.current(option);
    }
  }, [isRevealed]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRevealed) return;
      
      // Allow keys A-Z
      const key = e.key.toUpperCase();
      const foundOption = currentOptions.find(opt => opt.id === key);
      
      if (foundOption) {
        // Prevent default to avoid typing in input fields if nested
        e.preventDefault(); 
        handleSelect(foundOption);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, currentOptions, handleSelect]);

  const getSystemMessage = () => {
    if (!isRevealed) return null;
    const selectedOpt = currentOptions.find(o => o.id === selectedAnswer);
    if (selectedOpt?.isCorrect) return { text: 'ACCESS GRANTED', color: THEME.primary };
    return { text: 'SYSTEM FAILURE', color: THEME.error };
  };

  const systemMessage = getSystemMessage();

  return (
    <TerminalCard>
      {/* Accessibility: Live Region */}
      <div 
        aria-live="assertive" 
        aria-atomic="true"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {systemMessage ? `Result: ${systemMessage.text}` : ''}
        {isRevealed ? 'Quiz interaction ended.' : ''}
      </div>

      <Box sx={{ px: 3, pt: 3, pb: 1, backgroundColor: 'rgba(0,0,0,0.3)', position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
          <Typography 
            variant="overline" 
            sx={{ 
              color: THEME.primary, 
              fontWeight: 'bold', 
              letterSpacing: 3,
              fontSize: '0.7rem',
              textShadow: `0 0 5px ${THEME.primary}88`
            }}
          >
            {`// ${level}`}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box 
              component="span" 
              sx={{ 
                width: 6, height: 6, bgcolor: THEME.primary, 
                borderRadius: '50%', 
                '@media (prefers-reduced-motion: no-preference)': {
                  animation: `${pulse} 1.5s infinite` 
                }
              }} 
            />
            <Typography variant="caption" sx={{ color: THEME.textMuted, fontFamily: 'monospace', fontSize: '0.7rem' }}>
              HP: {health}%
            </Typography>
          </Box>
        </Box>
        <HealthBar variant="determinate" value={health} />
      </Box>

      <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
        <Box sx={{ minHeight: '3em', mb: 3 }}>
          <GlitchText
            variant="h6"
            component="pre"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: THEME.textMain,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            <Box component="span" sx={{ color: THEME.primary, mr: 1, textShadow: `0 0 5px ${THEME.primary}` }}>{'>'}</Box>
            {question}
            <Box component="span" sx={{ 
              borderLeft: `2px solid ${THEME.primary}`, 
              pl: 0.5, 
              ml: 0.5, 
              '@media (prefers-reduced-motion: no-preference)': {
                animation: `${blink} 1s step-end infinite`,
              },
              display: 'inline-block',
              height: '1.2em',
              verticalAlign: 'text-bottom'
            }} />
          </GlitchText>
        </Box>

        <Stack spacing={1.5}>
          {currentOptions.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrect = option.isCorrect;
            const isWrong = isSelected && !isCorrect;
            const isOther = isRevealed && !isSelected; // Logic for fading unselected buttons

            return (
              <ActionButton
                key={option.id}
                fullWidth
                size="large"
                $isSelected={isSelected && !isRevealed}
                $isCorrect={isCorrect && isRevealed}
                $isWrong={isWrong && isRevealed}
                $isRevealed={isRevealed}
                $isOther={isOther}
                onClick={() => handleSelect(option)}
                disabled={isRevealed}
                aria-pressed={isSelected}
                aria-label={`Option ${option.id}: ${option.text}`}
              >
                <Typography 
                  component="span" 
                  sx={{ 
                    mr: 2, 
                    color: isSelected ? THEME.primary : THEME.border,
                    fontWeight: 'bold',
                    minWidth: '30px',
                    display: 'inline-block',
                    transition: 'color 0.2s'
                  }}
                >
                  {`[${option.id}]`}
                </Typography>
                {option.text}
              </ActionButton>
            );
          })}
        </Stack>

        {/* Result Message with Fade Transition */}
        <Fade in={isRevealed} timeout={500}>
          <Box sx={{ mt: 3, textAlign: 'center', height: systemMessage ? 'auto' : 0 }}>
            {systemMessage && (
              <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: 'monospace', 
                  fontWeight: 'bold', 
                  color: systemMessage.color,
                  textShadow: `0 0 10px ${systemMessage.color}`,
                  letterSpacing: 2
                }}
              >
                {`> ${systemMessage.text}`}
              </Typography>
            )}
          </Box>
        </Fade>
      </CardContent>

      <Box
        sx={{
          p: 1.5,
          bgcolor: '#050505',
          borderTop: `1px solid ${THEME.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: THEME.border, letterSpacing: 1 }}>
          USER: ROOT
        </Typography>
        
        <Typography
          variant="caption"
          sx={{
            color: THEME.primary,
            fontFamily: 'monospace',
            letterSpacing: 1,
            textShadow: `0 0 3px ${THEME.primary}66`
          }}
        >
          STATUS: ACTIVE
        </Typography>
      </Box>
    </TerminalCard>
  );
}