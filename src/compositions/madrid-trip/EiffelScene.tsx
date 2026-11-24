import React, { useLayoutEffect } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { COLORS, FONT } from "./constants";
import { EiffelTower } from "./EiffelTower";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const CameraRig: React.FC<{ y: number; z: number }> = ({ y, z }) => {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(0, y, z);
    camera.lookAt(0, 4.4, 0);
  }, [camera, y, z]);
  return null;
};

export const EiffelScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  const build = interpolate(frame, [15, 150], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const dolly = interpolate(frame, [0, durationInFrames], [22, 19.5], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const camY = interpolate(frame, [0, 150], [7.5, 5.6], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const spin = frame * 0.014;

  const title = spring({
    frame: frame - 25,
    fps,
    config: { damping: 200 },
  });
  const glow = 14 + Math.sin(frame / 6) * 4;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 62%, #24345f 0%, ${COLORS.ocean} 72%)`,
      }}
    >
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 38, position: [0, 8, 20] }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
      >
        <CameraRig y={camY} z={dolly} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[6, 10, 8]} intensity={1.6} />
        <pointLight position={[0, 9.5, 0]} color="#ffb347" intensity={glow} />
        <gridHelper args={[28, 56, "#2a4070", "#16233f"]} position={[0, -0.02, 0]} />
        <EiffelTower build={build} rotationY={spin} frame={frame} />
      </ThreeCanvas>

      <div
        style={{
          position: "absolute",
          left: 80,
          bottom: 72,
          fontFamily: FONT,
          color: COLORS.text,
          opacity: title,
          transform: `translateY(${(1 - title) * 30}px)`,
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1 }}>
          Paris
        </div>
        <div style={{ fontSize: 34, marginTop: 12, opacity: 0.8 }}>
          La Tour Eiffel
        </div>
      </div>
    </AbsoluteFill>
  );
};
