import { evaluateAnimationTrack } from "./animation";
import type { SceneTransition } from "./project";

export type SceneTransitionStyle = {
  opacity?: number;
  transform?: string;
  clipPath?: string;
};

type TransitionPhase = "in" | "out";

const getProgress = (frame: number, transition: SceneTransition): number =>
  evaluateAnimationTrack(
    frame,
    {
      keyframes: [
        {
          frame: 0,
          value: 0,
          ...(transition.easing === undefined ? {} : { easing: transition.easing }),
        },
        { frame: transition.durationInFrames, value: 1 },
      ],
    },
    0
  );

const percent = (value: number): string => `${Number(value.toFixed(3))}%`;

const getSingleTransitionStyle = (
  transition: SceneTransition,
  progress: number,
  phase: TransitionPhase
): SceneTransitionStyle => {
  const entering = phase === "in";
  const remaining = 1 - progress;

  switch (transition.type) {
    case "cut":
      return {};
    case "fade":
      return { opacity: entering ? progress : remaining };
    case "slide-left":
      // New scene enters from the right while the previous scene exits left.
      return { transform: entering
        ? `translateX(${percent(remaining * 100)})`
        : `translateX(${percent(-progress * 100)})` };
    case "slide-right":
      return { transform: entering
        ? `translateX(${percent(-remaining * 100)})`
        : `translateX(${percent(progress * 100)})` };
    case "slide-up":
      return { transform: entering
        ? `translateY(${percent(remaining * 100)})`
        : `translateY(${percent(-progress * 100)})` };
    case "slide-down":
      return { transform: entering
        ? `translateY(${percent(-remaining * 100)})`
        : `translateY(${percent(progress * 100)})` };
    case "zoom":
      return {
        opacity: entering ? progress : remaining,
        transform: entering
          ? `scale(${Number((1.12 - progress * 0.12).toFixed(4))})`
          : `scale(${Number((1 + progress * 0.08).toFixed(4))})`,
      };
    case "wipe-left":
      return entering
        ? { clipPath: `inset(0 0 0 ${percent(remaining * 100)})` }
        : {};
    case "wipe-right":
      return entering
        ? { clipPath: `inset(0 ${percent(remaining * 100)} 0 0)` }
        : {};
    default:
      return {};
  }
};

/**
 * Calculate the deterministic style for a scene's incoming and outgoing
 * transitions. The outgoing window begins at the scene's nominal end frame;
 * ProjectVideo extends that scene's Sequence to cover the overlap.
 */
export const getSceneTransitionStyle = (
  frame: number,
  sceneDurationInFrames: number,
  transitionIn?: SceneTransition,
  transitionOut?: SceneTransition
): SceneTransitionStyle => {
  const incoming = transitionIn && transitionIn.type !== "cut"
    ? getSingleTransitionStyle(
        transitionIn,
        getProgress(frame, transitionIn),
        "in"
      )
    : {};
  const outgoingFrame = frame - sceneDurationInFrames;
  const outgoing = transitionOut && transitionOut.type !== "cut" && outgoingFrame >= 0
    ? getSingleTransitionStyle(
        transitionOut,
        getProgress(outgoingFrame, transitionOut),
        "out"
      )
    : {};

  const transforms = [incoming.transform, outgoing.transform].filter(Boolean);
  const opacity = (incoming.opacity ?? 1) * (outgoing.opacity ?? 1);

  return {
    ...(opacity === 1 ? {} : { opacity }),
    ...(transforms.length === 0 ? {} : { transform: transforms.join(" ") }),
    ...(incoming.clipPath ? { clipPath: incoming.clipPath } : outgoing.clipPath ? { clipPath: outgoing.clipPath } : {}),
  };
};
