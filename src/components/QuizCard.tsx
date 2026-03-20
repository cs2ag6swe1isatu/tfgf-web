import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
  useId,
} from 'react';
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
  Fade,
} from '@mui/material';

// --- Theme & Constants (unchanged) ---
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
} as const;

// --- Animations (unchanged) ---
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

const flash = keyframes({
  '0%': { opacity: 0 },
  '10%': { opacity: 0.7 },
  '100%': { opacity: 0 },
});

const cardGlitch = keyframes({
  '0%': { transform: 'translate(0)' },
  '20%': { transform: 'translate(-2px, 2px)', filter: 'hue-rotate(0deg)' },
  '40%': { transform: 'translate(2px, -2px)', filter: 'hue-rotate(15deg)' },
  '60%': { transform: 'translate(-1px, 1px)', filter: 'hue-rotate(-10deg)' },
  '80%': { transform: 'translate(1px, -1px)', filter: 'hue-rotate(5deg)' },
  '100%': { transform: 'translate(0)', filter: 'hue-rotate(0deg)' },
});

const healthPulse = keyframes({
  '0%': { boxShadow: `0 0 0 0 ${THEME.primary}99` },
  '70%': { boxShadow: `0 0 0 10px ${THEME.primary}00` },
  '100%': { boxShadow: `0 0 0 0 ${THEME.primary}00` },
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

  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${flicker} 8s infinite linear`,
  },

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

// --- ActionButton Props ---
interface ActionButtonProps {
  $isSelected?: boolean;
  $isCorrect?: boolean;
  $isWrong?: boolean;
  $isRevealed?: boolean;
  $isOther?: boolean;
}

// Helper to determine button styles based on state
const getButtonStyles = ({
  $isSelected,
  $isCorrect,
  $isWrong,
  $isRevealed,
  $isOther,
}: ActionButtonProps) => {
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
  if ($isRevealed && $isOther) {
    return {
      opacity: 0.4,
      filter: 'blur(1px)',
      cursor: 'default',
    };
  }
  if ($isSelected && !$isRevealed) {
    return {
      borderColor: THEME.primary,
      backgroundColor: THEME.primaryDim,
      color: THEME.primary,
    };
  }
  return {};
};

const ActionButton = styled(Button, {
  shouldForwardProp: (prop) =>
    !['$isSelected', '$isCorrect', '$isWrong', '$isRevealed', '$isOther'].includes(prop as string),
})<ActionButtonProps>((props) => ({
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

  ...(!props.$isRevealed && {
    '&:hover': {
      backgroundColor: THEME.bgHover,
      borderColor: THEME.primary,
      color: THEME.primary,
      transform: 'skewX(-2deg) scale(1.01)',
      boxShadow: `0 0 10px ${THEME.primary}33`,
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  }),
}));

const HealthBar = styled(LinearProgress)(() => ({
  height: 8,
  borderRadius: 0,
  backgroundColor: THEME.border,
  transition: 'value 0.5s ease-in-out',
  '.MuiLinearProgress-bar': {
    borderRadius: 0,
    backgroundImage: `linear-gradient(90deg, #00cc7a 0%, ${THEME.primary} 100%)`,
    boxShadow: `0 0 10px ${THEME.primary}99`,
    transition: 'transform 0.5s ease-in-out',
  },
}));

// --- Custom Hook for Keyboard Navigation ---
function useKeyboardNavigation(
  options: Option[],
  onSelect: (option: Option) => void,
  isDisabled: boolean
) {
  useEffect(() => {
    if (isDisabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toUpperCase();
      const found = options.find((opt) => opt.id === key);
      if (found) {
        e.preventDefault();
        onSelect(found);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, onSelect, isDisabled]);
}

function useSoundEffects() {
  const [audioCtx] = useState(() => new (window.AudioContext || (window as any).webkitAudioContext)());

  const playBeep = useCallback(() => {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.2);
    osc.start();
    osc.stop(now + 0.2);
  }, [audioCtx]);

  const playCorrect = useCallback(() => {
    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);
    osc1.frequency.value = 523.25; // C5
    osc2.frequency.value = 659.25; // E5
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.3);
    osc1.start();
    osc2.start();
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }, [audioCtx]);

  const playError = useCallback(() => {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.4);
    osc.start();
    osc.stop(now + 0.4);
  }, [audioCtx]);

  return { playBeep, playCorrect, playError };
}

// --- Particle Effect Component ---
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  velocityX: number;
  velocityY: number;
  life: number;
}

