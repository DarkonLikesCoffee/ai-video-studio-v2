import { Composition } from "remotion";
import { MadridTrip, MADRID_TRIP_DURATION, FPS, WIDTH, HEIGHT } from "./compositions/madrid-trip";
import { TinyAstronautCrystalCave } from "./compositions/tiny-astronaut-crystal-cave/TinyAstronautCrystalCave";
import { LighthouseStorm } from "./compositions/lighthouse-storm/LighthouseStorm";

export const RemotionRoot = () => (
  <>
    <Composition id="MadridTrip" component={MadridTrip} durationInFrames={MADRID_TRIP_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TinyAstronautCrystalCave" component={TinyAstronautCrystalCave} durationInFrames={600} fps={30} width={1920} height={1080} />
    <Composition id="LighthouseStorm" component={LighthouseStorm} durationInFrames={600} fps={30} width={1920} height={1080} />
  </>
);
