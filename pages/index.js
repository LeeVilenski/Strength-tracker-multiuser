import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { MUSCLE_GROUPS as BUILTIN_MUSCLE_GROUPS, computeMuscleStats, diffMuscleStats, detectPBs, generateMonthlyChallenge, computeChallengeProgress, xpForExercise, totalRepsFromValue, bestWeightFromValue, summariseSets } from "../lib/game";
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES, getExercisesByCategory } from "../lib/exercises";
import BodyMap from "../components/BodyMap";

const EMOJI_OPTIONS = ["💪","🏋️","🔱","⚡","💥","🎯","🦵","🦶","🔥","❤️","🌊","⛰️","🛡️","🎖️","🧗","🤸"];
const COLOR_OPTIONS = [
  {color:"#ef4444",lightBg:"#fef2f2",border:"#fecaca"},{color:"#8b5cf6",lightBg:"#f5f3ff",border:"#ddd6fe"},
  {color:"#0891b2",lightBg:"#ecfeff",border:"#a5f3fc"},{color:"#d97706",lightBg:"#fffbeb",border:"#fde68a"},
  {color:"#16a34a",lightBg:"#f0fdf4",border:"#bbf7d0"},{color:"#db2777",lightBg:"#fdf2f8",border:"#fbcfe8"},
  {color:"#2563eb",lightBg:"#eff6ff",border:"#bfdbfe"},{color:"#0d9488",lightBg:"#f0fdfa",border:"#99f6e4"},
  {color:"#7c3aed",lightBg:"#faf5ff",border:"#e9d5ff"},{color:"#b45309",lightBg:"#fefce8",border:"#fef08a"},
];

function slugify(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");}
function fmtDist(m){return m>=1000?`${(m/1000).toFixed(1)}km`:`${Math.round(m)}m`;}
function fmtDuration(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h>0?`${h}h ${m}m`:`${m}min`;}
function fmtPace(minKm){if(!minKm||isNaN(minKm))return "—";const m=Math.floor(minKm);const s=Math.round((minKm-m)*60);return `${m}:${String(s).padStart(2,"0")}/km`;}
function dayLabel(d){if(!d)return "";return new Date(d+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});}
function monthLabel(monthKey){const [y,m]=monthKey.split("-").map(Number);return new Date(y,m-1,1).toLocaleDateString("en-GB",{month:"long",year:"numeric"});}

// Group runs by calendar month -> [{key:"YYYY-MM", km, durationSec, pace, count}], most recent first
function groupRunsByMonth(runs){
  const map={};
  for(const r of runs){
    if(!r.date) continue;
    const key=r.date.slice(0,7);
    if(!map[key]) map[key]={key,km:0,durationSec:0,count:0};
    map[key].km+=r.distance/1000;
    map[key].durationSec+=r.duration;
    map[key].count++;
  }
  return Object.values(map).map(m=>({...m,pace:m.km>0?(m.durationSec/60)/m.km:null})).sort((a,b)=>b.key.localeCompare(a.key));
}
// Distance buckets — each spans from its own distance up to (but not including) the
// next bucket's distance. The final bucket (Marathon) is open-ended.
const DISTANCE_BUCKETS=[
  {label:"Under 2 Mile",   meters:0},
  {label:"2 Mile",         meters:3219},
  {label:"5K",             meters:5000},
  {label:"5 Mile",         meters:8047},
  {label:"10K",            meters:10000},
  {label:"15K",            meters:15000},
  {label:"Half Marathon",  meters:21098},
  {label:"30K",            meters:30000},
  {label:"Marathon",       meters:42195},
];
// Bucket every run into the largest distance bucket it reaches -> [{label, meters, count}]
function countRunsByDistance(runs){
  return DISTANCE_BUCKETS.map((b,i)=>{
    const next=DISTANCE_BUCKETS[i+1];
    return {
      ...b,
      count: runs.filter(r=>r.distance>=b.meters&&(!next||r.distance<next.meters)).length,
    };
  });
}
// Group strength sessions by calendar month -> [{key:"YYYY-MM", count, durationSec}], most recent first
function groupStrengthByMonth(sessions){
  const map={};
  for(const s of sessions){
    if(!s.date) continue;
    const key=s.date.slice(0,7);
    if(!map[key]) map[key]={key,count:0,durationSec:0};
    map[key].count++;
    map[key].durationSec+=s.duration;
  }
  return Object.values(map).sort((a,b)=>b.key.localeCompare(a.key));
}
function hrColor(hr){if(!hr)return "#9ca3af";if(hr<120)return "#16a34a";if(hr<140)return "#65a30d";if(hr<160)return "#d97706";if(hr<175)return "#ea580c";return "#dc2626";}
function isStrengthType(t){return["WeightTraining","Workout","Crossfit","HighIntensityIntervalTraining","Yoga","Pilates","RockClimbing"].includes(t);}
function daysAgo(d){if(!d)return null;return Math.floor((new Date()-new Date(d+"T12:00:00"))/86400000);}

