import { useState, useRef, useEffect, ReactNode } from "react";
import { useGameStore } from "../store/gameStore";
import { usePlayerStore, PlayerState } from "../store/playerStore";

const NEON = "#35E52B";
const CYAN = "#00E5FF";
const BG   = "#010707";

const avatars = [
  "Boy.png","Boy2.png","Detective.png","FarmerBoy.png","Girl.png",
  "Girl2.png","Glasses.png","Goblin.png","Kid1.png","Kid2.png",
  "Knight.png","Lady.png","Lumberjack.png","old_man.png","old_man2.png",
  "Punk.png","Viking.png","Wizard1.png","Wizard2.png",
];

const fallbackEmoji: Record<string, string> = {
  "Boy.png":"0","Boy2.png":"1","Detective.png":"2","FarmerBoy.png":"3",
  "Girl.png":"4","Girl2.png":"5","Glasses.png":"6","Goblin.png":"7",
  "Kid1.png":"8","Kid2.png":"9","Knight.png":"10","Lady.png":"11",
  "Lumberjack.png":"12","old_man.png":"13","old_man2.png":"14",
  "Punk.png":"15","Viking.png":"16","Wizard1.png":"17","Wizard2.png":"18",
};

type DataAction  = [string, () => void];
type SettingsTab = "PROFILE" | "CONNECTION" | "DISPLAY" | "AUDIO" | "DATA" | "CREDITS";
type SettingsView = {
  bgmEnabled: boolean; sfxEnabled: boolean; volume: number;
  useCase: boolean; useScanlines: boolean; useFlicker: boolean;
};

const resolutions = [
  { w: 1280, h: 720,  label: "HD 720P",       key: "HD 720p" },
  { w: 1152, h: 768,  label: "XGA+",          key: "XGA+"    },
  { w: 1024, h: 768,  label: "XGA (DEFAULT)", key: "XGA"     },
  { w: 1024, h: 600,  label: "WSVGA",         key: "WSVGA"   },
  { w: 800,  h: 600,  label: "SVGA",          key: "SVGA"    },
];

const TABS: SettingsTab[] = ["PROFILE","CONNECTION","DISPLAY","AUDIO","DATA","CREDITS"];

// ─── HELPER COMPONENTS ────────────────────────────────────

function AvatarImage({ fileName, selected, onClick, onHover }: {
  fileName: string; selected: boolean; onClick: () => void; onHover: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div
      onMouseEnter={() => { setIsHovered(true); onHover(); }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        width: 72, height: 72,
        border: selected ? `2px solid ${NEON}` : "1px solid #3A3A3A",
        background: selected ? "rgba(53,229,43,0.1)" : "#0a0f0a",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "transform 0.1s, box-shadow 0.2s",
        transform: isHovered ? "scale(1.05)" : selected ? "scale(0.95)" : "scale(1)",
        boxShadow: selected ? `0 0 12px rgba(53,229,43,0.5)` : isHovered ? `0 0 8px rgba(255,255,255,0.3)` : "none",
        overflow: "hidden",
      }}
    >
      {imgFailed ? (
        <span style={{ fontSize: 28 }}>{fallbackEmoji[fileName] ?? "❓"}</span>
      ) : (
        <img
          src={`./img/avatars/${encodeURIComponent(fileName)}`}
          alt={fileName}
          onError={() => setImgFailed(true)}
          style={{ width: 64, height: 64, imageRendering: "pixelated", objectFit: "contain" }}
        />
      )}
    </div>
  );
}

