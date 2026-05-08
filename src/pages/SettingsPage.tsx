import { useState, useRef, useEffect, JSXElementConstructor, MouseEventHandler, ReactElement, ReactNode } from "react";

const NEON = "#35E52B";
const CYAN = "#00E5FF";
const BG   = "#010707";

const avatarData = [
  { name:"Elder",    skin:"#F5D6B8", hair:"#9e9e9e", shirt:"#5D4037", eyes:"#5D4037", bald:true,  wrinkled:true },
  { name:"Girl",     skin:"#FFDAB9", hair:"#8B4513", shirt:"#E91E63", eyes:"#4A2C17", braid:true },
  { name:"Explorer", skin:"#C8A882", hair:"#6B3F0C", shirt:"#795548", eyes:"#4A3728", hat:true,  beard:true },
  { name:"Nerd",     skin:"#FFE4C4", hair:"#FF6B00", shirt:"#607D8B", eyes:"#263238", glasses:true },
  { name:"Lady",     skin:"#D4A96A", hair:"#6B7B3A", shirt:"#9C6B6B", eyes:"#4A3728", mature:true },
  { name:"Goblin",   skin:"#4CAF50", hair:"#2E7D32", shirt:"#33691E", eyes:"#1B5E20", goblin:true },
  { name:"Cyber",    skin:"#FFE4C4", hair:"#F44336", shirt:"#212121", eyes:"#263238", visor:true },
  { name:"Blonde",   skin:"#FFDAB9", hair:"#FFD700", shirt:"#3F51B5", eyes:"#1565C0", long:true },
];

type Avatar = {
  name: string;
  skin: string;
  hair: string;
  shirt: string;
  eyes: string;
  bald?: boolean;
  wrinkled?: boolean;
  hat?: boolean;
  braid?: boolean;
  long?: boolean;
  mature?: boolean;
  beard?: boolean;
  glasses?: boolean;
  visor?: boolean;
  goblin?: boolean;
};

type ConnectionOption = "AUTO-JOIN LAN" | "AUTO-MATCH" | "SHOW PING";
type EffectsOption = "CASEMODE" | "FLICKER" | "SCANLINES";
type DataAction = [string, () => void];
type SettingsTab = "PROFILE" | "CONNECTION" | "DISPLAY" | "AUDIO" | "DATA";

function drawAvatar(canvas: HTMLCanvasElement, av: Avatar) {
  const C = canvas.getContext("2d");
  if (!C) return;
  const W = 64, H = 64;
  canvas.width = W; canvas.height = H;
  C.imageSmoothingEnabled = false;
  const p = (x: number,y: number,w: number,h: number,c: string) => { C.fillStyle=c; C.fillRect(x,y,w,h); };
  p(0,0,W,H,"#0d1a0d");
  p(18,10,28,26,av.skin);
  p(14,18,4,8,av.skin); p(46,18,4,8,av.skin);
  if(av.goblin){
    p(22,18,6,5,"#FF0"); p(36,18,6,5,"#FF0");
    p(24,20,2,2,"#000"); p(38,20,2,2,"#000");
  } else {
    p(22,20,5,4,"#fff"); p(37,20,5,4,"#fff");
    p(24,21,3,3,av.eyes); p(39,21,3,3,av.eyes);
  }
  if(av.wrinkled){
    p(22,30,4,2,"#c4956a"); p(28,30,8,2,"#c4956a"); p(38,30,4,2,"#c4956a");
  } else {
    p(25,30,14,2,"#c4956a"); p(27,32,10,1,"#a0614a");
  }
  p(30,26,4,3,av.goblin?"#388E3C":"#c4956a");
  if(av.wrinkled){
    C.strokeStyle="#c4956a"; C.lineWidth=1;
    C.beginPath(); C.moveTo(20,18); C.lineTo(22,22); C.stroke();
    C.beginPath(); C.moveTo(44,18); C.lineTo(42,22); C.stroke();
  }
  if(av.bald){ p(18,10,28,4,"#888"); }
  else if(av.hat){ p(12,12,40,4,av.hair); p(18,4,28,10,av.hair); p(14,14,36,2,"#5D3A1A"); }
  else if(av.braid){ p(18,8,28,8,av.hair); p(16,14,4,20,av.hair); p(44,14,4,20,av.hair); }
  else if(av.long){ p(18,8,28,6,av.hair); p(12,14,6,22,av.hair); p(46,14,6,22,av.hair); }
  else if(av.mature){ p(18,8,28,8,av.hair); p(16,12,4,14,av.hair); p(44,12,4,14,av.hair); }
  else { p(18,8,28,10,av.hair); p(16,10,4,12,av.hair); p(44,10,4,8,av.hair); }
  if(av.beard){ p(18,30,28,6,av.hair); p(20,36,24,4,av.hair); }
  if(av.glasses){
    C.strokeStyle="#888"; C.lineWidth=1.5;
    C.strokeRect(20,19,9,7); C.strokeRect(35,19,9,7);
    C.beginPath(); C.moveTo(29,22); C.lineTo(35,22); C.stroke();
  }
  if(av.visor){ p(18,18,28,7,"#F44336"); p(19,19,26,5,"#FF5722"); p(19,19,26,2,"rgba(255,255,255,.3)"); }
  p(26,36,12,8,av.skin);
  p(10,44,44,20,av.shirt);
  if(av.goblin){ p(10,12,6,10,av.skin); p(48,12,6,10,av.skin); p(10,10,4,4,av.skin); p(50,10,4,4,av.skin); }
  C.strokeStyle="rgba(53,229,43,.15)"; C.lineWidth=1;
  C.strokeRect(.5,.5,W-1,H-1);
}

