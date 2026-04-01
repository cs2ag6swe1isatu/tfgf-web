import { Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const HomePage = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>

      <Box sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Box sx={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ textAlign: 'center', fontSize: '104px' }} variant="h1">Think Fast, Guess Faster</Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Button sx={{ backgroundColor: '#3BA527', width: '50%'}}
              onClick={() => setScreen("mode-select")}
            >
            <PlayArrowIcon sx={{ color: '#222' }} fontSize="large" />
          </Button>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', gap: 2, alignItems: 'center'}}>
          <Button
            fullWidth
            variant="outlined"
            color="primary"
            onClick={() => setScreen("settings")}
          >
            Settings
          </Button>

          <Button
            fullWidth
            variant="outlined"
            color="primary"
            onClick={() => setScreen("profile")}
          >
            Profile
          </Button>

          <Button
            fullWidth
            variant="outlined"
            color="primary"
            onClick={() => setScreen("standing")}
          >
            Standing
          </Button>
        </Box>

      </Box>
    </Box>
  );
};

export default HomePage;
