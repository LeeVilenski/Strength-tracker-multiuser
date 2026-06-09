import { useState } from "react";

export function muscleColor(stats, mgId) {
  const s = stats?.[mgId];

  // Truly untrained — no XP at all
  if (!s || s.effectiveXp === 0) return { fill: "rgba(200,220,255,0.45)", border:"rgba(147,197,253,0.8)", label: "Untrained", effectiveXp: 0 };

  const da = s.lastTrained
    ? Math.floor((new Date() - new Date(s.lastTrained + "T12:00:00")) / 86400000)
    : null;
  const decaying = da !== null && da > 14;
  if (decaying) {
    return { fill:"rgba(251,191,36,0.75)", border:"rgba(245,158,11,0.95)", glow:"#f59e0b", label:`Lv ${s.level} ⚠`, decaying:true, effectiveXp:s.effectiveXp, level:s.level, streak:s.streak||0, lastTrained:s.lastTrained, xpNeeded:s.xpNeeded, currentXp:s.currentXp };
  }

  const level = s.level || 0;
  const streak = s.streak || 0;

  // One distinct colour per level 0–7+
  // Level 0 with XP = light green (started but not levelled yet)
  // Levels progress: green → lime → yellow-green → teal → cyan → blue → indigo → purple
  const LEVEL_COLORS = [
    { fill:"rgba(59,130,246,0.80)",  border:"rgba(37,99,235,0.95)"  },  // 0 — blue (has XP, not levelled yet)
    { fill:"rgba(74,222,128,0.80)",  border:"rgba(22,163,74,0.95)"  },  // 1 — green
    { fill:"rgba(163,230,53,0.80)",  border:"rgba(101,163,13,0.95)" },  // 2 — lime
    { fill:"rgba(250,204,21,0.75)",  border:"rgba(202,138,4,0.95)"  },  // 3 — yellow
    { fill:"rgba(45,212,191,0.80)",  border:"rgba(15,118,110,0.95)" },  // 4 — teal
    { fill:"rgba(56,189,248,0.82)",  border:"rgba(14,165,233,0.95)" },  // 5 — sky blue
    { fill:"rgba(129,140,248,0.85)", border:"rgba(99,102,241,0.95)" },  // 6 — indigo
    { fill:"rgba(192,132,252,0.88)", border:"rgba(168,85,247,0.95)" },  // 7+ — purple
  ];

  const idx = Math.min(level, LEVEL_COLORS.length - 1);
  const c = LEVEL_COLORS[idx];
  return {
    fill: c.fill, border: c.border, glow: c.border,
    label: `Lv ${level}${streak >= 2 ? " 🔥" : ""}`,
    level, effectiveXp: s.effectiveXp, streak,
    lastTrained: s.lastTrained, xpNeeded: s.xpNeeded, currentXp: s.currentXp,
  };
}

// All coordinates are % of rendered image size
// Image has white padding: figure occupies roughly x:32%-68%, y:4%-97%

const FRONT_HOTSPOTS = {
  shoulders: {
    label: "Shoulders",
    regions: [
      { top:18, left:40, width:6, height:5, borderRadius:"50%" },   // L
      { top:18, left:52, width:6, height:5, borderRadius:"50%" },   // R — in 2%
    ],
  },
  chest: {
    label: "Chest",
    regions: [
      { top:26, left:40, width:8, height:7, borderRadius:"40% 30% 50% 40%" },
      { top:26, left:48, width:8, height:7, borderRadius:"30% 40% 40% 50%" },   // R — in 2%
    ],
  },
  biceps: {
    label: "Biceps",
    regions: [
      { top:26, left:33, width:5, height:8, borderRadius:"50%" },
      { top:26, left:60, width:5, height:8, borderRadius:"50%" },   // R — in 2%
    ],
  },
  core: {
    label: "Core",
    regions: [
      { top:36, left:42, width:6, height:6, borderRadius:"30%" },
      { top:36, left:48, width:6, height:6, borderRadius:"30%" },   // R — in 2%
      { top:42, left:43, width:5, height:5, borderRadius:"30%" },
      { top:42, left:48, width:5, height:5, borderRadius:"30%" },   // R — in 2%
    ],
  },
  quads: {
    label: "Quads",
    regions: [
      { top:53, left:40, width:8, height:16, borderRadius:"40% 40% 35% 35%" },
      { top:53, left:49, width:8, height:16, borderRadius:"40% 40% 35% 35%" },
    ],
  },
  calves: {
    label: "Calves",
    regions: [
      { top:73, left:41, width:6, height:10, borderRadius:"40% 40% 30% 30%" },
      { top:73, left:50, width:6, height:10, borderRadius:"40% 40% 30% 30%" },
    ],
  },
};