function AvatarCanvas({ av, selected, onClick }: { av: Avatar; selected: boolean; onClick: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => { if(ref.current) drawAvatar(ref.current, av); }, [av]);
  return (
    <div onClick={onClick} style={{
      width:72, height:72,
      border: selected ? `2px solid ${NEON}` : "1px solid #3A3A3A",
      background: selected ? "rgba(53,229,43,0.1)" : "#0a0f0a",
      display:"flex", alignItems:"center", justifyContent:"center",
      cursor:"pointer", transition:"all .15s",
      boxShadow: selected ? `0 0 8px rgba(53,229,43,.4)` : "none",
    }}>
      <canvas ref={ref} style={{ imageRendering:"pixelated", width:64, height:64 }} />
    </div>
  );
}

function PixelToggle({ value, onToggle, label }: { value: boolean; onToggle: () => void; label: string }) {
  const p = 4;
  return (
    <div onClick={onToggle} style={{
      cursor:"pointer", display:"flex", alignItems:"center", gap:16,
      marginBottom:12, userSelect:"none",
    }}>
      <div style={{
        width:60, height:28, background:"#1a1a1a", position:"relative", flexShrink:0,
        boxShadow:`inset ${p}px ${p}px 0 rgba(0,0,0,.8), inset -${p}px -${p}px 0 rgba(255,255,255,.04)`,
      }}>
        <div style={{
          position:"absolute", top:p, bottom:p,
          left: value ? "50%" : p, right: value ? p : "50%",
          background: value ? "#4caf50" : "#444",
          boxShadow: value ? `0 ${p}px 0 #1b5e20` : `0 ${p}px 0 #222`,
          transition:"all .1s steps(2)",
        }} />
      </div>
      <span style={{
        fontFamily:"'Press Start 2P', monospace", fontSize:9, letterSpacing:1,
        textTransform:"uppercase", color: value ? NEON : "#555",
      }}>{label}</span>
    </div>
  );
}

