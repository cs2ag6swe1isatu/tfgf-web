/**
 * usePreloader — React hook that integrates AssetPreloader with
 * the app lifecycle.
 *
 * On mount, it preloads critical assets in priority order:
 *  1. Fonts (prevent FOIT on first render)
 *  2. Core UI images (avatars, bezels, cursors)
 *  3. Sound effect audio buffers
 *  4. Questions JSON (deferred until game start)
 *
 * Usage:
 *   const { ready, progress, stats, errors } = usePreloader();
 *   if (!ready) return <LoadingScreen progress={progress} />;
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { AssetPreloader } from '../utils/AssetPreloader';
import { publicAssetUrl } from '../utils/publicAssetUrl';

// ── Asset URL helpers ───────────────────────────────────────────
function assetUrl(rel: string): string {
  return publicAssetUrl(rel);
}

// ── Image inventory ────────────────────────────────────────────

/** All avatar image paths */
const AVATAR_FILES = [
  'Boy.png', 'Boy2.png', 'Detective.png', 'FarmerBoy.png', 'Girl.png',
  'Girl2.png', 'Glasses.png', 'Goblin.png', 'Kid1.png', 'Kid2.png',
  'Knight.png', 'Lady.png', 'Lady2.png', 'Lumberjack.png', 'old_man.png',
  'old_man2.png', 'Punk.png', 'Viking.png', 'Wizard1.png', 'Wizard2.png',
];

/** UI chrome images */
const UI_IMAGES = [
  'img/bezel.png',
  'img/bezel_gray.png',
  'img/bezel2.png',
  'img/bezel3.png',
  'img/hand.png',
  'img/pointer.png',
];

/** Particle images used by animations */
const PARTICLE_IMAGES = [
  'img/particles/bubble.png',
  'img/particles/question_mark.png',
];

/** Achievement badge images (loaded on-demand, but we cache actively-used ones) */
const ACHIEVEMENT_FILES = [
  'Apex Predator.png', 'Built Different.png', 'Champion.png',
  'Clutch King.png', 'Crowd Controller.png', 'Daily Grind.png',
  'Fast Hands.png', 'First Blood.png', 'Flawless Victory.png',
  'Git Gud.png', 'Hall of Fame.png', 'Host With The Most.png',
  'Jack of All Trades.png', 'Locked icon.png', 'Lone Wolf.png',
  'Mastermind.png', 'Nemesis.png', 'Party Up.png', 'Playing Favorites.png',
  'Podium Finish.png', 'Pog Champ.png', 'Point Hoarder.png',
  'Smooth Start.png', 'Smurfing.png', 'Solid Performance.png',
  'SpeedRunner.png', 'True Expert.png', 'Untouchable.png',
];

// ── Sound effect inventory ─────────────────────────────────────

const SFX_FILES = [
  'sounds/hover.mp3',
  'sounds/select.mp3',
  'sounds/tab.mp3',
  'sounds/back.mp3',
  'sounds/error.mp3',
  'sounds/JDSherbert - Pixel UI SFX Pack - Cancel 2 (Saw).mp3',
  'sounds/JDSherbert - Pixel UI SFX Pack - Cursor 1 (Saw).mp3',
  'sounds/JDSherbert - Pixel UI SFX Pack - Cursor 3 (Saw).mp3',
  'sounds/JDSherbert - Pixel UI SFX Pack - Select 2 (Saw).mp3',
];

// ── Font inventory ─────────────────────────────────────────────

const FONT_ASSETS = [
  {
    family: 'Press Start 2P',
    url: assetUrl('fonts/PressStart2P-Regular.ttf'),
  },
  {
    family: 'BoldPixels',
    url: assetUrl('fonts/BoldPixels.ttf'),
  },
];

// ── JSON data ───────────────────────────────────────────────────

const QUESTIONS_JSON_URL = assetUrl('data/Questions.json');
const LOADING_PLACEHOLDER_URL = assetUrl('data/UserProfile.sample.json');

// ── Priority levels ────────────────────────────────────────────
// Level 0: absolutely required before first paint (fonts)
// Level 1: visible on home screen (bezels, cursors, current avatar)
// Level 2: visible on all screens (hand/pointer cursors)
// Level 3: needed by end of loading screen (avatars)
// Level 4: background — not needed until user starts playing

export interface PreloaderState {
  ready: boolean;
  progress: number; // 0–100
  stage: string;
  stats: ReturnType<AssetPreloader['getStats']>;
}

