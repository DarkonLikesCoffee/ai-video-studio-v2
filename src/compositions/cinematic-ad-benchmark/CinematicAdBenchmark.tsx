import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { FC } from "react";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const phaseOpacity = (frame: number, start: number, end: number): number =>
  interpolate(
    frame,
    [start, start + 14, end - 14, end],
    [0, 1, 1, 0],
    clamp,
  );

const SpeakerGrille: FC = () => {
  const holes = Array.from({ length: 42 }, (_, index) => {
    const ring = Math.floor(index / 14);
    const position = index % 14;
    const angle = (position / 14) * Math.PI * 2 + ring * 0.12;
    const radius = 0.27 + ring * 0.13;
    return {
      key: index,
      position: [Math.cos(angle) * radius, Math.sin(angle) * radius, 0.185] as [number, number, number],
    };
  });

  return (
    <group>
      {holes.map((hole) => (
        <mesh key={hole.key} position={hole.position}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color="#080d14" metalness={0.3} roughness={0.72} />
        </mesh>
      ))}
    </group>
  );
};

const SpeakerProduct: FC = () => {
  const frame = useCurrentFrame();
  const entrance = interpolate(frame, [0, 46], [0.01, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const explode = interpolate(frame, [238, 278, 326, 362], [0, 1, 1, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const rotationY = interpolate(frame, [0, 120, 240, 360, 480, 600], [-0.72, 0.62, -0.58, 0.76, -0.7, 0.52], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const rotationX = interpolate(frame, [0, 150, 300, 450, 600], [0.12, -0.22, 0.18, -0.16, 0.1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const bob = Math.sin(frame / 34) * 0.035;

  return (
    <group scale={entrance * 1.12} position={[0, bob, 0]} rotation={[rotationX, rotationY, 0]}>
      {/* Main anodized-aluminium enclosure */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.82, 0.82, 2.52, 96, 1, false]} />
        <meshPhysicalMaterial
          color="#40566b"
          metalness={0.62}
          roughness={0.32}
          clearcoat={1}
          clearcoatRoughness={0.16}
        />
      </mesh>

      {/* Floating end caps separate during the exploded-view sequence */}
      <mesh position={[0, 1.27 + explode * 0.78, 0]}>
        <cylinderGeometry args={[0.79, 0.79, 0.055, 96]} />
        <meshStandardMaterial color="#8295a8" metalness={0.92} roughness={0.2} />
      </mesh>
      <mesh position={[0, -1.27 - explode * 0.78, 0]}>
        <cylinderGeometry args={[0.79, 0.79, 0.055, 96]} />
        <meshStandardMaterial color="#65788b" metalness={0.9} roughness={0.23} />
      </mesh>

      {/* Precision-machined front driver */}
      <group position={[0, 0, 0.79 + explode * 0.52]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.69, 0.69, 0.055, 96]} />
          <meshStandardMaterial color="#0d1621" metalness={0.76} roughness={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.032, 12, 96]} />
          <meshPhysicalMaterial color="#b4c4d4" metalness={0.96} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0, 0.045]} scale={[1, 1, 0.22]}>
          <sphereGeometry args={[0.55, 64, 48]} />
          <meshPhysicalMaterial color="#263849" metalness={0.68} roughness={0.3} clearcoat={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.17]} scale={[1, 1, 0.38]}>
          <sphereGeometry args={[0.22, 48, 36]} />
          <meshPhysicalMaterial color="#9eb6c8" metalness={0.88} roughness={0.16} clearcoat={1} />
        </mesh>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.74, 0.012, 8, 128]} />
          <meshBasicMaterial color="#7fe4e1" transparent opacity={0.82} />
        </mesh>
        <SpeakerGrille />
      </group>

      {/* Rear acoustic chamber and floating internal ring */}
      <mesh position={[0, 0, -0.68 - explode * 0.62]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 0.16, 64]} />
        <meshStandardMaterial color="#0c1722" metalness={0.72} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0, -0.9 - explode * 0.9]}>
        <torusGeometry args={[0.57, 0.035, 12, 80]} />
        <meshPhysicalMaterial color="#56d6d1" metalness={0.82} roughness={0.2} emissive="#0b494b" emissiveIntensity={0.8} />
      </mesh>

      {/* Fine vertical machining grooves */}
      {Array.from({ length: 18 }, (_, index) => {
        const angle = (index / 18) * Math.PI * 2;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.824, 0, Math.sin(angle) * 0.824]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[0.008, 2.24, 0.008]} />
            <meshBasicMaterial color="#8093a6" transparent opacity={0.28} />
          </mesh>
        );
      })}
    </group>
  );
};