function VolumeBars({ level, setLevel }: { level: number; setLevel: (level: number) => void }) {
  return (
    <div style={{ display:"flex", gap:4, alignItems:"flex-end", marginBottom:24 }}>
      {Array.from({length:10}).map((_,i) => (
        <div key={i} onClick={() => setLevel(i+1)} style={{
          width:18, height:32,
          border:`2px solid ${NEON}`,
          background: i < level ? NEON : "transparent",
          boxShadow: i < level ? "0 4px 0 #1b5e20" : "none",
          cursor:"pointer",
        }} />
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontFamily:"'Press Start 2P', monospace", fontSize:10, letterSpacing:2,
      color:NEON, textShadow:`0 0 8px ${NEON}`, marginBottom:16, marginTop:8,
    }}>{children}</p>
  );
}

const resolutions = [
  { w:1280, h:720,  label:"HD 720P",       key:"HD 720p" },
  { w:1152, h:768,  label:"XGA+",          key:"XGA+" },
  { w:1024, h:768,  label:"XGA (DEFAULT)", key:"XGA" },
  { w:1024, h:600,  label:"WSVGA",         key:"WSVGA" },
  { w:800,  h:600,  label:"SVGA",          key:"SVGA" },
];

const TABS: SettingsTab[] = ["PROFILE","CONNECTION","DISPLAY","AUDIO","DATA"];

export default function SettingsPage() {
  const font = "'Press Start 2P', monospace";
  const [tab, setTab] = useState<SettingsTab>("PROFILE");
  const [playerName, setPlayerName] = useState("PLAYER_01");
  const [nameInput, setNameInput]   = useState("PLAYER_01");
  const [selectedAv, setSelectedAv] = useState(2);
  const [resolution, setResolution] = useState("XGA");
  const [effects, setEffects]       = useState<Record<EffectsOption, boolean>>({ CASEMODE:false, FLICKER:false, SCANLINES:false });
  const [conn, setConn]             = useState<Record<ConnectionOption, boolean>>({ "AUTO-JOIN LAN":false, "AUTO-MATCH":false, "SHOW PING":true });
  const [sfx, setSfx]               = useState(true);
  const [bgm, setBgm]               = useState(true);
  const [vol, setVol]               = useState(5);

  const btn = (active: boolean, onClick: MouseEventHandler<HTMLButtonElement> | undefined, children: ReactNode) => (
    <button onClick={onClick} style={{
      display:"block", width:"100%",
      background: active ? NEON : "transparent",
      border:`1px solid ${active ? NEON : "rgba(0,223,255,.3)"}`,
      color: active ? BG : NEON,
      fontFamily:font, fontSize:9, letterSpacing:1, textTransform:"uppercase",
      padding:"14px 12px", textAlign:"left", cursor:"pointer", marginBottom:4,
      transition:"background .1s",
    }}>{children}</button>
  );

  const renderContent = () => {
    switch(tab) {
      case "PROFILE": return (
        <div>
          <SectionLabel>PLAYER NAME</SectionLabel>
          <div style={{ display:"flex", gap:8, marginBottom:28 }}>
            <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&(setPlayerName(nameInput.trim()||playerName),setNameInput(nameInput.trim()||playerName))}
              style={{
                flex:1, background:"transparent", border:`2px solid ${NEON}`,
                color:NEON, fontFamily:font, fontSize:9, padding:"10px 12px", outline:"none",
              }} />
            <button onClick={()=>{ const n=nameInput.trim(); if(n){ setPlayerName(n); } else setNameInput(playerName); }}
              style={{
                background:"#10363A", border:`2px solid ${CYAN}`, color:CYAN,
                fontFamily:font, fontSize:8, letterSpacing:1, padding:"10px 14px", cursor:"pointer",
              }}>SAVE</button>
          </div>
          <SectionLabel>SELECT AVATAR</SectionLabel>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,72px)", gap:12 }}>
            {avatarData.map((av,i) => (
              <AvatarCanvas key={av.name} av={av} selected={selectedAv===i} onClick={()=>setSelectedAv(i)} />
            ))}
          </div>
        </div>
      );

      case "CONNECTION": return (
        <div>
          <SectionLabel>NETWORK</SectionLabel>
          {(Object.entries(conn) as [ConnectionOption, boolean][]).map(([k,v]) => (
            <PixelToggle key={k} value={v} label={k} onToggle={()=>setConn(c=>({...c,[k]:!c[k]}))} />
          ))}
        </div>
      );

      case "DISPLAY": return (
        <div>
          <SectionLabel>RESOLUTION</SectionLabel>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:24 }}>
            {resolutions.map(r => (
              <button key={r.key} onClick={()=>setResolution(r.key)} style={{
                background: resolution===r.key ? NEON : "transparent",
                border:`2px solid ${NEON}`, color: resolution===r.key ? BG : NEON,
                fontFamily:font, padding:"10px 6px", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              }}>
                <span style={{ fontSize:7, letterSpacing:1 }}>{r.label}</span>
                <span style={{ fontSize:6, opacity:.8 }}>{r.w}×{r.h}</span>
              </button>
            ))}
          </div>
          <SectionLabel>EFFECTS</SectionLabel>
          {(Object.entries(effects) as [EffectsOption, boolean][]).map(([k,v]) => (
            <PixelToggle key={k} value={v} label={k} onToggle={()=>setEffects(e=>({...e,[k]:!e[k]}))} />
          ))}
        </div>
      );

      case "AUDIO": return (
        <div>
          <SectionLabel>VOLUME</SectionLabel>
          <VolumeBars level={vol} setLevel={setVol} />
          <SectionLabel>SOUND EFFECTS</SectionLabel>
          <PixelToggle value={sfx} label="SOUND EFFECTS" onToggle={()=>setSfx(v=>!v)} />
          <SectionLabel>MUSIC</SectionLabel>
          <PixelToggle value={bgm} label="BACKGROUND MUSIC" onToggle={()=>setBgm(v=>!v)} />
        </div>
      );

      case "DATA": return (
        <div>
          <SectionLabel>MANAGE DATA</SectionLabel>
          {( [
            ["RESET PROGRESS", ()=>window.confirm("RESET PROGRESS?")&&alert("Progress reset.")],
            ["CLEAR DATA",     ()=>window.confirm("CLEAR ALL DATA?")&&alert("Data cleared.")],
            ["EXPORT SAVE",    ()=>alert("Export complete.")],
          ] as DataAction[]).map(([label, fn]) => (
            <button key={label} onClick={fn} style={{
              display:"block", width:"100%",
              background:"transparent", border:`2px solid ${NEON}`,
              color:NEON, fontFamily:font, fontSize:9, letterSpacing:1,
              textTransform:"uppercase", padding:"16px 20px",
              cursor:"pointer", textAlign:"left", marginBottom:12,
            }}
            onMouseEnter={e=>{ e.currentTarget.style.background=NEON; e.currentTarget.style.color=BG; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=NEON; }}
            >{label}</button>
          ))}
        </div>
      );

      default: return null;
    }
  };

  return (
    <div style={{
      width:"100%", height:"100vh", minHeight:520,
      display:"flex", flexDirection:"column",
      padding:"32px 40px", boxSizing:"border-box",
      background:BG, color:NEON, fontFamily:font,
      overflow:"hidden",
    }}>
      {/* HEADER */}
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24, flexShrink:0 }}>
        <svg viewBox="0 0 24 24" width={32} height={32} style={{ stroke:NEON, fill:"none", strokeWidth:2 }}>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
        <span style={{ fontSize:22, letterSpacing:3, textShadow:`0 0 12px ${NEON}` }}>SETTINGS</span>
      </div>

      {/* MAIN PANEL */}
      <div style={{
        flex:1, display:"flex", minHeight:0,
        border:`3px solid ${CYAN}`,
        boxShadow:`0 0 12px rgba(0,223,255,.25)`,
        overflow:"hidden",
      }}>
        {/* SIDEBAR */}
        <nav style={{
          flex:"0 0 150px", display:"flex", flexDirection:"column",
          borderRight:`2px solid ${CYAN}`, overflowY:"auto",
        }}>
          {TABS.map(t => btn(tab===t, ()=>setTab(t), t))}
        </nav>

        {/* CONTENT */}
        <div style={{
          flex:1, padding:"24px 28px",
          background:"rgba(0,0,0,.8)",
          overflowY:"auto", overflowX:"hidden",
        }}>
          {renderContent()}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ flexShrink:0, marginTop:20 }}>
        <button style={{
          background:"transparent", border:"none", color:NEON,
          fontFamily:font, fontSize:10, letterSpacing:1, cursor:"pointer",
          display:"flex", alignItems:"center", gap:10,
        }}>
          <svg viewBox="0 0 10 10" width={14} height={14} style={{ stroke:"currentColor", fill:"none", strokeWidth:3 }}>
            <polyline points="7,1 3,5 7,9"/>
          </svg>
          BACK TO MENU
        </button>
      </div>
    </div>
  );
}