function DevCard({ name, file }: { name: string; file: string }) {
  const [hovered,   setHovered]   = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const font = "'Press Start 2P', monospace";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 90 }}
    >
      <div style={{
        width: 52, height: 52,
        border: `2px solid ${hovered ? NEON : CYAN}`,
        background: "#0a0f0a", overflow: "hidden",
        boxShadow: hovered
          ? `0 0 14px ${NEON}, 0 0 28px ${NEON}55`
          : `0 0 6px ${CYAN}44`,
        transition: "box-shadow 0.2s, border-color 0.2s",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {imgFailed ? (
          <span style={{ fontFamily: font, fontSize: 9, color: NEON }}>
            {name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </span>
        ) : (
          <img
            src={`./img/avatars/${encodeURIComponent(file)}`}
            alt={name}
            onError={() => setImgFailed(true)}
            style={{ width: 44, height: 44, imageRendering: "pixelated", objectFit: "contain" }}
          />
        )}
      </div>
      <span style={{
        fontFamily: font, fontSize: 6, color: hovered ? NEON : `${NEON}99`,
        textAlign: "center", letterSpacing: 0.3, lineHeight: 1.6,
        textShadow: hovered ? `0 0 6px ${NEON}` : "none",
        transition: "color 0.2s, text-shadow 0.2s", wordBreak: "break-word",
      }}>
        {name}
      </span>
    </div>
  );
}

function PixelToggle({ value, onToggle, onHover, label }: {
  value: boolean; onToggle: () => void; onHover: () => void; label: string;
}) {
  const p = 4;
  return (
    <div onClick={onToggle} onMouseEnter={onHover}
      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16, marginBottom: 12, userSelect: "none" }}
    >
      <div style={{
        width: 60, height: 28, background: "#1a1a1a", position: "relative", flexShrink: 0,
        boxShadow: `inset ${p}px ${p}px 0 rgba(0,0,0,.8), inset -${p}px -${p}px 0 rgba(255,255,255,.04)`,
      }}>
        <div style={{
          position: "absolute", top: p, bottom: p,
          left: value ? "50%" : p, right: value ? p : "50%",
          background: value ? "#4caf50" : "#444",
          boxShadow: value ? `0 ${p}px 0 #1b5e20` : `0 ${p}px 0 #222`,
          transition: "all .1s steps(2)",
        }} />
      </div>
      <span style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 9,
        letterSpacing: 1, textTransform: "uppercase",
        color: value ? NEON : "#555",
      }}>
        {label}
      </span>
    </div>
  );
}

function VolumeBars({ level, setLevel, onHover }: {
  level: number; setLevel: (l: number) => void; onHover: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", marginBottom: 24 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} onMouseEnter={onHover} onClick={() => setLevel(i + 1)} style={{
          width: 18, height: 32, border: `2px solid ${NEON}`,
          background: i < level ? NEON : "transparent",
          boxShadow: i < level ? "0 4px 0 #1b5e20" : "none",
          cursor: "pointer",
        }} />
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontFamily: "'Press Start 2P', monospace", fontSize: 10,
      letterSpacing: 2, color: NEON, textShadow: `0 0 8px ${NEON}`,
      marginBottom: 16, marginTop: 8,
    }}>
      {children}
    </p>
  );
}

function SaveBar({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const font = "'Press Start 2P', monospace";
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "flex-end",
      gap: 14, paddingTop: 20, borderTop: `1px solid rgba(0,223,255,0.2)`, marginTop: 20,
    }}>
      {saved && (
        <span style={{ fontFamily: font, fontSize: 8, color: NEON, letterSpacing: 1, opacity: 0.8 }}>
          ✓ SAVED
        </span>
      )}
      <button
        onClick={onSave}
        style={{
          background: NEON, border: "none", color: BG,
          fontFamily: font, fontSize: 9, letterSpacing: 1,
          padding: "12px 24px", cursor: "pointer",
          transition: "transform 0.1s, opacity 0.1s",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
        onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
      >
        SAVE SETTINGS
      </button>
    </div>
  );
}

// ─── AUDIO ENGINE ─────────────────────────────────────────

type SoundType = "hover" | "select" | "tab" | "back" | "error";

function useAudioEngine(sfxEnabled: boolean, vol: number) {
  const audioBank = useRef<Partial<Record<SoundType, HTMLAudioElement>>>({});
  const audioCtx  = useRef<AudioContext | null>(null);
  const mp3Ready  = useRef(false);
  // Keep a ref in sync with sfxEnabled so playSound always reads the latest value
  const sfxEnabledRef = useRef(sfxEnabled);
  useEffect(() => { sfxEnabledRef.current = sfxEnabled; }, [sfxEnabled]);

  useEffect(() => {
    const files: Record<SoundType, string> = {
      hover:  "/sounds/JDSherbert - Pixel UI SFX Pack - Cursor 2 (Square).mp3",
      select: "/sounds/JDSherbert - Pixel UI SFX Pack - Select 1 (Square).mp3",
      tab:    "/sounds/JDSherbert - Pixel UI SFX Pack - Popup Open 1 (Square).mp3",
      back:   "/sounds/JDSherbert - Pixel UI SFX Pack - Cancel 1 (Square).mp3",
      error:  "/sounds/JDSherbert - Pixel UI SFX Pack - Error 1 (Square).mp3",
    };
    let loaded = 0;
    (Object.entries(files) as [SoundType, string][]).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.oncanplaythrough = () => {
        audioBank.current[key] = audio;
        loaded++;
        if (loaded === Object.keys(files).length) mp3Ready.current = true;
      };
    });
    return () => { Object.values(audioBank.current).forEach((a) => { a?.pause(); }); };
  }, []);

  useEffect(() => {
    const v = vol / 10;
    Object.values(audioBank.current).forEach((a) => { if (a) a.volume = v; });
  }, [vol]);

  function synthBeep(freq: number, dur: number, type: OscillatorType = "square", gain = 0.2) {
    try {
      if (!audioCtx.current)
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ac  = audioCtx.current;
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      g.gain.setValueAtTime(gain * (vol / 10), ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start(); osc.stop(ac.currentTime + dur);
    } catch (_) {}
  }

  function synthSound(type: SoundType) {
    switch (type) {
      case "hover":  synthBeep(440, 0.04, "square",   0.15); break;
      case "select": synthBeep(660, 0.07, "square",   0.25); break;
      case "tab":
        synthBeep(520, 0.10, "square", 0.20);
        setTimeout(() => synthBeep(660, 0.08, "square", 0.15), 60);
        break;
      case "back":   synthBeep(300, 0.10, "square",   0.20); break;
      case "error":
        synthBeep(180, 0.15, "sawtooth", 0.30);
        setTimeout(() => synthBeep(140, 0.15, "sawtooth", 0.20), 120);
        break;
    }
  }

  function playSound(type: SoundType) {
    if (!sfxEnabledRef.current) return;
    const mp3 = audioBank.current[type];
    if (mp3Ready.current && mp3) {
      mp3.currentTime = 0;
      mp3.play().catch(() => synthSound(type));
    } else {
      synthSound(type);
    }
  }

  return { playSound };
}

