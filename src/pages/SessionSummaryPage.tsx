import React from 'react';
import { Box, Typography, Button, LinearProgress } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { useGameStore } from '../store/gameStore';
import { useTriviaStore } from '../store/triviaStore';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { usePlayerStore } from '../store/playerStore';
import { calculateXP, getLevelProgressPercent } from '../utils/progression';
import { keyframes, styled } from '@mui/material/styles';

// ─── Keyframes ────────────────────────────────────────────────────────────────

const scanline = keyframes`
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
`;

const flickerRed = keyframes`
  0%, 100% { text-shadow: 2px 2px 0 #FF6540, 4px 4px 0 #2B0909, 0 0 20px rgba(227,50,50,0.7); }
  8%  { text-shadow: 2px 2px 0 #FF6540, 4px 4px 0 #2B0909, 0 0 8px rgba(227,50,50,0.2); }
  9%  { text-shadow: 2px 2px 0 #FF6540, 4px 4px 0 #2B0909, 0 0 32px rgba(255,101,64,1); }
  41% { text-shadow: 2px 2px 0 #FF6540, 4px 4px 0 #2B0909, 0 0 5px rgba(227,50,50,0.15); }
  42% { text-shadow: 2px 2px 0 #FF6540, 4px 4px 0 #2B0909, 0 0 36px rgba(255,101,64,1); }
`;

const cyanPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 2px #00DFFF, 0 0 18px rgba(0,223,255,0.35), inset 0 0 24px rgba(0,223,255,0.06); }
  50%       { box-shadow: 0 0 0 2px #00DFFF, 0 0 36px rgba(0,223,255,0.6), inset 0 0 40px rgba(0,223,255,0.1); }
`;

const statGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 1.5px #00E5FF, 0 0 10px rgba(0,229,255,0.2), inset 0 0 16px rgba(0,229,255,0.04); }
  50%       { box-shadow: 0 0 0 1.5px #00E5FF, 0 0 22px rgba(0,229,255,0.5), inset 0 0 28px rgba(0,229,255,0.08); }
`;

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-40px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(32px); }
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
  70%  { transform: scale(1.12) translateY(-4px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

const btnHover = keyframes`
  0%, 100% { box-shadow: 0 0 0 2px #00DFFF, 0 0 16px rgba(0,223,255,0.45); }
  50%       { box-shadow: 0 0 0 2px #00DFFF, 0 0 32px rgba(0,223,255,0.8), 0 0 60px rgba(0,223,255,0.25); }
`;

const progressReveal = keyframes`
  from { opacity: 0; transform: scaleX(0); transform-origin: left; }
  to   { opacity: 1; transform: scaleX(1); transform-origin: left; }
`;

const achievePop = keyframes`
  0%   { opacity: 0; transform: scale(0.88) translateY(8px); }
  60%  { transform: scale(1.04) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

const greenPulse = keyframes`
  0%, 100% { text-shadow: 0 0 8px rgba(53,229,43,0.4), 0 0 16px rgba(53,229,43,0.2); }
  50%       { text-shadow: 0 0 16px rgba(53,229,43,0.8), 0 0 32px rgba(53,229,43,0.4); }
`;

// ─── Layout config ────────────────────────────────────────────────────────────

const LAYOUTS = {
  '1280x720': {
    w: 1280,
    h: 720,

    // Header
    header: 58,

    // Numbers
    stat: 54,

    // Labels
    label: 14,

    // Buttons
    btn: 18,

    // OUTER SCREEN PADDING
    // gives breathing room left/right
    pad: '30px 58px',

    // stat cards height
    statMinH: 150,

    // global spacing between sections
    gap: 24,

    rankTitle: 30,
  },

  '1152x768': {
    w: 1152,
    h: 768,
    header: 54,
    stat: 50,
    label: 13,
    btn: 17,
    pad: '28px 52px',
    statMinH: 145,
    gap: 22,
    rankTitle: 28,
  },

  '1024x768': {
    w: 1024,
    h: 768,
    header: 50,
    stat: 46,
    label: 12,
    btn: 16,
    pad: '24px 46px',
    statMinH: 138,
    gap: 20,
    rankTitle: 26,
  },

  '1024x600': {
    w: 1024,
    h: 600,
    header: 40,
    stat: 38,
    label: 10,
    btn: 13,
    pad: '18px 34px',
    statMinH: 118,
    gap: 16,
    rankTitle: 20,
  },

  '600x600': {
    w: 600,
    h: 600,
    header: 28,
    stat: 30,
    label: 9,
    btn: 11,
    pad: '16px 18px',
    statMinH: 95,
    gap: 12,
    rankTitle: 16,
  },
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
  overflow: 'auto',
  background: '#010707',
});

// ─── Component ────────────────────────────────────────────────────────────────

const SessionSummaryPage: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const score = useTriviaStore((s) => s.score ?? 0);
  const maxStreak = useTriviaStore((s) => s.maxStreak ?? 0);
  const questions = useTriviaStore((s) => s.questions);
  const userAnswers = useTriviaStore((s) => s.userAnswers ?? {});
  const scale = useResponsiveScale();
  const player = usePlayerStore((s) => s.getPlayer());
  const playerTotalXp = player.totalXp;

  let playerRankTitle = 'STUDENT';
  try {
    playerRankTitle = player.rankTitle ?? 'STUDENT';
  } catch (_) {}

  const L = LAYOUTS[detectRatio()];

  const totalQ = questions.length;
  const correct = questions.reduce(
    (acc: number, q: any, i: number) =>
      acc + (userAnswers[i] === q.correctAnswer ? 1 : 0),
    0
  );

  const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
  const xpGained = calculateXP(score, maxStreak);
  const rankProg = getLevelProgressPercent(playerTotalXp + xpGained);
  
  // Get actual time from most recent game session
  const mostRecentSession = player.gameHistory && player.gameHistory.length > 0 
    ? player.gameHistory[player.gameHistory.length - 1] 
    : null;
  const totalTimeSeconds = mostRecentSession?.timeTaken ?? (totalQ * 10);
  
  // Calculate average time per question
  const totalAnswered = totalQ > 0 ? totalQ : 1;
  const avgTimeSeconds = totalTimeSeconds / totalAnswered;
  const avgTimeDisplay = avgTimeSeconds.toFixed(1) + 's';

  const gridPad = Math.round(L.gap * 1.35);

  return (
    <ScaleRoot>
      <Box
        sx={{
          transform: `scale(${scale})`,
          transformOrigin: 'center top',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          width: `${L.w}px`,
        }}
      >
        <Box
          sx={{
            width: `${L.w}px`,
            height: `${L.h}px`,
            position: 'relative',
            overflowY: 'auto',
            overflowX: 'hidden',
            fontFamily: `'Press Start 2P', monospace`,
            background: `
              radial-gradient(ellipse at 50% 0%,
                #0A2A6E 0%,
                #061B52 30%,
                #041440 60%,
                #020D2E 80%,
                #030F1A 100%
              )
            `,
            display: 'flex',
            flexDirection: 'column',
            padding: L.pad,
            boxSizing: 'border-box',
            gap: `${L.gap}px`,
          }}
        >
          {/* HEADER */}
          <Typography
            sx={{
              fontSize: `${L.header}px`,
              textAlign: 'center',
              color: '#E33232',
              letterSpacing: '5px',
              lineHeight: 1.1,
              animation: `${flickerRed} 5s ease-in-out infinite`,
            }}
          >
            GAME OVER!
          </Typography>

          {/* STATS */}
          <Box
            sx={{
              width: '100%',
              border: '2px solid #00DFFF',
              borderRadius: '14px',
              padding: `${gridPad}px`,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: `${L.gap}px`,
              animation: `${cyanPulse} 3s ease-in-out infinite`,
              boxSizing: 'border-box',
            }}
          >
            {[
              ['YOUR SCORE', score],
              ['XP GAINED', xpGained],
              ['ACCURACY', `${accuracy}%`],
              [
                'TIME',
                `${Math.floor(totalTimeSeconds / 60)}:${(totalTimeSeconds % 60)
                  .toString()
                  .padStart(2, '0')}`,
              ],
              ['AVG TIME', avgTimeDisplay],
            ].map(([label, value], i) => (
              <Box
                key={label}
                sx={{
                  minHeight: `${L.statMinH}px`,
                  border: '1.5px dashed rgba(0,229,255,0.6)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px',
                  animation: `${statGlow} 3s ease-in-out ${i * 0.2}s infinite`,
                }}
              >
                <Typography sx={{ fontSize: `${L.label}px`, color: '#8ECFFF' }}>
                  {label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: `${L.stat}px`,
                    color: '#fff',
                    lineHeight: 1,
                  }}
                >
                  {value}
                </Typography>
                {label === 'AVG TIME' && (
                  <Typography sx={{ fontSize: `${Math.round(L.label * 0.75)}px`, color: '#8ECFFF' }}>
                    per question
                  </Typography>
                )}
              </Box>
            ))}
          </Box>

          {/* RANK */}
          <Box
            sx={{
              width: '100%',
              background: '#353A33',
              borderRadius: '12px',
              padding: `${L.gap}px`,
            }}
          >
            <Typography
              sx={{
                fontSize: `${L.label}px`,
                color: '#ddd',
                textAlign: 'center',
                mb: 1.2,
              }}
            >
              RANK PROGRESS
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <StarIcon
                sx={{
                  color: '#FFD42A',
                  fontSize: `${Math.round(L.header * 0.5)}px`,
                }}
              />

              <LinearProgress
                variant="determinate"
                value={rankProg}
                sx={{
                  flex: 1,
                  height: '14px',
                  borderRadius: '99px',
                  backgroundColor: '#1c1c1c',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#D9E600',
                    animation: `${progressReveal} 1s ease`,
                  },
                }}
              />

              <Typography
                sx={{
                  fontSize: `${Math.round(L.label * 0.85)}px`,
                  color: '#D9E600',
                  minWidth: '52px',
                  textAlign: 'right',
                }}
              >
                {rankProg}%
              </Typography>
            </Box>

            <Typography
              sx={{
                mt: 1.5,
                textAlign: 'center',
                fontSize: `${L.rankTitle}px`,
                color: '#D9E600',
                animation: `${rankPop} .6s ease`,
              }}
            >
              {playerRankTitle}
            </Typography>
          </Box>

          {/* ACHIEVEMENT */}
          <Box
            sx={{
              width: '100%',
              background: '#0D3B3B',
              borderRadius: '12px',
              padding: `${L.gap}px`,
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
            }}
          >
            <StarIcon
              sx={{
                color: '#35E52B',
                fontSize: `${Math.round(L.header * 0.5)}px`,
              }}
            />

            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: `${L.label}px`,
                  color: '#00DFFF',
                }}
              >
                ACHIEVEMENT UNLOCKED
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  fontSize: `${Math.round(L.stat * 0.55)}px`,
                  color: '#35E52B',
                  animation: `${greenPulse} 2.5s infinite`,
                }}
              >
                PARTY UP
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  fontSize: `${Math.round(L.label * 0.75)}px`,
                  color: '#8ECFFF',
                }}
              >
                Played your first multiplayer game!
              </Typography>
            </Box>
          </Box>

          {/* BUTTONS */}
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              gap: `${L.gap}px`,
              mt: 'auto',
            }}
          >
            <Button
              onClick={() => setScreen('home')}
              sx={{
                flex: 1,
                height: `${Math.round(L.gap * 3.1)}px`,
                border: '2px solid #00DFFF',
                background: '#0D4D73',
              }}
            >
              <Typography
                sx={{
                  fontSize: `${L.btn}px`,
                  color: '#35E52B',
                }}
              >
                MAIN MENU
              </Typography>
            </Button>

            <Button
              onClick={() => setScreen('profile')}
              sx={{
                flex: 1,
                height: `${Math.round(L.gap * 3.1)}px`,
                border: '2px solid #00DFFF',
                background: '#0D4D73',
              }}
            >
              <Typography
                sx={{
                  fontSize: `${L.btn}px`,
                  color: '#35E52B',
                }}
              >
                VIEW PROFILE
              </Typography>
            </Button>
          </Box>
        </Box>
      </Box>
    </ScaleRoot>
  );
};

export default SessionSummaryPage;