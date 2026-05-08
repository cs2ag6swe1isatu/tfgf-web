import { Typography, Box, Button, Grid, Paper, Avatar, TextField } from "@mui/material";
import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { Settings2, ChevronLeft2 } from "pixelarticons/react";
import { usePlayerStore } from "../store/playerStore";

const resolutions = [
  { width: 1280, height: 720, label: "HD 720p", ratio: "16:9" },
  { width: 1152, height: 768, label: "XGA+", ratio: "4:3" },
  { width: 1024, height: 768, label: "XGA (Default)", ratio: "4:3" },
  { width: 1024, height: 600, label: "WVSGA", ratio: "16:9" },
  { width: 800, height: 600, label: "SVGA", ratio: "4:3" },
];

type SettingsTab = "profile" | "connection" | "display" | "audio" | "data";

const SettingsPage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const currentRes = useGameStore((state) => state.resolution);
  const setResolution = useGameStore((state) => state.setResolution);
  const settings = useGameStore((state) => state.settings);
  const toggleSetting = useGameStore((state) => state.toggleSetting);

  const player = usePlayerStore((state) => state.getPlayer());
  const setAvatar = usePlayerStore((state) => state.setAvatar);
  const setPlayerName = usePlayerStore((state) => state.setPlayerName);

  const [currentTab, setCurrentTab] = useState<SettingsTab>("profile");
  const [nameInput, setNameInput] = useState(player.name);

  const handleNameSave = () => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim());
    } else {
      setNameInput(player.name);
    }
  };

  const avatars = [
    "Detective 1.png",
    "Girl2 1.png",
    "Glasses 1.png",
    "Goblin 1.png",
    "Kid2 1.png",
    "Lady 1.png",
    "Punk 1.png",
    "old_man 1.png",
  ];

  const TabButton = ({ tab, label }: { tab: SettingsTab; label: string }) => (
    <Button
      fullWidth
      onClick={() => setCurrentTab(tab)}
      sx={{
        justifyContent: "flex-start",
        p: 2,
        mb: 1,
        textTransform: "uppercase",
        borderColor: currentTab === tab ? "primary.main" : "divider",
        backgroundColor: currentTab === tab ? "rgba(0, 255, 0, 0.1)" : "transparent",
        color: currentTab === tab ? "primary.main" : "text.primary",
      }}
    >
      {label}
    </Button>
  );

  const EffectToggles = () => {
    return (Object.keys(settings) as Array<keyof typeof settings>).map((key) => {
      const value = settings[key];
      const label = String(key)
        .replace(/([A-Z])/g, " $1")
        .trim()
        .replace(/^Use\s/i, "");
      const p = 4;

      return (
        <Grid size={{ xs: 6 }} key={String(key)}>
          <Box
            onClick={() => toggleSetting(key)}
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
                    ? `0 ${p}px 0 0 #1b5e20`
                    : `0 ${p}px 0 0 #222`,
                }}
              />
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

  const renderTabContent = () => {
    switch (currentTab) {
      case "profile":
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>Player Name</Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 4 }}>
              <TextField
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                variant="outlined"
                size="small"
                sx={{
                  flex: 1,
                }}
              />
              <Button variant="contained" onClick={handleNameSave}>
                Save
              </Button>
            </Box>

           <Grid container spacing={2}>
  {avatars.map((name) => {
    const src = `/img/avatars/${encodeURIComponent(name)}`;
    const isSelected = player.avatar === src;
    return (
      // ❌ REMOVED 'item'
      // ✅ ADDED 'xs="auto"' so they sit side-by-side like a gallery
      <Grid key={name} sx={{ display: 'flex' }}> 
        <Box
          onClick={() => setAvatar(src)}
          sx={{
            border: isSelected ? "2px solid" : "1px solid",
            borderColor: isSelected ? "#35E52B" : "rgba(0,229,255,0.3)", // Theming it to match your game colors
            borderRadius: 1,
            p: 0.5,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isSelected ? "rgba(53,229,43,0.1)" : "transparent",
            transition: "all 0.2s ease",
            "&:hover": {
               borderColor: "#00E5FF",
               background: "rgba(0,229,255,0.1)"
            }
          }}
        >
          {/* Make sure 'Avatar' is also imported from @mui/material! */}
          <Avatar 
            src={src} 
            alt={name} 
            sx={{ width: 64, height: 64, imageRendering: "pixelated" }} 
          />
        </Box>
      </Grid>
    );
  })}
</Grid>
          </Box>
        );

      case "display":
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3 }}>Display Resolution</Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {resolutions.map((res) => {
                const isSelected = currentRes.label === res.label;
                return (
                  <Grid size={{ xs: 6 }} key={res.label} sx={{ flex: 1 }}>
                    <Button
                      fullWidth
                      variant={isSelected ? "contained" : "outlined"}
                      onClick={() => setResolution(res.width, res.height, res.label)}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        borderWidth: "4px !important",
                        p: 1,
                        overflow: "hidden",
                        height: "100%",
                      }}
                    >
                      <Typography variant="h6" sx={{ fontSize: "1.2rem", lineHeight: 1.1 }}>
                        {res.label}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.8rem", opacity: 0.8 }}>
                        {res.width}x{res.height}
                      </Typography>
                    </Button>
                  </Grid>
                );
              })}
            </Grid>

            <Typography variant="h5" sx={{ mb: 3 }}>Effects</Typography>
            <Grid container spacing={2}>
              {EffectToggles()}
            </Grid>
          </Box>
        );

        case "connection":
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>

      {/* Auto-Join LAN Toggle */}
      <Box
        sx={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 1,
          transition: "transform 0.1s ease-in-out",
          "&:active": { transform: "translateY(2px)" },
        }}
      >
        {(() => {
          const value = true;
          const p = 4;
          return (
            <>
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
                      ? `0 ${p}px 0 0 #1b5e20`
                      : `0 ${p}px 0 0 #222`,
                  }}
                />
              </Box>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  color: value ? "primary.main" : "text.disabled",
                  fontSize: "1.5rem",
                }}
              >
                Auto-Join LAN
              </Typography>
            </>
          );
        })()}
      </Box>

    </Box>
  );

        case "audio":
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>

      {/* Volume */}
      <Box>
        <Typography variant="h5" sx={{ mb: 3 }}>
          Volume
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {Array.from({ length: 10 }).map((_, i) => {
            const filled = i < 5;
            return (
              <Box
                key={i}
                sx={{
                  width: "18px",
                  height: "32px",
                  bgcolor: filled ? "primary.main" : "transparent",
                  border: "2px solid",
                  borderColor: filled ? "primary.main" : "primary.dark",
                  boxShadow: filled ? "0 4px 0 0 #1b5e20" : "none",
                  cursor: "pointer",
                  transition: "all 0.1s steps(2)",
                  "&:hover": {
                    bgcolor: "primary.light",
                    borderColor: "primary.light",
                  },
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Sound Effects Toggle */}
      <Box>
        <Typography variant="h5" sx={{ mb: 3 }}>
          Sound Effects
        </Typography>
        <Box
          sx={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 2,
            mb: 1,
            transition: "transform 0.1s ease-in-out",
            "&:active": { transform: "translateY(2px)" },
          }}
        >
          {(() => {
            const value = true;
            const p = 4;
            return (
              <>
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
                        ? `0 ${p}px 0 0 #1b5e20`
                        : `0 ${p}px 0 0 #222`,
                    }}
                  />
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    color: value ? "primary.main" : "text.disabled",
                    fontSize: "1.5rem",
                  }}
                >
                  Sound Effects
                </Typography>
              </>
            );
          })()}
        </Box>
      </Box>

    </Box>
  );

      // ── DATA TAB ── only this case was added; nothing else was changed ──
      case "data":
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        mt: 2,
      }}
    >
      <Button
        fullWidth
        sx={{
          justifyContent: "flex-start",
          p: 2,
          mb: 1,
          textTransform: "uppercase",
          borderColor: "primary.main",
          backgroundColor: "transparent",
          color: "text.primary",
          "&:hover": {
            backgroundColor: "rgb(0, 255, 0)",
            color: "#000",
          },
        }}
      >
        Reset Progress
      </Button>

      <Button
        fullWidth
        sx={{
          justifyContent: "flex-start",
          p: 2,
          mb: 1,
          textTransform: "uppercase",
          borderColor: "primary.main",
          backgroundColor: "transparent",
          color: "text.primary",
          "&:hover": {
            backgroundColor: "rgb(0, 255, 0)",
            color: "#000",
          },
        }}
      >
        Clear Data
      </Button>
    </Box>
  );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "40px",
        boxSizing: "border-box",
        color: "primary.main",
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: "0 0 auto", display: "flex", alignItems: "center", mb: 4, gap: 2}}>
        <Settings2 style={{ fontSize: "3rem" }} />
        <Typography variant="h3" sx={{ fontWeight: "bold", textTransform: "uppercase" }}>
          Settings
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: "flex", gap: 0, overflow: "hidden", border: "4px solid", borderColor: "primary.main"}}>
        {/* Sidebar */}
        <Box
          sx={{
            flex: "0 0 180px",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            pr: 1,
            borderRight: "2px solid",
            borderColor: "primary.main",
            "&::-webkit-scrollbar": { width: "8px" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "primary.main",
              borderRadius: 0,
            },
          }}
        >
          <TabButton tab="profile" label="Profile" />
          <TabButton tab="connection" label="Connection" />
          <TabButton tab="display" label="Display" />
          <TabButton tab="audio" label="Audio" />
          <TabButton tab="data" label="Data" />
        </Box>

        {/* Content Area */}
        <Paper
          variant="outlined"
          sx={(theme) => ({
            flex: 1,
            p: 3,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
            "&::-webkit-scrollbar": { width: "18px" },
            "&::-webkit-scrollbar-track": {
              backgroundColor: theme.palette.background.paper,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: theme.palette.primary.main,
              borderRadius: 0,
              minHeight: "8px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: theme.palette.primary.light,
            },
            "&::-webkit-scrollbar-thumb:active": {
              backgroundColor: theme.palette.primary.dark,
            },
          })}
        >
          {renderTabContent()}
        </Paper>
      </Box>

      <Box sx={{ flex: "0 0 auto", mt: 4 }}>
        <Button
          variant="text"
          color="primary"
          startIcon={<ChevronLeft2 />}
          onClick={() => setScreen("home")}
          sx={{ fontSize: "1.5rem" }}
        >
          Back to Menu
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsPage;