const SoundWaves: FC = () => {
  const frame = useCurrentFrame();
  const active = interpolate(frame, [348, 382, 478, 510], [0, 1, 1, 0], clamp);
  const pulse = (frame % 72) / 72;

  return (
    <group position={[0, 0, 1.02]}>
      {[0, 1, 2].map((index) => {
        const scale = 1.04 + ((pulse + index / 3) % 1) * 1.65;
        const opacity = active * (1 - ((pulse + index / 3) % 1)) * 0.42;
        return (
          <mesh key={index} scale={[scale, scale, 1]}>
            <torusGeometry args={[0.88, 0.012, 8, 96]} />
            <meshBasicMaterial color={index === 1 ? "#a3f4e9" : "#6bbbc9"} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
};

const StudioEnvironment: FC = () => {
  const frame = useCurrentFrame();
  const sweep = Math.sin(frame / 42) * 3.5;
  return (
    <>
      <color attach="background" args={["#050912"]} />
      <fog attach="fog" args={["#050912", 8, 20]} />
      <ambientLight intensity={0.82} />
      <directionalLight position={[4, 5, 7]} intensity={3.1} color="#e5f2ff" />
      <spotLight position={[-4 + sweep, 3, 5]} angle={0.46} penumbra={0.8} intensity={105} color="#5ad8dc" />
      <pointLight position={[4, 1, 2]} intensity={58} color="#638aff" />
      <pointLight position={[-3, -2, -3]} intensity={38} color="#b17bff" />
      <pointLight position={[0, 4, -4]} intensity={22} color="#c6e7ff" />
      <mesh position={[0, -2.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#080f1b" metalness={0.34} roughness={0.66} />
      </mesh>
      <gridHelper args={[24, 48, "#29414f", "#132331"]} position={[0, -2.06, 0]} />
      <mesh position={[0, 0, -2.5]}>
        <planeGeometry args={[18, 12]} />
        <meshBasicMaterial color="#101b2b" transparent opacity={0.36} />
      </mesh>
      <SpeakerProduct />
      <SoundWaves />
    </>
  );
};

type ChapterProps = {
  frame: number;
  start: number;
  end: number;
  kicker: string;
  title: string;
  body: string;
  align?: "left" | "right";
};

const Chapter: FC<ChapterProps> = ({ frame, start, end, kicker, title, body, align = "left" }) => {
  const opacity = phaseOpacity(frame, start, end);
  const local = frame - start;
  const rise = interpolate(local, [0, 26], [30, 0], clamp);
  const right = align === "right";

  return (
    <div
      style={{
        position: "absolute",
        top: "17%",
        left: right ? "auto" : "8%",
        right: right ? "8%" : "auto",
        width: "38%",
        opacity,
        transform: `translateY(${rise}px)`,
        textAlign: right ? "right" : "left",
      }}
    >
      <div style={{ color: "#8de8e1", fontSize: 17, fontWeight: 700, letterSpacing: 5, marginBottom: 24 }}>
        {kicker}
      </div>
      <div style={{ fontSize: 66, lineHeight: 0.98, fontWeight: 800, letterSpacing: -3, whiteSpace: "pre-line", textShadow: "0 8px 40px rgba(0,0,0,.45)" }}>
        {title}
      </div>
      <div style={{ color: "#b7c4d2", fontSize: 22, lineHeight: 1.5, marginTop: 22, maxWidth: 560, marginLeft: right ? "auto" : 0 }}>
        {body}
      </div>
      <div style={{ width: 76, height: 3, background: "#79ded9", marginTop: 28, marginLeft: right ? "auto" : 0 }} />
    </div>
  );
};

export const CinematicAdBenchmark: FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cameraX = interpolate(frame, [0, 120, 240, 360, 480, 600], [2.55, -2.7, 2.85, -2.5, 2.65, -2.2], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cameraY = interpolate(frame, [0, 150, 300, 450, 600], [1.15, -0.85, 1.25, -0.9, 0.75], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cameraZ = interpolate(frame, [0, 120, 240, 360, 480, 600], [6.4, 5.2, 6.0, 5.1, 6.2, 5.5], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cameraYaw = Math.atan2(cameraX, cameraZ);
  const cameraPitch = -Math.atan2(cameraY, Math.hypot(cameraX, cameraZ));
  const cameraRoll = Math.sin(frame / 125) * 0.035;
  const heroOpacity = phaseOpacity(frame, 478, 600);
  const wipe = Math.max(
    interpolate(frame, [112, 120, 128], [0, 0.72, 0], clamp),
    interpolate(frame, [232, 240, 248], [0, 0.72, 0], clamp),
    interpolate(frame, [352, 360, 368], [0, 0.72, 0], clamp),
    interpolate(frame, [472, 480, 488], [0, 0.72, 0], clamp),
  );
  const progress = (frame / 600) * 100;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050912", color: "#f4f7fb", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <Audio src={staticFile("assets/audio/score.wav")} volume={0.54} />
      {[114, 234, 354, 474].map((start) => (
        <Sequence key={start} from={start} durationInFrames={42}>
          <Audio src={staticFile("assets/audio/transition-whoosh.wav")} volume={0.42} />
        </Sequence>
      ))}
      <Sequence from={478} durationInFrames={42}>
        <Audio src={staticFile("assets/audio/impact.wav")} volume={0.46} />
      </Sequence>

      <ThreeCanvas
        width={width}
        height={height}
        camera={{
          position: [cameraX, cameraY, cameraZ],
          fov: 36,
          rotation: [cameraPitch, cameraYaw, cameraRoll],
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <StudioEnvironment />
      </ThreeCanvas>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Chapter frame={frame} start={0} end={120} kicker="AURA / MATERIAL STUDY" title={"FORM FOLLOWS\nFEELING."} body="A quieter kind of presence. Designed to be seen before it is heard." />
        <Chapter frame={frame} start={120} end={240} kicker="02 / PRECISION" title={"ENGINEERED\nTO RESONATE."} body="Anodized aluminium. Acoustic geometry. Every surface has a reason." align="right" />
        <Chapter frame={frame} start={240} end={360} kicker="03 / INSIDE THE FORM" title={"NOTHING\nIS ACCIDENTAL."} body="A closer look at the architecture behind a richer, more considered sound." />
        <Chapter frame={frame} start={360} end={480} kicker="04 / FEEL THE SPACE" title={"SOUND,\nMADE VISIBLE."} body="A room-filling signature, shaped with restraint and intention." align="right" />

        <div
          style={{
            position: "absolute",
            left: "8%",
            top: "14%",
            width: "84%",
            height: "72%",
            border: "1px solid rgba(159,205,219,.16)",
            opacity: heroOpacity * 0.65,
            boxSizing: "border-box",
          }}
        />
        <div style={{ position: "absolute", left: "8%", bottom: "10%", opacity: heroOpacity, maxWidth: "42%" }}>
          <div style={{ color: "#8de8e1", fontSize: 18, fontWeight: 700, letterSpacing: 7, marginBottom: 18 }}>A U R A</div>
          <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: -5, lineHeight: 0.9 }}>SOUND,<br />SHAPED.</div>
          <div style={{ color: "#c1ccd7", fontSize: 22, marginTop: 22, letterSpacing: 1 }}>Precision-tuned. Unmistakably yours.</div>
          <div style={{ color: "#8de8e1", fontSize: 14, fontWeight: 700, letterSpacing: 4, marginTop: 30 }}>DISCOVER AURA  /  AVAILABLE NOW</div>
        </div>

        <div style={{ position: "absolute", top: 58, left: "8%", right: "8%", display: "flex", justifyContent: "space-between", color: "rgba(211,226,237,.58)", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>
          <span>AI VIDEO STUDIO / CINEMATIC BENCHMARK</span>
          <span>01 — 05 / 20 SEC</span>
        </div>
        <div style={{ position: "absolute", bottom: 38, left: "8%", right: "8%", height: 2, background: "rgba(188,216,226,.18)" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#8de8e1" }} />
        </div>
        <AbsoluteFill style={{ backgroundColor: "#b8f5f2", opacity: wipe * 0.2, mixBlendMode: "screen" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
