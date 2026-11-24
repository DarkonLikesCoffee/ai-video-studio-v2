import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useMemo } from "react";
import type { CSSProperties, FC, ReactNode } from "react";
import type { AnimationTracks, AudioTrack, GraphicElement, ParticleSystem, SceneMedia, SceneTransition, SubtitleCue, VideoProject, VideoScene } from "../project";
import { isRemoteMediaUrl } from "../project";
import { evaluateAnimationTrack, evaluateSvgPathMorph } from "../animation";
import { getSceneTransitionStyle } from "../transitions";

type SceneCardProps = {
  scene: VideoScene;
  index: number;
  compositionFps: number;
  isFirstScene: boolean;
  isLastScene: boolean;
  transitionIn?: SceneTransition | undefined;
  transitionOut?: SceneTransition | undefined;
  transitionOutDurationInFrames: number;
};

type AudioTrackLayerProps = {
  track: AudioTrack;
  projectDurationInFrames: number;
};

const AudioTrackLayer: FC<AudioTrackLayerProps> = ({ track, projectDurationInFrames }) => {
  const frame = useCurrentFrame();
  const durationInFrames = track.durationInFrames ?? projectDurationInFrames - track.startInFrames;
  const playbackRate = track.playbackRate ?? 1;
  const sourceDurationInFrames = Math.round(durationInFrames * playbackRate);
  const localFrame = frame - track.startInFrames;
  const baseVolume = evaluateAnimationTrack(
    localFrame,
    track.volumeAutomation,
    track.volume ?? 1
  );

  const fadeIn = track.fadeInFrames && track.fadeInFrames > 0
    ? interpolate(localFrame, [0, track.fadeInFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  const fadeOut = track.fadeOutFrames && track.fadeOutFrames > 0
    ? interpolate(
        localFrame,
        [Math.max(0, durationInFrames - track.fadeOutFrames), durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;
  const volume = Math.max(0, Math.min(1, baseVolume * fadeIn * fadeOut));
  const src = isRemoteMediaUrl(track.src) ? track.src : staticFile(track.src);

  return (
    <Audio
      name={`${track.role}: ${track.id}`}
      src={src}
      from={track.startInFrames}
      durationInFrames={sourceDurationInFrames}
      trimBefore={track.trimBefore ?? 0}
      playbackRate={playbackRate}
      preservePitch={track.preservePitch ?? false}
      volume={volume}
      muted={track.muted ?? false}
      loop={track.loop ?? false}
    />
  );
};

type SubtitleCueLayerProps = {
  cue: SubtitleCue;
};

const SubtitleCueLayer: FC<SubtitleCueLayerProps> = ({ cue }) => {
  const frame = useCurrentFrame();
  const duration = cue.durationInFrames;
  const defaultFade = Math.min(6, Math.floor(duration / 5));
  const fadeInFrames = cue.fadeInFrames ?? defaultFade;
  const fadeOutFrames = cue.fadeOutFrames ?? defaultFade;
  const fadeIn = fadeInFrames > 0
    ? interpolate(frame, [0, fadeInFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  const fadeOut = fadeOutFrames > 0
    ? interpolate(frame, [duration - fadeOutFrames, duration], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  const position = cue.position ?? "bottom";
  const alignment = cue.alignment ?? "center";
  const fontSize = cue.fontSize ?? 38;
  const alignItems = alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center";

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems,
        justifyContent: position === "top" ? "flex-start" : position === "center" ? "center" : "flex-end",
        padding: position === "top" ? "11% 8% 0" : position === "center" ? "0 8%" : "0 8% 8%",
        boxSizing: "border-box",
        opacity: fadeIn * fadeOut,
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems,
          justifyContent: "center",
          textAlign: alignment,
          maxWidth: "84%",
          padding: "15px 30px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.14)",
          backgroundColor: "rgba(4, 9, 22, " + (cue.backgroundOpacity ?? 0.78) + ")",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          color: cue.color ?? "#FFFFFF",
          fontFamily: cue.fontFamily ?? "Arial, sans-serif",
          fontSize,
          fontWeight: cue.fontWeight ?? 600,
          lineHeight: 1.32,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {cue.speaker ? (
          <span
            style={{
              alignSelf: alignItems,
              marginBottom: 5,
              color: cue.color ?? "#8DEBFF",
              fontSize: Math.max(16, Math.round(fontSize * 0.58)),
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {cue.speaker}
          </span>
        ) : null}
        {cue.wordTimings?.length ? (
          <span style={{ display: "inline", whiteSpace: "pre-wrap" }}>
            {cue.wordTimings.map((word, index) => {
              const active = frame >= word.startInFrames && frame < word.endInFrames;
              return (
                <span
                  key={word.startInFrames + "-" + index}
                  style={{
                    display: "inline-block",
                    marginRight: "0.28em",
                    color: active ? (cue.activeWordColor ?? cue.color ?? "#FFFFFF") : (cue.color ?? "#FFFFFF"),
                    opacity: active ? 1 : 0.76,
                  }}
                >
                  {word.text}
                </span>
              );
            })}
          </span>
        ) : <span>{cue.text}</span>}
      </div>
    </AbsoluteFill>
  );
};

type AnimatedGraphicProps = {
  graphic: GraphicElement;
};

const AnimatedGraphic: FC<AnimatedGraphicProps> = ({ graphic }) => {
  const frame = useCurrentFrame();
  const x = evaluateAnimationTrack(frame, graphic.animations?.x, graphic.x);
  const y = evaluateAnimationTrack(frame, graphic.animations?.y, graphic.y);
  const width = evaluateAnimationTrack(frame, graphic.animations?.width, graphic.width);
  const height = evaluateAnimationTrack(frame, graphic.animations?.height, graphic.height);
  const opacity = evaluateAnimationTrack(frame, graphic.animations?.opacity, graphic.opacity ?? 1);
  const rotation = evaluateAnimationTrack(frame, graphic.animations?.rotation, graphic.rotation ?? 0);
  const scaleX = evaluateAnimationTrack(frame, graphic.animations?.scaleX, 1);
  const scaleY = evaluateAnimationTrack(frame, graphic.animations?.scaleY, 1);
  const baseStyle: CSSProperties = {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    width: `${width}%`,
    height: `${height}%`,
    opacity,
    zIndex: graphic.zIndex ?? 20,
    transform: `scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`,
    transformOrigin: "center center",
    pointerEvents: "none",
    overflow: "visible",
  };

  if (graphic.type === "text") {
    const align = graphic.textAnchor ?? "start";
    return (
      <div
        style={{
          ...baseStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: align === "middle" ? "center" : align === "end" ? "flex-end" : "flex-start",
          color: graphic.fill ?? "#FFFFFF",
          fontFamily: graphic.fontFamily ?? "Arial, sans-serif",
          fontSize: graphic.fontSize ?? 48,
          fontWeight: graphic.fontWeight ?? 600,
          letterSpacing: graphic.letterSpacing ?? 0,
          whiteSpace: "pre-wrap",
          lineHeight: 1.1,
        }}
      >
        {graphic.text}
      </div>
    );
  }

  const sharedShapeProps = {
    fill: graphic.fill ?? "none",
    stroke: graphic.stroke ?? "none",
    strokeWidth: graphic.strokeWidth ?? 1,
    vectorEffect: "non-scaling-stroke" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={baseStyle}
      aria-hidden="true"
    >
      {graphic.type === "rect" ? (
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          rx={graphic.radius ?? 0}
          {...sharedShapeProps}
        />
      ) : graphic.type === "ellipse" ? (
        <ellipse
          cx="50"
          cy="50"
          rx="49.5"
          ry="49.5"
          {...sharedShapeProps}
        />
      ) : (
        <path
          d={graphic.pathMorph ? evaluateSvgPathMorph(frame, graphic.d, graphic.pathMorph) : graphic.d}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - evaluateAnimationTrack(frame, graphic.animations?.pathProgress, 1)}
          strokeLinecap={graphic.lineCap ?? "round"}
          {...sharedShapeProps}
        />
      )}
    </svg>
  );
};

type ParticleSpec = {
  offsetX: number;
  offsetY: number;
  angleRadians: number;
  speed: number;
  size: number;
  color: string;
  phase: number;
  rotation: number;
};

type ParticleFieldProps = {
  system: ParticleSystem;
  fps: number;
};

const ParticleField: FC<ParticleFieldProps> = ({ system, fps }) => {
  const frame = useCurrentFrame();
  const specs = useMemo<ParticleSpec[]>(() => {
    let state = system.seed >>> 0;
    const random = (): number => {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    };

    const speedMin = system.speedMin ?? 1.5;
    const speedMax = system.speedMax ?? 8;
    const sizeMin = system.sizeMin ?? 2;
    const sizeMax = system.sizeMax ?? 6;
    const angleMin = system.angleMinDeg ?? 0;
    const angleMax = system.angleMaxDeg ?? 360;

    return Array.from({ length: system.count }, () => ({
      offsetX: (random() - 0.5) * (system.spreadX ?? 24),
      offsetY: (random() - 0.5) * (system.spreadY ?? 24),
      angleRadians: (angleMin + random() * (angleMax - angleMin)) * Math.PI / 180,
      speed: speedMin + random() * (speedMax - speedMin),
      size: sizeMin + random() * (sizeMax - sizeMin),
      color: system.colors[Math.floor(random() * system.colors.length)] ?? "#FFFFFF",
      phase: random(),
      rotation: random() * 360,
    }));
  }, [system, fps]);

  const lifeInFrames = system.lifeInFrames;
  const opacity = system.opacity ?? 0.8;
  const gravity = system.gravity ?? 0;

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        pointerEvents: "none",
        mixBlendMode: system.blendMode ?? "screen",
      }}
    >
      {specs.map((particle, index) => {
        const phaseOffset = Math.floor(particle.phase * lifeInFrames);
        const ageFrames = (frame + phaseOffset) % lifeInFrames;
        const ageSeconds = ageFrames / fps;
        const fade = Math.sin(Math.PI * ageFrames / lifeInFrames);
        const travel = particle.speed * ageSeconds;
        const xRaw = (system.originX + particle.offsetX) +
          Math.cos(particle.angleRadians) * travel;
        const yRaw = (system.originY + particle.offsetY) +
          Math.sin(particle.angleRadians) * travel +
          0.5 * gravity * ageSeconds * ageSeconds;
        // Clamp to a small off-canvas margin; wrapping would teleport particles
        // from one edge to the opposite edge and create visible discontinuities.
        const x = Math.max(-5, Math.min(105, xRaw));
        const y = Math.max(-5, Math.min(105, yRaw));
        const shapeStyle: CSSProperties = {
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          opacity: opacity * fade,
          borderRadius: system.shape === "circle" ? "50%" : 2,
          transform: `translate(-50%, -50%) rotate(${particle.rotation + ageFrames * 1.8}deg)${system.shape === "diamond" ? " rotate(45deg)" : ""}`,
          boxShadow: system.blendMode === "screen" ? `0 0 ${particle.size * 2}px ${particle.color}` : undefined,
        };
        return <div key={index} style={shapeStyle} />;
      })}
    </AbsoluteFill>
  );
};

type AnimatedMediaProps = {
  media: SceneMedia;
  index: number;
};

const AnimatedMedia: FC<AnimatedMediaProps> = ({ media, index }) => {
  const frame = useCurrentFrame();
  const placement = media.placement ?? "background";
  const defaultX = media.x ?? (placement === "right" ? 57 : 0);
  const defaultY = media.y ?? 0;
  const defaultWidth = media.width ?? (placement === "background" ? 100 : 43);
  const defaultHeight = media.height ?? 100;
  const x = evaluateAnimationTrack(frame, media.animations?.x, defaultX);
  const y = evaluateAnimationTrack(frame, media.animations?.y, defaultY);
  const width = evaluateAnimationTrack(frame, media.animations?.width, defaultWidth);
  const height = evaluateAnimationTrack(frame, media.animations?.height, defaultHeight);
  const opacity = evaluateAnimationTrack(frame, media.animations?.opacity, media.opacity ?? 1);
  const rotation = evaluateAnimationTrack(frame, media.animations?.rotation, media.rotation ?? 0);
  const scaleX = evaluateAnimationTrack(frame, media.animations?.scaleX, 1);
  const scaleY = evaluateAnimationTrack(frame, media.animations?.scaleY, 1);
  const source = isRemoteMediaUrl(media.src) ? media.src : staticFile(media.src);

  const style: CSSProperties = {
    position: "absolute",
    top: `${y}%`,
    left: `${x}%`,
    width: `${width}%`,
    height: `${height}%`,
    objectFit: media.fit ?? "cover",
    objectPosition: media.position ?? "center",
    opacity,
    zIndex: media.zIndex ?? index,
    transform: `scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`,
    transformOrigin: "center center",
  };

  if (media.type === "image") {
    return <Img src={source} style={style} />;
  }

  return (
    <OffthreadVideo
      src={source}
      style={style}
      {...(media.trimBefore === undefined ? {} : { trimBefore: media.trimBefore })}
      playbackRate={media.playbackRate ?? 1}
      muted={media.muted ?? true}
      volume={media.volume ?? 1}
    />
  );
};

type AnimatedTextProps = {
  animation?: AnimationTracks | undefined;
  children: ReactNode;
  style?: CSSProperties;
};

const AnimatedText: FC<AnimatedTextProps> = ({ animation, children, style }) => {
  const frame = useCurrentFrame();
  const x = evaluateAnimationTrack(frame, animation?.x, 0);
  const y = evaluateAnimationTrack(frame, animation?.y, 0);
  const width = evaluateAnimationTrack(frame, animation?.width, 100);
  const height = animation?.height
    ? evaluateAnimationTrack(frame, animation.height, 100)
    : undefined;
  const opacity = evaluateAnimationTrack(frame, animation?.opacity, 1);
  const rotation = evaluateAnimationTrack(frame, animation?.rotation, 0);
  const scaleX = evaluateAnimationTrack(frame, animation?.scaleX, 1);
  const scaleY = evaluateAnimationTrack(frame, animation?.scaleY, 1);

  return (
    <div
      style={{
        ...style,
        width: `${width}%`,
        ...(height === undefined ? {} : { height: `${height}%` }),
        opacity,
        transform: `translate(${x}%, ${y}%) scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );
};

const getTransitionExtendedDuration = (
  startInFrames: number,
  declaredDurationInFrames: number | undefined,
  sceneDurationInFrames: number,
  transitionOutDurationInFrames: number
): number => {
  const duration = declaredDurationInFrames ?? sceneDurationInFrames - startInFrames;
  const endsWithScene = startInFrames + duration === sceneDurationInFrames;
  return endsWithScene ? duration + transitionOutDurationInFrames : duration;
};

const SceneCard: FC<SceneCardProps> = ({
  scene,
  index,
  compositionFps,
  isFirstScene,
  isLastScene,
  transitionIn,
  transitionOut,
  transitionOutDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const duration = scene.durationInFrames;
  const cameraMotion = scene.cameraMotion;
  const cameraEasing = cameraMotion?.easing === "ease-in"
    ? Easing.in(Easing.cubic)
    : cameraMotion?.easing === "ease-out"
      ? Easing.out(Easing.cubic)
      : cameraMotion?.easing === "ease-in-out"
        ? Easing.inOut(Easing.cubic)
        : Easing.linear;
  const cameraProgress = interpolate(frame, [0, Math.max(1, duration - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: cameraEasing,
  });
  const cameraTransform = cameraMotion
    ? `translate(${(cameraMotion.panX ?? 0) * cameraProgress}%, ${(cameraMotion.panY ?? 0) * cameraProgress}%) scale(${1 + ((cameraMotion.zoom ?? 1) - 1) * cameraProgress})`
    : undefined;
  // Fade the film at its outer edges only. Internal scene cuts stay fully visible.
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [duration - 12, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const transitionStyle = getSceneTransitionStyle(
    frame,
    duration,
    transitionIn,
    transitionOut
  );
  const opacity = (isFirstScene ? fadeIn : 1) *
    (isLastScene ? fadeOut : 1) *
    (transitionStyle.opacity ?? 1);
  const rise = interpolate(frame, [0, 20], [36, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const accent = scene.accentColor ?? "#8B5CF6";
  const background = scene.backgroundColor ?? "#0B1020";
  const mediaLayers = scene.mediaLayers ?? (scene.media ? [scene.media] : []);
  const hasLegacyBackground = Boolean(scene.media && (scene.media.placement ?? "background") === "background");
  const hasSideMedia = Boolean(
    scene.media && (scene.media.placement === "left" || scene.media.placement === "right")
  );
  const textAlign = scene.media?.placement === "left"
    ? "right"
    : scene.type === "content" || scene.media?.placement === "right" ? "left" : "center";
  const eyebrow = scene.eyebrow ?? (scene.type === "title" ? "A SHORT EXPLAINER" : scene.type === "outro" ? "THE BIG PICTURE" : `CHAPTER ${String(index + 1).padStart(2, "0")}`);

  const titleStyle: CSSProperties = {
    fontSize: hasSideMedia ? 72 : scene.type === "content" ? 82 : 104,
    lineHeight: 1.06,
    fontWeight: 760,
    letterSpacing: -4,
    whiteSpace: "pre-line",
    maxWidth: 1320,
    margin: 0,
  };

  const textWidth = hasSideMedia ? "53%" : "100%";
  const textSide = scene.media?.placement === "left" ? "flex-end" : "flex-start";

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 78% 22%, ${accent}25, transparent 34%), ${background}`,
        color: "#F8FAFC",
        opacity,
        justifyContent: "center",
        alignItems: hasSideMedia ? textSide : scene.type === "content" ? "flex-start" : "center",
        padding: "0 13%",
        boxSizing: "border-box",
        overflow: "hidden",
        ...(transitionStyle.transform ? { transform: transitionStyle.transform } : {}),
        ...(transitionStyle.clipPath ? { clipPath: transitionStyle.clipPath } : {}),
        ...(transitionStyle.transform || transitionStyle.clipPath || transitionStyle.opacity !== undefined
          ? { willChange: "transform, opacity, clip-path" }
          : {}),
      }}
    >
      <AbsoluteFill
        style={cameraTransform ? { transform: cameraTransform, transformOrigin: "center center", willChange: "transform" } : undefined}
      >
      {mediaLayers.map((media, layerIndex) => {
        const startInFrames = media.startInFrames ?? 0;
        const durationInFrames = getTransitionExtendedDuration(
          startInFrames,
          media.durationInFrames,
          duration,
          transitionOutDurationInFrames
        );
        return (
          <Sequence
            key={media.id ?? `${media.src}-${layerIndex}`}
            from={startInFrames}
            durationInFrames={durationInFrames}
            name={media.id ?? `media-layer-${layerIndex + 1}`}
            style={{ zIndex: media.zIndex ?? layerIndex }}
          >
            <AnimatedMedia media={media} index={layerIndex} />
          </Sequence>
        );
      })}
      {(scene.graphics ?? []).map((graphic, graphicIndex) => {
        const startInFrames = graphic.startInFrames ?? 0;
        const durationInFrames = getTransitionExtendedDuration(
          startInFrames,
          graphic.durationInFrames,
          duration,
          transitionOutDurationInFrames
        );
        return (
          <Sequence
            key={graphic.id}
            from={startInFrames}
            durationInFrames={durationInFrames}
            name={`graphic-${graphic.id}`}
          >
            <AnimatedGraphic graphic={graphic} />
          </Sequence>
        );
      })}
      {(scene.particleSystems ?? []).map((system) => {
        const startInFrames = system.startInFrames ?? 0;
        const durationInFrames = getTransitionExtendedDuration(
          startInFrames,
          system.durationInFrames,
          duration,
          transitionOutDurationInFrames
        );
        return (
          <Sequence
            key={system.id}
            from={startInFrames}
            durationInFrames={durationInFrames}
            name={`particles-${system.id}`}
          >
            <ParticleField system={system} fps={compositionFps} />
          </Sequence>
        );
      })}
      </AbsoluteFill>
      {hasLegacyBackground ? (
        <AbsoluteFill
          style={{
            background: "linear-gradient(90deg, rgba(5, 8, 20, 0.82), rgba(5, 8, 20, 0.38))",
            zIndex: 30,
            pointerEvents: "none",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          right: -330,
          bottom: -430,
          borderRadius: "50%",
          border: `2px solid ${accent}55`,
          boxShadow: `0 0 100px ${accent}22`,
          transform: `translateY(${interpolate(frame, [0, duration], [26, -26], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px) rotate(${frame * 0.12}deg)`,
          zIndex: 35,
        }}
      />
      <div
        style={{
          position: "relative",
          width: textWidth,
          maxWidth: 1320,
          transform: `translateY(${rise}px)`,
          textAlign,
          zIndex: 50,
        }}
      >
        <AnimatedText
          animation={scene.eyebrowAnimation}
          style={{
            color: accent,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 7,
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          {eyebrow}
        </AnimatedText>
        <AnimatedText animation={scene.titleAnimation}>
          <h1 style={titleStyle}>{scene.title}</h1>
        </AnimatedText>
        {scene.body ? (
          <AnimatedText
            animation={scene.bodyAnimation}
            style={{
              margin: textAlign === "center" ? "34px auto 0" : "32px 0 0",
              color: "#C7CBD7",
              fontSize: hasSideMedia ? 30 : 38,
              lineHeight: 1.45,
              fontWeight: 400,
            }}
          >
            <p style={{ margin: 0 }}>{scene.body}</p>
          </AnimatedText>
        ) : null}
        <div
          style={{
            width: 112,
            height: 5,
            margin: textAlign === "center" ? "46px auto 0" : "46px 0 0",
            borderRadius: 99,
            background: accent,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 64,
          left: "13%",
          right: "13%",
          display: "flex",
          justifyContent: "space-between",
          color: "#7B8498",
          fontSize: 17,
          letterSpacing: 3,
          textTransform: "uppercase",
          zIndex: 60,
        }}
      >
        <span>AI VIDEO STUDIO</span>
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>
    </AbsoluteFill>
  );
};

export const ProjectVideo: FC<VideoProject> = ({ scenes, audioTracks = [], subtitles = [], composition }) => {
  const projectDurationInFrames = scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
  let nextSceneStartInFrames = 0;

  const sceneSequences = scenes.map((scene, index) => {
    const from = nextSceneStartInFrames;
    nextSceneStartInFrames += scene.durationInFrames;

    const nextScene = scenes[index + 1];
    const transitionOut = nextScene?.transitionIn;
    const transitionOutDurationInFrames = transitionOut && transitionOut.type !== "cut"
      ? transitionOut.durationInFrames
      : 0;
    const transitionIn = index === 0 ? undefined : scene.transitionIn;

    return (
      <Sequence
        key={scene.id}
        from={from}
        durationInFrames={scene.durationInFrames + transitionOutDurationInFrames}
        name={`scene-${scene.id}`}
        style={{ zIndex: index }}
      >
        <SceneCard
          scene={scene}
          index={index}
          compositionFps={composition.fps}
          isFirstScene={index === 0}
          isLastScene={index === scenes.length - 1}
          transitionIn={transitionIn}
          transitionOut={transitionOut}
          transitionOutDurationInFrames={transitionOutDurationInFrames}
        />
      </Sequence>
    );
  });

  return (
    <AbsoluteFill>
      {audioTracks.map((track) => (
        <AudioTrackLayer
          key={track.id}
          track={track}
          projectDurationInFrames={projectDurationInFrames}
        />
      ))}
      {sceneSequences}
      {subtitles.map((cue) => (
        <Sequence
          key={cue.id}
          from={cue.startInFrames}
          durationInFrames={cue.durationInFrames}
          name={"subtitle-" + cue.id}
          style={{ zIndex: 1000 }}
        >
          <SubtitleCueLayer cue={cue} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
