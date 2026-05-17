import React, { useRef, useState } from 'react';
import { Box, Typography, Button, LinearProgress, GlobalStyles } from '@mui/material';
import { useGameStore } from '../store/gameStore';
import { useTriviaStore } from '../store/triviaStore';
import { usePlayerStore } from '../store/playerStore';
import { getLevelProgressPercent } from '../utils/progression';
import { getLastXpGained } from '../progression/progressionRules';
import RankIcon, { RANK_ICON_KEYFRAMES, RANK_COLORS, getRankSymbolType } from '../components/ui/RankIcon';
import { keyframes, styled } from '@mui/material/styles';
import LevelProgressionScreen from './LevelProgressionScreen';
import RankProgressionScreen from './RankProgressionScreen';

// ─── Keyframes ────────────────────────────────────────────────────────────────

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

// ─── Root wrapper ─────────────────────────────────────────────────────────────

const ScaleRoot = styled(Box)({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  background: '#031533',
});

// ─── Rank milestone levels ────────────────────────────────────────────────────
const RANK_MILESTONE_LEVELS = [11, 21, 31, 41, 51, 61, 71, 81, 91];

// ─── Component ────────────────────────────────────────────────────────────────

const ResultPage: React.FC = () => {
  const setScreen             = useGameStore((s) => s.setScreen);
  const storedRes             = useGameStore((s) => s.resolution);
  const score                 = useTriviaStore((s) => s.score ?? 0);
  const questions             = useTriviaStore((s) => s.questions);
  const userAnswers           = useTriviaStore((s) => s.userAnswers ?? {});
  const playerTotalXp         = usePlayerStore((s) => s.getPlayer().totalXp);

  // ── XP / level computations (stable, computed once) ──────────────────────
  const xpGained      = getLastXpGained();
  const totalXpBefore = playerTotalXp - xpGained;
  const oldLevel      = Math.min(Math.floor(totalXpBefore / 1000) + 1, 100);
  const newLevel      = Math.min(Math.floor(playerTotalXp  / 1000) + 1, 100);

  const didLevelUp    = newLevel > oldLevel;

  // FIX: Capture rankMilestone in a ref on mount so it's stable across
  // the level→rank transition (plain const would be stale after re-render).
  const rankMilestoneRef = useRef<number | null>(
    RANK_MILESTONE_LEVELS.includes(newLevel) ? newLevel : null
  );
  const rankMilestone = rankMilestoneRef.current;

  // ── Sequential flow state ─────────────────────────────────────────────────
  // If leveled up → show level screen first.
  // If no level-up but somehow at a rank milestone → show rank screen directly.
  const [showLevelUp, setShowLevelUp] = useState<boolean>(() => didLevelUp);
  const [showRankUp,  setShowRankUp]  = useState<boolean>(() => !didLevelUp && rankMilestone !== null);

  // FIX: Use stable ref for rankMilestone in handler to avoid closure staleness.
  const handleLevelUpContinue = () => {
    setShowLevelUp(false);
    if (rankMilestoneRef.current !== null) {
      setShowRankUp(true);
    }
  };

  const handleRankUpContinue = () => {
    setShowRankUp(false);
  };

  // Pull rank / level data from player store
  const player          = usePlayerStore((s) => s.getPlayer());
  const playerRankTitle = player.rank.name.toUpperCase();
  const rankSymbolType  = getRankSymbolType(player.rank.name);
  const rankColors      = RANK_COLORS[rankSymbolType];

  // Compute layout from the user's stored resolution
  const base = {
    w: 1280, h: 720,
    header: 62, stat: 62, label: 15, btn: 18,
    padV: 34, padH: 52, statMinH: 168, gap: 22, rankTitle: 32,
  };

  const layoutScale = Math.min(storedRes.width / base.w, storedRes.height / base.h);

  const L = {
    w: storedRes.width,
    h: storedRes.height,
    header: Math.max(20, Math.round(base.header * layoutScale)),
    stat: Math.max(20, Math.round(base.stat * layoutScale)),
    label: Math.max(8, Math.round(base.label * layoutScale)),
    btn: Math.max(8, Math.round(base.btn * layoutScale)),
    pad: `${Math.max(10, Math.round(base.padV * layoutScale))}px ${Math.max(15, Math.round(base.padH * layoutScale))}px`,
    statMinH: Math.max(80, Math.round(base.statMinH * layoutScale)),
    gap: Math.max(8, Math.round(base.gap * layoutScale)),
    rankTitle: Math.max(16, Math.round(base.rankTitle * layoutScale)),
  } as const;

  const totalQ   = questions.length;
  const correct  = questions.reduce(
    (acc: number, q: any, i: number) =>
      acc + (userAnswers[i] === q.correctAnswer ? 1 : 0),
    0
  );
  const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
  const rankProg = getLevelProgressPercent(playerTotalXp);
  const avgTime  = useTriviaStore((s) => s.avgTime);

  // ── Overlay screens ───────────────────────────────────────────────────────

  if (showLevelUp) {
    return (
      <LevelProgressionScreen
        xp={playerTotalXp}
        previousXp={totalXpBefore}
        onContinue={handleLevelUpContinue}
      />
    );
  }

  if (showRankUp && rankMilestone !== null) {
    return (
      <RankProgressionScreen
        newLevel={rankMilestone}
        playerXp={playerTotalXp}
        onContinue={handleRankUpContinue}
      />
    );
  }

  // ── Result screen (final resting state) ──────────────────────────────────
  return (
    <ScaleRoot>
      <Box
        sx={{
          width:      '100%',
          height:     `100%`,
          position:   'relative',
          flexShrink: 0,
          overflow:   'hidden',
          fontFamily: `'Press Start 2P', monospace`,
          background: '#031533',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            `${L.gap}px`,
          padding:        L.pad,
          boxSizing:      'border-box',
        }}
      >
        {/* Rank icon keyframes */}
        <GlobalStyles styles={{ [RANK_ICON_KEYFRAMES]: {} }} />

        {/* ── GAME OVER HEADER ─────────────────────────────────────────── */}
        <Box sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          zIndex: 5,
          animation: `${slideDown} 0.55s cubic-bezier(0.22,1,0.36,1) both`,
          mb: `${Math.round(L.gap * 0.5)}px`,
        }}>
          <Typography sx={{
            fontFamily: `'Press Start 2P', monospace`,
            fontSize:   `${L.header}px`,
            color:      '#E33232',
            letterSpacing: '4px',
            textAlign:  'center',
            lineHeight: 1.2,
            userSelect: 'none',
          }}>
            GAME OVER !
          </Typography>
        </Box>

        {/* ── 2×2 STATS GRID ────────────────────────────────────────────── */}
        <Box sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: `${L.gap}px`,
          position: 'relative',
          zIndex: 5,
          animation: `${fadeIn} 0.5s ease 0.3s both`,
        }}>
          {/* YOUR SCORE */}
          <Box sx={{
            border: '2.5px dashed #00E5FF',
            borderRadius: '14px',
            background: '#0A3766',
            minHeight: `${L.statMinH}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px 14px',
          }}>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#DADADA',
              fontSize: `${L.label}px`,
              mb: 2.5,
              textAlign: 'center',
              letterSpacing: '1px',
            }}>
              YOUR SCORE
            </Typography>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#FFFFFF',
              fontSize: `${L.stat}px`,
              lineHeight: 1,
            }}>
              {score}
            </Typography>
          </Box>

          {/* XP GAINED */}
          <Box sx={{
            border: '2.5px dashed #00E5FF',
            borderRadius: '14px',
            background: '#0A3766',
            minHeight: `${L.statMinH}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px 14px',
          }}>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#DADADA',
              fontSize: `${L.label}px`,
              mb: 2.5,
              textAlign: 'center',
              letterSpacing: '1px',
            }}>
              XP GAINED
            </Typography>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#FFFFFF',
              fontSize: `${L.stat}px`,
              lineHeight: 1,
            }}>
              {xpGained}
            </Typography>
          </Box>

          {/* ACCURACY */}
          <Box sx={{
            border: '2.5px dashed #00E5FF',
            borderRadius: '14px',
            background: '#0A3766',
            minHeight: `${L.statMinH}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px 14px',
          }}>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#DADADA',
              fontSize: `${L.label}px`,
              mb: 2.5,
              textAlign: 'center',
              letterSpacing: '1px',
            }}>
              ACCURACY
            </Typography>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#FFFFFF',
              fontSize: `${L.stat}px`,
              lineHeight: 1,
              mb: 1.5,
            }}>
              {accuracy}%
            </Typography>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#A0A0A0',
              fontSize: `${Math.max(7, Math.round(L.label * 0.7))}px`,
              textAlign: 'center',
            }}>
              {correct} / {totalQ} CORRECT
            </Typography>
          </Box>

          {/* AVG TIME */}
          <Box sx={{
            border: '2.5px dashed #00E5FF',
            borderRadius: '14px',
            background: '#0A3766',
            minHeight: `${L.statMinH}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px 14px',
          }}>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#DADADA',
              fontSize: `${L.label}px`,
              mb: 2.5,
              textAlign: 'center',
              letterSpacing: '1px',
            }}>
              AVG TIME
            </Typography>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#FFFFFF',
              fontSize: `${L.stat}px`,
              lineHeight: 1,
              mb: 1.5,
            }}>
              {avgTime.toFixed(1)}s
            </Typography>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#A0A0A0',
              fontSize: `${Math.max(7, Math.round(L.label * 0.7))}px`,
              textAlign: 'center',
            }}>
              PER QUESTION
            </Typography>
          </Box>
        </Box>

        {/* ── RANK PROGRESS PANEL ────────────────────────────────────────── */}
        <Box sx={{
          width: '100%',
          background: '#0A1A3A',
          borderRadius: '16px',
          padding: `${Math.round(L.gap * 0.9)}px ${L.gap}px`,
          display: 'flex',
          alignItems: 'center',
          gap: `${Math.round(L.gap * 0.5)}px`,
          position: 'relative',
          zIndex: 5,
          animation: `${slideUp} 0.55s cubic-bezier(0.22,1,0.36,1) 0.55s both`,
        }}>
          {/* Left: LEVEL */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flexShrink: 0,
            minWidth: '70px',
          }}>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#A0A0A0',
              fontSize: `${Math.max(8, Math.round(L.label * 0.65))}px`,
              letterSpacing: '1px',
              mb: 0.5,
            }}>
              LEVEL
            </Typography>
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#FFFFFF',
              fontSize: `${Math.round(L.stat * 0.8)}px`,
              lineHeight: 1,
            }}>
              {player.level}
            </Typography>
          </Box>

          {/* Right: Rank info */}
          <Box sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: `${Math.round(L.gap * 0.35)}px`,
            minWidth: 0,
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              <Box sx={{
                background: '#8B3A8B',
                borderRadius: '20px',
                padding: '3px 12px',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                <Typography sx={{
                  fontFamily: `'Press Start 2P', monospace`,
                  color: '#FFFFFF',
                  fontSize: `${Math.max(6, Math.round(L.label * 0.5))}px`,
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                }}>
                  CURRENT RANK
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <RankIcon
                  type={rankSymbolType}
                  color={rankColors.primary}
                  glow={rankColors.glow}
                  size={Math.max(16, Math.round(L.rankTitle * 0.7))}
                  style={{ flexShrink: 0 }}
                />
                <Typography sx={{
                  fontFamily: `'Press Start 2P', monospace`,
                  color: rankColors.primary,
                  fontSize: `${Math.max(10, Math.round(L.rankTitle * 0.65))}px`,
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                }}>
                  {playerRankTitle}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ width: '100%' }}>
              <LinearProgress
                variant="determinate"
                value={rankProg}
                sx={{
                  height: `${Math.round(L.gap * 0.6)}px`,
                  borderRadius: '99px',
                  backgroundColor: '#1A2A4A',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#00E5FF',
                    borderRadius: '99px',
                  },
                }}
              />
            </Box>

            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#A0A0A0',
              fontSize: `${Math.max(6, Math.round(L.label * 0.5))}px`,
              letterSpacing: '0.5px',
            }}>
              {playerTotalXp} / {player.xpToNextLevel}
            </Typography>
          </Box>
        </Box>

        {/* ── NAV BUTTONS ──────────────────────────────────────────────── */}
        <Box sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          gap: `${L.gap}px`,
          position: 'relative',
          zIndex: 5,
          animation: `${slideUp} 0.5s ease 0.8s both`,
        }}>
          <Button
            onClick={() => setScreen('home')}
            disableRipple={false}
            sx={{
              flex: 1,
              height: `${Math.round(L.gap * 3.3)}px`,
              borderRadius: '16px',
              background: 'transparent',
              border: '2.5px solid #00DFFF',
              color: '#00DFFF',
              '&:hover': {
                background: 'rgba(0,223,255,0.1)',
                border: '2.5px solid #00DFFF',
              },
            }}
          >
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#00DFFF',
              fontSize: `${L.btn}px`,
              letterSpacing: '1.5px',
              userSelect: 'none',
            }}>
              MAIN MENU
            </Typography>
          </Button>

          <Button
            onClick={() => setScreen('profile')}
            disableRipple={false}
            sx={{
              flex: 1,
              height: `${Math.round(L.gap * 3.3)}px`,
              borderRadius: '16px',
              background: 'transparent',
              border: '2.5px solid #00DFFF',
              color: '#00DFFF',
              '&:hover': {
                background: 'rgba(0,223,255,0.1)',
                border: '2.5px solid #00DFFF',
              },
            }}
          >
            <Typography sx={{
              fontFamily: `'Press Start 2P', monospace`,
              color: '#00DFFF',
              fontSize: `${L.btn}px`,
              letterSpacing: '1.5px',
              userSelect: 'none',
            }}>
              VIEW PROFILE
            </Typography>
          </Button>
        </Box>
      </Box>
    </ScaleRoot>
  );
};

export default ResultPage;