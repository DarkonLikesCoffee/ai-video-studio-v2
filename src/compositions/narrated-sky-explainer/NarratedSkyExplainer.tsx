import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import type { FC } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BackSide } from "three";
import type { SubtitleCue } from "../project";

export type NarratedFootageClip = {
  id: string;
  src: string;
  startInFrames: number;
  durationInFrames: number;
  trimBefore?: number;
  playbackRate?: number;
};

export type NarratedSkyExplainerProps = {
  title: string;
  durationInFrames: number;
  narrationAudioSrc: string;
  musicAudioSrc: string;
  transitionAudioSrc: string;
  subtitleCues: SubtitleCue[];
  footageClips?: NarratedFootageClip[];
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const StarField: FC = () => {
  const frame = useCurrentFrame();
  const stars = Array.from({ length: 80 }, (_, index) => {
    const angle = index * 2.399963229728653;
    const radius = 5.2 + ((index * 17) % 37) / 10;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle * 1.31) * 3.1,
      z: -2.5 - ((index * 11) % 23) / 10,
      size: 0.012 + ((index * 7) % 7) / 1000,
      phase: index * 0.71,
    };
  });
  return (
    <group>
      {stars.map((star, index) => (
        <mesh key={index} position={[star.x, star.y, star.z]}>
          <sphereGeometry args={[star.size, 5, 5]} />
          <meshBasicMaterial
            color={index % 6 === 0 ? "#b9e8ff" : "#dce8ff"}
            transparent
            opacity={0.4 + 0.35 * (0.5 + 0.5 * Math.sin(frame / 19 + star.phase))}
          />
        </mesh>
      ))}
    </group>
  );
};