// ─── CREDITS DATA ─────────────────────────────────────────

const CREDITS_SECTIONS = [
  {
    heading: "PROGRAMMING",
    rows: [
      { label: "FRONTEND DEVELOPMENT", names: ["Nicolette Jyn Bautista", "Mary Claire Jordan", "Loel Joseph Hofilena", "Lianna Louise Ngitngit"] },
      { label: "BACKEND LOGIC",        names: ["Mary Claire Jordan", "Loel Joseph Hofilena"] },
    ],
  },
  {
    heading: "DESIGN & ART",
    rows: [
      { label: "UI/UX DESIGN",     names: ["Lianna Louise Ngitngit", "Sharyn May Allonar", "Mary Claire Jordan", "Nicolette Jyn Bautista", "Loel Joseph Hofilena"] },
      { label: "PIXEL ART ASSETS", names: ["Lianna Louise Ngitngit", "Sharyn May Allonar", "Mary Claire Jordan"] },
      { label: "ANIMATIONS",       names: ["Nicolette Jyn Bautista"] },
    ],
  },
  {
    heading: "AUDIO",
    rows: [
      { label: "BACKGROUND MUSIC", names: ["Nicolette Jyn Bautista"] },
      { label: "SOUND EFFECTS",    names: ["Lianna Louise Ngitngit"] },
    ],
  },
  {
    heading: "TOOLS USED",
    rows: [
      { label: "SOFTWARE & TECH", names: ["Visual Studio Code", "Figma", "GitHub", "Electron", "React", "Claude AI", "Chat GPT", "Gemini"] },
    ],
  },
  {
    heading: "LANGUAGES",
    rows: [
      { label: "LANGUAGES", names: ["TypeScript", "CSS"] },
    ],
  },
  {
    heading: "SPECIAL THANKS",
    rows: [
      { label: "SPECIAL THANKS", names: ["Ma'am May Florence J. Franco", "Boarding House of Nicolette", "Friends", "Family"] },
    ],
  },
];

const DEVS = [
  { name: "Lianna Louise Ngitngit",  file: "Girl.png"    },
  { name: "Sharyn May Allonar",      file: "Girl2.png"   },
  { name: "Nicolette Jyn Bautista",  file: "Lady.png"    },
  { name: "Loel Joseph Hofilena",    file: "Knight.png"  },
  { name: "Mary Claire Jordan",      file: "Wizard1.png" },
];

const DOTS = "····················";

// ─── MAIN SETTINGS PAGE ───────────────────────────────────

