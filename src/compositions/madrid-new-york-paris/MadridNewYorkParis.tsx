import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FC } from "react";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const Pin: FC<{ x: number; y: number; label: string; frame: number; start: number }> = ({
  x, y, label, frame, start,
}) => {
  const opacity = interpolate(frame, [start, start + 20], [0, 1], clamp);
  const pulse = (Math.sin(frame / 9) + 1) / 2;
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <circle r={16 + pulse * 8} fill="none" stroke="#5fe1ff" strokeWidth="2" opacity={0.22 + pulse * 0.28} />
      <circle r="22" fill="#5fe1ff" opacity=".16" />
      <circle r="7" fill="#5fe1ff" />
      <text x="15" y="-18" fill="white" fontSize="22" fontWeight="bold">{label}</text>
    </g>
  );
};

const Map: FC<{ frame: number }> = ({ frame }) => {
  const zoom = interpolate(frame, [0, 100], [2.5, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const baseX = interpolate(frame, [0, 100], [-950 * 2.5 + 960, 0], clamp);
  const baseY = interpolate(frame, [0, 100], [-520 * 2.5 + 540, 0], clamp);
  const panToNewYork = interpolate(frame, [400, 475], [0, -300], clamp);
  const panToParis = interpolate(frame, [730, 820], [0, 240], clamp);
  const firstRoute = interpolate(frame, [170, 420], [0, 1], clamp);
  const secondRoute = interpolate(frame, [560, 750], [0, 1], clamp);

  // A restrained continuous camera drift keeps the map alive between major route beats.
  const driftX = Math.sin(frame / 24) * 7;
  const driftY = Math.cos(frame / 31) * 5;
  const mapTransform = `translate(${baseX + panToNewYork + panToParis + driftX} ${baseY + driftY}) scale(${zoom})`;

  let planeX = 950;
  let planeY = 520;
  let planeRotation = -9;
  if (frame >= 140 && frame < 450) {
    const progress = interpolate(frame, [140, 450], [0, 1], clamp);
    planeX = 950 + (410 - 950) * progress;
    planeY = 520 + (430 - 520) * progress - Math.sin(progress * Math.PI) * 105;
    planeRotation = -10 - progress * 8;
  } else if (frame >= 450 && frame < 780) {
    const progress = interpolate(frame, [450, 780], [0, 1], clamp);
    planeX = 410 + (930 - 410) * progress;
    planeY = 430 + (475 - 430) * progress - Math.sin(progress * Math.PI) * 95;
    planeRotation = 5 + progress * 10;
  } else if (frame >= 780) {
    planeX = 930;
    planeY = 475;
    planeRotation = 15;
  }

  return (
    <svg viewBox="0 0 1920 1080" style={{ width: "100%", height: "100%", position: "absolute" }}>
      <defs>
        <radialGradient id="mapbg">
          <stop stopColor="#1a3f62" />
          <stop offset="1" stopColor="#061522" />
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#mapbg)" />
      <g transform={mapTransform} fill="#19364e" stroke="#315a73" strokeWidth="2">
        <path d="M180 200 260 90 420 60 510 130 460 220 390 280 310 250 250 300Z M440 360 510 390 540 510 500 640 450 720 400 610 380 480Z M700 140 820 90 980 130 1110 160 1190 240 1080 300 980 270 900 340 810 300 750 240Z M980 370 1100 400 1150 530 1120 670 1030 760 960 660 930 520Z M1250 180 1400 120 1580 190 1680 290 1610 360 1450 320 1350 380 1290 290Z M1520 430 1680 400 1770 500 1720 620 1610 600 1550 540Z" />
      </g>
      <g transform={mapTransform} fill="none" stroke="#5ce3ff" strokeWidth="4" strokeDasharray="8 12">
        <path d="M950 520 Q680 340 410 430" strokeDashoffset={900 - firstRoute * 900} />
        <path d="M410 430 Q670 320 930 475" strokeDashoffset={900 - secondRoute * 900} />
      </g>
      <g transform={mapTransform}>
        <Pin x={950} y={520} label="MADRID" frame={frame} start={100} />
        <Pin x={410} y={430} label="NEW YORK" frame={frame} start={390} />
        <Pin x={930} y={475} label="PARIS" frame={frame} start={720} />
        <g transform={`translate(${planeX} ${planeY}) rotate(${planeRotation})`}>
          <circle r="22" fill="#e9b86a" opacity=".13" />
          <path d="M-19 0 14-5 7 0 14 5Z" fill="#e9b86a" stroke="#fff2d7" strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  );
};

const EiffelTower: FC = () => {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [780, 830], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.back(1.1)),
  });
  const rotation = interpolate(frame, [780, 900], [0.08, 0.34], clamp);
  const lightPulse = 30 + Math.sin(frame / 8) * 3;
  const gold = "#d9a75c";

  return (
    <group scale={rise} rotation={[0, rotation, 0]}>
      <color attach="background" args={["#081522"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 7, 5]} intensity={3} />
      <pointLight position={[-3, 4, 2]} color="#f6b95d" intensity={lightPulse} />
      <mesh position={[0, -1.8, 0]}>
        <cylinderGeometry args={[2.7, 3.1, 0.12, 48]} />
        <meshStandardMaterial color="#1a3448" />
      </mesh>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.2, 1.65, 2.5, 4]} />
        <meshStandardMaterial color={gold} metalness={0.8} />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.1, 0.38, 1.3, 4]} />
        <meshStandardMaterial color={gold} metalness={0.8} />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.05, 0.16, 0.7, 4]} />
        <meshStandardMaterial color={gold} />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <coneGeometry args={[0.08, 0.4, 4]} />
        <meshStandardMaterial color={gold} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.8, -0.2, 0]} rotation={[0, 0, -side * 0.34]}>
            <boxGeometry args={[0.12, 2.3, 0.12]} />
            <meshStandardMaterial color={gold} />
          </mesh>
          <mesh position={[side * 0.55, 0.7, 0]} rotation={[0, 0, -side * 0.27]}>
            <boxGeometry args={[0.08, 1.4, 0.08]} />
            <meshStandardMaterial color={gold} />
          </mesh>
          <mesh position={[side * 0.65, -0.35, 0]}>
            <boxGeometry args={[1.3, 0.07, 0.07]} />
            <meshStandardMaterial color={gold} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={index} position={[0, -1.3 + index * 0.48, 0]}>
          <boxGeometry args={[2.4 - index * 0.3, 0.035, 0.035]} />
          <meshStandardMaterial color="#e8bc77" emissive="#bb8036" emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
};