const SolarSystemShot: FC = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 16) * 0.025;
  const rotation = frame / 180;
  return (
    <>
      <color attach="background" args={["#050c19"]} />
      <fog attach="fog" args={["#050c19", 10, 24]} />
      <ambientLight intensity={0.58} />
      <directionalLight position={[4, 6, 8]} intensity={1.7} color="#e8f3ff" />
      <StarField />
      <group position={[-2.65, 0.62, 0]}>
        <mesh scale={pulse}>
          <sphereGeometry args={[0.72, 64, 48]} />
          <meshStandardMaterial color="#fff1bf" emissive="#ffac3d" emissiveIntensity={2.4} roughness={0.35} />
        </mesh>
        {[0, 1, 2].map((index) => (
          <mesh key={index} rotation={[0.35 + index * 0.48, rotation * (index % 2 ? -1 : 1), 0]}>
            <torusGeometry args={[0.98 + index * 0.22, 0.012, 8, 96]} />
            <meshBasicMaterial color={index === 1 ? "#ffe9a8" : "#f6b85c"} transparent opacity={0.42 - index * 0.08} />
          </mesh>
        ))}
        <pointLight color="#ffd17d" intensity={88} distance={18} />
      </group>
      <group position={[2.35, -0.35, -0.3]} rotation={[0.14, rotation, -0.12]}>
        <mesh>
          <sphereGeometry args={[1.05, 64, 48]} />
          <meshStandardMaterial color="#16446f" roughness={0.92} metalness={0.08} />
        </mesh>
        <mesh scale={1.045}>
          <sphereGeometry args={[1.05, 64, 48]} />
          <meshBasicMaterial color="#5cb9ff" transparent opacity={0.23} side={BackSide} />
        </mesh>
        <mesh position={[-0.2, 0.62, 0.66]} rotation={[0.2, 0.3, -0.6]} scale={[0.55, 0.16, 0.05]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#4c926d" roughness={1} />
        </mesh>
        <mesh position={[0.47, -0.12, 0.82]} rotation={[0.5, -0.3, 0.5]} scale={[0.38, 0.12, 0.04]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#4c926d" roughness={1} />
        </mesh>
        <pointLight position={[0, 0, 2]} color="#8bcfff" intensity={5} distance={5} />
      </group>
      <mesh position={[-0.05, 0.55, -0.4]} rotation={[0, 0, -0.07]}>
        <boxGeometry args={[4.9, 0.035, 0.035]} />
        <meshBasicMaterial color="#ffe7a7" transparent opacity={0.76} />
      </mesh>
    </>
  );
};

const MoleculeMacroShot: FC = () => {
  const frame = useCurrentFrame();
  const molecules = Array.from({ length: 19 }, (_, index) => {
    const angle = index * 2.399963229728653 + frame / 95;
    const radius = 1.25 + (index % 5) * 0.38;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle * 1.4) * radius * 0.62,
      z: Math.sin(angle * 0.8) * 0.8 - 0.7,
      rotation: angle * 0.6,
      scale: 0.48 + (index % 3) * 0.11,
    };
  });
  return (
    <>
      <color attach="background" args={["#03121f"]} />
      <fog attach="fog" args={["#03121f", 5, 16]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 2, 4]} color="#65d7f5" intensity={52} />
      <pointLight position={[-3, -1, -2]} color="#2a85ff" intensity={24} />
      <group rotation={[0.08, frame / 180, -0.04]}>
        {molecules.map((molecule, index) => (
          <group key={index} position={[molecule.x, molecule.y, molecule.z]} rotation={[0, 0, molecule.rotation]} scale={molecule.scale}>
            <mesh position={[-0.2, 0, 0]}>
              <sphereGeometry args={[0.15, 18, 14]} />
              <meshStandardMaterial color={index % 4 === 0 ? "#72c9ec" : "#9ad8f0"} emissive="#155c86" emissiveIntensity={0.35} roughness={0.28} />
            </mesh>
            <mesh position={[0.2, 0, 0]}>
              <sphereGeometry args={[0.15, 18, 14]} />
              <meshStandardMaterial color={index % 4 === 0 ? "#72c9ec" : "#9ad8f0"} emissive="#155c86" emissiveIntensity={0.35} roughness={0.28} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 0.38, 10]} />
              <meshStandardMaterial color="#b8edff" metalness={0.32} roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>
      <group position={[0, 0, 0.45]} scale={1.45} rotation={[0, 0, Math.sin(frame / 80) * 0.08]}>
        <mesh>
          <sphereGeometry args={[0.3, 40, 32]} />
          <meshPhysicalMaterial color="#e35b54" emissive="#651c30" emissiveIntensity={0.3} roughness={0.2} clearcoat={1} />
        </mesh>
        <mesh position={[-0.39, 0.31, 0.02]}>
          <sphereGeometry args={[0.19, 32, 24]} />
          <meshPhysicalMaterial color="#e8f4f8" metalness={0.12} roughness={0.2} clearcoat={1} />
        </mesh>
        <mesh position={[0.39, 0.31, 0.02]}>
          <sphereGeometry args={[0.19, 32, 24]} />
          <meshPhysicalMaterial color="#e8f4f8" metalness={0.12} roughness={0.2} clearcoat={1} />
        </mesh>
        <mesh position={[-0.2, 0.16, 0]} rotation={[0, 0, -0.88]}>
          <cylinderGeometry args={[0.045, 0.045, 0.43, 10]} />
          <meshStandardMaterial color="#e9f6fa" metalness={0.3} roughness={0.3} />
        </mesh>
        <mesh position={[0.2, 0.16, 0]} rotation={[0, 0, 0.88]}>
          <cylinderGeometry args={[0.045, 0.045, 0.43, 10]} />
          <meshStandardMaterial color="#e9f6fa" metalness={0.3} roughness={0.3} />
        </mesh>
      </group>
      {[0, 1].map((index) => (
        <mesh key={index} rotation={[Math.PI / 2 + index * 0.45, index * 0.7, frame / 130]}>
          <torusGeometry args={[2.8 + index * 0.35, 0.008, 8, 128]} />
          <meshBasicMaterial color="#62c9f5" transparent opacity={0.2} />
        </mesh>
      ))}
    </>
  );
};

