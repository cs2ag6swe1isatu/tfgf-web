import { useEffect, useState } from "react";

const RANKS = [
  { id:1,  name:"Novice",     level:[1,10],   xp:[0,10000]       },
  { id:2,  name:"Student",    level:[11,20],  xp:[10001,20000]   },
  { id:3,  name:"Scholar",    level:[21,30],  xp:[20001,30000]   },
  { id:4,  name:"Professor",  level:[31,40],  xp:[30001,40000]   },
  { id:5,  name:"Expert",     level:[41,50],  xp:[40001,50000]   },
  { id:6,  name:"Specialist", level:[51,60],  xp:[50001,60000]   },
  { id:7,  name:"Genius",     level:[61,70],  xp:[60001,70000]   },
  { id:8,  name:"Brainiac",   level:[71,80],  xp:[70001,80000]   },
  { id:9,  name:"Sage",       level:[81,90],  xp:[80001,90000]   },
  { id:10, name:"Oracle",     level:[91,100], xp:[90001,100000]  },
];

const RANK_COLORS: Record<string, { primary: string; glow: string; secondary: string }> = {
  novice:     { primary:"#00ff88", glow:"rgba(0,255,136,",     secondary:"#00cc66" },
  student:    { primary:"#4488ff", glow:"rgba(68,136,255,",    secondary:"#2255cc" },
  scholar:    { primary:"#aa44ff", glow:"rgba(170,68,255,",    secondary:"#7722cc" },
  professor:  { primary:"#ffd700", glow:"rgba(255,215,0,",     secondary:"#cc9900" },
  expert:     { primary:"#ff8800", glow:"rgba(255,136,0,",     secondary:"#cc5500" },
  specialist: { primary:"#00ccaa", glow:"rgba(0,204,170,",     secondary:"#009977" },
  genius:     { primary:"#ff44cc", glow:"rgba(255,68,204,",    secondary:"#cc1199" },
  brainiac:   { primary:"#ff3333", glow:"rgba(255,51,51,",     secondary:"#cc0000" },
  sage:       { primary:"#ddddff", glow:"rgba(221,221,255,",   secondary:"#aaaacc" },
  oracle:     { primary:"#aaeeff", glow:"rgba(170,238,255,",   secondary:"#00ccff" },
};

function getRankKey(name: string) { return name.toLowerCase(); }
function getRankForXp(xp: number) {
  return RANKS.find(r => xp >= r.xp[0] && xp <= r.xp[1]) ?? RANKS[RANKS.length - 1];
}
function getNextRank(cur: typeof RANKS[0]) {
  return RANKS.find(r => r.id === cur.id + 1) ?? null;
}
function getProgress(xp: number, rank: typeof RANKS[0]) {
  const range = rank.xp[1] - rank.xp[0];
  const done = xp - rank.xp[0];
  return Math.min(Math.max((done / range) * 100, 0), 100);
}

const cr = { rx: 0, ry: 0 };

