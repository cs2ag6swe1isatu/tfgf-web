import React from 'react';

import {
  Box,
  Typography,
  Button,
  LinearProgress,
} from '@mui/material';

import StarIcon from '@mui/icons-material/Star';



import { useGameStore } from "../store/gameStore";
import { useTriviaStore } from "../store/triviaStore";

const ratioLayouts = {
  '1280x720': {
    containerWidth: '1280px',
    containerHeight: '720px',
    headerSize: '68px',
    statValue: '72px',
    buttonText: '24px',
  },

  '1152x768': {
    containerWidth: '1152px',
    containerHeight: '768px',
    headerSize: '64px',
    statValue: '68px',
    buttonText: '22px',
  },

  '1024x768': {
    containerWidth: '1024px',
    containerHeight: '768px',
    headerSize: '60px',
    statValue: '64px',
    buttonText: '20px',
  },

  '1024x600': {
    containerWidth: '1024px',
    containerHeight: '600px',
    headerSize: '52px',
    statValue: '56px',
    buttonText: '18px',
  },

  '600x600': {
    containerWidth: '600px',
    containerHeight: '600px',
    headerSize: '42px',
    statValue: '42px',
    buttonText: '16px',
  },
};

const DEFAULT_RATIO = '1024x768';

const ResultPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  const score = useTriviaStore((state) => state.score);
  const questions = useTriviaStore((state) => state.questions);
  const userAnswers = useTriviaStore((state) => state.userAnswers);

  const currentLayout = ratioLayouts[DEFAULT_RATIO];

  const totalQuestions = questions.length;

  const correctAnswers = questions.reduce(
    (total, question, index) => {
      return (
        total +
        (userAnswers[index] === question.correctAnswer
          ? 1
          : 0)
      );
    },
    0
  );

  const accuracy =
    totalQuestions > 0
      ? Math.round(
          (correctAnswers / totalQuestions) * 100
        )
      : 0;

  const xpGained = score;
  const rankProgress = accuracy;
  const rankTitle = 'STUDENT';

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',

        background: `
          radial-gradient(
            circle at top,
            #08235A 0%,
            #041D49 45%,
            #031533 100%
          )
        `,

        fontFamily: `'Press Start 2P', monospace`,
      }}
    >
      <Box
        sx={{
          width: {
            xs: '600px',
            sm: '1024px',
            md: currentLayout.containerWidth,
          },

          height: {
            xs: '600px',
            sm: currentLayout.containerHeight,
          },

          position: 'relative',

          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',

          padding: '42px',
          boxSizing: 'border-box',
        }}
      >
        {/* GAME OVER HEADER */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mt: 1,
          }}
        >
          <Typography
            sx={{
              fontFamily: `'Press Start 2P', monospace`,

              fontSize: {
                xs: '42px',
                sm: currentLayout.headerSize,
              },

              color: '#E33232',

              textShadow: `
                0px 0px 0px #2B0909,
                3px 3px 0px #2B0909,
                0px 0px 12px rgba(227,50,50,0.55)
              `,

              letterSpacing: '4px',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            GAME OVER !
          </Typography>
        </Box>

        {/* MAIN STATS PANEL */}
        <Box
          sx={{
            width: '100%',

            border: '3px solid #00DFFF',
            borderRadius: '22px',

            background: '#072454',

            boxShadow:
              '0 0 18px rgba(0,223,255,0.45)',

            padding: '24px',

            display: 'grid',

            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
            },

            gap: 3,
          }}
        >
          {/* SCORE */}
          <Box
            sx={{
              border: '3px dashed #00E5FF',
              borderRadius: '16px',

              background: '#0A3766',

              boxShadow:
                '0 0 12px rgba(0,229,255,0.3)',

              padding: 3,

              minHeight: '190px',

              display: 'flex',
              flexDirection: 'column',

              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography
              sx={{
                fontFamily: `'Press Start 2P', monospace`,

                color: '#DADADA',

                fontSize: {
                  xs: '12px',
                  sm: '16px',
                },

                mb: 3,
                textAlign: 'center',
              }}
            >
              YOUR SCORE
            </Typography>

            <Typography
              sx={{
                fontFamily: `'Press Start 2P', monospace`,

                color: '#F0F0F0',

                fontSize: {
                  xs: '42px',
                  sm: currentLayout.statValue,
                },

                lineHeight: 1,
              }}
            >
              {score}
            </Typography>
          </Box>

          {/* XP */}
          <Box
            sx={{
              border: '3px dashed #00E5FF',
              borderRadius: '16px',

              background: '#0A3766',

              boxShadow:
                '0 0 12px rgba(0,229,255,0.3)',

              padding: 3,

              minHeight: '190px',

              display: 'flex',
              flexDirection: 'column',

              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography
              sx={{
                fontFamily: `'Press Start 2P', monospace`,

                color: '#DADADA',

                fontSize: {
                  xs: '12px',
                  sm: '16px',
                },

                mb: 3,
                textAlign: 'center',
              }}
            >
              XP GAINED
            </Typography>

            <Typography
              sx={{
                fontFamily: `'Press Start 2P', monospace`,

                color: '#F0F0F0',

                fontSize: {
                  xs: '42px',
                  sm: currentLayout.statValue,
                },

                lineHeight: 1,
              }}
            >
              {xpGained}
            </Typography>
          </Box>
        </Box>

        {/* RANK PROGRESS */}
        <Box
          sx={{
            width: '100%',

            background: '#4B5248',

            borderRadius: '16px',

            padding: '24px',

            boxShadow: '0 8px 0 #2E332E',

            display: 'flex',
            flexDirection: 'column',

            gap: 3,
          }}
        >
          <Typography
            sx={{
              fontFamily: `'Press Start 2P', monospace`,

              color: '#E5E5E5',

              fontSize: {
                xs: '12px',
                sm: '16px',
              },

              textAlign: 'center',
            }}
          >
            RANK PROGRESS
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <StarIcon
              sx={{
                color: '#FFD42A',

                fontSize: {
                  xs: '28px',
                  sm: '38px',
                },

                filter:
                  'drop-shadow(0 0 8px rgba(255,212,42,0.5))',
              }}
            />

            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={rankProgress}
                sx={{
                  height: 20,

                  borderRadius: '10px',

                  backgroundColor: '#3E443D',

                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#D9E600',
                  },
                }}
              />
            </Box>

            <Typography
              sx={{
                fontFamily: `'Press Start 2P', monospace`,

                color: '#E5E5E5',

                fontSize: {
                  xs: '10px',
                  sm: '14px',
                },

                minWidth: '72px',
                textAlign: 'right',
              }}
            >
              {rankProgress}%
            </Typography>
          </Box>

          <Typography
            sx={{
              fontFamily: `'Press Start 2P', monospace`,

              color: '#D9E600',

              fontSize: {
                xs: '22px',
                sm: '34px',
              },

              textAlign: 'center',

              textShadow:
                '0 0 10px rgba(217,230,0,0.35)',

              letterSpacing: '2px',
            }}
          >
            {rankTitle}
          </Typography>
        </Box>

        {/* BUTTONS */}
        <Box
          sx={{
            width: '100%',

            display: 'flex',

            justifyContent: 'space-between',

            gap: 3,
            mt: 1,
          }}
        >
          <Button
            onClick={() => setScreen("home")}
            sx={{
              flex: 1,

              height: {
                xs: '70px',
                sm: '82px',
              },

              borderRadius: '18px',

              background: '#0D4D73',

              border: '2px solid #00DFFF',

              boxShadow:
                '0 0 12px rgba(0,223,255,0.4)',

              '&:hover': {
                background: '#12608F',
              },
            }}
          >
            <Typography
              sx={{
                fontFamily: `'Press Start 2P', monospace`,

                color: '#35E52B',

                fontSize: {
                  xs: '12px',
                  sm: currentLayout.buttonText,
                },

                textShadow:
                  '0 0 8px rgba(53,229,43,0.45)',
              }}
            >
              MAIN MENU
            </Typography>
          </Button>

          <Button
            onClick={() => setScreen("profile")}
            sx={{
              flex: 1,

              height: {
                xs: '70px',
                sm: '82px',
              },

              borderRadius: '18px',

              background: '#0D4D73',

              border: '2px solid #00DFFF',

              boxShadow:
                '0 0 12px rgba(0,223,255,0.4)',

              '&:hover': {
                background: '#12608F',
              },
            }}
          >
            <Typography
              sx={{
                fontFamily: `'Press Start 2P', monospace`,

                color: '#35E52B',

                fontSize: {
                  xs: '12px',
                  sm: currentLayout.buttonText,
                },

                textShadow:
                  '0 0 8px rgba(53,229,43,0.45)',
              }}
            >
              VIEW PROFILE
            </Typography>
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ResultPage;