const WavelengthShot: FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <color attach="background" args={["#09101e"]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 0, 4]} color="#72baff" intensity={26} />
      {[0, 1].map((band) => {
        const color = band === 0 ? "#55aaff" : "#ff806d";
        const y = band === 0 ? 0.95 : -0.95;
        const frequency = band === 0 ? 1.05 : 0.54;
        return (
          <group key={band} position={[0, y, 0]}>
            {Array.from({ length: 42 }, (_, index) => {
              const x = -3.4 + index * 0.165;
              const phase = (x + frame * 0.045) * frequency;
              const z = Math.sin(phase) * (band === 0 ? 0.34 : 0.25);
              return (
                <mesh key={index} position={[x, z, 0]}>
                  <sphereGeometry args={[0.035, 8, 8]} />
                  <meshBasicMaterial color={color} />
                </mesh>
              );
            })}
            <mesh position={[0, 0, -0.16]}>
              <boxGeometry args={[7.1, 0.012, 0.012]} />
              <meshBasicMaterial color={color} transparent opacity={0.38} />
            </mesh>
          </group>
        );
      })}
      <mesh>
        <sphereGeometry args={[0.38, 32, 24]} />
        <meshPhysicalMaterial color="#b3e6ff" metalness={0.16} roughness={0.12} clearcoat={1} emissive="#226b9a" emissiveIntensity={0.9} />
      </mesh>
    </>
  );
};

const ScatteringShot: FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <color attach="background" args={["#06182a"]} />
      <fog attach="fog" args={["#06182a", 6, 19]} />
      <ambientLight intensity={0.58} />
      <pointLight position={[0, 1, 2]} color="#49aaff" intensity={24} />
      {Array.from({ length: 92 }, (_, index) => {
        const angle = index * 2.399963229728653;
        const radius = 0.5 + ((index * 13) % 29) / 10;
        const drift = frame * (index % 2 === 0 ? 0.003 : -0.002);
        const x = Math.cos(angle + drift) * radius;
        const y = Math.sin(angle * 1.27 + drift) * radius * 0.66;
        const z = Math.sin(angle) * 1.1 - 0.3;
        const size = 0.018 + (index % 5) * 0.009;
        const pulse = 0.75 + 0.25 * Math.sin(frame / 17 + index);
        return (
          <mesh key={index} position={[x, y, z]} scale={pulse}>
            <sphereGeometry args={[size, 7, 7]} />
            <meshBasicMaterial color={index % 5 === 0 ? "#e2f5ff" : "#55b6ff"} transparent opacity={0.56 + (index % 3) * 0.12} />
          </mesh>
        );
      })}
      {[-1.8, -0.9, 0, 0.9, 1.8].map((x, index) => (
        <mesh key={index} position={[x * Math.cos(frame / 90), x * 0.22, -0.4]} rotation={[0, 0, x * 0.13]}>
          <boxGeometry args={[3.2, 0.018, 0.018]} />
          <meshBasicMaterial color="#71c8ff" transparent opacity={0.12 + 0.14 * (0.5 + 0.5 * Math.sin(frame / 12 + index))} />
        </mesh>
      ))}
      <mesh scale={2.8}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial color="#2384d3" transparent opacity={0.055} side={BackSide} />
      </mesh>
    </>
  );
};