export const MadridNewYorkParis: FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const paris = interpolate(frame, [780, 850], [0, 1], clamp);
  const mapFade = interpolate(frame, [805, 865], [1, 0], clamp);
  const route = frame < 130
    ? "MADRID, SPAIN"
    : frame < 450
      ? "MADRID → NEW YORK"
      : frame < 780
        ? "NEW YORK → PARIS"
        : "PARIS, FRANCE";
  const title = frame < 130
    ? "A JOURNEY BEGINS"
    : frame < 450
      ? "ACROSS THE ATLANTIC"
      : frame < 780
        ? "NEXT STOP"
        : "THE CITY OF LIGHT";

  return (
    <AbsoluteFill style={{ background: "#071522", color: "#f4f7fb", fontFamily: "Arial" }}>
      <Audio src={staticFile("audio/madrid-travel-score.wav")} volume={0.3} />
      <AbsoluteFill style={{ opacity: mapFade }}>
        <Map frame={frame} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: paris, background: "#091725" }}>
        <ThreeCanvas
          width={width}
          height={height}
          camera={{ position: [0, 0.4, 8], fov: 42 }}
          style={{ width: "100%", height: "100%" }}
        >
          <EiffelTower />
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{ padding: "7% 8%", boxSizing: "border-box", pointerEvents: "none" }}>
        <div style={{ fontSize: 18, letterSpacing: 7, fontWeight: 700, color: "#70d9f3" }}>
          WORLD ROUTE / 001
        </div>
        <div style={{ position: "absolute", top: "17%", fontSize: 22, letterSpacing: 5, color: "#9db3c5" }}>
          {route}
        </div>
        <div style={{ position: "absolute", bottom: "12%", fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 0.95 }}>
          {title}
        </div>
        <div style={{ position: "absolute", right: "8%", bottom: "13%", fontSize: 16, letterSpacing: 3, color: "#e9b86a", textAlign: "right", opacity: paris }}>
          EIFFEL TOWER / 3D
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
