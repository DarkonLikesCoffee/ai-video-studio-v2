import test from "node:test";
import assert from "node:assert/strict";
import { getAstronautLayerVisibility } from "../packages/video-engine/src/scenes/tinyAstronautPhases";

test("astronaut layer handoffs are exclusive at every frame", () => {
  for (let frame = 0; frame < 600; frame += 1) {
    const layers = getAstronautLayerVisibility(frame);
    const activeLayers = Object.values(layers).filter(Boolean).length;
    assert.equal(activeLayers, frame < 90 ? 0 : 1, `unexpected astronaut layer count at frame ${frame}`);
  }
});

test("astronaut visibility changes at the intended story phase boundaries", () => {
  assert.deepEqual(getAstronautLayerVisibility(89), {
    planet: false, caveApproach: false, crystalAwakening: false,
  });
  assert.deepEqual(getAstronautLayerVisibility(90), {
    planet: true, caveApproach: false, crystalAwakening: false,
  });
  assert.deepEqual(getAstronautLayerVisibility(269), {
    planet: true, caveApproach: false, crystalAwakening: false,
  });
  assert.deepEqual(getAstronautLayerVisibility(270), {
    planet: false, caveApproach: true, crystalAwakening: false,
  });
  assert.deepEqual(getAstronautLayerVisibility(429), {
    planet: false, caveApproach: true, crystalAwakening: false,
  });
  assert.deepEqual(getAstronautLayerVisibility(430), {
    planet: false, caveApproach: false, crystalAwakening: true,
  });
  assert.deepEqual(getAstronautLayerVisibility(599), {
    planet: false, caveApproach: false, crystalAwakening: true,
  });
  assert.deepEqual(getAstronautLayerVisibility(600), {
    planet: false, caveApproach: false, crystalAwakening: false,
  });
});
