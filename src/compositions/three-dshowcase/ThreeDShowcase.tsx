import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { FC } from "react";

const StarField: FC = () => {
  const stars = Array.from({ length: 72 }, (_, index) => {
    const a = index * 2.399963229728653;
    const radius = 2.7 + ((index * 37) % 31) / 10;
    const y = (((index * 19) % 29) - 14) / 5;
    const size = 0.012 + ((index * 13) % 8) / 1000;
    return { position: [Math.cos(a) * radius, y, -1.5 - ((index * 7) % 24) / 10] as [number, number, number], size };
  });

  return (
    <group>
      {stars.map((star, index) => (
        <mesh key={index} position={star.position}>
          <sphereGeometry args={[star.size, 6, 6]} />
          <meshBasicMaterial color={index % 5 === 0 ? "#8deaff" : "#dce5ff"} />
        </mesh>
      ))}
    </group>
  );
};

const OrbitalAssembly: FC = () => {
  const frame = useCurrentFrame();
  const seconds = frame / 30;
  const entrance = interpolate(frame, [0, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const spin = seconds * 0.22;

  return (
    <>
      <color attach="background" args={["#050812"]} />
      <fog attach="fog" args={["#050812", 9, 19]} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[4, 6, 7]} intensity={2.6} />
      <pointLight position={[-4, 2, 3]} color="#547bff" intensity={32} />
      <pointLight position={[4, -2, -1]} color="#ff4c9a" intensity={22} />
      <pointLight position={[0, 4, -5]} color="#45e4d0" intensity={14} />

      <StarField />

      <group rotation={[0.16, spin * 0.35, spin * 0.12]} scale={entrance}>
        <mesh rotation={[seconds * 0.12, seconds * 0.28, seconds * 0.08]}>
          <torusKnotGeometry args={[1.18, 0.31, 240, 32, 2, 3]} />
          <meshPhysicalMaterial
            color="#8298ff"
            metalness={0.82}
            roughness={0.19}
            clearcoat={1}
            clearcoatRoughness={0.12}
            emissive="#17245d"
            emissiveIntensity={0.32}
          />
        </mesh>

        <mesh rotation={[Math.PI / 2.2, 0, spin * -0.55]}>
          <torusGeometry args={[2.05, 0.012, 8, 220]} />
          <meshBasicMaterial color="#78dff5" transparent opacity={0.8} />
        </mesh>
        <mesh rotation={[0.35, Math.PI / 2.8, spin * 0.42]}>
          <torusGeometry args={[2.38, 0.008, 8, 220]} />
          <meshBasicMaterial color="#b28cff" transparent opacity={0.55} />
        </mesh>

        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index / 8) * Math.PI * 2 + spin * (index % 2 === 0 ? 0.8 : -0.55);
          const radius = index % 2 === 0 ? 2.05 : 2.38;
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * radius, Math.sin(angle * 1.7) * 0.48, Math.sin(angle) * radius * 0.55]}
              rotation={[seconds * 0.3, seconds * 0.45, 0]}
            >
              <icosahedronGeometry args={[index % 3 === 0 ? 0.105 : 0.065, 1]} />
              <meshStandardMaterial
                color={index % 2 === 0 ? "#f0a6d0" : "#8ce9e0"}
                metalness={0.72}
                roughness={0.24}
                emissive={index % 2 === 0 ? "#4a173d" : "#123d43"}
                emissiveIntensity={0.6}
              />
            </mesh>
          );
        })}
      </group>

      <mesh position={[0, -2.7, -1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#080d1a" metalness={0.25} roughness={0.82} />
      </mesh>
    </>
  );
};

export const ThreeDShowcase: FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const cameraX = Math.sin(frame / 105) * 0.38;
  const cameraY = 0.12 + Math.sin(frame / 140) * 0.16;
  const titleOpacity = interpolate(frame, [18, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const titleY = interpolate(frame, [18, 58], [34, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#050812", color: "#f4f6ff", fontFamily: "Arial, sans-serif" }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [cameraX, cameraY, 7.7], fov: 38 }}
        style={{ width: "100%", height: "100%" }}
      >
        <OrbitalAssembly />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          padding: "7.2% 8%",
          boxSizing: "border-box",
          pointerEvents: "none",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div style={{ color: "#8deaff", fontSize: 17, fontWeight: 700, letterSpacing: 5 }}>
          AI VIDEO STUDIO / 3D ENGINE TEST
        </div>
        <div
          style={{
            position: "absolute",
            left: "8%",
            bottom: "12%",
            fontSize: 76,
            lineHeight: 0.96,
            fontWeight: 800,
            letterSpacing: -3,
            maxWidth: 780,
            textShadow: "0 8px 42px rgba(0,0,0,0.55)",
          }}
        >
          BEYOND THE
          <br />
          FLAT FRAME.
        </div>
        <div
          style={{
            position: "absolute",
            right: "8%",
            bottom: "13%",
            textAlign: "right",
            color: "rgba(232,239,255,0.72)",
            fontSize: 17,
            lineHeight: 1.7,
            letterSpacing: 2,
          }}
        >
          REAL GEOMETRY
          <br />
          FRAME-SYNCED MOTION
          <br />
          3D LIGHT & MATERIAL
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