const BACK_HOTSPOTS = {
  shoulders: {
    label: "Shoulders",
    regions: [
      { top:18, left:41, width:6, height:5, borderRadius:"50%" },   // L — in 1%
      { top:18, left:54, width:6, height:5, borderRadius:"50%" },   // R — in 5%
    ],
  },
  back: {
    label: "Back",
    regions: [
      { top:24, left:43, width:8, height:11, borderRadius:"20% 30% 40% 20%" },
      { top:24, left:53, width:8, height:11, borderRadius:"30% 20% 20% 40%" },
    ],
  },
  triceps: {
    label: "Triceps",
    regions: [
      { top:24, left:35, width:6, height:10, borderRadius:"50%" },
      { top:24, left:62, width:6, height:10, borderRadius:"50%" },  // R — in 3%
    ],
  },
  glutes: {
    label: "Glutes",
    regions: [
      { top:45, left:44, width:7, height:8, borderRadius:"50% 30% 35% 50%" },
      { top:45, left:53, width:7, height:8, borderRadius:"30% 50% 50% 35%" },
    ],
  },
  hamstrings: {
    label: "Hamstrings",
    regions: [
      { top:54, left:43, width:7, height:14, borderRadius:"40% 40% 35% 35%" },
      { top:54, left:53, width:7, height:14, borderRadius:"40% 40% 35% 35%" },
    ],
  },
  calves: {
    label: "Calves",
    regions: [
      { top:73, left:44, width:6, height:10, borderRadius:"40% 40% 30% 30%" },
      { top:73, left:53, width:6, height:10, borderRadius:"40% 40% 30% 30%" },
    ],
  },
};

const MG_COLORS = {
  chest:"#ef4444", back:"#8b5cf6", shoulders:"#0891b2", triceps:"#d97706",
  biceps:"#16a34a", core:"#db2777", quads:"#7c3aed", hamstrings:"#6d28d9",
  glutes:"#be185d", calves:"#0369a1",
};

function MusclePopup({ mgId, muscle, stats, onClose }) {
  const s = stats?.[mgId];
  const da = s?.lastTrained
    ? Math.floor((new Date() - new Date(s.lastTrained + "T12:00:00")) / 86400000)
    : null;
  const pct    = s ? Math.min(100, Math.round((s.currentXp / s.xpNeeded) * 100)) : 0;
  const streak = s?.streak || 0;
  const color  = MG_COLORS[mgId] || "#2563eb";
  const level  = s?.level || 0;
  const decaying = da !== null && da > 14;

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:500 }}
      onClick={onClose}
    >
      <div
        style={{ background:"#fff", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:520, padding:"20px 20px 36px" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width:36, height:4, background:"#e2e8f0", borderRadius:2, margin:"0 auto 18px" }}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:24, fontWeight:"700", color:"#111827" }}>{muscle.label}</div>
            {decaying
              ? <div style={{ fontSize:13, color:"#f59e0b", fontWeight:"500", marginTop:3 }}>⚠ Decaying — train this week to stop XP loss</div>
              : <div style={{ fontSize:13, color:"#6b7280", marginTop:3 }}>
                  {da===null ? "Never trained" : da===0 ? "Trained today" : `Last trained ${da} day${da===1?"":"s"} ago`}
                </div>
            }
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:36, fontWeight:"800", color, lineHeight:1 }}>{level}</div>
            <div style={{ fontSize:11, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.05em" }}>Level</div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:12, color:"#6b7280", fontWeight:"500" }}>XP to next level</span>
            <span style={{ fontSize:12, color, fontWeight:"600" }}>{s?.currentXp||0} / {s?.xpNeeded||160}</span>
          </div>
          <div style={{ background:"#f1f5f9", borderRadius:99, height:12, overflow:"hidden" }}>
            <div style={{ height:"100%", background:color, borderRadius:99, width:`${pct}%`, transition:"width 0.4s" }}/>
          </div>
          <div style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>{s?.effectiveXp||0} total XP earned</div>
        </div>

        {streak > 0 && (
          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"10px 14px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:16, lineHeight:1, marginBottom:4 }}>
                {Array.from({length:5},(_,i) => <span key={i} style={{opacity:i<streak?1:0.2}}>🔥</span>)}
              </div>
              <div style={{ fontSize:12, color:"#a16207" }}>{streak}-week streak · keep it up!</div>
            </div>
            <div style={{ fontSize:20, fontWeight:"700", color:"#d97706" }}>{(1+(streak-1)*0.2).toFixed(1)}x XP</div>
          </div>
        )}

        {s && level < 10 && (
          <div style={{ fontSize:12, color:"#9ca3af", textAlign:"center", marginBottom:16 }}>
            {s.xpNeeded - s.currentXp} XP to reach Level {level+1}
          </div>
        )}

        <button onClick={onClose} style={{ width:"100%", padding:"13px", background:"#f1f5f9", border:"none", borderRadius:10, fontSize:14, fontWeight:"600", color:"#374151", cursor:"pointer", fontFamily:"inherit" }}>
          Close
        </button>
      </div>
    </div>
  );
}

