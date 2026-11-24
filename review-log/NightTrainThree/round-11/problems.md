# NightTrainThree — round 11 findings

## Three worst aesthetic problems
1. **Side shot starts with the locomotive clipped at the left edge.** The train then moves rightward and is readable by frames 60–120, but the initial sample does not keep the locomotive fully in frame. Shift the side camera start/end two units left to give the locomotive more room at frame 0.
2. **High-shot motion is now real but still subtle.** The train moves rightward during the crane and remains well above 25% of frame width, but the screen displacement from 420 to 570 is only about 50 px in the inspected 1650px frame. Pan the high camera farther left while it cranes back to make forward travel clearer.
3. **Mountain silhouettes remain oversized.** The repeated triangular peaks still dominate the background; they are the main remaining environment weakness.

## Motion check
- Subject facing direction: locomotive nose points +X (screen-right).
- Subject travel direction across sampled frames: side shot moves rightward; low shot moves rightward and remains in frame; high shot moves rightward while the camera cranes upward/backward. All three now read nose-first.
- 3+ consecutive near-identical one-second samples: none are byte-identical; high-shot screen movement is visible but too subtle and should be strengthened.

## Technical checks
- `npm run check`: passed after restoring the `interpolate` import.
- Round-11 workflow rendered selected frames and contact sheet successfully.
- The shared ThreeScene CameraRig now owns the camera and uses the existing `durationInFrames` prop for shot-local timing.
- Inspected frames: 0, 60, 120, 210, 240, 360, 420, 480, 510, 570.
- Next fix: shift side camera two units left at both ends; pan the high camera farther left during the crane.
