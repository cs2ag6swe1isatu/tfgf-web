import { useState, useEffect } from 'react';

export interface ResponsiveTokens {
  isCompact: boolean;
  isWvga: boolean;
  paddingLarge: string;
  paddingMedium: string;
  paddingSmall: string;
  gapLarge: string;
  gapMedium: string;
  gapSmall: string;
  fontSizeLarge: string;
  fontSizeMedium: string;
  fontSizeSmall: string;
  fontSizeTiny: string;
  avatarSize: string;
  avatarSizeSmall: string;
}

const COMPACT_WIDTH = 820;
const COMPACT_HEIGHT = 500;
const WVGA_WIDTH = 800;
const WVGA_HEIGHT = 480;

export const useResponsiveScale = (): ResponsiveTokens => {
  const [isCompact, setIsCompact] = useState(false);
  const [isWvga, setIsWvga] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsCompact(w <= COMPACT_WIDTH || h <= COMPACT_HEIGHT);
      setIsWvga(w <= WVGA_WIDTH && h <= WVGA_HEIGHT);
    };

    updateDimensions();
    const resizeListener = () => updateDimensions();
    window.addEventListener('resize', resizeListener);
    return () => window.removeEventListener('resize', resizeListener);
  }, []);

  // Return responsive token values based on breakpoint
  return {
    isCompact,
    isWvga,
    // Padding tokens
    paddingLarge: isCompact ? '12px 10px' : '24px 16px',
    paddingMedium: isCompact ? '10px 8px' : '14px 12px',
    paddingSmall: isCompact ? '6px 10px' : '8px 14px',
    // Gap tokens
    gapLarge: isCompact ? '10px' : '16px',
    gapMedium: isCompact ? '8px' : '12px',
    gapSmall: isCompact ? '6px' : '8px',
    // Font size tokens
    fontSizeLarge: isCompact ? '14px' : '18px',
    fontSizeMedium: isCompact ? '10px' : '13px',
    fontSizeSmall: isCompact ? '8px' : '9px',
    fontSizeTiny: isCompact ? '7px' : '8px',
    // Avatar sizes
    avatarSize: isCompact ? '28px' : '36px',
    avatarSizeSmall: isCompact ? '24px' : '28px',
  };
};

export default useResponsiveScale;