const HorizonShot: FC = () => {
  const frame = useCurrentFrame();
  const sunrise = interpolate(frame, [0, 116], [-1.9, 0.78], clamp);
  const halo = 1 + Math.sin(frame / 22) * 0.035;
  return (
    <>
      <color attach="background" args={["#07192f"]} />
      <fog attach="fog" args={["#07192f", 7, 22]} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[2, 6, 5]} intensity={2.3} color="#cfeaff" />
      <pointLight position={[0, 1, 3]} color="#6bbfff" intensity={32} distance={14} />
      <mesh position={[0, -3.65, -2.1]}>
        <sphereGeometry args={[5.0, 96, 64]} />
        <meshStandardMaterial color="#135b91" roughness={0.72} metalness={0.08} />
      </mesh>
      <mesh position={[0, -3.65, -2.1]} scale={1.015}>
        <sphereGeometry args={[5.0, 96, 64]} />
        <meshBasicMaterial color="#5ebdff" transparent opacity={0.18} side={BackSide} />
      </mesh>
      <mesh position={[0, -3.58, -1.94]} scale={[5.08, 5.02, 5.02]}>
        <sphereGeometry args={[1, 96, 64]} />
        <meshBasicMaterial color="#69bfff" transparent opacity={0.1} />
      </mesh>
      <group position={[0, sunrise, -0.3]}>
        <mesh scale={halo}>
          <sphereGeometry args={[0.48, 48, 36]} />
          <meshBasicMaterial color="#fff1ce" />
        </mesh>
        <mesh scale={1.55}>
          <sphereGeometry args={[0.48, 48, 36]} />
          <meshBasicMaterial color="#ffd18a" transparent opacity={0.17} />
        </mesh>
        <pointLight color="#ffda9a" intensity={65} distance={13} />
      </group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 4.8, -1.95, -1.5]} rotation={[0, 0, side * -0.12]}>
          <boxGeometry args={[3.4, 0.035, 0.035]} />
          <meshBasicMaterial color="#81caff" transparent opacity={0.34} />
        </mesh>
      ))}
    </>
  );
};

const ChapterOverlay: FC<{ frame: number; phase: number; footageMode?: boolean }> = ({ frame, phase, footageMode = false }) => {
  const local = frame - phase * 120;
  const enter = interpolate(local, [4, 26], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const fade = interpolate(local, [0, 14, 103, 120], [0, 1, 1, 0], clamp);
  const chapters = [
    { label: "01 / LUZ SOLAR", title: "TODO EMPIEZA\nCON LUZ.", note: "Un rayo blanco guarda todos los colores." },
    { label: "02 / ATMÓSFERA", title: "EL AIRE\nCAMBIA EL VIAJE.", note: "La luz encuentra millones de moléculas." },
    { label: "03 / LONGITUD DE ONDA", title: "AZUL CORTO.\nROJO LARGO.", note: "No todos los colores se dispersan igual." },
    { label: "04 / DISPERSIÓN", title: "EL AZUL\nSE REPARTE.", note: "La luz llega a tus ojos desde todas partes." },
    { label: "05 / LO QUE VEMOS", title: "ASÍ NACE\nEL CIELO AZUL.", note: "El color está en la luz que llena el aire." },
  ];
  const content = chapters[phase]!;
  const left = footageMode || phase === 3;
  return (
    <div
      style={{
        position: "absolute",
        left: left ? "8%" : "auto",
        right: left ? "auto" : "8%",
        top: footageMode ? "13%" : phase === 0 ? "9%" : phase === 2 ? "13%" : "18%",
        width: footageMode ? "48%" : phase === 0 ? "40%" : phase === 2 ? "82%" : "36%",
        textAlign: footageMode ? "left" : phase === 2 ? "center" : left ? "left" : "right",
        opacity: fade * enter,
        transform: "translateY(" + ((1 - enter) * 28) + "px)",
        color: "#f4f7fb",
        textShadow: "0 5px 32px rgba(0,0,0,.54)",
      }}
    >
      <div style={{ color: phase === 4 ? "#c7ecff" : "#8ddcff", fontSize: 16, fontWeight: 800, letterSpacing: 5, marginBottom: 18 }}>
        {content.label}
      </div>
      <div style={{ fontSize: phase === 4 ? 78 : 70, fontWeight: 850, lineHeight: 0.94, letterSpacing: -3, whiteSpace: "pre-line" }}>
        {content.title}
      </div>
      <div style={{ color: "#c0d0df", fontSize: 21, lineHeight: 1.45, marginTop: 20 }}>
        {content.note}
      </div>
    </div>
  );
};

const TransitionWipe: FC<{ frame: number }> = ({ frame }) => (
  <>
    {[120, 240, 360, 480].map((start) => {
      const progress = interpolate(frame, [start - 12, start + 12], [0, 1], clamp);
      const opacity = interpolate(frame, [start - 12, start - 3, start + 3, start + 12], [0, 0.74, 0.74, 0], clamp);
      return (
        <div
          key={start}
          style={{
            position: "absolute",
            top: "-15%",
            bottom: "-15%",
            left: String(-45 + progress * 145) + "%",
            width: "38%",
            transform: "skewX(-18deg)",
            background: "linear-gradient(90deg, rgba(90,188,255,0), rgba(132,214,255,.72), rgba(255,255,255,.88), rgba(90,188,255,0))",
            filter: "blur(14px)",
            opacity,
          }}
        />
      );
    })}
  </>
);

const WordCaption: FC<{ cue: SubtitleCue; frame: number; footageMode?: boolean }> = ({ cue, frame, footageMode = false }) => {
  const localFrame = frame - cue.startInFrames;
  const active = cue.wordTimings?.find((word) => localFrame >= word.startInFrames && localFrame < word.endInFrames);
  return (
    <div
      style={{
        position: "absolute",
        left: footageMode ? "7.7%" : "50%",
        bottom: "6.5%",
        transform: footageMode ? "none" : "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: footageMode ? "flex-start" : "center",
        minWidth: footageMode ? 0 : 420,
        maxWidth: footageMode ? "57%" : "82%",
        padding: "14px 28px 17px",
        borderRadius: 7,
        background: "rgba(3, 11, 22, .68)",
        border: "1px solid rgba(191, 227, 255, .18)",
        boxShadow: "0 16px 48px rgba(0,0,0,.28)",
        color: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {cue.speaker ? <div style={{ color: "#8ddcff", fontSize: 13, letterSpacing: 3, fontWeight: 800, marginBottom: 7 }}>{cue.speaker}</div> : null}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: footageMode ? "flex-start" : "center", columnGap: 8, rowGap: 3, fontSize: 34, lineHeight: 1.16, fontWeight: 750 }}>
        {cue.wordTimings?.map((word, index) => (
          <span key={index} style={{ color: active === word ? "#ffd27a" : "#f5f8fc", opacity: active === word ? 1 : 0.74 }}>
            {word.text}
          </span>
        ))}
      </div>
    </div>
  );
};

const FootageClipLayer: FC<{ clip: NarratedFootageClip }> = ({ clip }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 10], [0, 1], clamp);
  const fadeOut = interpolate(
    frame,
    [Math.max(0, clip.durationInFrames - 10), clip.durationInFrames],
    [1, 0],
    clamp,
  );
  const scale = interpolate(frame, [0, Math.max(1, clip.durationInFrames - 1)], [1.035, 1.085], clamp);
  return (
    <OffthreadVideo
      src={staticFile(clip.src)}
      muted
      playbackRate={clip.playbackRate ?? 1}
      {...(clip.trimBefore === undefined ? {} : { trimBefore: clip.trimBefore })}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center",
        opacity: fadeIn * fadeOut,
        transform: `scale(${scale})`,
        filter: "saturate(.88) contrast(1.06)",
      }}
    />
  );
};

