# NightTrainThree — round 8 findings

## Three worst aesthetic problems
1. **Low shot is framed more safely, but forward travel is still too subtle.** The locomotive remains inside the frame from 210 to 360 and its nose faces +X; however the camera tracks most of its displacement, so the visible screen movement is modest. Keep the wider 12-unit view but ensure the camera move uses the shot-local duration and tracks only 60% of the train's travel.
2. **The closing crane is nearly static in screen space.** The locomotive remains larger than a quarter of frame width, but the nose barely shifts between frames 420 and 570. The camera pan does not visibly reveal the train's +X travel. Inspection of the shared ThreeScene revealed its CameraRig was also driving the camera; remove that competing camera path so the shot-specific CameraMove owns the camera, and use explicit per-shot durations.
3. **The mountain peaks remain oversized and repetitive.** The high peaks still occupy much of the frame and have similar silhouettes; this remains a visual weakness but is lower priority than motion.

## Motion check
- Subject facing direction: locomotive nose points +X (screen-right).
- Subject travel direction across sampled frames: side shot moves rightward; low shot moves rightward and remains in frame; high shot moves +X in world space but shows little screen displacement.
- 3+ consecutive near-identical one-second samples: high-shot samples 420, 450, 480, 510, 540, 570 remain nearly identical in locomotive screen position; insufficient visible motion is a problem.

## Technical checks
- `npm run check`: passed.
- Round-8 review workflow rendered selected frames and contact sheet successfully.
- Inspected frames: 0, 60, 120, 210, 240, 360, 420, 480, 510, 570.
- Root cause identified for next round: the shared `ThreeScene` CameraRig competes with the shot camera. Remove the redundant cameraFrom/cameraTo path and give CameraMove explicit shot-local duration (210 or 216 frames).