export default function BodyMap({ stats, onSelect, selectedMuscle }) {
  const [view,  setView]  = useState("front");
  const [popup, setPopup] = useState(null);
  const hotspots = view === "front" ? FRONT_HOTSPOTS : BACK_HOTSPOTS;

  function handleTap(mgId) {
    setPopup(mgId);
    onSelect(mgId);
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
        {["front","back"].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding:"6px 28px", background:"none", border:"none",
            borderBottom: view===v ? "2px solid #2563eb" : "2px solid transparent",
            color: view===v ? "#2563eb" : "#6b7280",
            fontSize:12, fontWeight: view===v ? "600":"400",
            cursor:"pointer", fontFamily:"inherit",
            textTransform:"uppercase", letterSpacing:"0.06em",
          }}>{v}</button>
        ))}
      </div>

      {/* Image + hotspots */}
      <div style={{ position:"relative", width:"100%", maxWidth:300, margin:"0 auto" }}>
        <img
          src={`/${view}.jpg`}
          alt={`${view} muscles`}
          style={{ width:"100%", display:"block", userSelect:"none", pointerEvents:"none" }}
          draggable={false}
        />
        {Object.entries(hotspots).map(([mgId, muscle]) => {
          const mc = muscleColor(stats, mgId);
          const isSelected = selectedMuscle === mgId;
          return muscle.regions.map((r, i) => (
            <div
              key={`${mgId}-${i}`}
              onClick={() => handleTap(mgId)}
              title={muscle.label}
              style={{
                position:"absolute",
                top:`${r.top}%`, left:`${r.left}%`,
                width:`${r.width}%`, height:`${r.height}%`,
                borderRadius: r.borderRadius||"50%",
                background: mc.fill,
                border: `2px solid ${mc.border||"transparent"}`,
                boxShadow: mc.glow && mc.effectiveXp>0
                  ? `0 0 ${8+(mc.level||0)*4}px ${mc.glow}`
                  : isSelected ? "0 0 0 2px #1e293b" : "none",
                cursor:"pointer",
                transition:"all 0.3s",
              }}
            />
          ));
        })}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:"6px 14px", marginTop:12 }}>
        {[
          { label:"Untrained", color:"rgba(200,220,255,0.6)", border:"1px solid rgba(147,197,253,0.8)" },
          { label:"Lv 0",  color:"rgba(59,130,246,0.85)"  },
          { label:"Lv 1",  color:"rgba(74,222,128,0.85)"  },
          { label:"Lv 2",  color:"rgba(163,230,53,0.85)"  },
          { label:"Lv 3",  color:"rgba(250,204,21,0.85)"  },
          { label:"Lv 4",  color:"rgba(45,212,191,0.85)"  },
          { label:"Lv 5",  color:"rgba(56,189,248,0.85)"  },
          { label:"Lv 6",  color:"rgba(129,140,248,0.9)"  },
          { label:"Lv 7+", color:"rgba(192,132,252,0.9)"  },
          { label:"Decaying", color:"rgba(251,191,36,0.85)" },
        ].map(l => (
          <div key={l.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:11, height:11, borderRadius:3, background:l.color, border:l.border||"none", flexShrink:0 }}/>
            <span style={{ fontSize:11, color:"#6b7280" }}>{l.label}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign:"center", fontSize:11, color:"#9ca3af", marginTop:6 }}>Tap a muscle to see details</div>

      {popup && hotspots[popup] && (
        <MusclePopup mgId={popup} muscle={hotspots[popup]} stats={stats} onClose={() => setPopup(null)}/>
      )}
    </div>
  );
}