export const NarratedSkyExplainer: FC<NarratedSkyExplainerProps> = (props) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const phase = Math.min(4, Math.floor(frame / 120));
  const cameraX = interpolate(frame, [0, 120, 240, 360, 480, 600], [0.65, -1.9, 0.2, 2.35, 0.5, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cameraY = interpolate(frame, [0, 120, 240, 360, 480, 600], [0.35, 0.65, 0.1, -0.4, -0.2, 0.12], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cameraZ = interpolate(frame, [0, 120, 240, 360, 480, 600], [8.4, 6.1, 7.8, 7.1, 8.7, 7.4], clamp);
  const cameraYaw = -Math.atan2(cameraX, cameraZ);
  const cameraPitch = -Math.atan2(cameraY, Math.hypot(cameraX, cameraZ));
  const cue = props.subtitleCues.find((item) => frame >= item.startInFrames && frame < item.startInFrames + item.durationInFrames);
  const duckAmount = props.subtitleCues.reduce((maximum, item) => {
    const wordDuck = (item.wordTimings ?? []).reduce((wordMaximum, word) => {
      const wordStart = item.startInFrames + word.startInFrames;
      const wordEnd = item.startInFrames + word.endInFrames;
      const attack = interpolate(frame, [wordStart - 8, wordStart + 4], [0, 1], clamp);
      const release = interpolate(frame, [wordEnd - 2, wordEnd + 16], [1, 0], clamp);
      return Math.max(wordMaximum, Math.min(attack, release));
    }, 0);
    return Math.max(maximum, wordDuck);
  }, 0);
  const musicVolume = 0.16 - duckAmount * 0.105;
  const progress = frame / Math.max(1, props.durationInFrames);
  const hasFootage = Boolean(props.footageClips?.some((clip) =>
    frame >= clip.startInFrames && frame < clip.startInFrames + clip.durationInFrames
  ));

  return (
    <AbsoluteFill style={{ backgroundColor: "#050c19", color: "#f4f7fb", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <Audio src={staticFile(props.narrationAudioSrc)} volume={1} />
      <Audio src={staticFile(props.musicAudioSrc)} volume={musicVolume} loop />
      {[120, 240, 360, 480].map((start) => (
        <Sequence key={start} from={start - 5} durationInFrames={45}>
          <Audio src={staticFile(props.transitionAudioSrc)} volume={0.16} />
        </Sequence>
      ))}
      {props.footageClips?.map((clip) => (
        <Sequence key={clip.id} from={clip.startInFrames} durationInFrames={clip.durationInFrames} name={clip.id}>
          <FootageClipLayer clip={clip} />
        </Sequence>
      ))}
      {hasFootage ? (
        <AbsoluteFill
          style={{
            zIndex: 1,
            pointerEvents: "none",
            background: "linear-gradient(90deg, rgba(3,10,20,.55) 0%, rgba(3,10,20,.14) 58%, rgba(3,10,20,.2) 100%), linear-gradient(0deg, rgba(3,10,20,.38), transparent 48%)",
          }}
        />
      ) : null}
      <div
        style={hasFootage ? {
          position: "absolute",
          left: "62%",
          top: "17%",
          width: "32%",
          height: "47%",
          overflow: "hidden",
          borderRadius: 18,
          border: "1px solid rgba(210,238,255,.48)",
          boxShadow: "0 20px 70px rgba(0,0,0,.5), 0 0 34px rgba(93,183,255,.14)",
          background: "#06182a",
          zIndex: 5,
        } : {
          position: "absolute",
          inset: 0,
          zIndex: 2,
        }}
      >
        <ThreeCanvas
          width={hasFootage ? Math.round(width * 0.32) : width}
          height={hasFootage ? Math.round(height * 0.47) : height}
          camera={{ position: [cameraX, cameraY, cameraZ], rotation: [cameraPitch, cameraYaw, 0], fov: 39 }}
          style={{ width: "100%", height: "100%" }}
        >
          {phase === 0 ? <SolarSystemShot /> : null}
          {phase === 1 ? <MoleculeMacroShot /> : null}
          {phase === 2 ? <WavelengthShot /> : null}
          {phase === 3 ? <ScatteringShot /> : null}
          {phase === 4 ? <HorizonShot /> : null}
        </ThreeCanvas>
      </div>
      <AbsoluteFill style={{ pointerEvents: "none", zIndex: 10 }}>
        <ChapterOverlay frame={frame} phase={phase} footageMode={hasFootage} />
        <TransitionWipe frame={frame} />
        <div style={{ position: "absolute", left: "7.7%", right: "7.7%", top: 44, display: "flex", justifyContent: "space-between", color: "rgba(220,238,250,.6)", fontSize: 12, letterSpacing: 3, fontWeight: 800 }}>
          <span>AI VIDEO STUDIO / EXPLAINER FILM</span>
          <span>{String(phase + 1).padStart(2, "0")} — 05</span>
        </div>
        <div style={{ position: "absolute", left: "7.7%", right: "7.7%", bottom: 36, height: 2, background: "rgba(216,235,250,.16)" }}>
          <div style={{ width: String(Math.min(100, progress * 100)) + "%", height: "100%", background: "#83d6ff" }} />
        </div>
        {cue ? <WordCaption cue={cue} frame={frame} footageMode={hasFootage} /> : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