function RankSymbol({ name, size, color }: { name: string; size: number; color: string }) {
  const f = `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`;
  const k = getRankKey(name);
  switch (k) {
    case "novice": return (
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter:f, animation:"symbolSpin 12s linear infinite" }} shapeRendering="crispEdges">
        <rect x="8" y="8" width="44" height="2" fill={color} opacity=".6" {...cr}/><rect x="8" y="50" width="44" height="2" fill={color} opacity=".6" {...cr}/>
        <rect x="8" y="8" width="2" height="44" fill={color} opacity=".6" {...cr}/><rect x="50" y="8" width="2" height="44" fill={color} opacity=".6" {...cr}/>
        <rect x="16" y="16" width="28" height="2" fill={color} opacity=".35" {...cr}/><rect x="16" y="42" width="28" height="2" fill={color} opacity=".35" {...cr}/>
        <rect x="16" y="16" width="2" height="28" fill={color} opacity=".35" {...cr}/><rect x="42" y="16" width="2" height="28" fill={color} opacity=".35" {...cr}/>
        <rect x="26" y="26" width="8" height="8" fill={color} {...cr}/>
      </svg>
    );
    case "student": return (
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter:f, animation:"symbolSpin 14s linear infinite reverse" }} shapeRendering="crispEdges">
        <polygon points="30,8 52,30 30,52 8,30" fill="none" stroke={color} strokeWidth="2"/>
        <polygon points="30,16 44,30 30,44 16,30" fill="none" stroke={color} strokeWidth="1.5" opacity=".5"/>
        <rect x="28" y="8" width="4" height="44" fill={color} opacity=".2" {...cr}/><rect x="8" y="28" width="44" height="4" fill={color} opacity=".2" {...cr}/>
        <rect x="26" y="26" width="8" height="8" fill={color} {...cr}/>
      </svg>
    );
    case "scholar": return (
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter:f, animation:"symbolPulse 3s ease-in-out infinite" }} shapeRendering="crispEdges">
        <polygon points="30,8 52,20 52,40 30,52 8,40 8,20" fill="none" stroke={color} strokeWidth="2"/>
        <polygon points="30,16 44,24 44,36 30,44 16,36 16,24" fill="none" stroke={color} strokeWidth="1.5" opacity=".4"/>
        <rect x="24" y="24" width="12" height="12" fill={color} opacity=".9" {...cr}/>
        <rect x="28" y="20" width="4" height="4" fill={color} opacity=".4" {...cr}/><rect x="28" y="36" width="4" height="4" fill={color} opacity=".4" {...cr}/>
        <rect x="20" y="28" width="4" height="4" fill={color} opacity=".4" {...cr}/><rect x="36" y="28" width="4" height="4" fill={color} opacity=".4" {...cr}/>
      </svg>
    );
    case "professor": return (
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter:f, animation:"symbolSpin 16s linear infinite" }} shapeRendering="crispEdges">
        <rect x="6" y="6" width="48" height="2" fill={color} opacity=".25" {...cr}/><rect x="6" y="52" width="48" height="2" fill={color} opacity=".25" {...cr}/>
        <rect x="6" y="6" width="2" height="48" fill={color} opacity=".25" {...cr}/><rect x="52" y="6" width="2" height="48" fill={color} opacity=".25" {...cr}/>
        <polygon points="30,12 34,24 48,24 38,32 42,46 30,38 18,46 22,32 12,24 26,24" fill={color} opacity=".85" {...cr}/>
      </svg>
    );
    case "expert": return (
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter:f, animation:"symbolSpin 10s linear infinite" }} shapeRendering="crispEdges">
        <polygon points="30,6 54,18 54,42 30,54 6,42 6,18" fill="none" stroke={color} strokeWidth="2"/>
        <polygon points="30,14 46,23 46,37 30,46 14,37 14,23" fill="none" stroke={color} strokeWidth="1.5" opacity=".4"/>
        <polygon points="30,22 38,26 38,34 30,38 22,34 22,26" fill={color} opacity=".9" {...cr}/>
      </svg>
    );
    case "specialist": return (
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter:f, animation:"symbolSpin 9s linear infinite reverse" }} shapeRendering="crispEdges">
        <rect x="8" y="8" width="44" height="2" fill={color} {...cr}/><rect x="8" y="50" width="44" height="2" fill={color} {...cr}/>
        <rect x="8" y="8" width="2" height="44" fill={color} {...cr}/><rect x="50" y="8" width="2" height="44" fill={color} {...cr}/>
        <polygon points="30,8 35,20 48,20 38,28 42,41 30,33 18,41 22,28 12,20 25,20" fill={color} opacity=".9" {...cr}/>
        <rect x="27" y="27" width="6" height="6" fill="#010707" {...cr}/>
      </svg>
    );
    case "genius": return (
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter:f, animation:"symbolPulse 2.5s ease-in-out infinite" }} shapeRendering="crispEdges">
        <polygon points="30,4 56,18 56,42 30,56 4,42 4,18" fill="none" stroke={color} strokeWidth="2"/>
        <polygon points="30,12 50,23 50,37 30,48 10,37 10,23" fill="none" stroke={color} strokeWidth="1.5" opacity=".35"/>
        <rect x="4" y="26" width="52" height="8" fill={color} opacity=".18" {...cr}/><rect x="27" y="4" width="6" height="52" fill={color} opacity=".18" {...cr}/>
        <rect x="25" y="25" width="10" height="10" fill={color} {...cr}/>
      </svg>
    );
    case "brainiac": return (
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter:f, animation:"symbolManiac 1.8s ease-in-out infinite" }} shapeRendering="crispEdges">
        <polygon points="30,4 34,20 50,14 40,28 56,30 40,32 50,46 34,40 30,56 26,40 10,46 20,32 4,30 20,28 10,14 26,20" fill="none" stroke={color} strokeWidth="2"/>
        <polygon points="30,18 33,24 40,24 35,29 37,36 30,32 23,36 25,29 20,24 27,24" fill={color} opacity=".9" {...cr}/>
      </svg>
    );
    case "sage": return (
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter:f, animation:"symbolSpin 20s linear infinite" }} shapeRendering="crispEdges">
        <rect x="6" y="6" width="48" height="2" fill={color} opacity=".22" {...cr}/><rect x="6" y="52" width="48" height="2" fill={color} opacity=".22" {...cr}/>
        <rect x="6" y="6" width="2" height="48" fill={color} opacity=".22" {...cr}/><rect x="52" y="6" width="2" height="48" fill={color} opacity=".22" {...cr}/>
        <rect x="11" y="11" width="4" height="4" fill={color} opacity=".8" {...cr}/><rect x="45" y="11" width="4" height="4" fill={color} opacity=".8" {...cr}/>
        <rect x="11" y="45" width="4" height="4" fill={color} opacity=".8" {...cr}/><rect x="45" y="45" width="4" height="4" fill={color} opacity=".8" {...cr}/>
        <rect x="24" y="24" width="12" height="12" fill={color} opacity=".9" {...cr}/>
      </svg>
    );
    case "oracle": return (
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ filter:f, animation:"symbolOracle 4s ease-in-out infinite" }} shapeRendering="crispEdges">
        <rect x="6" y="6" width="48" height="2" fill={color} opacity=".8" {...cr}/><rect x="6" y="52" width="48" height="2" fill={color} opacity=".8" {...cr}/>
        <rect x="6" y="6" width="2" height="48" fill={color} opacity=".8" {...cr}/><rect x="52" y="6" width="2" height="48" fill={color} opacity=".8" {...cr}/>
        <rect x="14" y="14" width="32" height="2" fill={color} opacity=".5" {...cr}/><rect x="14" y="44" width="32" height="2" fill={color} opacity=".5" {...cr}/>
        <rect x="14" y="14" width="2" height="32" fill={color} opacity=".5" {...cr}/><rect x="44" y="14" width="2" height="32" fill={color} opacity=".5" {...cr}/>
        <rect x="28" y="26" width="4" height="8" fill={color} {...cr}/><rect x="26" y="28" width="8" height="4" fill={color} {...cr}/>
      </svg>
    );
    default: return null;
  }
}

