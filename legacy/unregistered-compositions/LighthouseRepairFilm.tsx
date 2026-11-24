import React, { type FC, type CSSProperties } from "react";
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const smooth = (f: number, a: number, b: number) => interpolate(f, [a,b], [0,1], {...clamp, easing:Easing.inOut(Easing.cubic)});
const point = (cx:number,cy:number,r:number,a:number) => [cx+Math.cos(a)*r,cy+Math.sin(a)*r] as const;

const Rain:FC<{frame:number; density?:number}> = ({frame,density=75}) => (
  <g opacity=".57" stroke="#a8c6d1" strokeWidth="2" strokeLinecap="round">
    {Array.from({length:density},(_,i)=>{
      const x=(i*137+Math.floor(frame*7.3))%1960;
      const y=(i*79+Math.floor(frame*17.2))%1110;
      return <path key={i} d={`M${x} ${y} l-15 34`} opacity={.18+(i%5)*.055}/>;
    })}
  </g>
);

const Ocean:FC<{frame:number}> = ({frame}) => (
  <g>
    <path d="M0 680 Q200 645 400 686 T800 678 T1200 685 T1600 672 T1920 681 V1080 H0Z" fill="#0a2638"/>
    <path d="M0 748 Q140 700 290 744 T580 744 T870 737 T1160 744 T1450 736 T1740 742 T2040 734" fill="none" stroke="#628b9b" strokeWidth="9" opacity=".38"/>
    <path d="M0 836 Q160 802 320 835 T640 838 T960 832 T1280 837 T1600 829 T1920 839" fill="none" stroke="#a0bec7" strokeWidth="4" opacity=".25"/>
    <path d="M0 920 Q160 891 320 923 T640 922 T960 920 T1280 924 T1600 914 T1920 923" fill="none" stroke="#63889a" strokeWidth="13" opacity=".28"/>
    {Array.from({length:15},(_,i)=><path key={i} d={`M${i*145-20} ${760+(i%4)*58+Math.sin(frame*.08+i)*7} q42 -15 90 0`} stroke="#bdd1d4" strokeWidth="5" opacity=".24" fill="none"/>)}
  </g>
);

const Cliff:FC = () => <g>
  <path d="M360 1080 520 870 690 830 810 735 1010 780 1215 630 1410 820 1580 1080Z" fill="#172b34"/>
  <path d="M450 1080 670 875 790 885 960 770 1110 840 1330 670 1510 880" fill="none" stroke="#5a6661" strokeWidth="20" opacity=".45"/>
  <path d="M700 1080 840 900 970 930 1100 840 1240 910" fill="none" stroke="#a09376" strokeWidth="8" opacity=".32"/>
</g>;

