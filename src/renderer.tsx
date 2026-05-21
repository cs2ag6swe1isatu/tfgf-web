import React, { useEffect, useState } from 'react';
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, styled, keyframes } from "@mui/material";
import App from "./App";
import theme from "./ui/theme";
import "./index.css";
import { Cursor } from "./components/ui";
import { runSessionSummaryPageTester } from "./tests";

// (removed) mock multiplayer bridge import — mock was removed in refactor/stuff

import { useGameStore } from "./store/gameStore";

const CASE_COLOR = '#14271D';

// --- Animations ---
const crtFlicker = keyframes`
  0%   { opacity: 0.99; }
  50%  { opacity: 1; }
  100% { opacity: 0.99; }
`;

const scanlineRoll = keyframes`
  0% { top: -400px; }
  100% { top: 200%; }
`;

const ScreenContainer = styled('div')({
  position: 'relative',
  width: '100%',
  height: '100%',
  backgroundColor: '#000',
  overflow: 'hidden',
  'WebkitUserSelect': 'none',
  'MozUserSelect': 'none',
  'msUserSelect': 'none',
  'userSelect': 'none',
});

const ContentLayer = styled('div')({
  position: 'relative',
  zIndex: 0,
  width: '100%',
  height: '100%',
});

const EffectsLayer = styled('div')<{ $useScanlines: boolean; $useFlicker: boolean }>(
  ({ $useScanlines, $useFlicker }) => ({
    position: 'absolute',
    inset: 0,
    zIndex: 3,
    pointerEvents: 'none',

    // Static scanlines and vignette
    background: $useScanlines
      ? `linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%),
         radial-gradient(circle, transparent 40%, rgba(0,0,0,0.3) 100%)`
      : 'none',
    backgroundSize: '100% 4px, 100% 100%',

    animation: $useFlicker ? `${crtFlicker} 0.15s infinite` : 'none',

    // The moving scanline bar
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      width: '100%',
      height: '400px',
      background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.03), transparent)',
      animation: `${scanlineRoll} 10s linear infinite`,
      visibility: $useScanlines ? 'visible' : 'hidden',
    }
  })
);

const FillerLayer = styled('div')({
  position: 'absolute',
  inset: -1, // fix subpixel rendering issue
  zIndex: 4,
  pointerEvents: 'none',
  boxSizing: 'border-box',
  border: `15px solid ${CASE_COLOR}`,
  borderRadius: '40px',
  boxShadow: `0 0 0 100px ${CASE_COLOR}`,
  transform: 'translateZ(0)', // trying to fix subpixel rendering
});

const BezelLayer = styled('div')({
  position: 'absolute',
  inset: -1,
  zIndex: 5,
  pointerEvents: 'none',
  boxSizing: 'border-box',
  border: '40px solid transparent',
  borderImageSource: 'url(/img/bezel3.png)',
  borderImageSlice: 40,
  transform: 'translateZ(0)', // trying to fix subpixel rendering
});

export const RetroProcessor: React.FC<React.PropsWithChildren> = ({ children }) => {
  // Assuming these come from your store
  const settings = useGameStore((state) => state.settings);

  return (
    <ScreenContainer>
      <ContentLayer>
        {children}
      </ContentLayer>

      <EffectsLayer
        $useScanlines={settings.useScanlines}
        $useFlicker={settings.useFlicker}
      />

      {settings.useCase && <FillerLayer />}
      {settings.useCase && <BezelLayer />}
    </ScreenContainer>
  );
};

// reminder: modify window size in electron as well
// note: maintain relative height/width; use % instead of vw or vh in css
export const ResolutionFixer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width: targetW, height: targetH } = useGameStore((state) => state.resolution);
  const [scale, setScale] = useState(1);
  const settings = useGameStore((state) => state.settings);

  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / targetW;
      const scaleY = window.innerHeight / targetH;
      setScale(Math.min(scaleX, scaleY));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [targetW, targetH]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: settings.useCase ? CASE_COLOR : '#000',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <div style={{
        width: targetW,
        height: targetH,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
};

const rootElement = document.getElementById("root");

if (rootElement) {
  runSessionSummaryPageTester();

  const anyWindow = window as Window & { __react_root?: ReturnType<typeof createRoot> };
  if (!anyWindow.__react_root) {
    anyWindow.__react_root = createRoot(rootElement);
  }

  anyWindow.__react_root.render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ResolutionFixer>
      <RetroProcessor>
          <App />
      </RetroProcessor>
      </ResolutionFixer>
      <Cursor />
    </ThemeProvider>
  );

  const importMeta = import.meta as ImportMeta & { hot?: { dispose: (cb: () => void) => void } };
  if (importMeta.hot) {
    importMeta.hot.dispose(() => {
      if (anyWindow.__react_root) {
        try {
          anyWindow.__react_root.unmount();
        } catch (e) {
          console.warn("Hot reload unmount failed", e);
        }
        anyWindow.__react_root = undefined;
      }
    });
  }
}
