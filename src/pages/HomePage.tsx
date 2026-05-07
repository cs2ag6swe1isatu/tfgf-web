import { useEffect, useRef, useState } from "react";
import { Typography, Box, Button } from "@mui/material";
import { useGameStore } from "../store/gameStore";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { SettingsCog2, UserSharp, Crown } from "pixelarticons/react";

type Particle = {
  id: number;
  left: number;
  top: number;
  size: number;
  rotation: number;
  driftX: number;
  driftY: number;
  duration: number;
};

type BubbleParticle = {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
};

const PARTICLE_SPRITE = "/img/particles/question_mark.png";
const BUBBLE_SPRITE = "/img/particles/bubble.png";
const MAX_BUBBLES = 8;

const createParticle = (id: number): Particle => {
  const size = 20 + Math.random() * 44;

  return {
    id,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size,
    rotation: Math.random() * 360,
    driftX: (Math.random() - 0.5) * 120,
    driftY: -40 - Math.random() * 90,
    duration: 3200 + Math.random() * 2400,
  };
};

const createBubble = (id: number): BubbleParticle => {
  const size = 16 + Math.random() * 28;

  return {
    id,
    left: Math.random() * 100,
    top: 100 + Math.random() * 20,
    size,
    duration: 5600 + Math.random() * 2800,
  };
};

const HomePage = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const nextParticleId = useRef(0);
  const nextBubbleId = useRef(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bubbles, setBubbles] = useState<BubbleParticle[]>([]);

  useEffect(() => {
    const spawnParticle = () => {
      const id = nextParticleId.current += 1;
      setParticles((current) => [...current, createParticle(id)]);
    };

    for (let i = 0; i < 6; i += 1) {
      spawnParticle();
    }

    const intervalId = window.setInterval(spawnParticle, 650);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const spawnBubble = () => {
      setBubbles((current) => {
        if (current.length >= MAX_BUBBLES) {
          return current;
        }
        const id = nextBubbleId.current += 1;
        return [...current, createBubble(id)];
      });
    };

    for (let i = 0; i < MAX_BUBBLES; i += 1) {
      spawnBubble();
    }

    const intervalId = window.setInterval(spawnBubble, 1200);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'background.default'
    }}>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        {/* Bubbles (slower, floating) */}
        {bubbles.map((bubble) => (
          <Box
            key={`bubble-${bubble.id}`}
            onAnimationEnd={() => {
              setBubbles((current) => current.filter((item) => item.id !== bubble.id));
            }}
            sx={{
              position: 'absolute',
              left: `${bubble.left}%`,
              top: `${bubble.top}%`,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              transformOrigin: 'center',
              animation: `bubble-float ${bubble.duration}ms ease-in-out forwards`,
            }}
          >
            <Box
              component="img"
              src={BUBBLE_SPRITE}
              alt=""
              sx={{
                width: '100%',
                height: '100%',
                display: 'block',
                imageRendering: 'pixelated',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </Box>
        ))}

        {/* Question marks (burst effect) */}
        {particles.map((particle) => (
          <Box
            key={`particle-${particle.id}`}
            onAnimationEnd={() => {
              setParticles((current) => current.filter((item) => item.id !== particle.id));
            }}
            sx={{
              position: 'absolute',
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              transformOrigin: 'center',
              animation: `question-particle-burst ${particle.duration}ms linear forwards`,
              ['--particle-rotation' as string]: `${particle.rotation}deg`,
              ['--particle-drift-x' as string]: `${particle.driftX}px`,
              ['--particle-drift-y' as string]: `${particle.driftY}px`,
            }}
          >
            <Box
              component="img"
              src={PARTICLE_SPRITE}
              alt=""
              sx={{
                width: '100%',
                height: '100%',
                display: 'block',
                imageRendering: 'pixelated',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </Box>
        ))}
      </Box>

      <Box sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
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
            <SettingsCog2 style={{ fontSize: "3rem", marginLeft: 10 }} />
            Settings
          </Button>

          <Button
            fullWidth
            variant="outlined"
            color="primary"
            onClick={() => setScreen("profile")}
          >
            <UserSharp style={{ fontSize: "3rem", marginLeft: 10 }} />
            Profile
          </Button>

          <Button
            fullWidth
            variant="outlined"
            color="primary"
            onClick={() => setScreen("standing")}
          >
            <Crown style={{ fontSize: "3rem", marginLeft: 10 }} />
            Standing
          </Button>
        </Box>

      </Box>
    </Box>
  );
};

export default HomePage;
