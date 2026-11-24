# NightTrainThree — round 10 findings

## Three worst aesthetic problems
1. **The attempted custom camera override has no visual effect.** Round-10 frame PNGs are byte-identical to round 9, including the low and high camera shots. The child camera controller is not taking ownership from the shared ThreeScene CameraRig.
2. **Closing shot remains nearly static.** Samples 420–570 still show almost no locomotive screen displacement; the crane/pull-back alone is not enough.
3. **Low-shot forward travel remains too subtle.** The locomotive stays framed but the camera masks the train's +X progress.

## Motion check
- Subject facing direction: locomotive nose points +X.
- Subject travel direction across sampled frames: side shot moves rightward; low and high shots move +X in world space but the visible camera output is unchanged from the prior round, so screen-space travel remains weak.
- 3+ consecutive near-identical one-second samples: high-shot frames 420, 450, 480, 510, 540, 570 are near-identical; insufficient motion is a problem.

## Technical checks
- `npm run check`: passed.
- Round-10 workflow succeeded, but its selected frames were byte-identical to round 9.
- Root cause: shared `ThreeScene` `CameraRig` is the actual camera driver. Use its existing `durationInFrames` prop (currently declared but unused), remove the competing child camera, and route each shot's cameraFrom/cameraTo through that rig.