const ParticleEffect = memo(function ParticleEffect({ 
  active, 
  position, 
  color,
  onComplete 
}: { 
  active: boolean; 
  position: { x: number; y: number }; 
  color: string;
  onComplete?: () => void;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!active) return;

    // Create 20 particles
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: position.x,
      y: position.y,
      size: Math.random() * 6 + 2,
      color,
      velocityX: (Math.random() - 0.5) * 8,
      velocityY: (Math.random() - 0.5) * 8 - 4,
      life: 1,
    }));
    setParticles(newParticles);

    let startTime = performance.now();
    const duration = 500;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      if (t >= 1) {
        setParticles([]);
        onComplete?.();
        return;
      }

      setParticles(prev =>
        prev.map(p => ({
          ...p,
          x: p.x + p.velocityX,
          y: p.y + p.velocityY,
          life: 1 - t,
        }))
      );
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [active, position, color, onComplete]);

  if (!active || particles.length === 0) return null;

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
      {particles.map(p => (
        <Box
          key={p.id}
          sx={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: '50%',
            opacity: p.life,
            transform: `scale(${1 - p.life * 0.5})`,
            transition: 'opacity 0.02s linear',
          }}
        />
      ))}
    </Box>
  );
});

function useTypingAnimation(text: string | null, active: boolean, speed = 50) {
  const [displayText, setDisplayText] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!active || !text) {
      setDisplayText('');
      return;
    }

    let index = 0;
    const type = () => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
        timeoutRef.current = setTimeout(type, speed);
      }
    };
    type();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, active, speed]);

  return displayText;
}

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

// Default options as a constant to avoid re-creation
const DEFAULT_OPTIONS: Option[] = [
  { id: 'A', text: '0x04', isCorrect: false },
  { id: 'B', text: '4', isCorrect: true },
  { id: 'C', text: 'SEGMENTATION FAULT', isCorrect: false },
];