function Corners({ color }: { color: string }) {
  const s: React.CSSProperties = { position:"absolute", width:16, height:16 };
  const b = `2px solid ${color}`;
  return <>
    <span style={{...s, top:0, left:0, borderTop:b, borderLeft:b}}/>
    <span style={{...s, top:0, right:0, borderTop:b, borderRight:b}}/>
    <span style={{...s, bottom:0, left:0, borderBottom:b, borderLeft:b}}/>
    <span style={{...s, bottom:0, right:0, borderBottom:b, borderRight:b}}/>
  </>;
}

const CSS = `
@keyframes symbolSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes symbolPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
@keyframes symbolManiac { 0%,100%{transform:rotate(0deg) scale(1)} 25%{transform:rotate(15deg) scale(1.08)} 75%{transform:rotate(-15deg) scale(1.08)} }
@keyframes symbolOracle { 0%,100%{transform:scale(1) rotate(0deg)} 50%{transform:scale(1.1) rotate(45deg)} }
@keyframes borderPulse { 0%,100%{opacity:.4} 50%{opacity:1} }
@keyframes arrowMove { 0%,100%{transform:translateX(0);opacity:.4} 50%{transform:translateX(8px);opacity:1} }
@keyframes barGlow { 0%,100%{opacity:.7} 50%{opacity:1} }
@keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes scanMove { from{transform:translateY(-100%)} to{transform:translateY(100%)} }
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes levelUpPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.08)} }
`;

