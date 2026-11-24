import React from "react";
import {AbsoluteFill,useCurrentFrame,interpolate,Easing} from "remotion";
import {AtmosphereParticles,Fog,Vignette,LightSweep} from "../../../shared/overlays";
export const Pass:React.FC=()=>{
 const f=useCurrentFrame(),move=interpolate(f,[0,210],[0,1],{easing:Easing.inOut(Easing.cubic)});
 const trainX=interpolate(f,[0,210],[2200,-1250],{easing:Easing.inOut(Easing.cubic)});
 const snow=Array.from({length:34},(_,i)=><path key={i} d={`M${i*62-30} ${760+(i%6)*35}q30 -22 64 -6`} stroke="#f0f7fb" strokeWidth={4+i%3} opacity={.12+(i%4)*.04} fill="none"/>);
 return <AbsoluteFill style={{overflow:"hidden",background:"linear-gradient(180deg,#071522,#21394a 65%,#0a1824)"}}>
  <svg viewBox="0 0 1920 1080" style={{position:"absolute",width:"100%",height:"100%"}}>
   <defs><linearGradient id="rock" x2="0" y2="1"><stop stopColor="#9caeba"/><stop offset=".24" stopColor="#4f6576"/><stop offset="1" stopColor="#142938"/></linearGradient><linearGradient id="car" x2="0" y2="1"><stop stopColor="#f1e8d5"/><stop offset=".42" stopColor="#334e61"/><stop offset="1" stopColor="#142534"/></linearGradient><radialGradient id="headlight"><stop stopColor="#fff5ce" stopOpacity=".95"/><stop offset="1" stopColor="#f4cb7d" stopOpacity="0"/></radialGradient></defs>
   <circle cx="1520" cy="170" r="58" fill="#e1e9ee" opacity=".48"/>
   <path d="M0 560 220 225 350 390 600 120 830 450 1060 210 1300 470 1530 140 1730 405 1920 225V1080H0Z" fill="#30495a"/>
   <path d="M0 560 220 225 350 390 600 120 830 450 1060 210 1300 470 1530 140 1730 405 1920 225" fill="none" stroke="#edf5f8" strokeWidth="26" opacity=".8"/>
   <path d="M0 620 220 430 370 590 660 300 850 600 1090 340 1360 630 1600 355 1920 600V1080H0Z" fill="url(#rock)"/>
   <path d="M0 680 260 540 420 680 690 440 930 725 1150 460 1400 720 1660 475 1920 695V1080H0Z" fill="#1b3140"/>
   <path d="M0 850 Q500 770 1000 845 T1920 830V1080H0Z" fill="#0b1a27"/>
   {snow}
  </svg>
  <svg viewBox="0 0 1920 1080" style={{position:"absolute",width:"100%",height:"100%",transform:`translateX(${-move*32}px)`}}>
   <path d="M0 1050Q550 940 1080 1010T1920 950 M0 1067Q550 957 1080 1027T1920 967" stroke="#bdcbd2" strokeWidth="7" fill="none" opacity=".8"/>
   <g transform={`translate(${trainX} 0)`}>
    <path d="M0 740Q0 655 90 655H1330Q1440 655 1490 725L1540 850H0Z" fill="url(#car)" stroke="#c6d2d8" strokeWidth="8"/>
    <path d="M0 740H1500" stroke="#c59d62" strokeWidth="18"/>
    {Array.from({length:7},(_,i)=><g key={i} transform={`translate(${180+i*175} 0)`}><rect y="690" width="125" height="105" rx="8" fill="#101f2d" stroke="#a8bdca" strokeWidth="8"/><rect x="10" y="700" width="105" height="82" fill="#e5c88b" opacity={.45+Math.sin(f*.07+i)*.12}/></g>)}
    <path d="M1310 660Q1450 660 1508 760L1542 846H1305Z" fill="#d8e1e3" stroke="#af8958" strokeWidth="8"/>
    <path d="M1350 685H1430L1492 778H1360Z" fill="#152b3a" stroke="#c2d0d6" strokeWidth="7"/>
    <path d="M1507 775L1600 835L1542 850H1490Z" fill="#f8d999"/>
    <circle cx="1540" cy="800" r="155" fill="url(#headlight)" opacity=".75"/>
    <path d="M100 850H1400" stroke="#0a131c" strokeWidth="22"/>
    {Array.from({length:8},(_,i)=><g key={i}><circle cx={120+i*175} cy="855" r="37" fill="#090f16" stroke="#6d7d86" strokeWidth="9"/><circle cx={120+i*175} cy="855" r="11" fill="#c3cbd0"/></g>)}
   </g>
  </svg>
  <div style={{position:"absolute",left:130,top:100,color:"#f4f7f9",fontSize:24,letterSpacing:5}}>02:19 / CROSSING THE RIDGELINE</div>
  <div style={{position:"absolute",right:125,bottom:105,color:"#d2e0e7",fontSize:18,letterSpacing:4}}>ALTITUDE 2,418 M</div>
  <Fog opacity={.2}/><AtmosphereParticles kind="snow" count={180}/><LightSweep opacity={.09}/><Vignette strength={.5}/>
 </AbsoluteFill>;
};
