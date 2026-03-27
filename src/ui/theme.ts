import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff9d',
    },
    secondary: {
      main: '#ffffff',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#39ff14',
      secondary: '#b0b0b0',
    },
  },
  typography: {
    fontFamily: 'pixelsboldpixels, sans-serif',
    h1: {
      fontSize: '4rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '3.5rem',
      fontWeight: 700,
    },
    h3: {
      fontSize: '3rem',
      fontWeight: 700,
    },
    h4: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h5: {
      fontSize: '2.25rem',
      fontWeight: 700,
    },
    h6: {
      fontSize: '2rem',
      fontWeight: 700,
    },
    body1: {
      fontSize: '2rem',
      fontWeight: 400,
    },
    body2: {
      fontSize: '1.75rem',
      fontWeight: 400,
    },
    caption: {
      fontSize: '1.5rem',
      fontWeight: 400,
    },
    button: {
      fontSize: '1.5rem',
      fontWeight: 700,
    },
  },
  components: {
   
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#252525',
        },
      },
    },
  },
});

export default theme;
