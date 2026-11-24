import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const DemoVideo = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [10, 38, 104, 132], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [142, 168, 252, 282], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const rotation = interpolate(frame, [0, 300], [0, Math.PI * 2]);

  return (
    <AbsoluteFill style={{ background: "#09090f", color: "white", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 760, height: 760, borderRadius: "50%", border: "1px solid #29243a", transform: `rotate(${rotation}rad)`, boxShadow: "0 0 100px #8b5cf622" }} />
      <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", border: "1px solid #302742", transform: `rotate(-${rotation * 1.4}rad)` }} />
      <div style={{ position: "absolute", width: 12, height: 12, borderRadius: "50%", background: "#a78bfa", top: "calc(50% - 270px)", boxShadow: "0 0 30px #a78bfa", transform: `rotate(${rotation}rad)` }} />
      <div style={{ textAlign: "center", opacity: titleOpacity, transform: `translateY(${interpolate(frame, [10, 38], [28, 0], { extrapolateRight: "clamp" })}px)` }}>
        <div style={{ fontSize: 22, color: "#b9a6ef", letterSpacing: 8, marginBottom: 25 }}>A NEW CREATIVE WORKSPACE</div>
        <div style={{ fontSize: 104, lineHeight: 1, fontWeight: 750, letterSpacing: -6 }}>AI VIDEO STUDIO</div>
      </div>
      <div style={{ position: "absolute", bottom: 170, fontSize: 30, color: "#b8b5c3", opacity: subtitleOpacity, letterSpacing: 2 }}>From an idea to a finished video.</div>
      <div style={{ position: "absolute", bottom: 75, fontSize: 18, color: "#686575", letterSpacing: 5 }}>PROMPT · COMPOSE · RENDER</div>
    </AbsoluteFill>
  );
};
