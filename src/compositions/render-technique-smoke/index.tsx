import React from "react";
import {TransitionSeries} from "@remotion/transitions";
import {fadeTransition} from "../../shared/fade-transition";
import {SpatialSmoke} from "./scenes/spatial";
import {AtmosphereSmoke} from "./scenes/atmosphere";

// Five-second smoke composition combines two seconds of 3D and three seconds of image parallax.
export const RenderTechniqueSmoke: React.FC = () => <TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={75}><SpatialSmoke /></TransitionSeries.Sequence>
  {fadeTransition(6)}
  <TransitionSeries.Sequence durationInFrames={81}><AtmosphereSmoke /></TransitionSeries.Sequence>
</TransitionSeries>;
