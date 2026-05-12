import React from 'react';
import { Box, Typography, Button, LinearProgress } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { useGameStore } from '../store/gameStore';
import { useTriviaStore } from '../store/triviaStore';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { usePlayerStore } from '../store/playerStore';

import { keyframes, styled } from '@mui/material/styles';

// ─── Keyframes (Keep these as you had them) ──────────────────────────────────
const scanline = keyframes`
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
`;

const flickerRed = keyframes`
  0%, 100% { text-shadow: 1px 1px 0 #FF6540, 3px 3px 0 #2B0909, 0 0 16px rgba(227,50,50,0.55); }
  8%  { text-shadow: 1px 1px 0 #FF6540, 3px 3px 0 #2B0909, 0 0 6px rgba(227,50,50,0.2); }
  9%  { text-shadow: 1px 1px 0 #FF6540, 3px 3px 0 #2B0909, 0 0 24px rgba(255,101,64,0.9); }
  41% { text-shadow: 1px 1px 0 #FF6540, 3px 3px 0 #2B0909, 0 0 4px rgba(227,50,50,0.15); }
  42% { text-shadow: 1px 1px 0 #FF6540, 3px 3px 0 #2B0909, 0 0 28px rgba(255,101,64,1); }
`;

const cyanPulse = keyframes`
  0%, 100% { box-shadow: 0 0 14px rgba(0,223,255,0.45), 0 0 28px rgba(0,223,255,0.2); }
  50%       { box-shadow: 0 0 24px rgba(0,223,255,0.7), 0 0 48px rgba(0,223,255,0.3); }
`;

const statGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(0,229,255,0.3); }
  50%       { box-shadow: 0 0 20px rgba(0,229,255,0.6); }
