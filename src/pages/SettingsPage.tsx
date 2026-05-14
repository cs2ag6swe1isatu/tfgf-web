import { useState, useRef, useEffect, ReactNode } from "react";
import { useGameStore } from "../store/gameStore";
import { usePlayerStore, PlayerState } from "../store/playerStore";

const NEON = "#35E52B";
const CYAN = "#00E5FF";
const BG   = "#010707";

const avatars = [
  "Boy.png",
  "Boy2.png",
  "Detective.png",
  "FarmerBoy.png",
  "Girl.png",
  "Girl2.png",
  "Glasses.png",
  "Goblin.png",
  "Kid1.png",
  "Kid2.png",
  "Knight.png",
  "Lady.png",
  "Lumberjack.png",
  "old_man.png",
  "old_man2.png",
  "Punk.png",
  "Viking.png",
  "Wizard1.png",
  "Wizard2.png",
];

const fallbackEmoji: Record<string, string> = {
  "Boy.png":"0",
  "Boy2.png":"1",
  "Detective.png":"2",
  "FarmerBoy.png":"3",
  "Girl.png":"4",
  "Girl2.png":"5",
  "Glasses.png":"6",
  "Goblin.png":"7",
  "Kid1.png":"8",
  "Kid2.png":"9",
  "Knight.png":"10",
  "Lady.png":"11",
  "Lumberjack.png":"12",
  "old_man.png":"13",
  "old_man2.png":"14",
  "Punk.png":"15",
  "Viking.png":"16",
  "Wizard1.png":"17",
  "Wizard2.png":"18",
};

type DataAction  = [string, () => void];
type SettingsTab = "PROFILE" | "CONNECTION" | "DISPLAY" | "AUDIO" | "DATA";
type SettingsView = {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  volume: number;
  useCase: boolean;
  useScanlines: boolean;
  useFlicker: boolean;
};

const resolutions = [
  { w: 1280, h: 720,  label: "HD 720P",       key: "HD 720p" },
  { w: 1152, h: 768,  label: "XGA+",          key: "XGA+"    },
  { w: 1024, h: 768,  label: "XGA (DEFAULT)", key: "XGA"     },
  { w: 1024, h: 600,  label: "WSVGA",         key: "WSVGA"   },
  { w: 800,  h: 600,  label: "SVGA",          key: "SVGA"    },
];

const TABS: SettingsTab[] = ["PROFILE", "CONNECTION", "DISPLAY", "AUDIO", "DATA"];

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
        cursor: "pointer",
        transition: "transform 0.1s, box-shadow 0.2s",
        transform: isHovered ? "scale(1.05)" : selected ? "scale(0.95)" : "scale(1)",
        boxShadow: selected
          ? `0 0 12px rgba(53,229,43,0.5)`
          : isHovered ? `0 0 8px rgba(255,255,255,0.3)` : "none",
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
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
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

    return () => {
      Object.values(audioBank.current).forEach((a) => { a?.pause(); });
    };
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
    if (!sfxEnabled) return;
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

// ─── MAIN SETTINGS PAGE ───────────────────────────────────