const Lighthouse:FC<{frame:number;door:number;beacon:number;wide?:boolean}> = ({frame,door,beacon,wide=false}) => {
 const rotation=frame*.035;
 const beamOpacity=beacon*.24;
 return <g>
  <path d="M1050 850 L1120 230 Q1200 193 1280 230 L1355 850Z" fill="#827e70" stroke="#c7bca4" strokeWidth="12"/>
  {Array.from({length:8},(_,i)=><path key={i} d={`M${1080-i*5} ${310+i*70} h${245+i*10}`} stroke={i%2?"#555f60":"#d0c5ab"} strokeWidth="12" opacity=".54"/>)}
  <path d="M1122 240 L1148 142 H1273 L1302 240Z" fill="#263a44" stroke="#b7ab8e" strokeWidth="10"/>
  <path d="M1132 145 H1290 L1268 105 H1153Z" fill="#9a805e" stroke="#d4bf93" strokeWidth="8"/>
  <path d="M1191 100 V52 H1220 V100" fill="#bbae90" stroke="#594c3d" strokeWidth="6"/>
  <path d="M1175 53 H1236" stroke="#594c3d" strokeWidth="10"/>
  <rect x="1155" y="163" width="114" height="70" fill="#ffcf86" opacity={.5+beacon*.48}/>
  <path d="M1167 165 V232 M1209 165 V232 M1255 165 V232" stroke="#283c45" strokeWidth="8"/>
  <path d="M1177 164 H1247" stroke="#f1dba8" strokeWidth="5"/>
  <g transform="translate(1230 202)">
    <g transform={`rotate(${rotation*57.2958})`}>
      {Array.from({length:8},(_,i)=><path key={i} d="M-4 -6 L-13 -64 L0 -78 L13 -64 L4 -6Z" fill="#f6d99c" opacity={.84}/>)}
    </g>
    <circle r="21" fill="#ffe9b2" opacity={beacon*.75}/>
  </g>
  <path d="M1198 244 L1198 330" stroke="#e5ad66" strokeWidth="8" opacity=".45"/>
  <g transform="translate(1198 840)">
   <path d="M-59 -1 V-122 Q0 -151 59 -122 V-1Z" fill="#121e25" stroke="#bcaa84" strokeWidth="9"/>
   <g transform={`translate(0 0) rotate(${door*72})`}>
    <path d="M-54 -4 V-120 Q0 -147 54 -120 V-4Z" fill="#344147" stroke="#8e8d7e" strokeWidth="9"/>
    {Array.from({length:7},(_,i)=><circle key={i} cx={i%2?39:-39} cy={-24-i*13} r="4" fill="#d9ba7c"/>)}
    <circle cx="36" cy="-63" r="7" fill="#e3c27f"/>
   </g>
   <rect x="-75" y="0" width="150" height="26" fill="#292e30"/>
  </g>
  {wide && <g transform={`translate(1230 202) rotate(${rotation*57.2958})`}>
    <path d="M0 0 L-980 -245 L-1020 210Z" fill="#ffd58a" opacity={beamOpacity*.8}/>
    <path d="M0 0 L-950 -90 L-960 100Z" fill="#fff0c6" opacity={beamOpacity*.42}/>
  </g>}
 </g>;
};