// --- Main Component ---
const QuizCard = memo(function QuizCard({
  level = 'LEVEL 01 - SYSTEM BREACH',
  question = 'IDENTIFY THE CORRECT OUTPUT: ECHO $((2 + 2))',
  options: externalOptions,
  health: rawHealth = 85,
  onAnswer,
}: QuizCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [particlePosition, setParticlePosition] = useState({ x: 0, y: 0 });
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [glitchActive, setGlitchActive] = useState(false);
  const [healthBarPulse, setHealthBarPulse] = useState(false);

  const health = Math.min(100, Math.max(0, rawHealth));

  const currentOptions = useMemo(
    () => (externalOptions && externalOptions.length > 0 ? externalOptions : DEFAULT_OPTIONS),
    [externalOptions]
  );

  // Reset state on question/options change
  useEffect(() => {
    setSelectedAnswer(null);
    setIsRevealed(false);
    setShowParticles(false);
    setFlashColor(null);
    setGlitchActive(false);
  }, [question, currentOptions]);

  const onAnswerRef = useRef(onAnswer);
  useEffect(() => {
    onAnswerRef.current = onAnswer;
  }, [onAnswer]);

  const { playBeep, playCorrect, playError } = useSoundEffects();

  // Trigger visual effects and sound on answer
  const handleSelect = useCallback(
    (option: Option, event?: React.MouseEvent<HTMLElement>) => {
      if (isRevealed) return;

      // Play selection beep
      playBeep();

      // Set particle position: use click coordinates if available, otherwise fallback to button center
      if (event) {
        setParticlePosition({ x: event.clientX, y: event.clientY });
      } else {
        // Keyboard fallback – get the corresponding button's position (optional)
        // We'll just use screen center or button center via a ref. For simplicity, center of viewport.
        setParticlePosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }

      setSelectedAnswer(option.id);
      setIsRevealed(true);

      // Trigger card glitch
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 300);

      // Determine correct/wrong and play sound, flash
      const isCorrect = option.isCorrect;
      if (isCorrect) {
        playCorrect();
        setFlashColor(THEME.primary);
      } else {
        playError();
        setFlashColor(THEME.error);
      }
      setTimeout(() => setFlashColor(null), 200);

      // Trigger health bar pulse
      setHealthBarPulse(true);
      setTimeout(() => setHealthBarPulse(false), 300);

      // Show particles after a tiny delay (to coincide with sound)
      setTimeout(() => setShowParticles(true), 50);
      setTimeout(() => setShowParticles(false), 550); // particles last 500ms

      if (onAnswerRef.current) {
        onAnswerRef.current(option);
      }
    },
    [isRevealed, playBeep, playCorrect, playError]
  );



  // Keyboard navigation
  const systemMessageRaw = useMemo(() => {
    if (!isRevealed) return null;
    const selected = currentOptions.find((o) => o.id === selectedAnswer);
    if (selected?.isCorrect) return 'ACCESS GRANTED';
    return 'SYSTEM FAILURE';
  }, [isRevealed, selectedAnswer, currentOptions]);

  const typedMessage = useTypingAnimation(systemMessageRaw, isRevealed, 60);
  const resultColor = systemMessageRaw === 'ACCESS GRANTED' ? THEME.primary : THEME.error;

  // Keyboard navigation
  useKeyboardNavigation(currentOptions, handleSelect, isRevealed);

  const liveRegionId = useId();

  return (
    <>
      {/* Screen Flash Overlay */}
      {flashColor && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: flashColor,
            pointerEvents: 'none',
            zIndex: 9998,
            animation: `${flash} 0.2s ease-out forwards`,
          }}
        />
      )}

      {/* Particle Effect */}
      <ParticleEffect
        active={showParticles}
        position={particlePosition}
        color={systemMessageRaw === 'ACCESS GRANTED' ? THEME.primary : THEME.error}
        onComplete={() => setShowParticles(false)}
      />

      <TerminalCard
        sx={{
          ...(glitchActive && {
            '@media (prefers-reduced-motion: no-preference)': {
              animation: `${cardGlitch} 0.3s ease-in-out`,
            },
          }),
        }}
      >
        {/* ... (live region unchanged) */}
        <div
          id={liveRegionId}
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
          }}
        >
          {systemMessageRaw ? `Result: ${systemMessageRaw}` : ''}
          {isRevealed ? 'Quiz interaction ended.' : ''}
        </div>

        <Box sx={{ px: 3, pt: 3, pb: 1, backgroundColor: 'rgba(0,0,0,0.3)', position: 'relative', zIndex: 1 }}>
          {/* ... header (level, HP) unchanged */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
            <Typography variant="overline" sx={{ color: THEME.primary, fontWeight: 'bold', letterSpacing: 3, fontSize: '0.7rem', textShadow: `0 0 5px ${THEME.primary}88` }}>
              {`// ${level}`}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                component="span"
                sx={{
                  width: 6,
                  height: 6,
                  bgcolor: THEME.primary,
                  borderRadius: '50%',
                  '@media (prefers-reduced-motion: no-preference)': {
                    animation: `${pulse} 1.5s infinite`,
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: THEME.textMuted, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                HP: {health}%
              </Typography>
            </Box>
          </Box>
          <HealthBar
            variant="determinate"
            value={health}
            aria-label="Player health"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={health}
            sx={{
              ...(healthBarPulse && {
                '@media (prefers-reduced-motion: no-preference)': {
                  animation: `${healthPulse} 0.3s ease-out`,
                },
              }),
            }}
          />
        </Box>

        <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
          {/* Question */}
          <Box sx={{ minHeight: '3em', mb: 3 }}>
            <Typography
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
                textShadow: `0 0 5px ${THEME.primary}66`,
                display: 'inline-block',
                '@media (prefers-reduced-motion: no-preference)': {
                  animation: `${glitch} 4s infinite linear`,
                },
              }}
            >
              <Box component="span" sx={{ color: THEME.primary, mr: 1, textShadow: `0 0 5px ${THEME.primary}` }}>
                {'>'}
              </Box>
              {question}
              <Box
                component="span"
                sx={{
                  borderLeft: `2px solid ${THEME.primary}`,
                  pl: 0.5,
                  ml: 0.5,
                  '@media (prefers-reduced-motion: no-preference)': {
                    animation: `${blink} 1s step-end infinite`,
                  },
                  display: 'inline-block',
                  height: '1.2em',
                  verticalAlign: 'text-bottom',
                }}
              />
            </Typography>
          </Box>

          {/* Options */}
          <Stack spacing={1.5}>
            {currentOptions.map((option) => {
              const isSelected = selectedAnswer === option.id;
              const isCorrect = option.isCorrect;
              const isWrong = isSelected && !isCorrect;
              const isOther = isRevealed && !isSelected;

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
                  onClick={(e) => handleSelect(option, e)}
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
                      transition: 'color 0.2s',
                    }}
                  >
                    {`[${option.id}]`}
                  </Typography>
                  {option.text}
                </ActionButton>
              );
            })}
          </Stack>

          {/* Result Message with Typing Effect */}
          <Fade in={isRevealed} timeout={300}>
            <Box sx={{ mt: 3, textAlign: 'center', minHeight: '3rem' }}>
              {typedMessage && (
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: resultColor,
                    textShadow: `0 0 10px ${resultColor}`,
                    letterSpacing: 2,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    '@media (prefers-reduced-motion: no-preference)': {
                      animation: `${glitch} 0.5s linear`,
                    },
                  }}
                >
                  {`> ${typedMessage}`}
                  {typedMessage.length !== systemMessageRaw?.length && (
                    <Box component="span" sx={{ borderLeft: `2px solid ${resultColor}`, ml: 0.5, animation: `${blink} 1s step-end infinite`, display: 'inline-block', height: '1.2em', verticalAlign: 'middle' }} />
                  )}
                </Typography>
              )}
            </Box>
          </Fade>
        </CardContent>

        {/* Footer unchanged */}
        <Box
          sx={{
            p: 1.5,
            bgcolor: '#050505',
            borderTop: `1px solid ${THEME.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
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
              textShadow: `0 0 3px ${THEME.primary}66`,
            }}
          >
            STATUS: ACTIVE
          </Typography>
        </Box>
      </TerminalCard>
    </>
  );
});

QuizCard.displayName = 'QuizCard';
export default QuizCard;