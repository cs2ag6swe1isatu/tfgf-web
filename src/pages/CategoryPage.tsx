import { useState } from 'react';
import { Typography, Box, Button, Paper } from "@mui/material";
import Grid from "@mui/material/Grid"; 
import { useGameStore } from "../store/gameStore";
import { CATEGORIES, Category } from "../constants";
import { ChevronLeft2, ChevronRight2, ArrowLeft } from 'pixelarticons/react';

const ITEMS_PER_PAGE = 6;

// Exact Palette from your specifications
const COLORS = {
  bg: '#0F2A2A',         // Deep Teal/Cyan Background
  surface: '#1E1E1E',    // Dark Charcoal for cards
  neonGreen: '#39FF14',  // Active / Hover State
  cyan: '#4AD2D2',       // Idle / Border State
};

const CategoryPage = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(CATEGORIES.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const currentCategories = CATEGORIES.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const mode = useGameStore((state) => state.gameConfig.mode);
  const setCategory = useGameStore((state) => state.setCategory);
  const setScreen = useGameStore((state) => state.setScreen);
  const setScreenModal = useGameStore((state) => state.setModalScreen);

  const handleNext = () => currentPage < totalPages - 1 && setCurrentPage(p => p + 1);
  const handlePrev = () => currentPage > 0 && setCurrentPage(p => p - 1);

  const handleSelect = (category: Category) => {
    setCategory(category);
    mode === "solo" ? setScreen("difficulty") : setScreenModal(null);
  };

  // Integrated Navigation Logic
  const handleGoBack = () => {
    mode === "solo" ? setScreen("mode-select") : setScreenModal(null);
  };

  return (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      bgcolor: COLORS.bg, 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* RESPONSIVE CONTAINER */}
      <Box sx={{ 
        width: '100%',
        height: '100%',
        maxWidth: '1024px',
        maxHeight: '768px',
        bgcolor: COLORS.bg,
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
      }}>
        
        {/* EXACT FIGMA BACK BUTTON */}
        <Box sx={{ position: 'absolute', top: { xs: 16, sm: 30 }, left: { xs: 16, sm: 30 }, zIndex: 20 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowLeft style={{ fontSize: "16px" }} />}
            onClick={handleGoBack}
            sx={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: { xs: "9px", sm: "11px" },
              letterSpacing: "0.1em",
              color: COLORS.cyan,
              borderColor: COLORS.cyan,
              bgcolor: COLORS.surface,
              borderRadius: 0, // Pixel Aesthetic
              px: { xs: 2, sm: 3 },
              py: { xs: 1, sm: 1.2 },
              transition: "all 0.1s",
              "&:hover": {
                color: COLORS.surface,
                borderColor: COLORS.neonGreen,
                bgcolor: COLORS.neonGreen,
                // Hard pixel shadow & translate for physical button feel
                boxShadow: `4px 4px 0px ${COLORS.neonGreen}`, 
                transform: 'translate(-2px, -2px)',
              },
              "&:active": { transform: 'translate(0, 0)', boxShadow: 'none' }
            }}
          >
            BACK
          </Button>
        </Box>

        {/* HEADER SECTION */}
        <Box sx={{ pt: { xs: 10, sm: 12 }, pb: 4, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ 
            fontFamily: "'Press Start 2P', monospace", 
            fontSize: { xs: '20px', sm: '28px', md: '36px' },
            color: COLORS.neonGreen,
            textShadow: `3px 3px 0px ${COLORS.surface}` // Hard text shadow
          }}>
            SELECT CATEGORY
          </Typography>
        </Box>

        {/* MAIN CONTENT AREA */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          px: { xs: 2, sm: 6 }, 
          gap: { xs: 2, sm: 4 } 
        }}>
          
          {/* NAV LEFT */}
          <Button
            onClick={handlePrev}
            disabled={currentPage === 0}
            sx={{ 
              minWidth: { xs: '40px', sm: '60px' }, 
              height: { xs: '120px', sm: '180px' }, 
              bgcolor: COLORS.surface, 
              border: `2px solid ${COLORS.cyan}`,
              color: COLORS.cyan, 
              borderRadius: 0, 
              '&:hover': { bgcolor: COLORS.surface, color: COLORS.neonGreen, borderColor: COLORS.neonGreen },
              '&.Mui-disabled': { opacity: 0.3, borderColor: COLORS.cyan }
            }}
          >
            <ChevronLeft2 style={{ fontSize: '36px' }} />
          </Button>

          {/* GRID */}
          <Grid container spacing={{ xs: 3, sm: 4 }} sx={{ flex: 1, mt: 2 }}>
            {currentCategories.map((cat) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat}>
                <Paper
                  onClick={() => handleSelect(cat)}
                  elevation={0}
                  sx={{
                    height: { xs: '70px', sm: '110px', md: '130px' },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    borderRadius: 0, // Pixel Aesthetic
                    bgcolor: COLORS.surface,
                    border: `2px solid ${COLORS.cyan}`,
                    transition: 'all 0.1s',
                    position: 'relative',
                    overflow: 'visible', // Must be visible for folder tab

                    // THE FOLDER LOOK 
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: '-14px', // Stick out above the card
                      left: '-2px', // Align with left border
                      width: '45%',
                      height: '14px',
                      backgroundColor: COLORS.surface,
                      borderTop: `2px solid ${COLORS.cyan}`,
                      borderLeft: `2px solid ${COLORS.cyan}`,
                      borderRight: `2px solid ${COLORS.cyan}`,
                      borderBottom: 'none',
                      zIndex: 1,
                      transition: 'all 0.1s',
                    },
                    // Hide the card's top border under the tab
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: '-2px',
                      left: 0,
                      width: '45%',
                      height: '4px',
                      backgroundColor: COLORS.surface,
                      zIndex: 2,
                    },

                    '&:hover': {
                      borderColor: COLORS.neonGreen,
                      transform: 'translate(-4px, -4px)',
                      boxShadow: `4px 4px 0px ${COLORS.neonGreen}`, // Hard Shadow
                      '&::before': { borderColor: COLORS.neonGreen },
                      '& .cat-text': { color: COLORS.neonGreen }
                    },
                    '&:active': { transform: 'translate(0, 0)', boxShadow: 'none' }
                  }}
                >
                  <Typography className="cat-text" sx={{ 
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: { xs: '10px', sm: '12px', md: '14px' },
                    textAlign: 'center', 
                    px: 2,
                    color: COLORS.cyan,
                    lineHeight: 1.5,
                    transition: 'color 0.1s',
                    zIndex: 3 // Keep text above the pseudo-elements
                  }}>
                    {cat}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* NAV RIGHT */}
          <Button
            onClick={handleNext}
            disabled={currentPage === totalPages - 1}
            sx={{ 
              minWidth: { xs: '40px', sm: '60px' }, 
              height: { xs: '120px', sm: '180px' }, 
              bgcolor: COLORS.surface, 
              border: `2px solid ${COLORS.cyan}`,
              color: COLORS.cyan, 
              borderRadius: 0, 
              '&:hover': { bgcolor: COLORS.surface, color: COLORS.neonGreen, borderColor: COLORS.neonGreen },
              '&.Mui-disabled': { opacity: 0.3, borderColor: COLORS.cyan }
            }}
          >
            <ChevronRight2 style={{ fontSize: '36px' }} />
          </Button>
        </Box>

        {/* FOOTER PAGER */}
        <Box sx={{ pb: 4, display: 'flex', justifyContent: 'center' }}>
          <Typography sx={{ 
            fontFamily: "'Press Start 2P', monospace", 
            fontSize: { xs: '10px', sm: '12px' }, 
            color: COLORS.cyan,
            letterSpacing: '0.2em'
          }}>
            SECTOR {currentPage + 1}/{totalPages}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default CategoryPage;