const Robot:FC<{x:number;y:number;scale:number;frame:number;reach?:number;walk?:number;glow?:number;turn?:number}> = ({x,y,scale,frame,reach=0,walk=0,glow=0,turn=0}) => {
 const stride=Math.sin(frame*.23)*walk;
 const armAngle=-.2+reach*.95;
 return <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${turn})`}>
  <ellipse cx="0" cy="6" rx="66" ry="16" fill="#02080d" opacity=".55"/>
  <path d="M-24 -42 L-29 -4 M24 -42 L32 -4" stroke="#67777a" strokeWidth="22" strokeLinecap="round"/>
  <g transform={`translate(-25 -5) rotate(${stride*26})`}><rect x="-12" y="-4" width="24" height="57" rx="11" fill="#85908a"/><path d="M-25 48 H24" stroke="#303e43" strokeWidth="18" strokeLinecap="round"/></g>
  <g transform={`translate(27 -5) rotate(${-stride*26})`}><rect x="-12" y="-4" width="24" height="57" rx="11" fill="#85908a"/><path d="M-25 48 H24" stroke="#303e43" strokeWidth="18" strokeLinecap="round"/></g>
  <rect x="-50" y="-158" width="100" height="126" rx="29" fill="#c7c3b2" stroke="#55666b" strokeWidth="8"/>
  <path d="M-37 -139 H37 M-40 -62 H40" stroke="#e9dec8" strokeWidth="5" opacity=".65"/>
  <g transform="translate(0 -198)">
   <rect x="-63" y="-45" width="126" height="88" rx="26" fill="#e2d8c2" stroke="#566a6e" strokeWidth="8"/>
   <rect x="-49" y="-23" width="98" height="34" rx="15" fill="#102731" stroke="#c1995d" strokeWidth="4"/>
   <rect x="-40" y="-15" width="80" height="18" rx="8" fill="#e5ab5e" opacity=".94"/>
   <circle cx="0" cy="-6" r="8" fill="#fff0c9"/>
   <path d="M-31 -47 V-61 M31 -47 V-61" stroke="#c39f69" strokeWidth="7" strokeLinecap="round"/>
   <circle cx="-31" cy="-64" r="8" fill="#edbd70"/><circle cx="31" cy="-64" r="8" fill="#edbd70"/>
  </g>
  <g transform={`translate(-55 -133) rotate(12)`}>
   <path d="M0 0 L-27 60" stroke="#7d8d8b" strokeWidth="19" strokeLinecap="round"/>
   <path d="M-27 60 L-18 108" stroke="#bca775" strokeWidth="16" strokeLinecap="round"/>
   <path d="M-18 108 l-11 17 m11 -17 12 16" stroke="#d5ba81" strokeWidth="7" strokeLinecap="round"/>
  </g>
  <g transform={`translate(55 -133) rotate(${armAngle*57.2958})`}>
   <path d="M0 0 L28 57" stroke="#7d8d8b" strokeWidth="19" strokeLinecap="round"/>
   <path d="M28 57 L31 103" stroke="#bca775" strokeWidth="16" strokeLinecap="round"/>
   <path d="M31 103 l-11 17 m11 -17 12 16" stroke="#d5ba81" strokeWidth="7" strokeLinecap="round"/>
   <circle cx="31" cy="102" r="5" fill="#ffcc80" opacity={glow}/>
  </g>
  <circle cx="0" cy="-365" r="11" fill="#edba72" opacity=".8"/>
 </g>;
};

const DoorClose:FC<{frame:number;open:number}> = ({frame,open}) => {
 const gust=Math.sin(frame*.19);
 const brace=Math.sin(frame*.27);
 const shoulderReach=.18+Math.sin(frame*.17)*.12+open*.22;
 return (
 <g>
  <path d="M0 1080V370 Q960 -70 1920 370 V1080Z" fill="#26383e"/>
  <path d="M550 1080V460 Q960 105 1370 460 V1080Z" fill="#131f26" stroke="#9a9077" strokeWidth="28"/>
  <g transform={`translate(960 1080) rotate(${-open*48 + gust*1.3})`}>
   <path d="M-360 0V-615 Q0 -900 360 -615 V0Z" fill="#3c4848" stroke="#b9a16f" strokeWidth="26"/>
   <path d="M-310 -15V-600 Q0 -830 310 -600 V-15" fill="none" stroke="#66736f" strokeWidth="15"/>
   {Array.from({length:16},(_,i)=><circle key={i} cx={i%2?290:-290} cy={-100-i*31} r="12" fill="#c3a46b"/>)}
   <circle cx="230" cy="-310" r="25" fill="#dfb975"/>
  </g>
  <Robot x={725+open*160+gust*7} y={950+brace*4} scale={1.18} frame={frame} walk={.34} reach={shoulderReach} glow={.7} turn={gust*2.4}/>
  <path d="M1000 805 Q1120 700 1275 792" fill="none" stroke="#edbd76" strokeWidth="12" opacity={open*.65}/>
  <path d={`M0 1010 Q380 ${960+brace*8} 760 1014`} fill="none" stroke="#8ba8ad" strokeWidth="5" opacity=".3"/>
 </g>
 );
};

const StairShot:FC<{frame:number;climb:number}> = ({frame,climb}) => (
 <g>
  <rect width="1920" height="1080" fill="#0a1720"/>
  <circle cx="960" cy="520" r="600" fill="#1b3038" stroke="#978668" strokeWidth="44"/>
  <circle cx="960" cy="520" r="355" fill="#02090f" stroke="#d0b37a" strokeWidth="18"/>
  {Array.from({length:24},(_,i)=>{
   const a=i*.52+frame*.003;
   const p=point(960,520,465,a);
   return <g key={i} transform={`translate(${p[0]} ${p[1]}) rotate(${a*57.2958})`}>
     <path d="M-110 -25 H110 L89 48 H-90Z" fill={i%2?"#83785f":"#b19b72"} stroke="#cdb77e" strokeWidth="6"/>
     <path d="M-86 -9 H86" stroke="#e0d1ab" strokeWidth="8" opacity=".6"/>
    </g>;
  })}
  <path d="M960 520 m-320 0 a320 320 0 1 1 640 0 a320 320 0 1 1 -640 0" fill="none" stroke="#9c8b68" strokeWidth="18" strokeDasharray="18 12"/>
  <g transform={`translate(960 ${820-climb*370})`}>
   <Robot x={0} y={0} scale={.62} frame={frame} walk={.8}/>
  </g>
  <path d="M0 0 H1920 V1080 H0Z" fill="none" stroke="#000" strokeWidth="150" opacity=".2"/>
 </g>
);

const RepairShot:FC<{frame:number;repair:number}> = ({frame,repair}) => {
 const coupled=smooth(frame,380,411);
 const pinned=smooth(frame,412,434);
 const turned=smooth(frame,436,466);
 return <g>
  <rect width="1920" height="1080" fill="#101e27"/>
  <circle cx="970" cy="545" r="340" fill="#253943" stroke="#b18e59" strokeWidth="30"/>
  <circle cx="970" cy="545" r="250" fill="#10232d" stroke="#e0bd78" strokeWidth="13"/>
  <g transform={`rotate(${frame*.8} 970 545)`}>
   {Array.from({length:12},(_,i)=>{
    const a=i*Math.PI/6;
    const p=point(970,545,295,a);
    return <rect key={i} x={p[0]-32} y={p[1]-25} width="64" height="50" rx="8" fill="#bd9b60" stroke="#e2c889" strokeWidth="6" transform={`rotate(${i*30} ${p[0]} ${p[1]})`}/>;
   })}
  </g>
  <g>
   <circle cx="970" cy="545" r="112" fill="#172a31" stroke="#a88350" strokeWidth="22"/>
   <path d={`M${730+coupled*180} 545 H${1205-pinned*120}`} stroke="#d2ad6c" strokeWidth="66" strokeLinecap="round"/>
   <path d={`M${820+coupled*120} 545 H${1120-pinned*110}`} stroke="#f1d79e" strokeWidth="14" strokeLinecap="round"/>
   <path d={`M${970-turned*40} 310 L${970-turned*40} 780`} stroke="#b99156" strokeWidth="28" strokeLinecap="round"/>
   <circle cx="970" cy="545" r="46" fill="#f4c979" opacity={.2+turned*.8}/>
  </g>
  <Robot x={350+coupled*90} y={890} scale={.98} frame={frame} reach={repair} glow={pinned}/>
  {Array.from({length:12},(_,i)=>{
    const t=smooth(frame,428+i*.8,430+i*.8)*(1-smooth(frame,437+i*.8,440+i*.8));
    const x=990+Math.sin(i*4.1)*110;
    const y=515+Math.cos(i*3.7)*120;
    return <circle key={i} cx={x} cy={y} r={3+t*12} fill="#ffe1a0" opacity={t}/>;
  })}
 </g>;
};

const LensShot:FC<{frame:number;power:number}> = ({frame,power}) => (
 <g>
  <rect width="1920" height="1080" fill="#0b1720"/>
  <circle cx="960" cy="520" r="420" fill="#f6c774" opacity={power*.1}/>
  <circle cx="960" cy="520" r="300" fill="#263a43" stroke="#c59d61" strokeWidth="28"/>
  <circle cx="960" cy="520" r="247" fill="#101e27" stroke="#f0d99f" strokeWidth="15"/>
  <g transform={`rotate(${frame*1.3} 960 520)`}>
   {Array.from({length:12},(_,i)=><path key={i} d="M960 520 L916 208 Q960 176 1004 208Z" fill="#ffe8b6" stroke="#c6a16a" strokeWidth="7" opacity=".88" transform={`rotate(${i*30} 960 520)`}/>)}
   <circle cx="960" cy="520" r="125" fill="#f6cc7e" stroke="#fff0c6" strokeWidth="18"/>
   <circle cx="960" cy="520" r="70" fill="#fff1c5" opacity={power}/>
  </g>
  <g transform="translate(1500 800) scale(.95)"><Robot x={0} y={0} scale={.7} frame={frame} turn={-8}/></g>
  <path d={`M960 520 L${960+Math.cos(frame*.06)*1600} ${520+Math.sin(frame*.06)*1600} L${960+Math.cos(frame*.06+.12)*1600} ${520+Math.sin(frame*.06+.12)*1600}Z`} fill="#ffd98f" opacity={power*.19}/>
 </g>
);

const FinalShot:FC<{frame:number;power:number}> = ({frame,power}) => (
 <g>
  <rect width="1920" height="1080" fill="#091725"/>
  <Ocean frame={frame}/>
  <Cliff/>
  <Lighthouse frame={frame} door={1} beacon={power} wide/>
  <g transform={`translate(${520+Math.sin(frame*.04)*18} ${720+Math.sin(frame*.1)*6})`}>
   <path d="M-80 0 H70 L48 42 H-53Z" fill="#61777e" stroke="#c2c6b2" strokeWidth="6"/>
   <path d="M-26 0 V-47 H42 V0Z" fill="#929e92" stroke="#d3c6a0" strokeWidth="5"/>
   <circle cx="48" cy="-22" r="7" fill="#ffc577"/>
   <path d="M-13 -45V-95" stroke="#d1c29b" strokeWidth="5"/>
   <path d="M-13 -93 L-85 -49 H-13Z" fill="#d4d9ca" opacity=".52"/>
  </g>
  <path d={`M1230 202 L${1230+Math.cos(frame*.035)*1750} ${202+Math.sin(frame*.035)*1750} L${1230+Math.cos(frame*.035+.14)*1750} ${202+Math.sin(frame*.035+.14)*1750}Z`} fill="#ffe1a7" opacity={power*.17}/>
  <path d="M0 0 H1920 V1080 H0Z" fill="url(#shade)"/>
 </g>
);

const shadeDef = <defs><radialGradient id="shade"><stop offset=".45" stopColor="#000" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".48"/></radialGradient><linearGradient id="sky" x2="0" y2="1"><stop stopColor="#071321"/><stop offset="1" stopColor="#1f3a48"/></linearGradient></defs>;

const StoryFrame:FC<{frame:number;shot:number}> = ({frame,shot}) => {
 const local=frame-shot*120;
 const approach=smooth(local,0,116);
 const door=smooth(local,8,92);
 const climb=smooth(local,12,110);
 const repair=smooth(frame,360,452);
 const beacon=smooth(frame,482,532);
 const zoom=shot===0?1.06+approach*.08:shot===1?1.16+door*.06:shot===2?1.1:shot===3?1.08:shot===4?1.04:1.02;
 const pan=shot===0?interpolate(local,[0,119],[-42,22],clamp):shot===1?interpolate(local,[0,119],[-38,16],clamp)+Math.sin(local*.17)*3:shot===2?interpolate(local,[0,119],[-10,12],clamp):shot===3?0:shot===4?interpolate(local,[0,119],[8,-8],clamp):interpolate(local,[0,119],[36,-26],clamp);
 const camera:CSSProperties={transform:`translate(${pan}px,0) scale(${zoom})`,transformOrigin:shot===0?"53% 55%":shot===1?"50% 70%":"50% 50%"};
 return (
  <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{display:"block",background:"#071321"}}>
   {shadeDef}
   <rect width="1920" height="1080" fill="url(#sky)"/>
   <g style={camera}>
    {shot===0 && <><Ocean frame={frame}/><Cliff/><Lighthouse frame={frame} door={0} beacon={0}/><Robot x={400+approach*520} y={975-approach*90} scale={.42} frame={frame} walk={1}/></>}
    {shot===1 && <DoorClose frame={frame} open={door}/>}
    {shot===2 && <StairShot frame={frame} climb={climb}/>}
    {shot===3 && <RepairShot frame={frame} repair={repair}/>}
    {shot===4 && <LensShot frame={frame} power={beacon}/>}
    {shot===5 && <FinalShot frame={frame} power={beacon}/>}
   </g>
   {shot!==2 && shot!==3 && <Rain frame={frame} density={shot===4?35:75}/>}
   {shot===0 && <g opacity={Math.max(0,Math.sin(frame*.11))*.12}><path d="M100 0 160 0 0 320Z" fill="#e0f1f5"/></g>}
   <rect width="1920" height="1080" fill="url(#shade)" pointerEvents="none"/>
  </svg>
 );
};

export const LighthouseRepairFilm:FC = () => {
 const frame=useCurrentFrame();
 const shot=Math.min(5,Math.floor(frame/120));
 const fadeIn=interpolate(frame,[0,20],[0,1],clamp);
 const fadeOut=interpolate(frame,[702,720],[1,0],clamp);
 return <AbsoluteFill style={{backgroundColor:"#071321",opacity:fadeIn*fadeOut}}>
   <StoryFrame frame={frame} shot={shot}/>
   <Audio src={staticFile("assets/audio/stormlight-score.wav")} volume={.68}/>
   <Audio src={staticFile("assets/audio/stormlight-atmosphere.wav")} volume={.52}/>
 </AbsoluteFill>;
};