export default function SettingsPage() {
  const font = "'Press Start 2P', monospace";
  const [tab,   setTab]   = useState<SettingsTab>("PROFILE");
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Store ──────────────────────────────────────────────
  const setScreen            = useGameStore((s) => s.setScreen);
  const updateSettings       = useGameStore((s) => s.updateSettings);
  // Used to signal App.tsx to pause/resume the global BGM around Credits
  const setCreditsBgmActive  = useGameStore((s) => s.setCreditsBgmActive);
  const setResolution  = useGameStore((s) => s.setResolution);
  const setGameConfig  = useGameStore((s) => s.setGameConfig);
  const storedSettings = useGameStore((s) => s.settings) as SettingsView;
  const storedRes      = useGameStore((s) => s.resolution);
  const gameConfig     = useGameStore((s) => s.gameConfig);

  const player       = usePlayerStore((s) => s.player);
  const updatePlayer = usePlayerStore((s: PlayerState) => s.updatePlayer);
  const resetPlayer  = usePlayerStore((s: PlayerState) => s.resetPlayer);

  // ── Local draft state ──────────────────────────────────
  const [nameInput,        setNameInput]        = useState<string>(player?.name ?? "PLAYER_01");
  const [draftAvatar,      setDraftAvatar]      = useState<string>(player?.avatar ?? avatars[0]);
  const [draftVolume,      setDraftVolume]      = useState<number>(storedSettings.volume ?? 5);
  const [draftSfx,         setDraftSfx]         = useState<boolean>(storedSettings.sfxEnabled ?? true);
  const [draftBgm,         setDraftBgm]         = useState<boolean>(storedSettings.bgmEnabled ?? false);
  const [draftUseCase,     setDraftUseCase]     = useState<boolean>(storedSettings.useCase ?? false);
  const [draftFlicker,     setDraftFlicker]     = useState<boolean>(storedSettings.useFlicker ?? false);
  const [draftScanlines,   setDraftScanlines]   = useState<boolean>(storedSettings.useScanlines ?? false);
  const [draftResKey,      setDraftResKey]      = useState<string>(storedRes.label ?? "XGA");
  const [draftAutoJoinLan, setDraftAutoJoinLan] = useState<boolean>(gameConfig.autoJoinLan ?? false);

  // FIX: drive the audio engine from the persisted setting, not the draft.
  // This prevents sounds from playing/stopping based on unsaved toggle state.
  const { playSound } = useAudioEngine(storedSettings.sfxEnabled ?? true, draftVolume);

  // ── Credits state & refs ───────────────────────────────
  const creditsScrollRef    = useRef<HTMLDivElement>(null);
  const creditsRAFRef       = useRef<number | null>(null);
  const creditsLastTimeRef  = useRef<number | null>(null);
  const creditsPausedRef    = useRef(false);
  const creditsCanvasRef    = useRef<HTMLCanvasElement>(null);
  const creditsBgmRef       = useRef<HTMLAudioElement | null>(null);
  const creditsFadeRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const [creditsMuted,      setCreditsMuted]      = useState(false);
  // Initialise credits BGM volume from the saved master volume (0–1 scale)
  const [creditsBgmVol,     setCreditsBgmVol]     = useState(() => (storedSettings.volume ?? 5) / 10);
  const [creditsBgmPlaying, setCreditsBgmPlaying] = useState(false);

  // ── Credits BGM helpers ────────────────────────────────
  function fadeCreditsBgm(target: number, ms: number, onDone?: () => void) {
    if (creditsFadeRef.current) clearInterval(creditsFadeRef.current);
    const audio = creditsBgmRef.current;
    if (!audio) { onDone?.(); return; }
    const start = audio.volume;
    const steps = Math.max(1, Math.round(ms / 16));
    let step = 0;
    creditsFadeRef.current = setInterval(() => {
      step++;
      audio.volume = Math.min(1, Math.max(0, start + (target - start) * (step / steps)));
      if (step >= steps) {
        clearInterval(creditsFadeRef.current!);
        creditsFadeRef.current = null;
        audio.volume = target;
        onDone?.();
      }
    }, 16);
  }

  function startCreditsBgm() {
    // Guard: only one instance, and respect the saved BGM enabled setting
    if (creditsBgmRef.current) return;
    if (!storedSettings.bgmEnabled) return;
    // ← swap filename here if the track ever changes
    const audio = new Audio("/sounds/djartmusic-8-bit-console-from-my-childhood-301286.mp3");
    audio.loop   = true;
    audio.volume = 0; // always start silent, then fade in
    creditsBgmRef.current = audio;
    audio.play()
      .then(() => {
        setCreditsBgmPlaying(true);
        fadeCreditsBgm(creditsMuted ? 0 : creditsBgmVol, 1800);
      })
      .catch(() => {}); // autoplay blocked — silently ignored
  }

  function stopCreditsBgm() {
    const audio = creditsBgmRef.current;
    if (!audio) return;
    fadeCreditsBgm(0, 900, () => {
      audio.pause();
      audio.src = "";
      creditsBgmRef.current = null;
      setCreditsBgmPlaying(false);
    });
  }

  // ── Credits scroll helpers ─────────────────────────────
  function startCreditsScroll() {
    if (creditsRAFRef.current) return;
    const tick = (ts: number) => {
      const el = creditsScrollRef.current;
      if (el && !creditsPausedRef.current) {
        if (creditsLastTimeRef.current === null) creditsLastTimeRef.current = ts;
        const dt = (ts - creditsLastTimeRef.current) / 1000;
        creditsLastTimeRef.current = ts;
        el.scrollTop += 36 * dt;
        if (el.scrollTop >= el.scrollHeight - el.clientHeight) el.scrollTop = 0;
      } else {
        creditsLastTimeRef.current = null;
      }
      creditsRAFRef.current = requestAnimationFrame(tick);
    };
    creditsRAFRef.current = requestAnimationFrame(tick);
  }

  function stopCreditsScroll() {
    if (creditsRAFRef.current) {
      cancelAnimationFrame(creditsRAFRef.current);
      creditsRAFRef.current = null;
    }
    creditsLastTimeRef.current = null;
  }

  // ── Credits particle canvas ────────────────────────────
  function startCreditsParticles(): (() => void) | undefined {
    const canvas = creditsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    type Pt = { x: number; y: number; s: number; spd: number; op: number; col: string };
    const cols = [NEON, CYAN, "#ffffff"];
    const pts: Pt[] = Array.from({ length: 55 }, () => ({
      x:   Math.random() * canvas.width,
      y:   Math.random() * canvas.height,
      s:   Math.random() < 0.65 ? 1 : 2,
      spd: 0.18 + Math.random() * 0.45,
      op:  0.25 + Math.random() * 0.55,
      col: cols[Math.floor(Math.random() * cols.length)],
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        ctx.globalAlpha = p.op;
        ctx.fillStyle   = p.col;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
        p.y += p.spd;
        if (p.y > canvas.height) { p.y = 0; p.x = Math.random() * canvas.width; }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }

  // ── Mount / unmount credits effects on tab change ──────
  useEffect(() => {
    if (tab === "CREDITS") {
      // Signal App.tsx to pause the global BGM while Credits is shown
      setCreditsBgmActive(true);
      startCreditsBgm();
      startCreditsScroll();
      const cleanupParticles = startCreditsParticles();
      return () => {
        stopCreditsBgm();
        stopCreditsScroll();
        cleanupParticles?.();
        creditsPausedRef.current = false;
        // Signal App.tsx to resume the global BGM
        setCreditsBgmActive(false);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Save ───────────────────────────────────────────────
  function handleSave() {
    playSound("select");
    if (updatePlayer) updatePlayer({ name: nameInput || "PLAYER_01", avatar: draftAvatar });
    updateSettings({
      volume: draftVolume, sfxEnabled: draftSfx, bgmEnabled: draftBgm,
      useCase: draftUseCase, useFlicker: draftFlicker, useScanlines: draftScanlines,
    } as Partial<SettingsView>);
    const res = resolutions.find((r) => r.key === draftResKey);
    if (res) setResolution(res.w, res.h, res.key);
    setGameConfig({ autoJoinLan: draftAutoJoinLan });
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }

  // ── Tab content ────────────────────────────────────────
  const renderContent = () => {
    switch (tab) {

      case "PROFILE":
        return (
          <div>
            <SectionLabel>PLAYER NAME</SectionLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
              <input
                aria-label="Player name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  flex: 1, background: "transparent", border: `2px solid ${NEON}`,
                  color: NEON, fontFamily: font, fontSize: 9,
                  padding: "10px 12px", outline: "none",
                }}
              />
            </div>
            <SectionLabel>SELECT AVATAR</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 72px)", gap: 12 }}>
              {avatars.map((fileName) => (
                <AvatarImage
                  key={fileName} fileName={fileName}
                  selected={draftAvatar === fileName}
                  onHover={() => playSound("hover")}
                  onClick={() => { playSound("select"); setDraftAvatar(fileName); }}
                />
              ))}
            </div>
            <SaveBar onSave={handleSave} saved={saved} />
          </div>
        );

      case "CONNECTION":
        return (
          <div>
            <SectionLabel>NETWORK</SectionLabel>
            <PixelToggle
              value={draftAutoJoinLan} label="AUTO-JOIN LAN"
              onHover={() => playSound("hover")}
              onToggle={() => { playSound("select"); setDraftAutoJoinLan(!draftAutoJoinLan); }}
            />
            <SaveBar onSave={handleSave} saved={saved} />
          </div>
        );

      case "DISPLAY":
        return (
          <div>
            <SectionLabel>RESOLUTION</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
              {resolutions.map((r) => (
                <button key={r.key}
                  onMouseEnter={() => playSound("hover")}
                  onClick={() => { playSound("select"); setDraftResKey(r.key); }}
                  style={{
                    background: draftResKey === r.key ? NEON : "transparent",
                    border: `2px solid ${NEON}`,
                    color: draftResKey === r.key ? BG : NEON,
                    fontFamily: font, padding: "10px 6px", cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}
                >
                  <span style={{ fontSize: 7, letterSpacing: 1 }}>{r.label}</span>
                  <span style={{ fontSize: 6, opacity: 0.8 }}>{r.w}×{r.h}</span>
                </button>
              ))}
            </div>
            <SectionLabel>EFFECTS</SectionLabel>
            <PixelToggle value={draftUseCase}   label="CASEMODE"  onHover={() => playSound("hover")} onToggle={() => { playSound("select"); setDraftUseCase(!draftUseCase); }} />
            <PixelToggle value={draftFlicker}   label="FLICKER"   onHover={() => playSound("hover")} onToggle={() => { playSound("select"); setDraftFlicker(!draftFlicker); }} />
            <PixelToggle value={draftScanlines} label="SCANLINES" onHover={() => playSound("hover")} onToggle={() => { playSound("select"); setDraftScanlines(!draftScanlines); }} />
            <SaveBar onSave={handleSave} saved={saved} />
          </div>
        );

      case "AUDIO":
        return (
          <div>
            <SectionLabel>MASTER VOLUME</SectionLabel>
            <VolumeBars
              level={draftVolume}
              onHover={() => playSound("hover")}
              setLevel={(l) => { playSound("select"); setDraftVolume(l); }}
            />
            <SectionLabel>SOUND EFFECTS</SectionLabel>
            <PixelToggle
              value={draftSfx} label="UI SOUND EFFECTS"
              onHover={() => playSound("hover")}
              // FIX: only play the click sound when turning SFX ON (new state = true).
              // When turning OFF, the new state is false so no sound should play.
              onToggle={() => { if (!draftSfx) playSound("select"); setDraftSfx(!draftSfx); }}
            />
            <SectionLabel>MUSIC</SectionLabel>
            <PixelToggle
              value={draftBgm} label="BACKGROUND MUSIC"
              onHover={() => playSound("hover")}
              onToggle={() => { playSound("select"); setDraftBgm(!draftBgm); }}
            />
            <SaveBar onSave={handleSave} saved={saved} />
          </div>
        );

      case "DATA":
        return (
          <div>
            <SectionLabel>MANAGE DATA</SectionLabel>
            {([
              ["RESET PROGRESS", () => { if (window.confirm("RESET PROGRESS?")) resetPlayer(); }],
              ["CLEAR DATA",     () => { if (window.confirm("CLEAR ALL DATA?")) resetPlayer(); }],
            ] as DataAction[]).map(([label, fn]) => (
              <button key={label}
                onMouseEnter={(e) => { playSound("hover"); e.currentTarget.style.background = NEON; e.currentTarget.style.color = BG; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = NEON; }}
                onClick={() => { playSound("error"); fn(); }}
                style={{
                  display: "block", width: "100%", background: "transparent",
                  border: `2px solid ${NEON}`, color: NEON, fontFamily: font,
                  fontSize: 9, letterSpacing: 1, textTransform: "uppercase",
                  padding: "16px 20px", cursor: "pointer", textAlign: "left", marginBottom: 12,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        );

      // ── CREDITS ─────────────────────────────────────────
      case "CREDITS":
        return (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

            {/* Audio controls strip */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
              padding: "5px 10px", border: `1px solid ${CYAN}33`,
              background: "rgba(0,0,0,0.7)", flexShrink: 0,
            }}>
              {/* BGM pulse indicator */}
              <span style={{
                display: "inline-block",
                width: 7, height: 7, flexShrink: 0,
                background: creditsBgmPlaying ? NEON : "#333",
                boxShadow: creditsBgmPlaying ? `0 0 6px ${NEON}` : "none",
                animation: creditsBgmPlaying ? "creditsPulse 0.9s steps(1,end) infinite" : "none",
              }} />
              <span style={{ fontFamily: font, fontSize: 7, color: creditsBgmPlaying ? NEON : "#444", letterSpacing: 1, flexShrink: 0 }}>
                BGM
              </span>

              {/* Mute button */}
              <button
                onClick={() => {
                  const next = !creditsMuted;
                  setCreditsMuted(next);
                  fadeCreditsBgm(next ? 0 : creditsBgmVol, 300);
                }}
                style={{
                  background: "transparent", border: `1px solid ${CYAN}88`,
                  color: CYAN, fontFamily: font, fontSize: 7, letterSpacing: 1,
                  padding: "3px 8px", cursor: "pointer", flexShrink: 0,
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 8px ${CYAN}`)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
              >
                {creditsMuted ? "UNMUTE" : "MUTE"}
              </button>

              {/* Vol label */}
              <span style={{ fontFamily: font, fontSize: 7, color: `${CYAN}77`, flexShrink: 0 }}>VOL</span>

              {/* Volume slider */}
              <input
                type="range" min={0} max={1} step={0.01}
                value={creditsMuted ? 0 : creditsBgmVol}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (creditsMuted && v > 0) setCreditsMuted(false);
                  setCreditsBgmVol(v);
                  if (creditsBgmRef.current) creditsBgmRef.current.volume = v;
                }}
                style={{ flex: 1, accentColor: CYAN, cursor: "pointer", minWidth: 0, height: 3 }}
              />
              <span style={{ fontFamily: font, fontSize: 7, color: CYAN, minWidth: 26, textAlign: "right", flexShrink: 0 }}>
                {Math.round((creditsMuted ? 0 : creditsBgmVol) * 100)}
              </span>
            </div>

            {/* Scrollable credits area */}
            <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>

              {/* Particle canvas */}
              <canvas
                ref={creditsCanvasRef}
                style={{
                  position: "absolute", inset: 0,
                  width: "100%", height: "100%",
                  pointerEvents: "none", zIndex: 0,
                }}
              />

              {/* CRT scanline overlay */}
              <div style={{
                position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
                backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.10) 2px,rgba(0,0,0,0.10) 4px)",
              }} />

              {/* Top fade */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 44,
                background: `linear-gradient(to bottom,${BG},transparent)`,
                zIndex: 3, pointerEvents: "none",
              }} />

              {/* Bottom fade */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 44,
                background: `linear-gradient(to top,${BG},transparent)`,
                zIndex: 3, pointerEvents: "none",
              }} />

              {/* The scrolling div */}
              <div
                ref={creditsScrollRef}
                onMouseEnter={() => { creditsPausedRef.current = true; }}
                onMouseLeave={() => { creditsPausedRef.current = false; creditsLastTimeRef.current = null; }}
                onKeyDown={(e) => {
                  const el = creditsScrollRef.current;
                  if (!el) return;
                  if (e.key === "ArrowDown") { e.preventDefault(); el.scrollTop += 48; }
                  if (e.key === "ArrowUp")   { e.preventDefault(); el.scrollTop -= 48; }
                }}
                tabIndex={0}
                style={{
                  position: "relative", zIndex: 1,
                  height: "100%", overflowY: "scroll", overflowX: "hidden",
                  outline: "none",
                  scrollbarWidth: "thin",
                  scrollbarColor: `${CYAN}55 transparent`,
                }}
              >
                <div style={{ padding: "48px 28px 80px", textAlign: "center" }}>

                  {/* Title */}
                  <div style={{
                    fontFamily: font, fontSize: 13, letterSpacing: 4,
                    color: NEON, textShadow: `0 0 12px ${NEON},0 0 24px ${NEON}55`,
                    marginBottom: 4,
                  }}>
                    == GAME CREDITS ==
                  </div>
                  <div style={{
                    color: `${CYAN}55`, fontFamily: font, fontSize: 7,
                    letterSpacing: 3, marginBottom: 32,
                  }}>
                    ·· ·· ·· ·· ·· ··
                  </div>

                  {/* Sections */}
                  {CREDITS_SECTIONS.map((sec) => (
                    <div key={sec.heading} style={{ marginBottom: 28, textAlign: "left" }}>
                      {/* Section heading */}
                      <div style={{
                        fontFamily: font, fontSize: 8, letterSpacing: 2, color: CYAN,
                        textShadow: `0 0 8px ${CYAN}`,
                        borderBottom: `1px solid ${CYAN}33`,
                        paddingBottom: 6, marginBottom: 12,
                      }}>
                        {sec.heading}
                      </div>

                      {sec.rows.map((row) => (
                        <div key={row.label} style={{
                          display: "flex", alignItems: "flex-start",
                          marginBottom: 8, gap: 4,
                        }}>
                          {/* Row label */}
                          <span style={{
                            fontFamily: font, fontSize: 7, color: `${NEON}88`,
                            minWidth: 150, flexShrink: 0, letterSpacing: 0.5, lineHeight: 1.8,
                          }}>
                            {row.label}
                          </span>
                          {/* Dots */}
                          <span style={{
                            fontFamily: font, fontSize: 7, color: `${NEON}33`,
                            flex: 1, letterSpacing: 2, overflow: "hidden",
                            whiteSpace: "nowrap", lineHeight: 1.8,
                          }}>
                            {DOTS}
                          </span>
                          {/* Names */}
                          <span style={{
                            fontFamily: font, fontSize: 7, color: NEON,
                            textAlign: "right", minWidth: 170, lineHeight: 1.8,
                          }}>
                            {row.names.map((n, i) => <div key={i}>{n}</div>)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Divider */}
                  <div style={{
                    borderTop: `1px solid ${CYAN}44`,
                    margin: "12px 0 24px",
                    boxShadow: `0 0 8px ${CYAN}44`,
                  }} />

                  {/* DEVELOPED BY */}
                  <div style={{
                    fontFamily: font, fontSize: 8, letterSpacing: 3,
                    color: CYAN, textShadow: `0 0 8px ${CYAN}`,
                    marginBottom: 20,
                  }}>
                    DEVELOPED BY
                  </div>

                  <div style={{
                    display: "flex", flexWrap: "wrap",
                    justifyContent: "center", gap: 18, marginBottom: 36,
                  }}>
                    {DEVS.map((dev) => (
                      <DevCard key={dev.name} name={dev.name} file={dev.file} />
                    ))}
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: `1px solid ${NEON}22`, margin: "0 0 20px" }} />

                  {/* Thank you */}
                  <div style={{
                    fontFamily: font, fontSize: 9, letterSpacing: 3,
                    color: NEON, textShadow: `0 0 12px ${NEON},0 0 24px ${NEON}44`,
                    marginBottom: 10, animation: "creditsGlow 2s ease-in-out infinite alternate",
                  }}>
                    ★ THANK YOU FOR PLAYING ★
                  </div>
                  <div style={{ fontFamily: font, fontSize: 6, color: `${NEON}44`, letterSpacing: 2 }}>
                    VERSION 1.0.0
                  </div>

                  {/* Buffer */}
                  <div style={{ height: 64 }} />
                </div>
              </div>
            </div>

            {/* Keyframe styles injected once */}
            <style>{`
              @keyframes creditsPulse {
                0%,49%{opacity:1}50%,100%{opacity:0.15}
              }
              @keyframes creditsGlow {
                from{filter:brightness(1)}
                to{filter:brightness(1.4)}
              }
            `}</style>
          </div>
        );

      default: return null;
    }
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={{
      width: "100%", height: "100%", minHeight: 520,
      display: "flex", flexDirection: "column",
      padding: "32px 40px", boxSizing: "border-box",
      background: BG, color: NEON, fontFamily: font, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexShrink: 0 }}>
        <svg viewBox="0 0 24 24" width={32} height={32} style={{ stroke: NEON, fill: "none", strokeWidth: 2 }}>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
        <span style={{ fontSize: 22, letterSpacing: 3, textShadow: `0 0 12px ${NEON}` }}>SETTINGS</span>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: "flex", minHeight: 0,
        border: `3px solid ${CYAN}`,
        boxShadow: `0 0 12px rgba(0,223,255,.25)`,
        overflow: "hidden",
      }}>
        {/* Sidebar */}
        <nav style={{ flex: "0 0 150px", display: "flex", flexDirection: "column", borderRight: `2px solid ${CYAN}`, overflowY: "auto" }}>
          {TABS.map((t) => (
            <button key={t}
              onMouseEnter={() => playSound("hover")}
              onClick={() => { playSound("tab"); setTab(t); }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
              onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              style={{
                display: "block", width: "100%",
                background: tab === t ? NEON : "transparent",
                border: `1px solid ${tab === t ? NEON : "rgba(0,223,255,.3)"}`,
                color: tab === t ? BG : NEON,
                fontFamily: font, fontSize: 9, letterSpacing: 1, textTransform: "uppercase",
                padding: "14px 12px", textAlign: "left", cursor: "pointer",
                marginBottom: 4, transition: "background .1s, transform .1s",
              }}
            >
              {t}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{
          flex: 1, padding: tab === "CREDITS" ? "16px 20px" : "24px 28px",
          background: "rgba(0,0,0,.8)",
          overflowY: tab === "CREDITS" ? "hidden" : "auto",
          overflowX: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {renderContent()}
        </div>
      </div>

      {/* Back */}
      <div style={{ flexShrink: 0, marginTop: 20 }}>
        <button
          onMouseEnter={() => playSound("hover")}
          onClick={() => { playSound("back"); setScreen("home"); }}
          style={{
            background: "transparent", border: "none", color: NEON,
            fontFamily: font, fontSize: 10, letterSpacing: 1,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <svg viewBox="0 0 10 10" width={14} height={14} style={{ stroke: "currentColor", fill: "none", strokeWidth: 3 }}>
            <polyline points="7,1 3,5 7,9"/>
          </svg>
          BACK TO MENU
        </button>
      </div>
    </div>
  );
}
