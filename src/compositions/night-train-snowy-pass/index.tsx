import React from "react";
import {AbsoluteFill} from "remotion";
import {TransitionSeries} from "@remotion/transitions";
import {fade} from "@remotion/transitions/fade";
import {Opening} from "./scenes/opening";
import {Pass} from "./scenes/pass";
import {Close} from "./scenes/close";
export const NightTrainSnowyPass = () => (
 <AbsoluteFill style={{background:"#07111d",fontFamily:"Arial, sans-serif"}}>
  <TransitionSeries>
   <TransitionSeries.Sequence durationInFrames={210}><Opening/></TransitionSeries.Sequence>
   <TransitionSeries.Transition presentation={fade()} timing={{durationInFrames:18}}/>
   <TransitionSeries.Sequence durationInFrames={210}><Pass/></TransitionSeries.Sequence>
   <TransitionSeries.Transition presentation={fade()} timing={{durationInFrames:18}}/>
   <TransitionSeries.Sequence durationInFrames={198}><Close/></TransitionSeries.Sequence>
  </TransitionSeries>
 </AbsoluteFill>
);