interface PlayerState { level: number; xp: number; }

export default function RankProgressionScreen({
  player = { level: 5, xp: 1000 },
  onContinue,
}: {
  player?: PlayerState;
  onContinue?: () => void;
}) {
  const [barPct, setBarPct] = useState(0);
  const curRank = getRankForXp(player.xp);
  const nextRank = getNextRank(curRank);
  const progress = getProgress(player.xp, curRank);
  const curKey = getRankKey(curRank.name);
  const curC = RANK_COLORS[curKey] ?? RANK_COLORS.novice;
  const nextKey = nextRank ? getRankKey(nextRank.name) : null;
  const nextC = nextKey ? (RANK_COLORS[nextKey] ?? RANK_COLORS.novice) : RANK_COLORS.oracle;
  const goalReached = progress >= 100;

  useEffect(() => {
    const t = setTimeout(() => setBarPct(progress), 500);
    return () => clearTimeout(t);
  }, [progress]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Enter") onContinue?.(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onContinue]);

  const panelStyle = (c: typeof curC): React.CSSProperties => ({
    position:"relative",
    background:"rgba(0,20,30,0.88)",
    border:`1px solid ${c.primary}44`,
    borderRadius:10,
    padding:"clamp(14px,3vw,28px)",
    flex:"1 1 0",
    minWidth:0,
    display:"flex",
    flexDirection:"column",
    alignItems:"center",
    gap:"clamp(8px,1.5vh,14px)",
    boxShadow:`0 0 24px ${c.glow}0.15), inset 0 0 30px ${c.glow}0.05)`,
    animation:"fadeUp 0.7s ease both",
  });

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight:"100vh", background:"#010d13",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"clamp(12px,4vh,40px) clamp(12px,4vw,48px)",
        fontFamily:"'Courier New',monospace",
        position:"relative", overflow:"hidden",
      }}>
        {/* scanline */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:1}}>
          <div style={{
            position:"absolute",width:"100%",height:"30%",
            background:"linear-gradient(transparent,rgba(0,255,200,0.025),transparent)",
            animation:"scanMove 6s linear infinite",
          }}/>
        </div>
        {/* ambient glow */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",
          background:"radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,255,200,0.04) 0%, transparent 70%)",
        }}/>
        {/* scanlines static */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.1) 3px,rgba(0,0,0,0.1) 4px)",
        }}/>

        {/* Title */}
        <div style={{
          position:"relative", width:"100%", maxWidth:860,
          border:"1px solid rgba(0,255,255,0.3)",
          padding:"10px clamp(14px,3vw,24px)",
          marginBottom:"clamp(14px,3vh,28px)",
          background:"rgba(0,255,200,0.03)",
          animation:"fadeUp 0.5s ease both",
          zIndex:2,
        }}>
          <Corners color="#00ffff"/>
          <span style={{color:"#00ff88",fontSize:"clamp(11px,1.8vw,17px)",fontWeight:700,letterSpacing:"0.25em",textShadow:"0 0 12px #00ff88"}}>
            RANK PROGRESSION
          </span>
        </div>

        {/* Main row */}
        <div style={{
          display:"flex", flexDirection:"row", alignItems:"center",
          gap:"clamp(10px,2.5vw,28px)", width:"100%", maxWidth:860,
          marginBottom:"clamp(16px,3.5vh,32px)", zIndex:2,
        }}>

          {/* LEFT PANEL */}
          <div style={panelStyle(curC)}>
            <Corners color={curC.primary}/>
            <div style={{animation:`borderPulse 2s ease-in-out infinite`,position:"absolute",inset:0,borderRadius:10,
              boxShadow:`0 0 32px ${curC.glow}0.2)`,pointerEvents:"none"}}/>

            <div style={{fontSize:"clamp(8px,1.1vw,11px)",letterSpacing:"0.25em",color:"rgba(0,255,255,0.5)"}}>CURRENT RANK</div>

            <div style={{animation:"float 3s ease-in-out infinite"}}>
              <RankSymbol name={curRank.name} size={Math.max(56, Math.min(80, 72))} color={curC.primary}/>
            </div>

            <div style={{textAlign:"center"}}>
              <div style={{
                color:curC.primary, fontSize:"clamp(18px,3vw,32px)", fontWeight:900,
                letterSpacing:"0.12em", textShadow:`0 0 20px ${curC.primary}`,
              }}>{curRank.name.toUpperCase()}</div>
              <div style={{color:"rgba(0,255,255,0.5)",fontSize:"clamp(8px,1vw,11px)",letterSpacing:"0.18em",marginTop:3}}>
                LV {curRank.level[0]}–{curRank.level[1]}
              </div>
            </div>

            <div style={{width:"100%"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:"clamp(7px,0.9vw,9px)",letterSpacing:"0.2em",color:"rgba(0,255,255,0.45)"}}>XP PROGRESS</span>
                <span style={{fontSize:"clamp(7px,0.9vw,9px)",color:"rgba(0,255,255,0.45)"}}>{player.xp.toLocaleString()}/{curRank.xp[1].toLocaleString()}</span>
              </div>
              <div style={{height:9,background:"rgba(255,255,255,0.06)",borderRadius:5,border:`1px solid ${curC.primary}33`,overflow:"hidden"}}>
                <div style={{
                  height:"100%", borderRadius:5,
                  background:curC.primary,
                  boxShadow:`0 0 12px ${curC.primary}`,
                  width:`${barPct}%`,
                  transition:"width 1.3s cubic-bezier(0.4,0,0.2,1)",
                  animation:"barGlow 1.5s ease-in-out infinite",
                }}/>
              </div>
              <div style={{textAlign:"right",marginTop:3,fontSize:"clamp(7px,0.9vw,9px)",color:"rgba(0,255,255,0.4)"}}>
                {Math.round(progress)}%
              </div>
            </div>

            {goalReached && (
              <div style={{
                width:"100%", border:`1px solid ${curC.primary}66`,
                padding:"clamp(5px,1vh,8px)", textAlign:"center",
                color:curC.primary, fontSize:"clamp(8px,1vw,11px)", letterSpacing:"0.2em",
                background:`${curC.primary}0d`, boxShadow:`0 0 14px ${curC.glow}0.25)`,
              }}>XP GOAL REACHED!</div>
            )}
          </div>

          {/* CENTER */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,flexShrink:0,zIndex:2}}>
            <div style={{
              color:"#00ff88", fontSize:"clamp(9px,1.4vw,15px)", fontWeight:900,
              letterSpacing:"0.25em", textShadow:"0 0 16px #00ff88",
              animation:"levelUpPulse 1.6s ease-in-out infinite", textAlign:"center",
            }}>LEVEL<br/>UP!</div>
            <div style={{display:"flex",gap:3}}>
              {[0,1,2].map(i => (
                <span key={i} style={{
                  color:"#00ff88", fontSize:"clamp(18px,2.5vw,30px)",
                  textShadow:"0 0 16px #00ff88, 0 0 30px #00ff88",
                  display:"block", lineHeight:1,
                  animation:`arrowMove 1s ease-in-out ${i*0.2}s infinite`,
                }}>›</span>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{...panelStyle(nextC), animationDelay:"0.2s", opacity: nextRank ? 1 : 0.5}}>
            <Corners color={nextC.primary}/>
            <div style={{animation:`borderPulse 2.4s ease-in-out infinite`,position:"absolute",inset:0,borderRadius:10,
              boxShadow:`0 0 32px ${nextC.glow}0.15)`,pointerEvents:"none"}}/>

            <div style={{fontSize:"clamp(8px,1.1vw,11px)",letterSpacing:"0.25em",color:"rgba(0,255,255,0.5)"}}>NEXT RANK</div>

            <div style={{animation:"float 3.5s ease-in-out 0.5s infinite", opacity: nextRank ? 1 : 0.35}}>
              <RankSymbol name={nextRank?.name ?? curRank.name} size={Math.max(56, Math.min(80, 72))} color={nextC.primary}/>
            </div>

            <div style={{textAlign:"center"}}>
              <div style={{
                color:nextC.primary, fontSize:"clamp(18px,3vw,32px)", fontWeight:900,
                letterSpacing:"0.12em", textShadow:`0 0 20px ${nextC.primary}`,
              }}>{(nextRank?.name ?? "MAX").toUpperCase()}</div>
              <div style={{color:"rgba(0,255,255,0.5)",fontSize:"clamp(8px,1vw,11px)",letterSpacing:"0.18em",marginTop:3}}>
                {nextRank ? `LV ${nextRank.level[0]}–${nextRank.level[1]}` : "MAX RANK"}
              </div>
            </div>

            <div style={{width:"100%"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:"clamp(7px,0.9vw,9px)",letterSpacing:"0.2em",color:"rgba(0,255,255,0.45)"}}>XP REQUIRED</span>
                <span style={{fontSize:"clamp(7px,0.9vw,9px)",color:"rgba(0,255,255,0.45)"}}>
                  {nextRank ? `${nextRank.xp[0].toLocaleString()}–${nextRank.xp[1].toLocaleString()}` : "—"}
                </span>
              </div>
              <div style={{height:9,background:"rgba(255,255,255,0.06)",borderRadius:5,border:`1px solid ${nextC.primary}33`,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:5,background:nextC.primary,width:"0%",boxShadow:`0 0 8px ${nextC.primary}`}}/>
              </div>
            </div>

            <div style={{
              width:"100%", border:`1px solid ${nextC.primary}55`,
              padding:"clamp(5px,1vh,8px)", textAlign:"center",
              color:nextC.primary, fontSize:"clamp(8px,1vw,11px)", letterSpacing:"0.2em",
              background:`${nextC.primary}0d`, boxShadow:`0 0 14px ${nextC.glow}0.2)`,
              animation:"fadeUp 0.8s ease 1.2s both",
            }}>NEW LEVEL UNLOCKED!</div>
          </div>
        </div>

        {/* Continue */}
        <div style={{zIndex:2,animation:"fadeUp 0.6s ease 0.8s both"}}>
          <button onClick={onContinue} style={{
            background:"transparent", border:"2px solid #00ffff",
            color:"#00ffff", padding:"clamp(9px,1.8vh,15px) clamp(36px,6vw,72px)",
            fontSize:"clamp(11px,1.4vw,15px)", fontWeight:700, letterSpacing:"0.3em",
            fontFamily:"'Courier New',monospace", cursor:"pointer",
            boxShadow:"0 0 18px rgba(0,255,255,0.4)", textShadow:"0 0 8px #00ffff",
            position:"relative", transition:"box-shadow 0.2s, transform 0.1s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow="0 0 40px rgba(0,255,255,0.8),0 0 70px rgba(0,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.transform="scale(1.05)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow="0 0 18px rgba(0,255,255,0.4)"; (e.currentTarget as HTMLButtonElement).style.transform="scale(1)"; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform="scale(0.97)"; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform="scale(1.05)"; }}
          >
            <Corners color="#00ffff"/>
            CONTINUE
          </button>
        </div>

        {/* frame corners */}
        {[{b:true,l:true},{b:true,r:true}].map((fc, i) => (
          <div key={i} style={{
            position:"absolute", width:40, height:40,
            bottom:"clamp(12px,3vh,24px)",
            left:fc.l ? "clamp(12px,3vw,24px)" : "auto",
            right:fc.r ? "clamp(12px,3vw,24px)" : "auto",
            borderBottom:"2px solid rgba(0,255,255,0.35)",
            borderLeft:fc.l ? "2px solid rgba(0,255,255,0.35)" : "none",
            borderRight:fc.r ? "2px solid rgba(0,255,255,0.35)" : "none",
            zIndex:2,
          }}/>
        ))}
      </div>
    </>
  );
}