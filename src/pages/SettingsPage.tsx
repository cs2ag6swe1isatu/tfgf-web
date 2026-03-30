import { Typography, Box, Button, Grid, Paper, useTheme } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import { Settings2, ChevronLeft2 } from "pixelarticons/react";

const resolutions = [
  { width: 1280, height: 720, label: "HD 720p", ratio: "16:9" },
  { width: 1152, height: 768, label: "XGA+", ratio: "4:3" },
  { width: 1024, height: 768, label: "XGA (Default)", ratio: "4:3" },
  { width: 1024, height: 600, label: "WVSGA", ratio: "16:9" },
  { width: 800, height: 600, label: "SVGA", ratio: "4:3" },
];

const SettingsPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const currentRes = useGameStore((state) => state.resolution);
  const setResolution = useGameStore((state) => state.setResolution);
  const settings = useGameStore((state) => state.settings);
  const toggleSetting = useGameStore((state) => state.toggleSetting);

  const EffectToggles = () => {
    return Object.entries(settings).map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .trim()
        .replace(/^Use\s/i, "");
      const p = 4; // Pixel size for 3D effect

      return (
        <Grid item xs={6} key={key}>
          <Box
            onClick={() => toggleSetting(key as keyof VisualSettings)}
            sx={{
              cursor: "pointer",
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 1,
              transition: "transform 0.1s ease-in-out",
              "&:active": { transform: "translateY(2px)" },
            }}
          >
            {/* THE "LIGHT SWITCH" MECHANISM */}
            <Box
              sx={{
                width: "60px",
                height: "32px",
                bgcolor: "#1a1a1a",
                position: "relative",
                boxShadow: `
                  inset ${p}px ${p}px 0 0 rgba(0,0,0,0.8),
                  inset -${p}px -${p}px 0 0 rgba(255,255,255,0.05)
                `,
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: `${p}px`,
                  bottom: `${p}px`,
                  left: value ? "50%" : `${p}px`,
                  right: value ? `${p}px` : "50%",
                  bgcolor: value ? "success.main" : "#444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.1s steps(2)",
                  boxShadow: value
                    ? `0 ${p}px 0 0 #1b5e20` // ON shadow
                    : `0 ${p}px 0 0 #222`,   // OFF shadow
                }}
              >
              </Box>
            </Box>

            <Typography
              variant="body1"
              sx={{
                fontWeight: "bold",
                textTransform: "uppercase",
                color: value ? "primary.main" : "text.disabled",
              }}
            >
              {label}
            </Typography>
          </Box>
        </Grid>
      );
    });
  };

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px',
      boxSizing: 'border-box',
      color: 'primary.main',
      overflow: 'hidden'
    }}>

      <Box sx={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
        <Settings2 style={{ fontSize: '3rem' }} />
        <Typography variant="h3" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
          Settings
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{
        flex: 1,
        p: 3,
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderColor: 'primary.main',
        borderWidth: '4px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <Typography variant="h5" sx={{ mb: 3 }}>Display Resolution</Typography>

        <Grid container spacing={2} sx={{ flex: 1 }}>
          {resolutions.map((res) => {
            const isSelected = currentRes.label === res.label;
            return (
              <Grid item xs={6} key={res.label} sx={{ flex: 1, height: '100%', pb: '20px' }}>
                <Button
                  fullWidth
                  variant={isSelected ? "contained" : "outlined"}
                  onClick={() => setResolution(res.width, res.height, res.label)}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderWidth: '4px !important',
                    p: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Typography variant="h6" sx={{ fontSize: '1.2rem', lineHeight: 1.1 }}>
                    {res.label}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {res.width}x{res.height}
                  </Typography>
                </Button>
              </Grid>
            );
          })}
        </Grid>
        <Typography variant="h5" sx={{ mb: 3 }}>Effects</Typography>
        <Grid container spacing={2} sx={{ flex: 1 }}>
          {EffectToggles()}
        </Grid>
      </Paper>

      <Box sx={{ flex: '0 0 auto', mt: 4 }}>
        <Button
          variant="text"
          color="primary"
          startIcon={<ChevronLeft2 />}
          onClick={() => setScreen("home")}
          sx={{ fontSize: '1.5rem' }}
        >
          Back to Menu
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsPage;
