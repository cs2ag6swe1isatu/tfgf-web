import React, { useState } from 'react';
import { Container, Typography, Box, Button} from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { CATEGORIES, Category } from "../constants";
import { ChevronLeft2, ChevronRight2 } from 'pixelarticons/react';

const ITEMS_PER_PAGE = 6;

const CategoryPage = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(CATEGORIES.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const currentCategories = CATEGORIES.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleNext = () => {
    if (currentPage < totalPages - 1) setCurrentPage(p => p + 1);
  };

  const handleBackPage = () => {
    if (currentPage > 0) setCurrentPage(p => p - 1);
  };

  const mode = useGameStore((state) => state.gameConfig.mode);
  const setCategory = useGameStore((state) => state.setCategory);
  const setScreen = useGameStore((state) => state.setScreen);

  const handleSelect = (category: Category) => {
    setCategory(category);
    if(mode === "solo") {
      setScreen("difficulty");
    } else if(mode === "multiplayer") {
      setScreen("multiplayer-lobby");
    }
  };

  const handleBack = () => {
    if(mode === "solo") {
      setScreen("mode-select");
    } else if(mode === "multiplayer") {
      setScreen("multiplayer-lobby");
    }
  }

  return (
    <Box sx={{
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateRows: "1fr 3fr 1fr",
      padding: "40px",
      boxSizing: "border-box",
      position: "relative"
    }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Typography variant="h1" sx={{ fontWeight: "bold", mb: 1 }}>
          Select Category
        </Typography>
        <Typography variant="caption" color="primary" sx={{ fontSize: '1.5rem' }}>
          PAGE {currentPage + 1} / {totalPages}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          height: "100%",
          mb: 4
        }}
      >
        {/* Navigation: Left */}
        <Button
          variant="outlined"
          onClick={handleBackPage}
          disabled={currentPage === 0}
          sx={{
            minWidth: "80px",
            height: "150px",
            borderWidth: "4px !important",
          }}
        >
          <ChevronLeft2 style={{ fontSize: '3rem' }} />
        </Button>

        {/* The Category Grid */}
        <Box
          sx={{
            flex: 1,
            height: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: 3,
          }}
        >
          {currentCategories.map((cat) => (
            <Button
              key={cat}
              variant="contained"
              color="primary"
              onClick={() => handleSelect(cat)}
              sx={{
                fontSize: "1.5rem",
                p: 2,
                textAlign: 'center',
                lineHeight: 1.2
              }}
            >
              {cat}
            </Button>
          ))}

          {currentCategories.length < ITEMS_PER_PAGE &&
            Array.from({ length: ITEMS_PER_PAGE - currentCategories.length }).map((_, i) => (
              <Box
                key={`empty-${i}`}
                sx={{
                  border: "4px dashed",
                  borderColor: "rgba(57, 255, 20, 0.1)",
                  backgroundColor: "rgba(0,0,0,0.2)",
                }}
              />
            ))}
        </Box>

        {/* Navigation: Right */}
        <Button
          variant="outlined"
          onClick={handleNext}
          disabled={currentPage === totalPages - 1}
          sx={{
            minWidth: "80px",
            height: "150px",
            borderWidth: "4px !important",
          }}
        >
          <ChevronRight2 style={{ fontSize: '3rem' }} />
        </Button>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "right",
          alignItems: "center",
        }}
      >
        <Button
          sx={{ width: "25%" }}
          variant="text"
          color="primary"
          onClick={() => handleBack()}
        >
          Back
        </Button>
      </Box>
    </Box>
  );
};

export default CategoryPage;
