import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const smooth = (frame: number, input: number[], output: number[]) =>
  interpolate(frame, input, output, { ...clamp, easing: Easing.inOut(Easing.cubic) });

const GrassBlade = ({ index }: { index: number }) => {
  const frame = useCurrentFrame();
  const x = (index * 83) % 1920;
  const height = 34 + (index * 19) % 58;
  const sway = Math.sin(frame / 39 + index * 0.71) * 7;
  return <path d={`M ${x} 910 Q ${x + sway} ${910 - height / 2} ${x + sway * 1.7} ${910 - height}`} fill="none" stroke={index % 3 === 0 ? "#6f9e62" : "#82aa70"} strokeWidth="4" strokeLinecap="round" opacity=".72" />;
};

const Cat = ({ frame }: { frame: number }) => {
  const cycleLength = 143;
  const cycleIndex = Math.floor(frame / cycleLength);
  const cycle = frame % cycleLength;
  const crouch = 1 - smooth(cycle, [0, 20, 36, 46], [0, 0, 1, 0]);
  const launch = smooth(cycle, [40, 54, 72, 82], [0, 1, 1, 0]);
  const land = smooth(cycle, [106, 114, 125, 140], [0, 1, 0.25, 0]);
  const jumpHeight = cycleIndex === 3 ? 205 : cycleIndex === 1 ? 245 : 265;
  const height = cycle < 55 ? 0 : cycle < 110 ? Math.sin(((cycle - 55) / 55) * Math.PI) * jumpHeight : 0;
  const leapTravel = cycleIndex === 3 ? 25 : 46;
  const x = cycle < 55 ? smooth(cycle, [0, 55], [0, 18]) : cycle < 110 ? smooth(cycle - 55, [0, 55], [18, leapTravel]) : smooth(cycle - 110, [0, 40], [leapTravel, 0]);
  const bodySquashY = 1 - crouch * 0.18 + land * 0.2;
  const bodySquashX = 1 + crouch * 0.13 - land * 0.12;
  const rotation = cycle < 55 ? -crouch * 0.08 : cycle < 110 ? smooth(cycle - 55, [0, 55], [-0.08, 0.13]) : 0;
  const tailSwing = Math.sin(frame / 10) * 15 + (launch - (cycle > 80 && cycle < 110 ? 1 : 0)) * 18;
  const blink = cycle > 31 && cycle < 38 ? 0.08 : 1;
  return (
    <g transform={`translate(${960 + x} ${710 - height}) rotate(${rotation * 57.3})`}>
      <ellipse cx="-8" cy="115" rx="122" ry="24" fill="#203d32" opacity={Math.max(0.04,0.23-height/1400)} transform={`scale(${Math.max(.35,1 - height / 650)},1)`} />
      <g transform={`scale(${bodySquashX} ${bodySquashY})`}>
        <path d={`M 80 38 C 175 20 183 -76 125 -92 C 82 -104 73 -49 110 -39 C 148 -27 169 -77 151 -118`} fill="none" stroke="#d58b55" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" transform={`rotate(${tailSwing} 80 38)`} />
        <path d="M -112 30 C -130 -54 -68 -105 21 -91 C 95 -82 131 -14 104 43 C 83 93 -68 104 -112 30Z" fill="#e9aa70" />
        <path d="M -84 -60 C -103 -102 -112 -148 -87 -160 C -55 -174 -38 -129 -28 -95Z" fill="#e9aa70" />
        <path d="M 41 -91 C 49 -140 81 -174 106 -157 C 128 -140 103 -103 82 -68Z" fill="#e9aa70" />
        <path d="M -80 -66 L -86 -143 Q -63 -138 -48 -91Z M 57 -90 L 96 -144 Q 102 -116 79 -80Z" fill="#c97e70" />
        <ellipse cx="4" cy="-59" rx="83" ry="73" fill="#f0bd8a" />
        <ellipse cx="-27" cy="-60" rx="9" ry={11 * blink} fill="#443b34" />
        <ellipse cx="40" cy="-60" rx="9" ry={11 * blink} fill="#443b34" />
        <path d="M 0 -36 Q 5 -28 12 -36" fill="none" stroke="#715047" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="5" cy="-43" rx="7" ry="5" fill="#a86f65" />
        <path d="M -8 -30 Q -38 -18 -62 -25 M -4 -24 Q -30 -7 -50 -9 M 15 -30 Q 39 -18 63 -25 M 16 -24 Q 41 -7 57 -9" fill="none" stroke="#8f6753" strokeWidth="2.8" strokeLinecap="round" opacity=".72" />
        <path d="M -74 57 Q -81 87 -65 105 M -32 73 Q -41 91 -24 112 M 42 69 Q 54 92 68 109" fill="none" stroke="#d58b55" strokeWidth="21" strokeLinecap="round" />
        <path d="M -115 12 Q -143 35 -134 71 M 101 11 Q 125 42 113 69" fill="none" stroke="#e9aa70" strokeWidth="18" strokeLinecap="round" opacity=".8" />
        <path d="M -87 -3 Q -60 14 -30 2" stroke="#cf8a55" strokeWidth="7" strokeLinecap="round" fill="none" opacity=".52" />
        <path d="M 21 2 Q 48 19 75 6" stroke="#cf8a55" strokeWidth="7" strokeLinecap="round" fill="none" opacity=".52" />
      </g>
    </g>
  );
};