`;

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-36px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const starSpin = keyframes`
  0%   { transform: scale(0) rotate(-90deg); opacity: 0; }
  65%  { transform: scale(1.3) rotate(15deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const rankPop = keyframes`
  0%   { opacity: 0; transform: scale(0.65) translateY(10px); }
  70%  { transform: scale(1.1) translateY(-4px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

const btnHover = keyframes`
  0%, 100% { box-shadow: 0 0 12px rgba(0,223,255,0.4), 0 0 0 2px #00DFFF; }
  50%       { box-shadow: 0 0 24px rgba(0,223,255,0.75), 0 0 0 2px #00DFFF, 0 0 48px rgba(0,223,255,0.2); }
`;

// ─── Layout config ────────────────────────────────────────────────────────────

const LAYOUTS = {
  '1280x720': { w: 1280, h: 720,  header: 62, stat: 62, label: 15, btn: 18, pad: '34px 52px', statMinH: 168, gap: 22, rankTitle: 32 },
  '1152x768': { w: 1152, h: 768,  header: 60, stat: 60, label: 15, btn: 17, pad: '38px 48px', statMinH: 180, gap: 24, rankTitle: 30 },
  '1024x768': { w: 1024, h: 768,  header: 56, stat: 56, label: 14, btn: 16, pad: '36px 44px', statMinH: 170, gap: 22, rankTitle: 28 },
  '1024x600': { w: 1024, h: 600,  header: 42, stat: 44, label: 11, btn: 13, pad: '22px 40px', statMinH: 128, gap: 16, rankTitle: 22 },
  '600x600':  { w: 600,  h: 600,  header: 32, stat: 36, label: 10, btn: 11, pad: '20px 26px', statMinH: 108, gap: 14, rankTitle: 18 },
} as const;

type RatioKey = keyof typeof LAYOUTS;

function detectRatio(): RatioKey {
  if (typeof window === 'undefined') return '1024x768';
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw <= 600) return '600x600';
  if (vw <= 1024 && vh <= 600) return '1024x600';
  if (vw <= 1024) return '1024x768';
  if (vw <= 1152) return '1152x768';
  return '1280x720';
}

const ScaleRoot = styled(Box)({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  background: '#010707', // Darker black for the letterboxing
});

// ─── Component ────────────────────────────────────────────────────────────────

const SessionSummaryPage: React.FC = () => {
  const setScreen   = useGameStore((s) => s.setScreen);
  const score       = useTriviaStore((s) => (s as any).score ?? 0);
  const questions   = useTriviaStore((s) => s.questions);
  const userAnswers = useTriviaStore((s) => (s as any).userAnswers ?? {});
  
  // ─── ADDED THE SCALE HOOK ───
  const scale = useResponsiveScale(); // Base design is for 1280x720

  let playerRankTitle = 'STUDENT';
  try {
    playerRankTitle = usePlayerStore((s: any) => s?.getPlayer?.()?.rankTitle) ?? 'STUDENT';
  } catch (_) { }

  const L = LAYOUTS[detectRatio()];

  const totalQ    = questions.length;
  const correct   = questions.reduce(
    (acc: number, q: any, i: number) => acc + (userAnswers[i] === q.correctAnswer ? 1 : 0), 0
  );
  const accuracy  = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
  const rankProg  = accuracy;
  const xpGained  = score;

  return (
    <ScaleRoot>
      {/* ─── NEW SCALING WRAPPER BOX ─── */}
      <Box sx={{
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Box
          sx={{
            width:      `${L.w}px`,
            height:     `${L.h}px`,
            position:   'relative',
            flexShrink: 0,
            overflow:   'hidden',
            fontFamily: `'Press Start 2P', monospace`,
            background: `
              radial-gradient(ellipse at 50% 0%,
                #08235A 0%,
                #041D49 40%,
                #031533 75%,
                #062B2B 100%
              )
            `,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:         L.pad,
            boxSizing:      'border-box',

            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.09) 2px, rgba(0,0,0,0.09) 4px)`,
              pointerEvents: 'none',
              zIndex: 20,
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0, right: 0,
              height: '100px',
              background: 'linear-gradient(transparent, rgba(0,160,255,0.025) 50%, transparent)',
              animation: `${scanline} 7s linear infinite`,
              pointerEvents: 'none',
              zIndex: 21,
            },
          }}
        >
          {/* Vignette */}
          <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.7) 100%)', pointerEvents: 'none', zIndex: 19 }} />

          {/* HEADER */}
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 5, animation: `${slideDown} 0.55s cubic-bezier(0.22,1,0.36,1) both` }}>
            <Typography sx={{ fontFamily: `'Press Start 2P', monospace`, fontSize: `${L.header}px`, color: '#E33232', letterSpacing: '4px', textAlign: 'center', WebkitTextStroke: '1px #2B0909', textShadow: `1px 1px 0 #FF6540, 3px 3px 0 #2B0909, 0 0 16px rgba(227,50,50,0.55)`, animation: `${flickerRed} 5s ease-in-out 1.2s infinite`, userSelect: 'none' }}>
              GAME OVER !
            </Typography>
          </Box>

          {/* STATS */}
          <Box sx={{ width: '100%', border: '2.5px solid #00DFFF', borderRadius: '20px', background: '#072454', padding: `${L.gap}px`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${L.gap}px`, position: 'relative', zIndex: 5, animation: `${cyanPulse} 3.5s ease-in-out infinite, ${fadeIn} 0.5s ease 0.3s both` }}>
            <Box sx={{ border: '2.5px dashed #00E5FF', borderRadius: '14px', background: '#0A3766', minHeight: `${L.statMinH}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 14px', animation: `${statGlow} 3s ease-in-out infinite, ${fadeIn} 0.5s ease 0.4s both` }}>
              <Typography sx={{ fontFamily: `'Press Start 2P', monospace`, color: '#DADADA', fontSize: `${L.label}px`, mb: 2.5, textAlign: 'center' }}>YOUR SCORE</Typography>
              <Typography sx={{ fontFamily: `'Press Start 2P', monospace`, color: '#F0F0F0', fontSize: `${L.stat}px`, textShadow: '0 0 12px rgba(240,240,240,0.3)' }}>{score}</Typography>
            </Box>

            <Box sx={{ border: '2.5px dashed #00E5FF', borderRadius: '14px', background: '#0A3766', minHeight: `${L.statMinH}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 14px', animation: `${statGlow} 3s ease-in-out 0.4s infinite, ${fadeIn} 0.5s ease 0.5s both` }}>
              <Typography sx={{ fontFamily: `'Press Start 2P', monospace`, color: '#DADADA', fontSize: `${L.label}px`, mb: 2.5, textAlign: 'center' }}>XP GAINED</Typography>
              <Typography sx={{ fontFamily: `'Press Start 2P', monospace`, color: '#F0F0F0', fontSize: `${L.stat}px`, textShadow: '0 0 12px rgba(240,240,240,0.3)' }}>{xpGained}</Typography>
            </Box>
          </Box>

          {/* RANK PROGRESS */}
          <Box sx={{ width: '100%', background: '#4B5248', borderRadius: '16px', padding: `${L.gap}px ${L.gap + 6}px`, boxShadow: '0 6px 0 #2E332E', display: 'flex', flexDirection: 'column', gap: `${Math.round(L.gap * 0.55)}px`, position: 'relative', zIndex: 5, animation: `${slideUp} 0.55s cubic-bezier(0.22,1,0.36,1) 0.55s both` }}>
            <Typography sx={{ fontFamily: `'Press Start 2P', monospace`, color: '#E5E5E5', fontSize: `${L.label}px`, textAlign: 'center' }}>RANK PROGRESS</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: `${Math.round(L.gap * 0.55)}px` }}>
              <StarIcon sx={{ color: '#FFD42A', fontSize: `${Math.round(L.header * 0.58)}px`, animation: `${starSpin} 0.7s cubic-bezier(0.22,1,0.36,1) 0.75s both` }} />
              <Box sx={{ flex: 1 }}>
                <LinearProgress variant="determinate" value={rankProg} sx={{ height: `${Math.round(L.gap * 0.85)}px`, borderRadius: '99px', backgroundColor: '#3E443D', '& .MuiLinearProgress-bar': { backgroundColor: '#D9E600', borderRadius: '99px' } }} />
              </Box>
              <Typography sx={{ fontFamily: `'Press Start 2P', monospace`, color: '#E5E5E5', fontSize: `${Math.round(L.label * 0.85)}px`, minWidth: '52px', textAlign: 'right' }}>{rankProg}%</Typography>
            </Box>
            <Typography sx={{ fontFamily: `'Press Start 2P', monospace`, color: '#D9E600', fontSize: `${L.rankTitle}px`, textAlign: 'center', animation: `${rankPop} 0.65s cubic-bezier(0.22,1,0.36,1) 1s both` }}>{playerRankTitle}</Typography>
          </Box>

          {/* NAV BUTTONS */}
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: `${L.gap}px`, position: 'relative', zIndex: 5, animation: `${slideUp} 0.5s ease 0.8s both` }}>
            <Button onClick={() => setScreen('home')} sx={{ flex: 1, height: `${Math.round(L.gap * 3.3)}px`, borderRadius: '16px', background: '#0D4D73', border: '2px solid #00DFFF', boxShadow: '0 0 12px rgba(0,223,255,0.4)', transition: 'all 0.15s ease', '&:hover': { background: '#125C8A', animation: `${btnHover} 1s ease-in-out infinite` } }}>
              <Typography sx={{ fontFamily: `'Press Start 2P', monospace`, color: '#35E52B', fontSize: `${L.btn}px` }}>MAIN MENU</Typography>
            </Button>
            <Button onClick={() => setScreen('profile')} sx={{ flex: 1, height: `${Math.round(L.gap * 3.3)}px`, borderRadius: '16px', background: '#0D4D73', border: '2px solid #00DFFF', boxShadow: '0 0 12px rgba(0,223,255,0.4)', transition: 'all 0.15s ease', '&:hover': { background: '#125C8A', animation: `${btnHover} 1s ease-in-out infinite` } }}>
              <Typography sx={{ fontFamily: `'Press Start 2P', monospace`, color: '#35E52B', fontSize: `${L.btn}px` }}>VIEW PROFILE</Typography>
            </Button>
          </Box>
        </Box>
      </Box>
    </ScaleRoot>
  );
};

export default SessionSummaryPage;