export function usePreloader() {
  const preloader = useRef(AssetPreloader.getInstance());
  const [state, setState] = useState<PreloaderState>({
    ready: false,
    progress: 0,
    stage: 'Initializing...',
    stats: { images: 0, audioBuffers: 0, json: 0, errors: 0 },
  });
  const startedRef = useRef(false);

  const update = useCallback(
    (partial: Partial<PreloaderState>) => {
      setState((prev) => ({
        ...prev,
        ...partial,
        stats: preloader.current.getStats(),
      }));
    },
    [],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let overallProgress = 0;
    const stages = 5; // fonts + UI images + particles + avatars + question JSON
    const perStage = 100 / stages;

    const advanceProgress = (stageProgress: number, stageLabel: string) => {
      // stageProgress is 0-100 within this stage
      // We estimate overall by adding completed stage weight
      const stageContribution = perStage * (stageProgress / 100);
      const base = Math.floor(overallProgress + stageContribution);
      update({ progress: Math.min(base, 99), stage: stageLabel });
    };

    (async () => {
      const p = preloader.current;

      // ── Stage 1: Fonts (blocking — essential to prevent FOIT) ──
      update({ stage: 'Loading fonts...' });
      await p.preloadFonts(FONT_ASSETS, (pct) => {
        overallProgress = pct * (perStage / 100);
        advanceProgress(pct, 'Loading fonts...');
      });
      overallProgress = perStage;

      // ── Stage 2: Critical UI images ──
      update({ stage: 'Loading UI assets...', progress: Math.floor(overallProgress) });
      const uiUrls = [
        ...UI_IMAGES.map((f) => assetUrl(f)),
        ...PARTICLE_IMAGES.map((f) => assetUrl(f)),
      ];
      await p.preloadImages(uiUrls, (pct) => {
        advanceProgress(pct, 'Loading UI assets...');
      });
      overallProgress += perStage;

      // ── Stage 3: Avatar images (needed on settings/profile) ──
      update({ stage: 'Loading avatars...', progress: Math.floor(overallProgress) });
      const avatarUrls = AVATAR_FILES.map((f) => assetUrl(`img/avatars/${f}`));
      await p.preloadImages(avatarUrls, (pct) => {
        advanceProgress(pct, 'Loading avatars...');
      });
      overallProgress += perStage;

      // ── Stage 4: Prefetch Questions JSON (cache in RAM) ──
      update({ stage: 'Loading question data...', progress: Math.floor(overallProgress) });
      await p.preloadJSON(QUESTIONS_JSON_URL, (pct) => {
        advanceProgress(pct, 'Loading question data...');
      });
      overallProgress += perStage;

      // ── Stage 5: Achievement badge images (background) ──
      update({ stage: 'Loading achievement badges...', progress: Math.floor(overallProgress) });
      const achUrls = ACHIEVEMENT_FILES.map((f) =>
        assetUrl(`img/achievements/${f}`),
      );
      await p.preloadImages(achUrls, (pct) => {
        advanceProgress(pct, 'Loading achievement badges...');
      });
      overallProgress = 100;

      // ── Audio buffers are NOT preloaded here — they're lazily
      //     loaded on first user interaction to respect browser
      //     autoplay policies. AudioContext must be created after
      //     user gesture. The old HTMLAudioElement approach in
      //     App.tsx continues to work as a fallback, but when the
      //     user interacts (clicks Home screen), we upgrade to
      //     AudioBuffer-based playback.

      update({ ready: true, stage: 'Ready!', progress: 100 });
    })();
  }, [update]);

  return state;
}

// ── Lazily preload audio buffers after first user gesture ──────

let audioCtx: AudioContext | null = null;

/**
 * Call this once after the first user interaction (click/tap) to
 * upgrade audio from HTMLAudioElement → AudioBuffer (zero-latency).
 */
export async function lazyPreloadAudio(audioContext?: AudioContext) {
  const ctx =
    audioContext ??
    audioCtx ??
    new (window.AudioContext || (window as any).webkitAudioContext)();
  audioCtx = ctx;

  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const p = AssetPreloader.getInstance();
  const sfxUrls = SFX_FILES.map((f) => assetUrl(f));
  await p.preloadAudioBuffers(ctx, sfxUrls);

  return ctx;
}

/** Get the shared AudioContext (must be resumed after user gesture) */
export function getSharedAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Play a preloaded audio buffer via Web Audio API.
 * Falls back to HTMLAudioElement if buffer isn't cached.
 */
export function playPreloadedAudio(url: string, volume = 1, loop = false) {
  const p = AssetPreloader.getInstance();
  const buffer = p.getAudioBuffer(url);
  const ctx = audioCtx;

  if (buffer && ctx) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain).connect(ctx.destination);
    source.start(0);
    return { source, gain, ctx };
  }

  // Fallback: play via HTMLAudioElement
  const fallback = new Audio(url);
  fallback.volume = volume;
  fallback.loop = loop;
  fallback.play().catch((err) => {
    // Fallback playback failed — expected if AudioContext hasn't been resumed
    if (err.name !== 'NotAllowedError') {
      console.warn('playPreloadedAudio fallback failed:', err);
    }
  });
  return null;
}