export const JumpingCat = () => {
  const frame = useCurrentFrame();
  const breeze = Math.sin(frame / 54) * 9;
  const sun = 0.5 + Math.sin(frame / 140) * 0.05;
  const backgroundDrift = Math.sin(frame / 105) * 13;
  const endFade = interpolate(frame, [570, 599], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#dbe9d6" }}>
      <Audio src={staticFile("audio/jumping-cat-wind.wav")} volume={frame < 540 ? 0.48 : interpolate(frame, [540,599],[0.48,0.3],clamp)} loop />
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#d6e7e1"/><stop offset=".68" stopColor="#f1e4c8"/></linearGradient>
          <linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a9bf91"/><stop offset="1" stopColor="#819c70"/></linearGradient>
          <radialGradient id="sunGlow"><stop stopColor="#fff8df" stopOpacity=".95"/><stop offset="1" stopColor="#fff8df" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#sky)"/>
        <circle cx={1500 + backgroundDrift} cy={180} r="260" fill="url(#sunGlow)" opacity={sun}/>
        <circle cx="1480" cy="170" r="68" fill="#fff3d4" opacity=".65"/>
        <path d={`M 0 600 Q 330 ${500 + breeze} 690 595 T 1420 578 T 1920 565 L 1920 1080 L 0 1080Z`} fill="#b7c9a4"/>
        <path d={`M 0 740 Q 360 ${680 - breeze} 760 730 T 1500 704 T 1920 720 L 1920 1080 L 0 1080Z`} fill="url(#field)"/>
        <g opacity=".34" fill="#f7f2df">
          {[0,1,2,3,4].map(i=><ellipse key={i} cx={260+i*340+backgroundDrift*.45} cy={230+i%2*72} rx="120" ry="34" />)}
        </g>
        <g transform={`translate(0 ${Math.sin(frame/50)*4})`} opacity=".8">
          {[0,1,2,3,4,5].map(i=><g key={i} transform={`translate(${i*390-110} 0)`}><path d="M 80 790 Q 120 510 178 435 Q 210 600 80 790Z" fill="#70966e" opacity=".32"/><path d="M 86 780 Q 28 580 10 520 Q 120 585 86 780Z" fill="#86a77d" opacity=".38"/></g>)}
        </g>
        <g><path d={`M 0 910 Q 200 ${880+breeze} 410 913 T 820 900 T 1220 914 T 1600 899 T 1920 912 L 1920 1080 L 0 1080Z`} fill="#789967"/></g>
        {Array.from({length:38},(_,i)=><GrassBlade key={i} index={i}/>)}
      </svg>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: "absolute", opacity:endFade }}>
        <Cat frame={frame}/>
      </svg>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 92, background: "linear-gradient(0deg,rgba(59,87,53,.22),transparent)" }} />
    </AbsoluteFill>
  );
};
