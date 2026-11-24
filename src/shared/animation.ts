import { Easing, interpolate } from "remotion";
import type { AnimationEasing, AnimationKeyframe, AnimationTrack, AnimationTracks, SvgPathMorphTrack } from "./project";
import { interpolateMorphableSvgPaths } from "./svg-path";

const easingPresets = {
  linear: Easing.linear,
  "ease-in": Easing.in(Easing.cubic),
  "ease-out": Easing.out(Easing.cubic),
  "ease-in-out": Easing.inOut(Easing.cubic),
  back: Easing.out(Easing.back()),
  bounce: Easing.out(Easing.bounce),
  elastic: Easing.out(Easing.elastic()),
  spring: Easing.spring(),
};

const resolveEasing = (easing: AnimationEasing | undefined) => {
  if (easing === undefined) return Easing.linear;
  if (typeof easing === "string") return easingPresets[easing];

  if (easing.type === "bezier") {
    return Easing.bezier(easing.x1, easing.y1, easing.x2, easing.y2);
  }

  return Easing.spring({
    ...(easing.stiffness === undefined ? {} : { stiffness: easing.stiffness }),
    ...(easing.damping === undefined ? {} : { damping: easing.damping }),
    ...(easing.mass === undefined ? {} : { mass: easing.mass }),
    ...(easing.overshootClamping === undefined ? {} : { overshootClamping: easing.overshootClamping }),
  });
};

/**
 * Resolve a numeric animation track at a local frame.
 * The easing declared on a keyframe applies to the segment leading to the next keyframe.
 */
export const evaluateAnimationTrack = (
  frame: number,
  track: AnimationTrack | undefined,
  fallback: number
): number => {
  if (!track || track.keyframes.length === 0) return fallback;

  const keyframes: AnimationKeyframe[] = track.keyframes;
  if (keyframes.length === 1) return keyframes[0]!.value;

  return interpolate(
    frame,
    keyframes.map((keyframe) => keyframe.frame),
    keyframes.map((keyframe) => keyframe.value),
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: keyframes.slice(0, -1).map((keyframe) => resolveEasing(keyframe.easing)),
    }
  );
};

export const evaluateAnimationTracks = (
  frame: number,
  tracks: AnimationTracks | undefined,
  defaults: Partial<Record<keyof AnimationTracks, number>>
): Partial<Record<keyof AnimationTracks, number>> => {
  if (!tracks) return {};
  const values: Partial<Record<keyof AnimationTracks, number>> = {};

  for (const [property, track] of Object.entries(tracks)) {
    values[property as keyof AnimationTracks] = evaluateAnimationTrack(
      frame,
      track,
      defaults[property as keyof AnimationTracks] ?? 0
    );
  }

  return values;
};


/**
 * Evaluate a compatible SVG path morph on a local graphic frame. The easing
 * on each morph keyframe controls interpolation toward the following shape.
 */
export const evaluateSvgPathMorph = (
  frame: number,
  fallback: string,
  track: SvgPathMorphTrack | undefined
): string => {
  if (!track || track.keyframes.length < 2) return fallback;

  const progressTrack: AnimationTrack = {
    keyframes: track.keyframes.map((keyframe, index) => ({
      frame: keyframe.frame,
      value: index,
      ...(keyframe.easing === undefined ? {} : { easing: keyframe.easing }),
    })),
  };
  const progress = evaluateAnimationTrack(frame, progressTrack, 0);
  const boundedProgress = Math.max(0, Math.min(track.keyframes.length - 1, progress));
  if (boundedProgress <= 0) return track.keyframes[0]!.d;
  if (boundedProgress >= track.keyframes.length - 1) return track.keyframes[track.keyframes.length - 1]!.d;

  const fromIndex = Math.floor(boundedProgress);
  const amount = boundedProgress - fromIndex;
  return interpolateMorphableSvgPaths(
    track.keyframes[fromIndex]!.d,
    track.keyframes[fromIndex + 1]!.d,
    amount
  ) ?? fallback;
};
