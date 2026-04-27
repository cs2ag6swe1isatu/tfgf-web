import { createTheme, alpha } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
  }
}
declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    accent: true;
  }
}

const NEON_GREEN = '#34D216';
const PRIMARY_BLUE = '#00fefc';
const NEON_RED = '#FF073A';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: NEON_GREEN,
    },
    secondary: {
      main: PRIMARY_BLUE,
    },
    error: {
      main: NEON_RED,
    },
    background: {
      default: '#050505',
      paper: '#0a0a0a',
    },
    text: {
      primary: NEON_GREEN,
      secondary: alpha(NEON_GREEN, 0.7)
    },
  },
  typography: {
    fontFamily: '"pixelsboldpixels", "Courier New", monospace',
    allVariants: {
      fontSmooth: 'never',
      WebkitFontSmoothing: 'none',
      textTransform: 'uppercase',
      letterSpacing: '2px',
    },
    h1: { fontSize: '5rem', textShadow: `4px 4px 0px ${alpha(NEON_GREEN, 0.2)}`},
    h2: { fontSize: '3.5rem' },
    button: { fontSize: '1.25rem', fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          imageRendering: 'pixelated',
          backgroundColor: '#000',
          // Custom scrollbar to look like a retro terminal
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { background: '#000' },
          '&::-webkit-scrollbar-thumb': { background: NEON_GREEN },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme, ownerState }) => {
          const colorProp = ownerState.color || 'primary';
          const paletteColor = theme.palette[colorProp as keyof typeof theme.palette];
          const mainColor =
            typeof paletteColor === 'object' &&
            paletteColor !== null &&
            'main' in paletteColor &&
            typeof paletteColor.main === 'string'
              ? paletteColor.main
              : theme.palette.primary.main;
          const shadowColor = alpha(mainColor, 0.3);
          const hoverShadowColor = alpha(mainColor, 0.5);

          return {
            borderRadius: 0,
            border: `4px solid ${mainColor}`,
            padding: '12px 24px',
            position: 'relative',
            transition: 'none',

            boxShadow: `4px 4px 0px ${shadowColor}`,

            '&:hover': {
              backgroundColor: mainColor,
              color: '#000',
              border: `4px solid ${mainColor}`,
              boxShadow: `6px 6px 0px ${hoverShadowColor}`,
              '& .MuiTouchRipple-root': { color: '#000' },
            },
            '&:active': {
              transform: 'translate(2px, 2px)',
              boxShadow: `1px 1px 0px ${mainColor}`,
            },
          };
        },
      },
    },
    MuiTouchRipple: {
      styleOverrides: {
        root: {
          borderRadius: '0 !important',
          overflow: 'hidden !important',

          '& .MuiTouchRipple-child': {
            /* Stepped, axis-aligned polygon to simulate a pixelated circle */
            clipPath: `polygon(100.00% 50.00%, 100.00% 62.50%, 100.00% 75.00%, 87.50% 75.00%, 87.50% 87.50%, 75.00% 87.50%, 75.00% 100.00%, 62.50% 100.00%, 50.00% 100.00%, 37.50% 100.00%, 25.00% 100.00%, 25.00% 87.50%, 12.50% 87.50%, 12.50% 75.00%, 0.00% 75.00%, 0.00% 62.50%, 0.00% 50.00%, 0.00% 37.50%, 0.00% 25.00%, 12.50% 25.00%, 12.50% 12.50%, 25.00% 12.50%, 25.00% 0.00%, 37.50% 0.00%, 50.00% 0.00%, 62.50% 0.00%, 75.00% 0.00%, 75.00% 12.50%, 87.50% 12.50%, 87.50% 25.00%, 100.00% 25.00%, 100.00% 37.50%, 100.00% 50.00%)`,
            imageRendering: 'pixelated',
            borderRadius: '0 !important',
            opacity: '0.5 !important',
          },

          '& .MuiTouchRipple-rippleVisible': {
            // keep 24 fps
            animation: 'pixel-ripple 375ms steps(9) forwards !important', // close enough
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme, ownerState }) => {
          const isOutlined = ownerState.variant === 'outlined';
          const colorProp = ownerState.color || 'primary';
          const paletteColor = theme.palette[colorProp as keyof typeof theme.palette];
          const filledBackground =
            typeof paletteColor === 'object' &&
            paletteColor !== null &&
            'main' in paletteColor &&
            typeof paletteColor.main === 'string'
              ? paletteColor.main
              : theme.palette.primary.main;
          return {
            backgroundColor: isOutlined
              ? theme.palette.background.paper
              : filledBackground,
            color: isOutlined ? theme.palette.text.primary : '#000',
          };
        },
      },
    },
  },
});

export default theme;
