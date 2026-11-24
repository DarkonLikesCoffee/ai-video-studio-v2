import type {FC} from "react";
import {TransitionSeries, linearTiming} from "@remotion/transitions";
import {fade} from "@remotion/transitions/fade";

// Reuse Remotion's cross-fade as the standard scene handoff.
export const FadeTransition: FC<{durationInFrames: number}> = ({durationInFrames}) => (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({durationInFrames})}
  />
);
