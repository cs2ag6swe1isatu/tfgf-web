import { createTheme } from '@mui/material';
export const pixelTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  shape: {
    borderRadius: 0,
  },
  typography: {
    fontFamily: '"Courier New", Courier, monospace', 
    h5: {
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '0.1rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderWidth: '4px',
          '&:hover': {
            borderWidth: '4px',
          },
          boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
          textTransform: 'none',
        },
        contained: {
          backgroundColor: '#3f51b5',
          border: '4px solid #000',
        },
        outlined: {
          border: '4px solid #3f51b5',
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '4px solid #fff',
          backgroundColor: '#000',
        },
      },
    },
  },
});