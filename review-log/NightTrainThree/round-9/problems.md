# NightTrainThree — round 9 findings

## Three worst aesthetic problems
1. **Shot-specific camera is still being overwritten.** The round-9 contact sheet is visually unchanged from round 8: despite the explicit shot-local timing, the low and high camera paths do not visibly update the composition. The shared ThreeScene CameraRig writes to the same camera during React render; move TrainWorld's camera updates into a frame callback so they apply after the default rig.
2. **Closing shot has insufficient visible travel.** Frames 420–570 still show nearly the same locomotive screen position; this violates the intended continuous movement even though trainX advances in world space.
3. **Low shot has insufficient travel separation.** The train stays framed, but the camera tracking masks much of the train's forward movement. Once the camera ownership conflict is fixed, preserve the slower tracking rate.

## Motion check
- Subject facing direction: locomotive nose points +X.
- Subject travel direction across sampled frames: side shot moves rightward; low and high shots advance +X in world space, but the default CameraRig overrides the shot-specific camera path, leaving screen-space movement weak or absent.
- 3+ consecutive near-identical one-second samples: high-shot samples 420, 450, 480, 510, 540, 570 are near-identical; insufficient visible motion is a problem.

## Technical checks
- `npm run check`: passed.
- Round-9 selected frames and contact sheet rendered successfully, but visually matched round 8.
- Fix: apply the shot camera with React Three Fiber `useFrame` after the default rig's render-time camera update.