const C={bg:"#f4f5f7",surface:"#ffffff",border:"#e5e7eb",text:"#111827",textSecondary:"#374151",textMuted:"#6b7280",textFaint:"#9ca3af",orange:"#ea580c",orangeLight:"#fff7ed",orangeBorder:"#fed7aa",blue:"#2563eb",blueLight:"#eff6ff",blueBorder:"#bfdbfe",green:"#16a34a",greenLight:"#f0fdf4",greenBorder:"#bbf7d0",red:"#dc2626",redLight:"#fef2f2",redBorder:"#fecaca"};
const S={
  page:{fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",color:C.text,maxWidth:520,margin:"0 auto"},
  header:{background:C.surface,padding:"24px 20px 0",borderBottom:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"},
  body:{padding:"20px 16px 80px"},
  card:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:12,boxShadow:"0 1px 2px rgba(0,0,0,0.04)"},
  sectionLabel:{fontSize:11,color:C.textMuted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12,fontWeight:"600"},
  navBtn:(a)=>({flex:1,padding:"10px 0",background:"none",border:"none",borderBottom:a?`2px solid ${C.blue}`:"2px solid transparent",color:a?C.blue:C.textMuted,fontSize:10,letterSpacing:"0.05em",textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",fontWeight:a?"600":"400"}),
  btn:(v="primary")=>({padding:"10px 18px",borderRadius:8,cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:"600",border:"none",...(v==="primary"?{background:C.blue,color:"#fff"}:{}),...(v==="ghost"?{background:"none",color:C.textMuted,border:`1px solid ${C.border}`}:{}),...(v==="danger"?{background:"none",color:C.red,border:`1px solid ${C.redBorder}`}:{}),...(v==="sm"?{padding:"6px 12px",fontSize:12,background:C.blue,color:"#fff",border:"none"}:{})}),
  input:{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:14,boxSizing:"border-box",fontFamily:"inherit",outline:"none"},
  statCard:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px",textAlign:"center",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"},
};

// labels[i] / formatValue(displayValues[i]) drive the hover/tap tooltip;
// displayValues defaults to values when not given (e.g. pace sparklines plot 1/pace but want to show pace).
function Sparkline({values,color="#2563eb",width=100,height=36,labels,displayValues,formatValue}){
  const [hover,setHover]=useState(null);
  if(!values||values.length<2)return <span style={{color:C.textFaint,fontSize:12}}>not enough data yet</span>;
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1,w=typeof width==="number"?width:100;
  const pts=values.map((v,i)=>({x:(i/(values.length-1))*w,y:height-((v-min)/range)*(height-6)-3}));
  const ptsStr=pts.map(p=>`${p.x},${p.y}`).join(" ");
  const lp=pts[pts.length-1];
  const showVals=displayValues||values;
  const fmt=formatValue||(v=>String(v));

  function handleMove(e){
    const rect=e.currentTarget.getBoundingClientRect();
    const clientX=e.touches?e.touches[0].clientX:e.clientX;
    const x=((clientX-rect.left)/rect.width)*w;
    const idx=Math.max(0,Math.min(values.length-1,Math.round((x/w)*(values.length-1))));
    setHover(idx);
  }

  return(
    <div style={{position:"relative",width:w}}>
      <svg width={w} height={height} style={{display:"block",overflow:"visible",touchAction:"none",cursor:"crosshair"}}
        onMouseMove={handleMove} onMouseLeave={()=>setHover(null)}
        onTouchStart={handleMove} onTouchMove={handleMove} onTouchEnd={()=>setHover(null)}>
        <polyline points={ptsStr} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={lp.x} cy={lp.y} r="3" fill={color}/>
        {hover!=null&&<>
          <line x1={pts[hover].x} y1="0" x2={pts[hover].x} y2={height} stroke={color} strokeWidth="1" strokeDasharray="2,2" opacity="0.35"/>
          <circle cx={pts[hover].x} cy={pts[hover].y} r="4" fill={color} stroke="#fff" strokeWidth="1.5"/>
        </>}
      </svg>
      {hover!=null&&(
        <div style={{position:"absolute",bottom:height+6,left:Math.min(Math.max(pts[hover].x,30),w-30),transform:"translateX(-50%)",background:"#111827",color:"#fff",borderRadius:6,padding:"4px 8px",fontSize:11,fontWeight:"600",whiteSpace:"nowrap",pointerEvents:"none",zIndex:10,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
          {labels&&<div style={{fontSize:9,color:"#9ca3af",fontWeight:"500"}}>{labels[hover]}</div>}
          {fmt(showVals[hover])}
        </div>
      )}
    </div>
  );
}

// ── Compute 4-week buckets (Mon-Sun) going back from today ──
function getWeekBuckets(n=8){
  const buckets=[];
  const now=new Date();
  // Find last Monday
  const day=now.getDay(); // 0=Sun
  const lastMon=new Date(now);
  lastMon.setDate(now.getDate()-((day+6)%7));
  lastMon.setHours(0,0,0,0);
  for(let i=n-1;i>=0;i--){
    const start=new Date(lastMon);start.setDate(lastMon.getDate()-i*7);
    const end=new Date(start);end.setDate(start.getDate()+6);end.setHours(23,59,59,999);
    const label=start.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
    buckets.push({start,end,label,key:start.toISOString().slice(0,10)});
  }
  return buckets;
}

function actInBucket(act, bucket){
  if(!act.date) return false;
  const d=new Date(act.date+"T12:00:00");
  return d>=bucket.start && d<=bucket.end;
}

// ── Dual line chart: run km + strength mins per week ──
function WeeklyLineChart({runs, strength}){
  const [hover,setHover]=useState(null);
  const weeks=getWeekBuckets(8);
  const runKm=weeks.map(w=>runs.filter(r=>actInBucket(r,w)).reduce((acc,r)=>acc+(r.distance/1000),0));
  const strMins=weeks.map(w=>strength.filter(s=>actInBucket(s,w)).reduce((acc,s)=>acc+(s.duration/60),0));

  const W=340, H=110, PAD={t:10,b:28,l:36,r:28};
  const cw=W-PAD.l-PAD.r, ch=H-PAD.t-PAD.b;
  const maxKm=Math.max(...runKm,1);
  const maxMins=Math.max(...strMins,1);
  const n=weeks.length;

  function xPos(i){ return PAD.l + (i/(n-1))*cw; }
  function yRun(v){ return PAD.t + ch - (v/maxKm)*ch; }
  function yStr(v){ return PAD.t + ch - (v/maxMins)*ch; }

  const runPts=runKm.map((v,i)=>`${xPos(i)},${yRun(v)}`).join(" ");
  const strPts=strMins.map((v,i)=>`${xPos(i)},${yStr(v)}`).join(" ");

  // Y axis ticks — km on the left (run line), minutes on the right (strength line)
  const yTicks=[0, Math.round(maxKm/2), Math.round(maxKm)];
  const minTicks=[0, Math.round(maxMins/2), Math.round(maxMins)];

  function handleMove(e){
    const rect=e.currentTarget.getBoundingClientRect();
    const clientX=e.touches?e.touches[0].clientX:e.clientX;
    const x=((clientX-rect.left)/rect.width)*W;
    const idx=Math.max(0,Math.min(n-1,Math.round((x-PAD.l)/cw*(n-1))));
    setHover(idx);
  }

  return(
    <div style={{overflowX:"auto",position:"relative"}}>
      <svg width={W} height={H} style={{display:"block",fontFamily:"Inter,sans-serif",touchAction:"none",cursor:"crosshair"}}
        onMouseMove={handleMove} onMouseLeave={()=>setHover(null)}
        onTouchStart={handleMove} onTouchMove={handleMove} onTouchEnd={()=>setHover(null)}>
        {/* Grid lines */}
        {yTicks.map(t=>(
          <line key={t} x1={PAD.l} x2={W-PAD.r} y1={yRun(t)} y2={yRun(t)} stroke="#f3f4f6" strokeWidth="1"/>
        ))}
        {/* Y axis labels (km, left — matches run line color) */}
        {yTicks.map(t=>(
          <text key={"l"+t} x={PAD.l-4} y={yRun(t)+4} textAnchor="end" fontSize="9" fill="#fb923c">{t}</text>
        ))}
        {/* Y axis labels (mins, right — matches strength line color) */}
        {minTicks.map(t=>(
          <text key={"r"+t} x={W-PAD.r+6} y={yStr(t)+4} textAnchor="start" fontSize="9" fill={C.blue}>{t}</text>
        ))}
        {/* Strength area fill */}
        {strMins.some(v=>v>0)&&(
          <polyline points={strPts} fill="none" stroke={C.blue} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="none" opacity="0.8"/>
        )}
        {/* Run line */}
        <polyline points={runPts} fill="none" stroke="#fb923c" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {/* Data point dots */}
        {runKm.map((v,i)=>v>0&&<circle key={i} cx={xPos(i)} cy={yRun(v)} r="3" fill="#fb923c"/>)}
        {strMins.map((v,i)=>v>0&&<circle key={i} cx={xPos(i)} cy={yStr(v)} r="3" fill={C.blue}/>)}
        {/* X axis labels — every other week to avoid crowding */}
        {weeks.map((w,i)=>(i%2===0||i===n-1)&&(
          <text key={i} x={xPos(i)} y={H-4} textAnchor="middle" fontSize="9" fill={C.textFaint}>{w.label}</text>
        ))}
        {/* Hover guideline + highlighted points */}
        {hover!=null&&<>
          <line x1={xPos(hover)} y1={PAD.t} x2={xPos(hover)} y2={PAD.t+ch} stroke="#9ca3af" strokeWidth="1" strokeDasharray="2,2" opacity="0.5"/>
          <circle cx={xPos(hover)} cy={yRun(runKm[hover])} r="4" fill="#fb923c" stroke="#fff" strokeWidth="1.5"/>
          <circle cx={xPos(hover)} cy={yStr(strMins[hover])} r="4" fill={C.blue} stroke="#fff" strokeWidth="1.5"/>
        </>}
      </svg>
      {hover!=null&&(
        <div style={{position:"absolute",top:0,left:Math.min(Math.max(xPos(hover),60),W-60),transform:"translateX(-50%)",background:"#111827",color:"#fff",borderRadius:6,padding:"6px 10px",fontSize:11,whiteSpace:"nowrap",pointerEvents:"none",zIndex:10,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
          <div style={{fontSize:9,color:"#9ca3af",fontWeight:"500",marginBottom:2}}>Week of {weeks[hover].label}</div>
          <div style={{color:"#fb923c",fontWeight:"600"}}>{runKm[hover].toFixed(1)} km run</div>
          <div style={{color:"#60a5fa",fontWeight:"600"}}>{Math.round(strMins[hover])} min strength</div>
        </div>
      )}
    </div>
  );
}

// ── Running stats panel ──
function RunStatsPanel({runs}){
  const weeks=getWeekBuckets(4);
  const weeklyKm=weeks.map(w=>runs.filter(r=>actInBucket(r,w)).reduce((acc,r)=>acc+(r.distance/1000),0));
  const thisWeekKm=weeklyKm[weeklyKm.length-1];
  const lastWeekKm=weeklyKm[weeklyKm.length-2]||0;
  const avgWeekKm=weeklyKm.reduce((a,b)=>a+b,0)/4;

  // Pace trend (avg speed of runs > 1km, last 8 runs)
  const recentRuns=[...runs].filter(r=>r.distance>1000&&r.duration>0).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).reverse();
  const paces=recentRuns.map(r=>(r.duration/60)/(r.distance/1000)); // min/km
  const latestPace=paces[paces.length-1];
  const firstPace=paces[0];
  const paceImproved=latestPace&&firstPace&&latestPace<firstPace;

  // Best effort run (highest relative_effort)
  const bestEffort=[...runs].sort((a,b)=>(b.effort||0)-(a.effort||0))[0];
  // Longest run
  const longest=[...runs].sort((a,b)=>b.distance-a.distance)[0];
  // Total elevation
  const totalElev=runs.reduce((acc,r)=>acc+(r.elevation||0),0);

  const weekChange=lastWeekKm>0?Math.round(((thisWeekKm-lastWeekKm)/lastWeekKm)*100):null;

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div style={{background:C.orangeLight,border:`1px solid ${C.orangeBorder}`,borderRadius:10,padding:"12px"}}>
          <div style={{fontSize:11,color:"#c2410c",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>This week</div>
          <div style={{fontSize:24,fontWeight:"700",color:C.orange}}>{thisWeekKm.toFixed(1)}<span style={{fontSize:13,fontWeight:"500"}}> km</span></div>
          {weekChange!==null&&<div style={{fontSize:11,color:weekChange>=0?C.green:C.red,fontWeight:"500",marginTop:2}}>{weekChange>=0?"↑":"↓"} {Math.abs(weekChange)}% vs last week</div>}
        </div>
        <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px"}}>
          <div style={{fontSize:11,color:C.textMuted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>4-week avg</div>
          <div style={{fontSize:24,fontWeight:"700",color:C.textSecondary}}>{avgWeekKm.toFixed(1)}<span style={{fontSize:13,fontWeight:"500"}}> km/wk</span></div>
          <div style={{fontSize:11,color:C.textFaint,marginTop:2}}>{totalElev.toFixed(0)}m elevation total</div>
        </div>
      </div>
      {/* Pace trend */}
      {paces.length>=2&&(
        <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <div style={{fontSize:11,color:C.textMuted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em"}}>Pace trend</div>
              <div style={{fontSize:11,color:paceImproved?C.green:"#d97706",fontWeight:"500",marginTop:2}}>{paceImproved?"↓ Getting faster":"→ Holding steady"}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:18,fontWeight:"700",color:paceImproved?C.green:C.textSecondary}}>{fmtPace(latestPace)}</div>
              <div style={{fontSize:10,color:C.textFaint}}>latest avg</div>
            </div>
          </div>
          <Sparkline values={paces.map(p=>1/p)} color={C.orange} width={260} height={30} displayValues={paces} formatValue={fmtPace} labels={recentRuns.map(r=>dayLabel(r.date))}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            <span style={{fontSize:10,color:C.textFaint}}>{fmtPace(firstPace)}</span>
            <span style={{fontSize:10,color:C.textFaint}}>now: {fmtPace(latestPace)}</span>
          </div>
        </div>
      )}
      {/* Highlights */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {longest&&<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px"}}>
          <div style={{fontSize:10,color:C.textMuted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>🏅 Longest run</div>
          <div style={{fontSize:18,fontWeight:"700",color:C.textSecondary}}>{fmtDist(longest.distance)}</div>
          <div style={{fontSize:10,color:C.textFaint,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{longest.name}</div>
        </div>}
        {bestEffort&&bestEffort.effort>0&&<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px"}}>
          <div style={{fontSize:10,color:C.textMuted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>🔥 Hardest effort</div>
          <div style={{fontSize:18,fontWeight:"700",color:C.textSecondary}}>{bestEffort.effort} pts</div>
          <div style={{fontSize:10,color:C.textFaint,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{bestEffort.name}</div>
        </div>}
      </div>
    </div>
  );
}

// ── Strength stats panel ──
function StrengthStatsPanel({strength}){
  const weeks=getWeekBuckets(4);
  const weeklyMins=weeks.map(w=>strength.filter(s=>actInBucket(s,w)).reduce((acc,s)=>acc+(s.duration/60),0));
  const weeklySessions=weeks.map(w=>strength.filter(s=>actInBucket(s,w)).length);
  const thisWeekMins=weeklyMins[weeklyMins.length-1];
  const lastWeekMins=weeklyMins[weeklyMins.length-2]||0;
  const avgWeekMins=weeklyMins.reduce((a,b)=>a+b,0)/4;
  const weekChange=lastWeekMins>0?Math.round(((thisWeekMins-lastWeekMins)/lastWeekMins)*100):null;

  if(strength.length===0) return(
    <div style={{textAlign:"center",padding:"20px 0",color:C.textFaint,fontSize:13}}>No strength sessions yet — record one on your Forerunner as Workout or Strength Training.</div>
  );

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div style={{background:C.blueLight,border:`1px solid ${C.blueBorder}`,borderRadius:10,padding:"12px"}}>
          <div style={{fontSize:11,color:"#1d4ed8",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>This week</div>
          <div style={{fontSize:24,fontWeight:"700",color:C.blue}}>{Math.round(thisWeekMins)}<span style={{fontSize:13,fontWeight:"500"}}> min</span></div>
          {weekChange!==null&&<div style={{fontSize:11,color:weekChange>=0?C.green:C.red,fontWeight:"500",marginTop:2}}>{weekChange>=0?"↑":"↓"} {Math.abs(weekChange)}% vs last week</div>}
        </div>
        <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px"}}>
          <div style={{fontSize:11,color:C.textMuted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>4-week avg</div>
          <div style={{fontSize:24,fontWeight:"700",color:C.textSecondary}}>{avgWeekMins.toFixed(0)}<span style={{fontSize:13,fontWeight:"500"}}> min/wk</span></div>
          <div style={{fontSize:11,color:C.textFaint,marginTop:2}}>{(weeklySessions.reduce((a,b)=>a+b,0)/4).toFixed(1)} sessions/wk</div>
        </div>
      </div>
      {/* Weekly sessions sparkline */}
      {weeklySessions.some(v=>v>0)&&(
        <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px"}}>
          <div style={{fontSize:11,color:C.textMuted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Sessions per week</div>
          <Sparkline values={weeklySessions} color={C.blue} width={260} height={30} labels={weeks.map(w=>w.label)} formatValue={v=>`${v} session${v===1?"":"s"}`}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            {weeks.map((w,i)=><span key={i} style={{fontSize:9,color:C.textFaint}}>{weeklySessions[i]||"—"}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Runs tab: YTD/all-time stats, monthly breakdown, run list linking out to Strava ──
function RunsTab({runs}){
  if(runs.length===0)return(
    <div style={{...S.card,color:C.textMuted,fontSize:14,textAlign:"center",padding:"40px 16px"}}>No runs yet.</div>
  );

  const sortedRuns=[...runs].sort((a,b)=>b.date.localeCompare(a.date));
  const totalRunKm=runs.reduce((acc,r)=>acc+r.distance/1000,0);
  const totalRunSec=runs.reduce((acc,r)=>acc+r.duration,0);
  const overallPace=totalRunKm>0?(totalRunSec/60)/totalRunKm:null;

  const currentYear=new Date().getFullYear();
  const ytdRuns=runs.filter(r=>r.date?.startsWith(String(currentYear)));
  const ytdKm=ytdRuns.reduce((acc,r)=>acc+r.distance/1000,0);
  const ytdSec=ytdRuns.reduce((acc,r)=>acc+r.duration,0);
  const ytdPace=ytdKm>0?(ytdSec/60)/ytdKm:null;

  const monthly=groupRunsByMonth(runs).slice(0,12);
  const maxMonthKm=Math.max(...monthly.map(m=>m.km),1);
  const milestones=countRunsByDistance(runs);

  const statCard=(value,label,color=C.textSecondary)=>(
    <div style={S.statCard}>
      <div style={{fontSize:18,fontWeight:"700",color}}>{value}</div>
      <div style={{fontSize:11,color:C.textMuted,marginTop:4,fontWeight:"500"}}>{label}</div>
    </div>
  );

  return(<>
    <div style={S.sectionLabel}>{currentYear} so far</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
      {statCard(<>{ytdKm.toFixed(0)}<span style={{fontSize:12,fontWeight:"500"}}> km</span></>,"YTD distance",C.orange)}
      {statCard(fmtDuration(ytdSec),"YTD time")}
      {statCard(fmtPace(ytdPace),"YTD avg pace")}
    </div>

    <div style={S.sectionLabel}>All time</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
      {statCard(runs.length,"Total runs",C.orange)}
      {statCard(<>{totalRunKm.toFixed(0)}<span style={{fontSize:12,fontWeight:"500"}}> km</span></>,"Total distance")}
      {statCard(fmtPace(overallPace),"Avg pace")}
    </div>

    <div style={S.sectionLabel}>Run distances</div>
    <div style={{...S.card,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {milestones.map(m=>(
        <div key={m.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:m.count>0?C.orangeLight:C.bg,border:`1px solid ${m.count>0?C.orangeBorder:C.border}`,borderRadius:8}}>
          <span style={{fontSize:13,color:m.count>0?C.text:C.textMuted,fontWeight:"500"}}>{m.label}</span>
          <span style={{fontSize:16,fontWeight:"700",color:m.count>0?C.orange:C.textFaint}}>{m.count}</span>
        </div>
      ))}
    </div>

    {monthly.length>0&&(<>
      <div style={S.sectionLabel}>By month</div>
      <div style={S.card}>
        {monthly.map((m,idx)=>(
          <div key={m.key} style={{marginBottom:idx<monthly.length-1?10:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3,gap:8}}>
              <span style={{fontSize:13,color:C.text,fontWeight:"500",whiteSpace:"nowrap"}}>{monthLabel(m.key)}</span>
              <span style={{fontSize:12,color:C.textMuted,whiteSpace:"nowrap"}}>{m.km.toFixed(1)}km · {fmtDuration(m.durationSec)} · {fmtPace(m.pace)}</span>
            </div>
            <div style={{height:6,background:C.bg,borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.max(2,(m.km/maxMonthKm)*100)}%`,background:C.orange,borderRadius:3}}/>
            </div>
          </div>
        ))}
      </div>
    </>)}

    <div style={S.sectionLabel}>Runs ({runs.length} total · {totalRunKm.toFixed(0)}km)</div>
    <div style={S.card}>
      {sortedRuns.map((r,idx)=>(
        <a key={r.id} href={`https://www.strava.com/activities/${r.id}`} target="_blank" rel="noopener noreferrer"
          style={{display:"flex",gap:12,alignItems:"center",textDecoration:"none",color:"inherit",borderBottom:idx<sortedRuns.length-1?`1px solid ${C.border}`:"none",paddingBottom:idx<sortedRuns.length-1?12:0,marginBottom:idx<sortedRuns.length-1?12:0}}>
          <div style={{width:36,height:36,borderRadius:8,background:C.orangeLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}}>🏃</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,color:C.text,fontWeight:"500",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</div><div style={{fontSize:12,color:C.textMuted,marginTop:2}}>{dayLabel(r.date)}{r.avg_hr&&<span style={{color:hrColor(r.avg_hr),marginLeft:8,fontWeight:"500"}}>♥ {Math.round(r.avg_hr)}</span>}</div></div>
          <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:14,color:C.orange,fontWeight:"600"}}>{fmtDist(r.distance)}</div><div style={{fontSize:12,color:C.textMuted}}>{fmtDuration(r.duration)}</div>{r.elevation>0&&<div style={{fontSize:11,color:C.textFaint}}>↑{Math.round(r.elevation)}m</div>}</div>
          <div style={{flexShrink:0,color:C.textFaint,fontSize:14}}>↗</div>
        </a>
      ))}
    </div>
  </>);
}

// ── Exercise picker: searchable dropdown ──
function ExercisePicker({allExercises, onSelect, onClose}){
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const inputRef = useRef(null);
  useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(), 100); },[]);

  const lowerSearch = search.toLowerCase();
  const categories = ["All", ...EXERCISE_CATEGORIES, "Custom"];

  const filteredLibrary = EXERCISE_LIBRARY.filter(ex => {
    const matchesSearch = !search || ex.label.toLowerCase().includes(lowerSearch);
    const matchesCat = activeCategory === "All" || ex.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const customFiltered = allExercises.filter(ex =>
    ex.isCustom && (!search || ex.label.toLowerCase().includes(lowerSearch)) &&
    (activeCategory === "All" || activeCategory === "Custom")
  );

  const grouped = {};
  for(const ex of filteredLibrary){
    if(!grouped[ex.category]) grouped[ex.category]=[];
    grouped[ex.category].push(ex);
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:520,maxHeight:"80vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        {/* Search bar */}
        <div style={{padding:"16px 16px 0"}}>
          <div style={{fontSize:14,fontWeight:"700",color:C.text,marginBottom:12}}>Add Exercise</div>
          <input ref={inputRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search exercises..."
            style={{...S.input,marginBottom:10}}/>
          {/* Category pills */}
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,scrollbarWidth:"none"}}>
            {categories.map(cat=>(
              <button key={cat} onClick={()=>setActiveCategory(cat)} style={{flexShrink:0,padding:"4px 12px",borderRadius:20,border:`1px solid ${activeCategory===cat?C.blue:C.border}`,background:activeCategory===cat?C.blueLight:"none",color:activeCategory===cat?C.blue:C.textMuted,fontSize:12,fontWeight:activeCategory===cat?"600":"400",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        {/* Exercise list */}
        <div style={{overflowY:"auto",padding:"0 16px 24px"}}>
          {customFiltered.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.textMuted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Custom</div>
              {customFiltered.map(ex=>(
                <button key={ex.id} onClick={()=>onSelect(ex)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:6,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                  <span style={{fontSize:14,color:C.text,fontWeight:"500"}}>{ex.label}</span>
                  <span style={{fontSize:11,color:C.textMuted}}>{ex.unit}</span>
                </button>
              ))}
            </div>
          )}
          {Object.entries(grouped).map(([cat, exs])=>(
            <div key={cat} style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.textMuted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>{cat}</div>
              {exs.map(ex=>(
                <button key={ex.id} onClick={()=>onSelect(ex)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:6,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                  <div>
                    <span style={{fontSize:14,color:C.text,fontWeight:"500"}}>{ex.label}</span>
                    <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{ex.muscles.map(m=>BUILTIN_MUSCLE_GROUPS[m]?.label||m).join(", ")}</div>
                  </div>
                  <span style={{fontSize:11,color:C.textMuted,flexShrink:0,marginLeft:8}}>{ex.unit}</span>
                </button>
              ))}
            </div>
          ))}
          {Object.keys(grouped).length===0&&customFiltered.length===0&&(
            <div style={{textAlign:"center",padding:"32px 0",color:C.textFaint,fontSize:14}}>No exercises match "{search}"</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sets input ──
function SetsInput({exercise, value, onChange, notes, activityId}){
  const sets=(value&&typeof value==="object"&&value.sets)?value.sets:value?[{reps:String(totalRepsFromValue(value)),weight:"",weightUnit:"kg"}]:[{reps:"",weight:"",weightUnit:"kg"}];
  function update(newSets){onChange({sets:newSets});}
  function addSet(){update([...sets,{reps:sets[sets.length-1]?.reps||"",weight:sets[sets.length-1]?.weight||"",weightUnit:sets[sets.length-1]?.weightUnit||"kg"}]);}
  function removeSet(i){if(sets.length>1)update(sets.filter((_,idx)=>idx!==i));}
  function updateSet(i,field,val){const s=[...sets];s[i]={...s[i],[field]:val};update(s);}
  const prevVals=Object.entries(notes||{}).filter(([id])=>id!==activityId).map(([,n])=>n?.exercises?.[exercise.id]).filter(Boolean);
  const prevMaxReps=Math.max(0,...prevVals.map(v=>totalRepsFromValue(v)));
  const prevMaxWeight=Math.max(0,...prevVals.map(v=>bestWeightFromValue(v)));
  return(
    <div>
      {sets.map((set,i)=>{
        const reps=parseInt(set.reps)||0,weight=parseFloat(set.weight)||0;
        const weightKg=set.weightUnit==="lbs"?weight*0.453592:weight;
        const isRepPB=reps>prevMaxReps&&prevMaxReps>0,isWeightPB=weightKg>prevMaxWeight&&prevMaxWeight>0;
        return(
          <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:C.bg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.textFaint,flexShrink:0}}>{i+1}</div>
            <div style={{flex:1,background:isRepPB?"#fefce8":C.bg,border:`1px solid ${isRepPB?"#fde68a":C.border}`,borderRadius:8,padding:"6px 10px",position:"relative"}}>
              <div style={{fontSize:9,color:C.textMuted,fontWeight:"500"}}>{exercise.unit==="sec"?"sec":"reps"}</div>
              <input type="number" value={set.reps} onChange={e=>updateSet(i,"reps",e.target.value)} placeholder="—" style={{width:"100%",background:"none",border:"none",outline:"none",fontSize:18,fontWeight:"700",color:C.text,fontFamily:"inherit",padding:0}}/>
              {isRepPB&&<div style={{position:"absolute",top:3,right:5,fontSize:9,color:"#d97706",fontWeight:"700"}}>🏆PB</div>}
            </div>
            <div style={{flex:1.2,background:isWeightPB?"#fefce8":C.bg,border:`1px solid ${isWeightPB?"#fde68a":C.border}`,borderRadius:8,padding:"6px 10px",position:"relative"}}>
              <div style={{fontSize:9,color:C.textMuted,fontWeight:"500"}}>weight</div>
              <div style={{display:"flex",alignItems:"baseline",gap:3}}>
                <input type="number" value={set.weight} onChange={e=>updateSet(i,"weight",e.target.value)} placeholder="BW" style={{flex:1,minWidth:0,background:"none",border:"none",outline:"none",fontSize:18,fontWeight:"700",color:C.text,fontFamily:"inherit",padding:0}}/>
                <select value={set.weightUnit||"kg"} onChange={e=>updateSet(i,"weightUnit",e.target.value)} style={{background:"none",border:"none",outline:"none",fontSize:11,color:C.textMuted,fontFamily:"inherit",cursor:"pointer",padding:0}}>
                  <option value="kg">kg</option><option value="lbs">lbs</option>
                </select>
              </div>
              {isWeightPB&&<div style={{position:"absolute",top:3,right:5,fontSize:9,color:"#d97706",fontWeight:"700"}}>🏆wt</div>}
            </div>
            <button onClick={()=>removeSet(i)} style={{background:"none",border:"none",color:C.textFaint,fontSize:18,cursor:"pointer",padding:"0 2px",lineHeight:1}}>×</button>
          </div>
        );
      })}
      <button onClick={addSet} style={{...S.btn("ghost"),padding:"5px 12px",fontSize:11,width:"100%",marginTop:2}}>+ Add set</button>
    </div>
  );
}

// ── Muscle card ──
function MuscleCard({mgId,stats,muscleGroups,allExercises,notes,strength,expanded,onExpand}){
  const mg=muscleGroups[mgId];if(!mg)return null;
  const s=stats[mgId]||{level:0,currentXp:0,xpNeeded:160,effectiveXp:0,lastTrained:null,streak:0,multiplier:1};
  const pct=Math.min(100,Math.round((s.currentXp/s.xpNeeded)*100));
  const da=daysAgo(s.lastTrained);
  const streak=s.streak||0;
  const mult=s.multiplier||1;
  const xpHistory=strength.filter(act=>notes[act.id]?.exercises).map(act=>{
    const exNotes=notes[act.id].exercises;let sessionXp=0;const contributions=[];
    for(const [exId,value] of Object.entries(exNotes)){
      if(!value)continue;
      const muscles=allExercises.find(e=>e.id===exId)?.muscles||[];
      if(!muscles.includes(mgId))continue;
      const isPrimary=muscles[0]===mgId;
      const xp=Math.round(xpForExercise(exId,value)*(isPrimary?1:0.4));
      if(xp>0){sessionXp+=xp;contributions.push({exId,value,xp,isPrimary,label:allExercises.find(e=>e.id===exId)?.label||exId});}
    }
    return{date:act.date,name:act.name,sessionXp,contributions};
  }).filter(h=>h.sessionXp>0).sort((a,b)=>b.date.localeCompare(a.date));

  // Streak fire display
  const streakDots = Array.from({length:5},(_,i)=>i<streak);

  return(
    <div style={{background:C.surface,border:`1px solid ${streak>=2?mg.border:C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden",boxShadow:"0 1px 2px rgba(0,0,0,0.04)",transition:"border-color 0.3s"}}>
      <div onClick={onExpand} style={{padding:"14px 16px",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:38,height:38,borderRadius:10,background:mg.lightBg,border:`1px solid ${mg.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{mg.emoji}</div>
            <div>
              <div style={{fontSize:14,fontWeight:"600",color:C.text}}>{mg.label}</div>
              <div style={{fontSize:11,color:C.textMuted,marginTop:1}}>
                {s.lastTrained?(da===0?"Trained today":`${da}d ago`):"Never trained"}
                {da!==null&&da>14&&<span style={{color:C.red,marginLeft:6,fontWeight:"500"}}>⚠ Decaying</span>}
              </div>
            </div>
          </div>
          <div style={{textAlign:"right",display:"flex",alignItems:"center",gap:8}}>
            {streak>=2&&(
              <div style={{background:mg.lightBg,border:`1px solid ${mg.border}`,borderRadius:8,padding:"4px 8px",textAlign:"center"}}>
                <div style={{fontSize:15,lineHeight:1}}>{streakDots.map((lit,i)=><span key={i} style={{opacity:lit?1:0.2}}>🔥</span>)}</div>
                <div style={{fontSize:9,color:mg.color,fontWeight:"600",marginTop:2}}>{streak}wk · {mult.toFixed(1)}x XP</div>
              </div>
            )}
            <div>
              <div style={{fontSize:22,fontWeight:"700",color:mg.color}}>Lv {s.level}</div>
              <div style={{fontSize:10,color:C.textFaint,textAlign:"right"}}>{expanded?"▲":"▼"}</div>
            </div>
          </div>
        </div>
        <div style={{background:"#f3f4f6",borderRadius:99,height:8,overflow:"hidden"}}>
          <div style={{height:"100%",background:mg.color,borderRadius:99,width:`${pct}%`,transition:"width 0.5s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
          <span style={{fontSize:11,color:C.textFaint}}>{s.currentXp} / {s.xpNeeded} XP to next level</span>
          <span style={{fontSize:11,color:C.textFaint}}>{s.effectiveXp} total XP</span>
        </div>
      </div>
      {expanded&&(
        <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 16px",background:C.bg}}>
          {streak>=1&&(
            <div style={{background:mg.lightBg,border:`1px solid ${mg.border}`,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:"600",color:mg.color,marginBottom:2}}>🔥 {streak}-week streak active</div>
              <div style={{fontSize:12,color:C.textSecondary}}>
                Current XP multiplier: <strong>{mult.toFixed(1)}x</strong>
                {streak<5&&<span style={{color:C.textMuted}}> — train next week for {(1+(streak)*0.2).toFixed(1)}x</span>}
                {streak>=5&&<span style={{color:mg.color}}> — max streak reached!</span>}
              </div>
            </div>
          )}
          <div style={{fontSize:11,color:C.textMuted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>XP History</div>
          {xpHistory.length===0?<div style={{fontSize:13,color:C.textFaint}}>No logged exercises for this muscle yet.</div>
          :xpHistory.map((h,i)=>(
            <div key={i} style={{marginBottom:10,background:C.surface,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div><div style={{fontSize:13,fontWeight:"600",color:C.text}}>{h.name}</div><div style={{fontSize:11,color:C.textMuted}}>{dayLabel(h.date)}</div></div>
                <div style={{background:mg.lightBg,border:`1px solid ${mg.border}`,borderRadius:8,padding:"4px 10px",textAlign:"center"}}><div style={{fontSize:14,fontWeight:"700",color:mg.color}}>+{h.sessionXp}</div><div style={{fontSize:9,color:mg.color,textTransform:"uppercase"}}>XP</div></div>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {h.contributions.map((c,j)=><div key={j} style={{fontSize:11,color:C.textMuted,background:C.bg,borderRadius:6,padding:"3px 8px",border:`1px solid ${C.border}`}}>{c.label} <span style={{color:C.textSecondary,fontWeight:"600"}}>{summariseSets(c.value)}</span><span style={{color:mg.color,marginLeft:4,fontWeight:"500"}}>+{c.xp}xp{!c.isPrimary?" (sec)":""}</span></div>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add muscle modal ──
function AddMuscleModal({onSave,onClose}){
  const [label,setLabel]=useState("");const [em,setEm]=useState("💪");const [ci,setCi]=useState(0);
  function handleSave(){if(!label.trim())return;onSave({id:slugify(label)+"_"+Date.now(),label:label.trim(),emoji:em,...COLOR_OPTIONS[ci]});onClose();}
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"16px 16px 0 0",padding:24,width:"100%",maxWidth:520,maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:"700",color:C.text,marginBottom:16}}>New Muscle Group</div>
        <div style={{marginBottom:12}}><div style={{fontSize:12,color:C.textMuted,marginBottom:6,fontWeight:"500"}}>Name</div><input style={S.input} placeholder="e.g. Forearms" value={label} onChange={e=>setLabel(e.target.value)} autoFocus/></div>
        <div style={{marginBottom:12}}><div style={{fontSize:12,color:C.textMuted,marginBottom:6,fontWeight:"500"}}>Emoji</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{EMOJI_OPTIONS.map(e=><button key={e} onClick={()=>setEm(e)} style={{width:36,height:36,border:`2px solid ${em===e?C.blue:C.border}`,borderRadius:8,background:em===e?C.blueLight:"none",fontSize:18,cursor:"pointer"}}>{e}</button>)}</div></div>
        <div style={{marginBottom:20}}><div style={{fontSize:12,color:C.textMuted,marginBottom:6,fontWeight:"500"}}>Colour</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{COLOR_OPTIONS.map((c,i)=><button key={i} onClick={()=>setCi(i)} style={{width:28,height:28,borderRadius:"50%",background:c.color,border:ci===i?"3px solid #111":"2px solid transparent",cursor:"pointer"}}/>)}</div></div>
        {label&&<div style={{background:COLOR_OPTIONS[ci].lightBg,border:`1px solid ${COLOR_OPTIONS[ci].border}`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:16}}><span style={{fontSize:20}}>{em}</span><span style={{fontSize:14,fontWeight:"600",color:COLOR_OPTIONS[ci].color}}>{label}</span></div>}
        <div style={{display:"flex",gap:8}}><button onClick={handleSave} style={{...S.btn("primary"),flex:1}}>Add</button><button onClick={onClose} style={S.btn("ghost")}>Cancel</button></div>
      </div>
    </div>
  );
}

// ── Add custom exercise modal ──
function AddExerciseModal({allMuscleGroups,onSave,onClose}){
  const [label,setLabel]=useState("");const [unit,setUnit]=useState("reps");const [pm,setPm]=useState("");const [sm,setSm]=useState([]);
  function toggleSec(id){setSm(prev=>prev.includes(id)?prev.filter(m=>m!==id):[...prev,id]);}
  function handleSave(){if(!label.trim()||!pm)return;onSave({id:slugify(label)+"_"+Date.now(),label:label.trim(),unit,muscles:[pm,...sm.filter(m=>m!==pm)],isCustom:true});onClose();}
  const mgIds=Object.keys(allMuscleGroups);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"16px 16px 0 0",padding:24,width:"100%",maxWidth:520,maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:"700",color:C.text,marginBottom:16}}>New Custom Exercise</div>
        <div style={{marginBottom:12}}><div style={{fontSize:12,color:C.textMuted,marginBottom:6,fontWeight:"500"}}>Name</div><input style={S.input} placeholder="e.g. Single Leg RDL" value={label} onChange={e=>setLabel(e.target.value)} autoFocus/></div>
        <div style={{marginBottom:12}}><div style={{fontSize:12,color:C.textMuted,marginBottom:6,fontWeight:"500"}}>Unit</div><div style={{display:"flex",gap:8}}>{["reps","sec","min"].map(v=><button key={v} onClick={()=>setUnit(v)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${unit===v?C.blue:C.border}`,background:unit===v?C.blueLight:"none",color:unit===v?C.blue:C.textMuted,fontFamily:"inherit",fontSize:13,fontWeight:unit===v?"600":"400",cursor:"pointer"}}>{v}</button>)}</div></div>
        <div style={{marginBottom:12}}><div style={{fontSize:12,color:C.textMuted,marginBottom:6,fontWeight:"500"}}>Primary muscle <span style={{color:C.red}}>*</span></div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{mgIds.map(id=>{const mg=allMuscleGroups[id];const sel=pm===id;return <button key={id} onClick={()=>setPm(id)} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${sel?mg.color:C.border}`,background:sel?mg.lightBg:"none",color:sel?mg.color:C.textMuted,fontFamily:"inherit",fontSize:12,fontWeight:sel?"600":"400",cursor:"pointer"}}>{mg.emoji} {mg.label}</button>;})}</div></div>
        <div style={{marginBottom:20}}><div style={{fontSize:12,color:C.textMuted,marginBottom:6,fontWeight:"500"}}>Secondary muscles</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{mgIds.filter(id=>id!==pm).map(id=>{const mg=allMuscleGroups[id];const sel=sm.includes(id);return <button key={id} onClick={()=>toggleSec(id)} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${sel?mg.color:C.border}`,background:sel?mg.lightBg:"none",color:sel?mg.color:C.textMuted,fontFamily:"inherit",fontSize:12,fontWeight:sel?"600":"400",cursor:"pointer"}}>{mg.emoji} {mg.label}</button>;})}</div></div>
        <div style={{display:"flex",gap:8}}><button onClick={handleSave} disabled={!label.trim()||!pm} style={{...S.btn("primary"),flex:1,opacity:(!label.trim()||!pm)?0.5:1}}>Add Exercise</button><button onClick={onClose} style={S.btn("ghost")}>Cancel</button></div>
      </div>
    </div>
  );
}

// ── Challenge card — prominent version ──
function ChallengeCard({challenge,notes,strength}){
  if(!challenge)return null;
  const {mg,title,description,type,exId,exLabel}=challenge;
  const now=new Date();
  const daysLeft=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate();
  const monthName=now.toLocaleDateString("en-GB",{month:"long"});
  const {current,target,pct,done}=computeChallengeProgress(challenge,notes,strength);

  // Reward tiers for display
  const tiers=[
    {at:Math.round(target*0.25),label:"25%",unlocked:pct>=25},
    {at:Math.round(target*0.5),label:"Halfway",unlocked:pct>=50},
    {at:Math.round(target*0.75),label:"75%",unlocked:pct>=75},
    {at:target,label:"Complete!",unlocked:done},
  ];

  return(
    <div style={{background:done?"#f0fdf4":mg.lightBg,border:`2px solid ${done?C.greenBorder:mg.border}`,borderRadius:14,padding:"0",marginBottom:16,overflow:"hidden"}}>
      {/* Header banner */}
      <div style={{background:done?C.green:mg.color,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>{mg.emoji}</span>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.8)",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.1em"}}>{monthName} Challenge</div>
            <div style={{fontSize:13,color:"#fff",fontWeight:"700",marginTop:1}}>{done?"Challenge Complete! 🎉":title}</div>
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
          <div style={{fontSize:22,fontWeight:"700",color:"#fff",lineHeight:1}}>{done?"✓":`${pct}%`}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",marginTop:2}}>{done?"done":daysLeft+"d left"}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{padding:"14px 16px"}}>
        {/* Description */}
        <div style={{fontSize:13,color:C.textSecondary,lineHeight:1.6,marginBottom:14}}>{description}</div>

        {/* Progress bar + counter */}
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:12,color:C.textMuted,fontWeight:"500"}}>Progress</span>
            <span style={{fontSize:13,fontWeight:"700",color:done?C.green:mg.color}}>
              {type==="volume"?`${current} / ${target} reps`:type==="pb"?(done?`${current} reps — new PB! 🎉`:`${current} / ${target} reps`):type==="streak"?`${current} / ${target} weeks`:`${current} / ${target} sessions`}
            </span>
          </div>
          <div style={{background:"rgba(0,0,0,0.08)",borderRadius:99,height:10,overflow:"hidden"}}>
            <div style={{height:"100%",background:done?C.green:mg.color,borderRadius:99,width:`${pct}%`,transition:"width 0.6s ease"}}/>
          </div>
        </div>

        {/* Milestone tiers */}
        <div style={{display:"flex",gap:6}}>
          {tiers.map((t,i)=>(
            <div key={i} style={{flex:1,textAlign:"center",padding:"6px 4px",borderRadius:8,background:t.unlocked?(done?C.greenLight:mg.lightBg):"#f9fafb",border:`1px solid ${t.unlocked?(done?C.greenBorder:mg.border):C.border}`}}>
              <div style={{fontSize:14}}>{t.unlocked?"✓":"○"}</div>
              <div style={{fontSize:9,color:t.unlocked?(done?C.green:mg.color):C.textFaint,fontWeight:"600",marginTop:2}}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PBToast({pbs,allExercises,onDismiss}){
  useEffect(()=>{if(pbs.length>0){const t=setTimeout(onDismiss,4500);return()=>clearTimeout(t);}},[pbs]);
  if(!pbs.length)return null;
  const repPBs=pbs.filter(p=>!p.endsWith("_first")&&!p.endsWith("_weight")).map(p=>allExercises.find(e=>e.id===p)?.label).filter(Boolean);
  const weightPBs=pbs.filter(p=>p.endsWith("_weight")).map(p=>allExercises.find(e=>e.id===p.replace("_weight",""))?.label).filter(Boolean);
  const firstEver=pbs.some(p=>p.endsWith("_first"));
  return(
    <div style={{background:"#111827",color:"#fff",borderRadius:12,padding:"12px 20px",boxShadow:"0 8px 24px rgba(0,0,0,0.2)",display:"flex",gap:10,alignItems:"center",width:"100%"}}>
      <span style={{fontSize:20}}>🏆</span>
      <div><div style={{fontSize:13,fontWeight:"700",color:"#fbbf24"}}>Personal Best!</div><div style={{fontSize:12,color:"#d1d5db",marginTop:2}}>{repPBs.length>0&&<div>Reps: {repPBs.join(", ")}</div>}{weightPBs.length>0&&<div>Weight: {weightPBs.join(", ")}</div>}{firstEver&&<div>First time logging!</div>}</div></div>
    </div>
  );
}

function XpToast({gain,muscleGroups,onDismiss}){
  useEffect(()=>{if(gain){const t=setTimeout(onDismiss,4500);return()=>clearTimeout(t);}},[gain]);
  if(!gain||(gain.totalXp<=0&&gain.levelUps.length===0))return null;
  return(
    <div style={{background:"#111827",color:"#fff",borderRadius:12,padding:"12px 20px",boxShadow:"0 8px 24px rgba(0,0,0,0.2)",display:"flex",gap:10,alignItems:"center",width:"100%"}}>
      <span style={{fontSize:20}}>⚡</span>
      <div>
        {gain.totalXp>0&&<div style={{fontSize:13,fontWeight:"700",color:"#34d399"}}>+{gain.totalXp} XP</div>}
        {gain.levelUps.length>0&&<div style={{fontSize:12,color:"#d1d5db",marginTop:2}}>
          {gain.levelUps.map(lu=>{
            const mg=muscleGroups[lu.muscle]||{emoji:"💪",label:lu.muscle};
            return <div key={lu.muscle}>{mg.emoji} {mg.label} leveled up to Lv {lu.toLevel}!</div>;
          })}
        </div>}
      </div>
    </div>
  );
}

function ChallengeToast({challenge,onDismiss}){
  useEffect(()=>{if(challenge){const t=setTimeout(onDismiss,5000);return()=>clearTimeout(t);}},[challenge]);
  if(!challenge)return null;
  return(
    <div style={{background:challenge.mg.color,color:"#fff",borderRadius:12,padding:"12px 20px",boxShadow:"0 8px 24px rgba(0,0,0,0.2)",display:"flex",gap:10,alignItems:"center",width:"100%"}}>
      <span style={{fontSize:20}}>🏆</span>
      <div>
        <div style={{fontSize:13,fontWeight:"700"}}>Challenge complete!</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",marginTop:2}}>{challenge.title}</div>
      </div>
    </div>
  );
}

function StravaSyncToast({error,onDismiss}){
  useEffect(()=>{if(error){const t=setTimeout(onDismiss,8000);return()=>clearTimeout(t);}},[error]);
  if(!error)return null;
  return(
    <div style={{background:"#111827",color:"#fff",borderRadius:12,padding:"12px 20px",boxShadow:"0 8px 24px rgba(0,0,0,0.2)",display:"flex",gap:10,alignItems:"center",width:"100%"}}>
      <span style={{fontSize:20}}>⚠️</span>
      <div>
        <div style={{fontSize:13,fontWeight:"700"}}>Couldn't sync to Strava</div>
        <div style={{fontSize:12,color:"#d1d5db",marginTop:2}}>
          {error.includes("authenticated")||error.includes("403")
            ? <>Reconnect Strava to allow description updates — <a href="/api/auth/login" style={{color:"#fb923c"}}>reconnect</a></>
            : "Saved locally, but the Strava activity description wasn't updated."}
        </div>
      </div>
    </div>
  );
}

function ToastStack({pbs,xpGain,challengeDone,stravaError,allExercises,muscleGroups,onDismissPbs,onDismissXp,onDismissChallenge,onDismissStrava}){
  const showXp=xpGain&&(xpGain.totalXp>0||xpGain.levelUps.length>0);
  if(!pbs.length&&!showXp&&!challengeDone&&!stravaError)return null;
  return(
    <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:1000,display:"flex",flexDirection:"column",gap:10,width:"90%",maxWidth:340}}>
      <PBToast pbs={pbs} allExercises={allExercises} onDismiss={onDismissPbs}/>
      <XpToast gain={xpGain} muscleGroups={muscleGroups} onDismiss={onDismissXp}/>
      <ChallengeToast challenge={challengeDone} onDismiss={onDismissChallenge}/>
      <StravaSyncToast error={stravaError} onDismiss={onDismissStrava}/>
    </div>
  );
}

function ExercisePills({notes,onEdit,allExercises}){
  const entries=Object.entries(notes.exercises||{}).filter(([,v])=>v&&(typeof v==="object"?v.sets?.some(s=>s.reps):true));
  return(
    <div>
      {entries.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>{entries.map(([k,v])=>{const ex=allExercises.find(e=>e.id===k);return ex?<div key={k} style={{background:C.blueLight,border:`1px solid ${C.blueBorder}`,borderRadius:20,padding:"3px 10px",fontSize:12,color:C.blue,fontWeight:"500",display:"inline-flex",gap:4}}><span style={{color:"#1d4ed8"}}>{ex.label}</span><span style={{fontWeight:"700"}}>{summariseSets(v)}</span></div>:null;})}</div>}
      {notes.sessionNotes&&<div style={{fontSize:13,color:C.textMuted,fontStyle:"italic",marginBottom:6}}>{notes.sessionNotes}</div>}
      <button onClick={onEdit} style={{background:"none",border:"none",color:C.textFaint,fontSize:12,cursor:"pointer",padding:0,fontFamily:"inherit"}}>edit</button>
    </div>
  );
}

// ── Enrich form — exercises added via picker ──
function EnrichForm({form,setForm,onSave,onCancel,saving,notes,activityId,allExercises}){
  const [showPicker,setShowPicker]=useState(false);
  const activeExIds=Object.keys(form.exercises||{});
  const activeExercises=allExercises.filter(ex=>activeExIds.includes(ex.id));

  function addExercise(ex){
    if(form.exercises?.[ex.id])return; // already added
    setForm(f=>({...f,exercises:{...f.exercises,[ex.id]:{sets:[{reps:"",weight:"",weightUnit:"kg"}]}}}));
    setShowPicker(false);
  }
  function removeExercise(exId){
    const updated={...form.exercises};delete updated[exId];
    setForm(f=>({...f,exercises:updated}));
  }
  function updateExercise(exId,value){setForm(f=>({...f,exercises:{...f.exercises,[exId]:value}}));}

  return(
    <div style={{background:"#f8faff",border:"1px solid #bfdbfe",borderRadius:10,padding:14,marginTop:10}}>
      <div style={{fontSize:12,color:C.blue,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:14,fontWeight:"600"}}>Exercise breakdown</div>

      {activeExercises.length===0&&(
        <div style={{textAlign:"center",padding:"16px 0",color:C.textFaint,fontSize:13}}>No exercises added yet</div>
      )}

      {activeExercises.map(ex=>(
        <div key={ex.id} style={{marginBottom:16,background:"#fff",borderRadius:10,padding:"12px",border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:"600",color:C.text}}>{ex.label}</div>
            <button onClick={()=>removeExercise(ex.id)} style={{background:"none",border:"none",color:C.textFaint,fontSize:18,cursor:"pointer",padding:0,lineHeight:1}}>×</button>
          </div>
          <SetsInput exercise={ex} value={form.exercises?.[ex.id]} onChange={v=>updateExercise(ex.id,v)} notes={notes} activityId={activityId}/>
        </div>
      ))}

      <button onClick={()=>setShowPicker(true)} style={{...S.btn("ghost"),width:"100%",marginBottom:12,fontSize:13}}>+ Add exercise</button>

      <textarea value={form.sessionNotes||""} onChange={e=>setForm(f=>({...f,sessionNotes:e.target.value}))} placeholder="Session notes..."
        style={{width:"100%",background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.textSecondary,fontSize:13,fontFamily:"inherit",resize:"none",minHeight:56,boxSizing:"border-box",marginBottom:10,outline:"none"}}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onSave} disabled={saving} style={{...S.btn("primary"),flex:1,opacity:saving?0.7:1}}>{saving?"Saving...":"Save"}</button>
        <button onClick={onCancel} style={S.btn("ghost")}>Cancel</button>
      </div>

      {showPicker&&<ExercisePicker allExercises={allExercises} onSelect={addExercise} onClose={()=>setShowPicker(false)}/>}
    </div>
  );
}

// ── Searchable exercise PB list ──
function ExercisePBList({allExercises, sortedStrength, notes}){
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("recent"); // "recent" | "all" | "pbs"
  const [showAll, setShowAll] = useState(false);

  // Build PB data for all exercises that have been logged
  const exercisesWithData = allExercises
    .filter(ex => sortedStrength.some(s => notes[s.id]?.exercises?.[ex.id]))
    .map(ex => {
      const dataPoints = sortedStrength
        .filter(s => notes[s.id]?.exercises?.[ex.id])
        .map(s => ({
          date: s.date,
          value: notes[s.id].exercises[ex.id],
          totalReps: totalRepsFromValue(notes[s.id].exercises[ex.id]),
          bestWeight: bestWeightFromValue(notes[s.id].exercises[ex.id]),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const pbReps = Math.max(...dataPoints.map(d => d.totalReps));
      const pbWeight = Math.max(...dataPoints.map(d => d.bestWeight));
      const first = dataPoints[0].totalReps, last = dataPoints[dataPoints.length-1].totalReps;
      const pct = first > 0 ? Math.round(((last-first)/first)*100) : 0;
      const lastLogged = dataPoints[dataPoints.length-1]?.date || "";
      return { ex, dataPoints, pbReps, pbWeight, pct, lastLogged };
    });

  // Filter + sort
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyKey = thirtyDaysAgo.toISOString().slice(0,10);

  let filtered = exercisesWithData.filter(e =>
    !search || e.ex.label.toLowerCase().includes(search.toLowerCase())
  );

  if (filter === "recent") filtered = filtered.filter(e => e.lastLogged >= thirtyKey);
  else if (filter === "pbs") filtered = filtered.filter(e => e.pct > 0 || e.pbWeight > 0);

  // Sort by most recently logged
  filtered = [...filtered].sort((a,b) => b.lastLogged.localeCompare(a.lastLogged));

  const visible = showAll ? filtered : filtered.slice(0, 5);

  return (
    <div>
      {/* Search + filter */}
      <div style={{marginBottom:12}}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search exercises..."
          style={{...S.input, marginBottom:8}}
        />
        <div style={{display:"flex",gap:6}}>
          {[["recent","Last 30 days"],["all","All time"],["pbs","Improved only"]].map(([val,label])=>(
            <button key={val} onClick={()=>{setFilter(val);setShowAll(false);}} style={{flex:1,padding:"6px 4px",borderRadius:8,border:`1px solid ${filter===val?C.blue:C.border}`,background:filter===val?C.blueLight:"none",color:filter===val?C.blue:C.textMuted,fontFamily:"inherit",fontSize:11,fontWeight:filter===val?"600":"400",cursor:"pointer"}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{...S.card, color:C.textMuted, fontSize:14, textAlign:"center", padding:"24px 16px"}}>
          {search ? `No exercises match "${search}"` : filter==="recent" ? "No exercises logged in the last 30 days" : "No exercise data yet"}
        </div>
      )}

      {visible.map(({ex, dataPoints, pbReps, pbWeight, pct, lastLogged})=>(
        <div key={ex.id} style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontSize:14,fontWeight:"600",color:C.text}}>{ex.label}</div>
              <div style={{fontSize:11,color:C.textMuted}}>{dataPoints.length} sessions · last {dayLabel(lastLogged).split(" ").slice(1).join(" ")}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <div style={{background:"#fefce8",border:"1px solid #fde68a",borderRadius:8,padding:"4px 8px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#92400e",fontWeight:"600",textTransform:"uppercase"}}>🏆 reps</div>
                <div style={{fontSize:16,color:"#d97706",fontWeight:"700"}}>{pbReps}</div>
              </div>
              {pbWeight>0&&<div style={{background:C.greenLight,border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:"4px 8px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#166534",fontWeight:"600",textTransform:"uppercase"}}>🏋️ kg</div>
                <div style={{fontSize:16,color:C.green,fontWeight:"700"}}>{pbWeight.toFixed(1)}</div>
              </div>}
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:6}}>
            <Sparkline values={dataPoints.map(d=>d.totalReps)} width={120} height={28}/>
            <div style={{fontSize:12,color:pct>0?C.green:pct<0?C.red:C.textMuted,fontWeight:"600"}}>{pct>0?"+":""}{pct}%</div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {dataPoints.slice(-3).map((d,i)=>(
              <div key={i} style={{fontSize:11,color:C.textFaint}}>{dayLabel(d.date).split(" ").slice(1).join(" ")} <span style={{color:C.textSecondary,fontWeight:"600"}}>{summariseSets(d.value)}</span></div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length > 5 && !showAll && (
        <button onClick={()=>setShowAll(true)} style={{...S.btn("ghost"),width:"100%",marginTop:4}}>
          Show all {filtered.length} exercises
        </button>
      )}
      {showAll && filtered.length > 5 && (
        <button onClick={()=>setShowAll(false)} style={{...S.btn("ghost"),width:"100%",marginTop:4}}>
          Show less
        </button>
      )}
    </div>
  );
}

// ── Manual session logger ──
function LogManualModal({allExercises, onSave, onClose}){
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [exercises, setExercises] = useState({});
  const [sessionNotes, setSessionNotes] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  function addExercise(ex){ setExercises(e=>({...e,[ex.id]:{sets:[{reps:"",weight:"",weightUnit:"kg"}]}})); setShowPicker(false); }
  function removeExercise(id){ const e={...exercises}; delete e[id]; setExercises(e); }
  function updateExercise(id, val){ setExercises(e=>({...e,[id]:val})); }

  function handleSave(){
    if(!name.trim()) return;
    const session = {
      id: "manual_"+Date.now(),
      name: name.trim(),
      sport_type: "Workout",
      date,
      distance:0, duration:(parseInt(duration)||0)*60,
      calories:0, effort:0, avg_hr:null, max_hr:null, elevation:0,
      isManual: true,
    };
    onSave(session, {exercises, sessionNotes});
    onClose();
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:520,maxHeight:"88vh",overflowY:"auto",padding:"20px 20px 36px"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:"#e2e8f0",borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{fontSize:16,fontWeight:"700",color:C.text,marginBottom:16}}>Log a Quick Session</div>

        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:C.textMuted,fontWeight:"500",marginBottom:5}}>Session name</div>
          <input style={S.input} placeholder="e.g. Morning pull-ups" value={name} onChange={e=>setName(e.target.value)} autoFocus/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div>
            <div style={{fontSize:12,color:C.textMuted,fontWeight:"500",marginBottom:5}}>Date</div>
            <input type="date" style={S.input} value={date} onChange={e=>setDate(e.target.value)}/>
          </div>
          <div>
            <div style={{fontSize:12,color:C.textMuted,fontWeight:"500",marginBottom:5}}>Duration (min)</div>
            <input type="number" style={S.input} placeholder="e.g. 15" value={duration} onChange={e=>setDuration(e.target.value)}/>
          </div>
        </div>

        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:C.textMuted,fontWeight:"500",marginBottom:8}}>Exercises</div>
          {Object.keys(exercises).map(exId=>{
            const ex=allExercises.find(e=>e.id===exId);
            if(!ex) return null;
            return(
              <div key={exId} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:"600",color:C.text}}>{ex.label}</div>
                  <button onClick={()=>removeExercise(exId)} style={{background:"none",border:"none",color:C.textFaint,fontSize:18,cursor:"pointer",padding:0}}>×</button>
                </div>
                <SetsInput exercise={ex} value={exercises[exId]} onChange={v=>updateExercise(exId,v)} notes={{}} activityId="manual"/>
              </div>
            );
          })}
          <button onClick={()=>setShowPicker(true)} style={{...S.btn("ghost"),width:"100%",fontSize:13}}>+ Add exercise</button>
        </div>

        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:C.textMuted,fontWeight:"500",marginBottom:5}}>Notes</div>
          <textarea value={sessionNotes} onChange={e=>setSessionNotes(e.target.value)} placeholder="Anything worth noting..."
            style={{...S.input,minHeight:56,resize:"none"}}/>
        </div>

        <div style={{display:"flex",gap:8}}>
          <button onClick={handleSave} disabled={!name.trim()} style={{...S.btn("primary"),flex:1,opacity:!name.trim()?0.5:1}}>Save Session</button>
          <button onClick={onClose} style={S.btn("ghost")}>Cancel</button>
        </div>

        {showPicker&&<ExercisePicker allExercises={allExercises} onSelect={addExercise} onClose={()=>setShowPicker(false)}/>}
      </div>
    </div>
  );
}

// ── Draft/template editor — same exercise picker + sets UI as a manual session ──
function DraftEditorModal({draft, allExercises, onSave, onClose}){
  const [title,setTitle]=useState(draft?.title||"");
  const [exercises,setExercises]=useState(draft?.exercises||{});
  const [sessionNotes,setSessionNotes]=useState(draft?.sessionNotes||"");
  const [isTemplate,setIsTemplate]=useState(draft?.isTemplate||false);
  const [showPicker,setShowPicker]=useState(false);

  function addExercise(ex){ if(exercises[ex.id])return; setExercises(e=>({...e,[ex.id]:{sets:[{reps:"",weight:"",weightUnit:"kg"}]}})); setShowPicker(false); }
  function removeExercise(id){ const e={...exercises}; delete e[id]; setExercises(e); }
  function updateExercise(id,val){ setExercises(e=>({...e,[id]:val})); }

  function handleSave(){
    if(!title.trim())return;
    onSave({
      id: draft?.id || "draft_"+Date.now(),
      title: title.trim(),
      exercises,
      sessionNotes,
      isTemplate,
    });
    onClose();
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:520,maxHeight:"88vh",overflowY:"auto",padding:"20px 20px 36px"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:"#e2e8f0",borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{fontSize:16,fontWeight:"700",color:C.text,marginBottom:16}}>{draft?"Edit Draft":"New Draft"}</div>

        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:C.textMuted,fontWeight:"500",marginBottom:5}}>Title</div>
          <input style={S.input} placeholder="e.g. Push Day" value={title} onChange={e=>setTitle(e.target.value)} autoFocus/>
        </div>

        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:C.textMuted,fontWeight:"500",marginBottom:8}}>Exercises</div>
          {Object.keys(exercises).map(exId=>{
            const ex=allExercises.find(e=>e.id===exId);
            if(!ex) return null;
            return(
              <div key={exId} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:"600",color:C.text}}>{ex.label}</div>
                  <button onClick={()=>removeExercise(exId)} style={{background:"none",border:"none",color:C.textFaint,fontSize:18,cursor:"pointer",padding:0}}>×</button>
                </div>
                <SetsInput exercise={ex} value={exercises[exId]} onChange={v=>updateExercise(exId,v)} notes={{}} activityId="draft"/>
              </div>
            );
          })}
          <button onClick={()=>setShowPicker(true)} style={{...S.btn("ghost"),width:"100%",fontSize:13}}>+ Add exercise</button>
        </div>

        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:C.textMuted,fontWeight:"500",marginBottom:5}}>Notes</div>
          <textarea value={sessionNotes} onChange={e=>setSessionNotes(e.target.value)} placeholder="Plan, cues, anything to remember..."
            style={{...S.input,minHeight:56,resize:"none"}}/>
        </div>

        <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,fontSize:13,color:C.textSecondary,cursor:"pointer"}}>
          <input type="checkbox" checked={isTemplate} onChange={e=>setIsTemplate(e.target.checked)}/>
          Save as reusable template (keeps it after applying)
        </label>

        <div style={{display:"flex",gap:8}}>
          <button onClick={handleSave} disabled={!title.trim()} style={{...S.btn("primary"),flex:1,opacity:!title.trim()?0.5:1}}>Save</button>
          <button onClick={onClose} style={S.btn("ghost")}>Cancel</button>
        </div>

        {showPicker&&<ExercisePicker allExercises={allExercises} onSelect={addExercise} onClose={()=>setShowPicker(false)}/>}
      </div>
    </div>
  );
}

// ── Draft/template card — shown in the Drafts & Templates section ──
function DraftCard({draft, allExercises, onApply, onEdit, onDelete}){
  const entries=Object.entries(draft.exercises||{}).filter(([,v])=>v&&(typeof v==="object"?v.sets?.some(s=>s.reps):true));
  return(
    <div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:14,fontWeight:"600",color:C.text}}>{draft.title}</div>
          {draft.isTemplate&&<span style={{fontSize:10,background:C.greenLight,color:C.green,border:`1px solid ${C.greenBorder}`,borderRadius:20,padding:"1px 7px",fontWeight:"600",flexShrink:0}}>Template</span>}
        </div>
      </div>
      {entries.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
        {entries.map(([k,v])=>{const ex=allExercises.find(e=>e.id===k);return ex?<div key={k} style={{background:C.blueLight,border:`1px solid ${C.blueBorder}`,borderRadius:20,padding:"3px 10px",fontSize:12,color:C.blue,fontWeight:"500",display:"inline-flex",gap:4}}><span style={{color:"#1d4ed8"}}>{ex.label}</span><span style={{fontWeight:"700"}}>{summariseSets(v)}</span></div>:null;})}
      </div>}
      {draft.sessionNotes&&<div style={{fontSize:13,color:C.textMuted,fontStyle:"italic",marginBottom:8}}>{draft.sessionNotes}</div>}
      <div style={{display:"flex",gap:8}}>
        <button onClick={onApply} style={{...S.btn("primary"),flex:1,fontSize:12,padding:"6px 12px"}}>Apply to session →</button>
        <button onClick={onEdit} style={{...S.btn("ghost"),fontSize:12,padding:"6px 12px"}}>Edit</button>
        <button onClick={onDelete} style={{...S.btn("danger"),fontSize:12,padding:"6px 12px"}}>Delete</button>
      </div>
    </div>
  );
}

// ── Pick which Strava session to merge a draft into ──
function ApplyDraftModal({draft, sessions, notes, onSelect, onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:520,maxHeight:"80vh",display:"flex",flexDirection:"column",padding:"16px 16px 24px"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:"#e2e8f0",borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{fontSize:14,fontWeight:"700",color:C.text,marginBottom:4}}>Apply "{draft.title}" to...</div>
        <div style={{fontSize:12,color:C.textMuted,marginBottom:14}}>Pick the session this draft belongs to — usually your most recent one. You'll get a chance to review before it's saved.</div>
        <div style={{overflowY:"auto"}}>
          {sessions.length===0&&<div style={{textAlign:"center",padding:"24px 0",color:C.textFaint,fontSize:13}}>No strength sessions yet. Sync Strava after your workout, then come back.</div>}
          {sessions.map(s=>{
            const hasNotes=!!notes[s.id]?.exercises&&Object.keys(notes[s.id].exercises).length>0;
            return(
              <button key={s.id} onClick={()=>onSelect(s.id)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:6,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:"600",color:C.text}}>{s.name}</div>
                  <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{dayLabel(s.date)}{hasNotes?" · has notes already":""}</div>
                </div>
                <span style={{color:C.textFaint,fontSize:14}}>→</span>
              </button>
            );
          })}
        </div>
        <button onClick={onClose} style={{...S.btn("ghost"),marginTop:8}}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main App ──
export default function App(){
  const [view,setView]=useState("dashboard");
  const [connected,setConnected]=useState(null);
  const [runs,setRuns]=useState([]);
  const [strength,setStrength]=useState([]);
  const [notes,setNotes]=useState({});
  const [customExercises,setCustomExercises]=useState([]);
  const [customMuscleGroups,setCustomMuscleGroups]=useState([]);
  const [loading,setLoading]=useState(true);
  const [enriching,setEnriching]=useState(null);
  const [enrichForm,setEnrichForm]=useState({exercises:{},sessionNotes:""});
  const [saving,setSaving]=useState(false);
  const [syncing,setSyncing]=useState(false);
  const [insight,setInsight]=useState("");
  const [insightLoading,setInsightLoading]=useState(false);
  const [pbs,setPbs]=useState([]);
  const [xpGain,setXpGain]=useState(null);
  const [challengeDone,setChallengeDone]=useState(null);
  const [stravaError,setStravaError]=useState(null);
  const [manualSessions,setManualSessions]=useState(()=>{try{return JSON.parse(localStorage.getItem("manual_sessions_v1")||"[]");}catch{return [];}});
  const [showLogManual,setShowLogManual]=useState(false);
  const [expandedMuscle,setExpandedMuscle]=useState(null);
  const [showAddMuscle,setShowAddMuscle]=useState(false);
  const [showAddExercise,setShowAddExercise]=useState(false);
  const [drafts,setDrafts]=useState([]);
  const [draftEditor,setDraftEditor]=useState(null);
  const [applyingDraft,setApplyingDraft]=useState(null);
  const insightDone=useRef(false);

  const allMuscleGroups={...BUILTIN_MUSCLE_GROUPS,...Object.fromEntries(customMuscleGroups.map(mg=>[mg.id,mg]))};
  const allExercises=[
    ...EXERCISE_LIBRARY.map(ex=>({...ex,isCustom:false})),
    ...customExercises.map(ex=>({...ex,isCustom:true})),
  ];

  useEffect(()=>{
    async function load(){
      setLoading(true);
      try{
        const status=await fetch("/api/auth/status").then(r=>r.json());
        setConnected(status.connected);
        if(status.connected){
          const [actData,notesData,customData,draftsData]=await Promise.all([fetch("/api/activities").then(r=>r.json()),fetch("/api/notes").then(r=>r.json()),fetch("/api/custom").then(r=>r.json()),fetch("/api/drafts").then(r=>r.json())]);
          setRuns(actData.runs||[]);setStrength(actData.strength||[]);setNotes(notesData.notes||{});
          setCustomExercises(customData.exercises||[]);setCustomMuscleGroups(customData.muscles||[]);
          setDrafts(draftsData.drafts||[]);
        }
      }catch(e){console.error(e);}
      setLoading(false);
    }
    load();
  },[]);

  async function forceSync() {
    setSyncing(true);
    try {
      const actData = await fetch("/api/activities?sync=true").then(r=>r.json());
      setRuns(actData.runs||[]);
      setStrength(actData.strength||[]);
      insightDone.current = false;
    } catch(e) { console.error(e); }
    setSyncing(false);
  }

  useEffect(()=>{
    if(insightDone.current||runs.length===0)return;
    insightDone.current=true;setInsightLoading(true);
    fetch("/api/insight",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recentRuns:runs.slice(0,10).map(r=>`${r.name} ${fmtDist(r.distance)}`).join(", "),strengthSummary:allStrength.length===0?"NONE":allStrength.slice(0,5).map(s=>`${s.name} ${fmtDuration(s.duration)}`).join(", "),strengthCount:allStrength.length,runCount:runs.length})})
      .then(r=>r.json()).then(d=>setInsight(d.insight||"")).catch(()=>{}).finally(()=>setInsightLoading(false));
  },[runs,strength]);

  async function saveManualSession(session, noteData) {
    const updated = [...manualSessions, session];
    setManualSessions(updated);
    try { localStorage.setItem("manual_sessions_v1", JSON.stringify(updated)); } catch {}
    // Save exercise notes using the session id
    await fetch("/api/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({activity_id:session.id,notes:noteData})});
    const updatedNotes={...notes,[session.id]:noteData};
    const updatedStrength=[...allStrength,session];
    const before=computeMuscleStats(notes,allStrength,allExercises);
    const after=computeMuscleStats(updatedNotes,updatedStrength,allExercises);
    setNotes(updatedNotes);
    setXpGain(diffMuscleStats(before,after));
    if(challenge){
      const beforeProgress=computeChallengeProgress(challenge,notes,allStrength);
      const afterProgress=computeChallengeProgress(challenge,updatedNotes,updatedStrength);
      if(!beforeProgress.done&&afterProgress.done)setChallengeDone(challenge);
    }
  }

  function deleteManualSession(id) {
    const updated = manualSessions.filter(s=>s.id!==id);
    setManualSessions(updated);
    try { localStorage.setItem("manual_sessions_v1", JSON.stringify(updated)); } catch {}
  }

  async function saveNotesFixed(activityId){
    const newPBs=detectPBs(enrichForm.exercises,notes,activityId);
    setSaving(true);
    const syncRes=await fetch("/api/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({activity_id:activityId,notes:enrichForm})}).then(r=>r.json()).catch(()=>null);
    if(syncRes?.stravaError)setStravaError(syncRes.stravaError);
    const updatedNotes={...notes,[activityId]:enrichForm};
    const before=computeMuscleStats(notes,allStrength,allExercises);
    const after=computeMuscleStats(updatedNotes,allStrength,allExercises);
    setNotes(updatedNotes);
    setSaving(false);setEnriching(null);
    if(newPBs.length>0)setPbs(newPBs);
    setXpGain(diffMuscleStats(before,after));
    if(challenge){
      const beforeProgress=computeChallengeProgress(challenge,notes,allStrength);
      const afterProgress=computeChallengeProgress(challenge,updatedNotes,allStrength);
      if(!beforeProgress.done&&afterProgress.done)setChallengeDone(challenge);
    }
  }

  function openEnrich(activity){setEnriching(activity.id);setEnrichForm(notes[activity.id]||{exercises:{},sessionNotes:""});}

  async function addCustomMuscle(mg){await fetch("/api/custom",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"muscle",data:mg})});setCustomMuscleGroups(prev=>[...prev,mg]);}
  async function addCustomExercise(ex){await fetch("/api/custom",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"exercise",data:ex})});setCustomExercises(prev=>[...prev,ex]);}
  async function deleteExercise(id){await fetch("/api/custom",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"exercise",id})});setCustomExercises(prev=>prev.filter(e=>e.id!==id));}
  async function deleteMuscle(id){await fetch("/api/custom",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"muscle",id})});setCustomMuscleGroups(prev=>prev.filter(m=>m.id!==id));}

  async function saveDraft(draft){
    await fetch("/api/drafts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({draft})});
    setDrafts(prev=>{
      const idx=prev.findIndex(d=>d.id===draft.id);
      if(idx>=0){const copy=[...prev];copy[idx]=draft;return copy;}
      return [draft,...prev];
    });
  }

  async function deleteDraft(id){
    await fetch("/api/drafts",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    setDrafts(prev=>prev.filter(d=>d.id!==id));
  }

  function applyDraftToSession(draft,activityId){
    const existing=notes[activityId]||{exercises:{},sessionNotes:""};
    const mergedExercises={...existing.exercises};
    for(const [exId,val] of Object.entries(draft.exercises||{})){
      if(mergedExercises[exId]){
        mergedExercises[exId]={...mergedExercises[exId],sets:[...(mergedExercises[exId].sets||[]),...(val.sets||[])]};
      }else{
        mergedExercises[exId]=val;
      }
    }
    const mergedNotes=[existing.sessionNotes,draft.sessionNotes].filter(Boolean).join("\n\n");
    setEnrichForm({exercises:mergedExercises,sessionNotes:mergedNotes});
    setEnriching(activityId);
    setApplyingDraft(null);
    if(!draft.isTemplate)deleteDraft(draft.id);
  }

  const allStrength=[...strength,...manualSessions].sort((a,b)=>b.date.localeCompare(a.date));
  const sortedStrength=allStrength;
  const timeline=[...runs,...allStrength].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,25);
  const totalRunKm=runs.reduce((acc,r)=>acc+r.distance/1000,0);
  const lastStr=sortedStrength[0];
  const daysSince=lastStr?Math.floor((new Date()-new Date(lastStr.date+"T12:00:00"))/86400000):null;
  const hrTrend=sortedStrength.filter(s=>s.avg_hr).slice(0,8).reverse().map(s=>s.avg_hr);
  const muscleStats=computeMuscleStats(notes,allStrength,allExercises);
  const challenge=generateMonthlyChallenge(muscleStats,new Date().getMonth(),allExercises);
  const ratio=Math.round(runs.length/Math.max(allStrength.length,1));

  const currentYear=new Date().getFullYear();
  const ytdStrength=allStrength.filter(s=>s.date?.startsWith(String(currentYear)));
  const totalStrengthSec=allStrength.reduce((acc,s)=>acc+s.duration,0);
  const ytdStrengthSec=ytdStrength.reduce((acc,s)=>acc+s.duration,0);
  const avgStrengthSec=allStrength.length>0?totalStrengthSec/allStrength.length:0;
  const ytdAvgStrengthSec=ytdStrength.length>0?ytdStrengthSec/ytdStrength.length:0;
  const monthlyStrength=groupStrengthByMonth(allStrength).slice(0,12);
  const maxMonthStrengthSec=Math.max(...monthlyStrength.map(m=>m.durationSec),1);
  const statCard=(value,label,color=C.textSecondary)=>(
    <div style={S.statCard}>
      <div style={{fontSize:18,fontWeight:"700",color}}>{value}</div>
      <div style={{fontSize:11,color:C.textMuted,marginTop:4,fontWeight:"500"}}>{label}</div>
    </div>
  );

  if(loading)return <div style={{...S.page,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}><div style={{color:C.textMuted,fontSize:14}}>Loading...</div></div>;
  if(!connected)return(
    <div style={{...S.page,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:32}}>
      <div style={{textAlign:"center",maxWidth:320}}>
        <div style={{fontSize:11,color:C.textMuted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:12,fontWeight:"600"}}>Ed's Strength Tracker</div>
        <div style={{fontSize:26,fontWeight:"700",color:C.text,marginBottom:10}}>Connect Strava</div>
        <div style={{fontSize:14,color:C.textMuted,lineHeight:1.7,marginBottom:28}}>Pulls your full Strava history. Every strength session from your Forerunner appears here alongside your runs.</div>
        <a href="/api/auth/login" style={{display:"block",padding:"14px 24px",background:"#FC4C02",borderRadius:10,color:"#fff",textDecoration:"none",fontSize:14,fontWeight:"600"}}>Connect with Strava</a>
      </div>
    </div>
  );

  return(<>
    <Head><title>Ed's Strength Tracker</title><meta name="viewport" content="width=device-width, initial-scale=1"/><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/></Head>
    <div style={S.page}>
      <div style={S.header}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{fontSize:11,color:C.textFaint,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4,fontWeight:"500"}}>Strava · Live</div><div style={{fontSize:24,fontWeight:"700",color:C.text,letterSpacing:"-0.02em"}}>Ed's Strength Tracker</div></div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
            <div style={{textAlign:"right",background:C.orangeLight,border:`1px solid ${C.orangeBorder}`,borderRadius:10,padding:"8px 14px"}}>
              <div style={{fontSize:22,color:C.orange,fontWeight:"700",lineHeight:1}}>{totalRunKm.toFixed(0)}km</div>
              <div style={{fontSize:11,color:"#c2410c",marginTop:2}}>{runs.length} runs total</div>
            </div>
            <button onClick={forceSync} disabled={syncing} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",fontSize:11,color:C.textMuted,cursor:"pointer",fontFamily:"inherit",opacity:syncing?0.6:1}}>
              {syncing?"Syncing…":"⟳ Sync Strava"}
            </button>
          </div>
        </div>
        <div style={{display:"flex",marginTop:20}}>
          {["dashboard","muscles","progress","strength","runs"].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={S.navBtn(view===v)}>{v}</button>
          ))}
        </div>
      </div>

      <div style={S.body}>

        {view==="dashboard"&&(<>
          {/* Monthly challenge — top of dashboard */}
          <ChallengeCard challenge={challenge} notes={notes} strength={[...strength,...manualSessions]}/>

          {/* Top stat row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
            {[{label:"Strength sessions",value:allStrength.length,color:C.blue},{label:"Last session",value:daysSince===null?"Never":daysSince===0?"Today":`${daysSince}d ago`,color:daysSince===null||daysSince>14?C.red:daysSince>7?"#d97706":C.green},{label:"Run:strength",value:`${ratio}:1`,color:ratio>10?C.red:ratio>5?"#d97706":C.green}].map(s=>(
              <div key={s.label} style={S.statCard}><div style={{fontSize:s.value.toString().length>5?13:22,fontWeight:"700",color:s.color,paddingTop:2}}>{s.value}</div><div style={{fontSize:11,color:C.textMuted,marginTop:4,fontWeight:"500"}}>{s.label}</div></div>
            ))}
          </div>

          {/* 8-week combined line chart */}
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:14,fontWeight:"600",color:C.text}}>8-week overview</div>
              <div style={{display:"flex",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:3,background:"#fb923c",borderRadius:2}}/><span style={{fontSize:11,color:C.textMuted}}>km run</span></div>
                <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:3,background:C.blue,borderRadius:2}}/><span style={{fontSize:11,color:C.textMuted}}>strength mins</span></div>
              </div>
            </div>
            <div style={{fontSize:11,color:C.textFaint,marginBottom:12}}>Each point = one week. Two separate scales.</div>
            <WeeklyLineChart runs={runs} strength={allStrength}/>
          </div>

          {/* Running section */}
          <div style={{...S.sectionLabel,marginTop:4}}>🏃 Running</div>
          <div style={S.card}>
            <RunStatsPanel runs={runs}/>
          </div>

          {/* Strength section */}
          <div style={{...S.sectionLabel}}>💪 Strength</div>
          <div style={S.card}>
            <StrengthStatsPanel strength={allStrength}/>
          </div>

          {/* AI insight */}
          <div style={{background:C.blueLight,border:`1px solid ${C.blueBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:14}}>
            <div style={{fontSize:11,color:C.blue,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,fontWeight:"600"}}>AI Coach</div>
            {insightLoading?<div style={{color:C.textMuted,fontSize:13}}>Analysing your training...</div>:<div style={{color:C.textSecondary,fontSize:14,lineHeight:1.7}}>{insight||"Add ANTHROPIC_API_KEY in Vercel to enable this."}</div>}
          </div>

          {allStrength.length===0&&<div style={{background:C.greenLight,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:14}}><div style={{fontSize:11,color:C.green,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,fontWeight:"600"}}>How to get started</div><div style={{color:"#166534",fontSize:13,lineHeight:1.8}}>Record on your Forerunner as <strong>Workout</strong> or <strong>Strength Training</strong>, or tap "+ Log Session" in the Strength tab.</div></div>}

          <div style={{...S.sectionLabel,marginTop:4}}>Recent Activity</div>
          <div style={S.card}>
            {timeline.map((a,idx)=>{
              const isStr=isStrengthType(a.sport_type);const actNotes=notes[a.id];
              return(<div key={a.id} style={{borderBottom:idx<timeline.length-1?`1px solid ${C.border}`:"none",paddingBottom:idx<timeline.length-1?12:0,marginBottom:idx<timeline.length-1?12:0}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:8,background:isStr?C.blueLight:C.orangeLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}}>{isStr?"💪":"🏃"}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,color:C.text,fontWeight:"500",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.name}</div><div style={{fontSize:12,color:C.textMuted,marginTop:2}}>{dayLabel(a.date)}{isStr&&a.avg_hr&&<span style={{color:hrColor(a.avg_hr),marginLeft:8,fontWeight:"500"}}>♥ {Math.round(a.avg_hr)} avg</span>}</div></div>
                  <div style={{textAlign:"right",flexShrink:0}}>{!isStr&&a.distance>0&&<div style={{fontSize:14,color:C.orange,fontWeight:"600"}}>{fmtDist(a.distance)}</div>}{isStr&&<div style={{fontSize:14,color:C.blue,fontWeight:"600"}}>{fmtDuration(a.duration)}</div>}{a.calories>0&&<div style={{fontSize:12,color:C.textFaint}}>{a.calories}kcal</div>}</div>
                </div>
                {isStr&&enriching!==a.id&&<div style={{marginLeft:48,marginTop:8}}>{actNotes?<ExercisePills notes={actNotes} onEdit={()=>openEnrich(a)} allExercises={allExercises}/>:<button onClick={()=>openEnrich(a)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px",color:C.textMuted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>+ add exercise breakdown</button>}</div>}
                {isStr&&enriching===a.id&&<EnrichForm form={enrichForm} setForm={setEnrichForm} onSave={()=>saveNotesFixed(a.id)} onCancel={()=>setEnriching(null)} saving={saving} notes={notes} activityId={a.id} allExercises={allExercises}/>}
              </div>);
            })}
          </div>
        </>)}

        {view==="muscles"&&(<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={S.sectionLabel}>Muscle Levels</div>
            <button onClick={()=>setShowAddMuscle(true)} style={{...S.btn("sm"),fontSize:11,padding:"6px 12px"}}>+ Muscle Group</button>
          </div>

          {/* Body map */}
          <div style={S.card}>
            <BodyMap
              stats={muscleStats}
              onSelect={mgId=>{setExpandedMuscle(expandedMuscle===mgId?null:mgId);}}
              selectedMuscle={expandedMuscle}
            />
          </div>

          <div style={{background:C.blueLight,border:`1px solid ${C.blueBorder}`,borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.textSecondary,lineHeight:1.6}}>
            XP from logged sets · Levels scale exponentially · Train weekly for up to <strong>2×</strong> XP · Miss 2+ weeks and it decays
          </div>

          {/* All muscle cards in stable order — expanded inline */}
          {Object.keys(allMuscleGroups).map(mgId=>(
            <MuscleCard key={mgId} mgId={mgId} stats={muscleStats} muscleGroups={allMuscleGroups} allExercises={allExercises} notes={notes} strength={sortedStrength} expanded={expandedMuscle===mgId} onExpand={()=>setExpandedMuscle(expandedMuscle===mgId?null:mgId)}/>
          ))}

          {customMuscleGroups.length>0&&<div style={{marginTop:8}}><div style={S.sectionLabel}>Custom groups</div>{customMuscleGroups.map(mg=><div key={mg.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:6}}><span style={{fontSize:13}}>{mg.emoji} {mg.label}</span><button onClick={()=>deleteMuscle(mg.id)} style={{...S.btn("danger"),padding:"4px 10px",fontSize:11}}>Remove</button></div>)}</div>}
        </>)}

        {view==="progress"&&(<>
          <div style={S.sectionLabel}>Progression</div>
          <div style={S.card}>
            <div style={{fontSize:14,fontWeight:"600",color:C.text,marginBottom:4}}>Session HR Trend</div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:14}}>Average HR — lower over time = getting fitter at the same effort</div>
            {hrTrend.length<2?<div style={{fontSize:13,color:C.textFaint}}>Need at least 2 sessions with HR data</div>:(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                <Sparkline values={hrTrend} color={hrColor(hrTrend[hrTrend.length-1])} width={160} height={40}/>
                <div style={{textAlign:"right"}}><div style={{fontSize:28,fontWeight:"700",color:hrColor(hrTrend[hrTrend.length-1])}}>{Math.round(hrTrend[hrTrend.length-1])}</div><div style={{fontSize:12,color:hrTrend[hrTrend.length-1]<hrTrend[0]?C.green:"#d97706",fontWeight:"500"}}>{hrTrend[hrTrend.length-1]<hrTrend[0]?"↓ Getting easier":"↑ Working harder"}</div></div>
              </div>
            )}
          </div>
          <div style={S.card}>
            <div style={{fontSize:14,fontWeight:"600",color:C.text,marginBottom:4}}>Run : Strength Ratio</div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:14}}>Per month — lower is better</div>
            {(()=>{const months=[];for(let i=5;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;const r=runs.filter(a=>a.date?.startsWith(key)).length;const s=allStrength.filter(a=>a.date?.startsWith(key)).length;months.push({label:d.toLocaleDateString("en-GB",{month:"short"}),ratio:s>0?(r/s).toFixed(1):null});}
            return <div style={{display:"flex",gap:6}}>{months.map((m,i)=><div key={i} style={{flex:1,textAlign:"center",background:m.ratio?(parseFloat(m.ratio)<=4?C.greenLight:parseFloat(m.ratio)<=8?"#fffbeb":C.redLight):C.bg,border:`1px solid ${m.ratio?(parseFloat(m.ratio)<=4?C.greenBorder:parseFloat(m.ratio)<=8?"#fde68a":C.redBorder):C.border}`,borderRadius:8,padding:"10px 4px"}}><div style={{fontSize:m.ratio?15:18,color:m.ratio?(parseFloat(m.ratio)<=4?C.green:parseFloat(m.ratio)<=8?"#d97706":C.red):C.textFaint,fontWeight:"700"}}>{m.ratio||"—"}</div><div style={{fontSize:9,color:C.textMuted,textTransform:"uppercase",marginTop:3}}>{m.label}</div></div>)}</div>;})()}
          </div>
          <div style={{...S.sectionLabel,marginTop:4}}>Exercise PBs</div>
          <ExercisePBList allExercises={allExercises} sortedStrength={sortedStrength} notes={notes}/>
        </>)}

        {view==="strength"&&(<>
          {allStrength.length>0&&(<>
            <div style={S.sectionLabel}>{currentYear} so far</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
              {statCard(ytdStrength.length,"YTD sessions",C.blue)}
              {statCard(fmtDuration(ytdStrengthSec),"YTD time")}
              {statCard(fmtDuration(ytdAvgStrengthSec),"Avg session")}
            </div>

            <div style={S.sectionLabel}>All time</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
              {statCard(allStrength.length,"Total sessions",C.blue)}
              {statCard(fmtDuration(totalStrengthSec),"Total time")}
              {statCard(fmtDuration(avgStrengthSec),"Avg session")}
            </div>

            {monthlyStrength.length>0&&(<>
              <div style={S.sectionLabel}>By month</div>
              <div style={S.card}>
                {monthlyStrength.map((m,idx)=>(
                  <div key={m.key} style={{marginBottom:idx<monthlyStrength.length-1?10:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3,gap:8}}>
                      <span style={{fontSize:13,color:C.text,fontWeight:"500",whiteSpace:"nowrap"}}>{monthLabel(m.key)}</span>
                      <span style={{fontSize:12,color:C.textMuted,whiteSpace:"nowrap"}}>{m.count} session{m.count===1?"":"s"} · {fmtDuration(m.durationSec)}</span>
                    </div>
                    <div style={{height:6,background:C.bg,borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.max(2,(m.durationSec/maxMonthStrengthSec)*100)}%`,background:C.blue,borderRadius:3}}/>
                    </div>
                  </div>
                ))}
              </div>
            </>)}
          </>)}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={S.sectionLabel}>Drafts & Templates</div>
            <button onClick={()=>setDraftEditor("new")} style={{...S.btn("sm"),fontSize:11,padding:"6px 12px"}}>+ New Draft</button>
          </div>
          {drafts.length===0&&<div style={{...S.card,color:C.textMuted,fontSize:13,textAlign:"center",padding:"20px 16px",lineHeight:1.7}}>No drafts yet. Jot down a plan before or during your workout, then apply it to the Strava session once it syncs.</div>}
          {drafts.map(d=>(
            <DraftCard key={d.id} draft={d} allExercises={allExercises}
              onApply={()=>setApplyingDraft(d)}
              onEdit={()=>setDraftEditor(d)}
              onDelete={()=>deleteDraft(d.id)}/>
          ))}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,marginTop:4}}>
            <div style={S.sectionLabel}>Sessions ({allStrength.length})</div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setShowLogManual(true)} style={{...S.btn("primary"),fontSize:11,padding:"6px 12px"}}>+ Log Session</button>
              <button onClick={()=>setShowAddExercise(true)} style={{...S.btn("ghost"),fontSize:11,padding:"6px 12px"}}>+ Exercise</button>
            </div>
          </div>
          {customExercises.length>0&&<div style={S.card}><div style={{fontSize:12,color:C.textMuted,fontWeight:"600",marginBottom:8}}>Custom exercises</div>{customExercises.map(ex=><div key={ex.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><div><span style={{fontSize:13,color:C.text,fontWeight:"500"}}>{ex.label}</span><span style={{fontSize:11,color:C.textMuted,marginLeft:8}}>{ex.unit} · {ex.muscles.map(m=>allMuscleGroups[m]?.label||m).join(", ")}</span></div><button onClick={()=>deleteExercise(ex.id)} style={{...S.btn("danger"),padding:"3px 8px",fontSize:11}}>Remove</button></div>)}</div>}
          {allStrength.length===0&&<div style={{...S.card,color:C.textMuted,fontSize:14,textAlign:"center",padding:"40px 16px",lineHeight:1.8}}>No strength sessions yet.<br/><span style={{fontSize:12}}>Record on Forerunner or tap "+ Log Session" above.</span></div>}
          {sortedStrength.map(s=>{
            const actNotes=notes[s.id];
            return(<div key={s.id} style={{...S.card, border:s.isManual?`1px solid ${C.blueBorder}`:S.card.border}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{fontSize:15,fontWeight:"600",color:C.text}}>{s.name}</div>
                    {s.isManual&&<span style={{fontSize:10,background:C.blueLight,color:C.blue,border:`1px solid ${C.blueBorder}`,borderRadius:20,padding:"1px 7px",fontWeight:"600",flexShrink:0}}>Manual</span>}
                  </div>
                  <div style={{fontSize:12,color:C.textMuted,marginTop:3}}>{dayLabel(s.date)}{!s.isManual&&<a href={`https://www.strava.com/activities/${s.id}`} target="_blank" rel="noopener noreferrer" style={{marginLeft:8,color:C.textFaint,textDecoration:"none"}}>↗ Strava</a>}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:16,color:C.blue,fontWeight:"600"}}>{fmtDuration(s.duration)}</div>
                  {s.calories>0&&<div style={{fontSize:12,color:C.textFaint}}>{s.calories}kcal</div>}
                  {s.isManual&&<button onClick={()=>deleteManualSession(s.id)} style={{background:"none",border:"none",color:C.textFaint,fontSize:11,cursor:"pointer",padding:0,fontFamily:"inherit",marginTop:4}}>delete</button>}
                </div>
              </div>
              {(s.avg_hr||s.max_hr)&&<div style={{display:"flex",gap:20,marginBottom:12,background:C.bg,borderRadius:8,padding:"10px 14px"}}>{s.avg_hr&&<div><div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:"500"}}>Avg HR</div><div style={{fontSize:24,color:hrColor(s.avg_hr),fontWeight:"700"}}>{Math.round(s.avg_hr)}</div></div>}{s.max_hr&&<div><div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:"500"}}>Max HR</div><div style={{fontSize:24,color:hrColor(s.max_hr),fontWeight:"700"}}>{Math.round(s.max_hr)}</div></div>}</div>}
              {enriching===s.id?<EnrichForm form={enrichForm} setForm={setEnrichForm} onSave={()=>saveNotesFixed(s.id)} onCancel={()=>setEnriching(null)} saving={saving} notes={notes} activityId={s.id} allExercises={allExercises}/>:actNotes?<ExercisePills notes={actNotes} onEdit={()=>openEnrich(s)} allExercises={allExercises}/>:<button onClick={()=>openEnrich(s)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 12px",color:C.textMuted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>+ add exercise breakdown</button>}
            </div>);
          })}
        </>)}

        {view==="runs"&&<RunsTab runs={runs}/>}

      </div>
    </div>
    <ToastStack pbs={pbs} xpGain={xpGain} challengeDone={challengeDone} stravaError={stravaError} allExercises={allExercises} muscleGroups={allMuscleGroups} onDismissPbs={()=>setPbs([])} onDismissXp={()=>setXpGain(null)} onDismissChallenge={()=>setChallengeDone(null)} onDismissStrava={()=>setStravaError(null)}/>
    {showLogManual&&<LogManualModal allExercises={allExercises} onSave={saveManualSession} onClose={()=>setShowLogManual(false)}/>}
    {showAddMuscle&&<AddMuscleModal onSave={addCustomMuscle} onClose={()=>setShowAddMuscle(false)}/>}
    {showAddExercise&&<AddExerciseModal allMuscleGroups={allMuscleGroups} onSave={addCustomExercise} onClose={()=>setShowAddExercise(false)}/>}
    {draftEditor&&<DraftEditorModal draft={draftEditor==="new"?null:draftEditor} allExercises={allExercises} onSave={saveDraft} onClose={()=>setDraftEditor(null)}/>}
    {applyingDraft&&<ApplyDraftModal draft={applyingDraft} sessions={sortedStrength.slice(0,10)} notes={notes} onSelect={id=>applyDraftToSession(applyingDraft,id)} onClose={()=>setApplyingDraft(null)}/>}
  </>);
}
