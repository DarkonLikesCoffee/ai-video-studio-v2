import React from "react";

import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { EIFFEL_DURATION, FADE, MAP_DURATION } from "./constants";
import { EiffelScene } from "./EiffelScene";
import { MapScene } from "./MapScene";

export { MADRID_TRIP_DURATION, FPS, WIDTH, HEIGHT } from "./constants";

export const MadridTrip: React.FC = () => (
  <>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={MAP_DURATION}>
        <MapScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE })}
      />
      <TransitionSeries.Sequence durationInFrames={EIFFEL_DURATION}>
        <EiffelScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </>
);
