import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';

// Import the store and the state interface from your updated store file
import { useTriviaStore, TriviaState } from '../store/triviaStore'; 

const cyberQuizTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00FFD1', 
    },
    background: {
      default: '#121212', 
      paper: '#1E1E1E', 
    },
  },
  typography: {
    fontFamily: '"Fira Code", monospace, "SF Pro Display", sans-serif',
    h1: {
      fontWeight: 900,
      textShadow: '0 0 10px #00FFD1, 0 0 20px #00FFD1, 0 0 30px #00FFD1', 
      '@media (max-width:600px)': {
        fontSize: '2rem',
      },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          border: '2px solid #00FFD1',
          borderRadius: 0,
          textTransform: 'none',
          boxShadow: '0 0 5px rgba(0, 255, 209, 0.5)',
          '&:hover': {
            backgroundColor: 'rgba(0, 255, 209, 0.1)',
            boxShadow: '0 0 10px rgba(0, 255, 209, 0.8)',
          },
        },
      },
    },
  },
});

{
  // Use the TriviaState interface to fix the "implicit any" error [cite: 221]
  const setScreen = useTriviaStore((state: TriviaState) => state.setScreen);

  const decoElementStyle = {
    position: 'absolute',
    color: 'rgba(0, 255, 209, 0.3)', 
    pointerEvents: 'none',
  } as const;

  return (
    <ThemeProvider theme={cyberQuizTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundImage: 'linear-gradient(180deg, #121212 0%, #1E1E1E 100%)', 
          p: 4,
          position: 'relative',
        }}
      >
        {/* Decorative Elements */}
        <Box sx={{ ...decoElementStyle, top: '20%', left: '10%' }}>?</Box>
        <Box sx={{ ...decoElementStyle, top: '40%', right: '15%' }}>⚡</Box>
        <Box sx={{ ...decoElementStyle, bottom: '25%', left: '20%' }}>?</Box>
        <Box sx={{ ...decoElementStyle, top: '10%', right: '30%' }}>⚡</Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mt: '15vh',
            textAlign: 'center',
          }}
        >
          <Typography variant="h1" gutterBottom sx={{ fontSize: '3rem' }}>
            Think Fast,
            <br />
            Guess Faster
          </Typography>

          <IconButton
            onClick={() => setScreen('ModeSelectPage')} 
            color="primary"
            sx={{
              backgroundColor: '#00FFD1', 
              color: '#000', 
              mt: 6,
              width: 100,
              height: 100,
              '&:hover': {
                backgroundColor: 'rgba(0, 255, 209, 0.8)',
              },
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 60 }} />
          </IconButton>
        </Box>

        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          sx={{ width: '100%', mb: 2 }}
        >
          <Button startIcon={<SettingsIcon />} variant="outlined" onClick={() => setScreen('SettingsPage')}>
            Settings
          </Button>
          <Button startIcon={<AccountCircleIcon />} variant="outlined" onClick={() => setScreen('ProfilePage')}>
            Profile
          </Button>
          <Button startIcon={<LeaderboardIcon />} variant="outlined" onClick={() => setScreen('StandingPage')}>
            Standing
          </Button>
        </Stack>
      </Box>
    </ThemeProvider>
  );
};

export default HomePage;