export default function SettingsPage() {
  const font = "'Press Start 2P', monospace";
  const [tab,   setTab]   = useState<SettingsTab>("PROFILE");
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Store ──────────────────────────────────────────────
  const setScreen      = useGameStore((s) => s.setScreen);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const setResolution  = useGameStore((s) => s.setResolution);
  const setGameConfig  = useGameStore((s) => s.setGameConfig);
  const storedSettings = useGameStore((s) => s.settings) as SettingsView;
  const storedRes      = useGameStore((s) => s.resolution);
  const gameConfig     = useGameStore((s) => s.gameConfig);

  const player       = usePlayerStore((s) => s.player);
  const updatePlayer = usePlayerStore((s: PlayerState) => s.updatePlayer);
  const resetPlayer  = usePlayerStore((s: PlayerState) => s.resetPlayer);

  const nameInput = player?.name || "PLAYER_01";
  const avatar = player?.avatar ?? avatars[0];
  const volume = storedSettings.volume ?? 5;
  const sfxEnabled = storedSettings.sfxEnabled ?? true;
  const bgmEnabled = storedSettings.bgmEnabled ?? false;
  const useCase = storedSettings.useCase ?? false;
  const useFlicker = storedSettings.useFlicker ?? false;
  const useScanlines = storedSettings.useScanlines ?? false;
  const resKey = storedRes.label ?? "XGA";
  const autoJoinLan = gameConfig.autoJoinLan ?? false;

  const { playSound } = useAudioEngine(sfxEnabled, volume);

  function updateSetting<T extends keyof SettingsView>(key: T, value: SettingsView[T]) {
    updateSettings({ [key]: value } as Partial<SettingsView>);
  }

  function updatePlayerName(nextName: string) {
    if (!updatePlayer) return;
    updatePlayer({ name: nextName.trim() || player?.name || "PLAYER_01" });
  }

  function updateAvatar(nextAvatar: string) {
    if (!updatePlayer) return;
    updatePlayer({ avatar: nextAvatar });
  }

  function updateResolution(key: string) {
    const res = resolutions.find((r) => r.key === key);
    if (res) setResolution(res.w, res.h, res.key);
  }

  function updateAutoJoinLan(enabled: boolean) {
    setGameConfig({ autoJoinLan: enabled });
  }

  function handleSave() {
    playSound("select");
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
              {/* FIX: Added aria-label to satisfy accessibility linting (axe/forms).
                  The input had no label, title, or placeholder — this is the minimal fix. */}
              <input
                aria-label="Player name"
                value={nameInput}
                onChange={(e) => updatePlayerName(e.target.value)}
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
                  key={fileName}
                  fileName={fileName}
                  selected={avatar === fileName}
                  onHover={() => playSound("hover")}
                  onClick={() => { playSound("select"); updateAvatar(fileName); }}
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
              value={autoJoinLan}
              label="AUTO-JOIN LAN"
              onHover={() => playSound("hover")}
              onToggle={() => { playSound("select"); updateAutoJoinLan(!autoJoinLan); }}
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
                <button
                  key={r.key}
                  onMouseEnter={() => playSound("hover")}
                  onClick={() => { playSound("select"); updateResolution(r.key); }}
                  style={{
                    background: resKey === r.key ? NEON : "transparent",
                    border: `2px solid ${NEON}`,
                    color: resKey === r.key ? BG : NEON,
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
            <PixelToggle value={useCase}      label="CASEMODE"  onHover={() => playSound("hover")} onToggle={() => { playSound("select"); updateSetting("useCase", !useCase); }} />
            <PixelToggle value={useFlicker}   label="FLICKER"   onHover={() => playSound("hover")} onToggle={() => { playSound("select"); updateSetting("useFlicker", !useFlicker); }} />
            <PixelToggle value={useScanlines} label="SCANLINES" onHover={() => playSound("hover")} onToggle={() => { playSound("select"); updateSetting("useScanlines", !useScanlines); }} />
            <SaveBar onSave={handleSave} saved={saved} />
          </div>
        );

      case "AUDIO":
        return (
          <div>
            <SectionLabel>MASTER VOLUME</SectionLabel>
            <VolumeBars
              level={volume}
              onHover={() => playSound("hover")}
              setLevel={(l) => { playSound("select"); updateSetting("volume", l); }}
            />
            <SectionLabel>SOUND EFFECTS</SectionLabel>
            <PixelToggle
              value={sfxEnabled}
              label="UI SOUND EFFECTS"
              onHover={() => playSound("hover")}
              onToggle={() => { playSound("select"); updateSetting("sfxEnabled", !sfxEnabled); }}
            />
            <SectionLabel>MUSIC</SectionLabel>
            <PixelToggle
              value={bgmEnabled}
              label="BACKGROUND MUSIC"
              onHover={() => playSound("hover")}
              onToggle={() => { playSound("select"); updateSetting("bgmEnabled", !bgmEnabled); }}
            />
            <SaveBar onSave={handleSave} saved={saved} />
          </div>
        );

      case "DATA":
        return (
          <div>
            <SectionLabel>MANAGE DATA</SectionLabel>
            {([
              ["RESET PROGRESS", () => {
                if (window.confirm("RESET PROGRESS?")) {
                  resetPlayer();
                }
              }],
              ["CLEAR DATA", () => {
                if (window.confirm("CLEAR ALL DATA?")) {
                  resetPlayer();
                }
              }],
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

      default: return null;
    }
  };

  return (
    <div style={{
      width: "100%", height: "100%", minHeight: 520, display: "flex", flexDirection: "column",
      padding: "32px 40px", boxSizing: "border-box", background: BG, color: NEON, fontFamily: font, overflow: "hidden",
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
        flex: 1, display: "flex", minHeight: 0, border: `3px solid ${CYAN}`,
        boxShadow: `0 0 12px rgba(0,223,255,.25)`, overflow: "hidden",
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
          flex: 1, padding: "24px 28px", background: "rgba(0,0,0,.8)",
          overflowY: "auto", overflowX: "hidden",
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