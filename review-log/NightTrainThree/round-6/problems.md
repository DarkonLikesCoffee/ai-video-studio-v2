# NightTrainThree — round 6 findings

## Three worst aesthetic problems
1. **The low shot still reads backward.** The locomotive faces +X, but in frames 210–360 its nose moves left across the screen (roughly x=1410 to x=1225 in the inspected 1650px render). The camera is on an oblique front-quarter angle, so the projected screen direction is reversed. Reorient this shot to a side-on low track-level camera and track at roughly 85% of train speed, leaving a small rightward screen drift.
2. **The closing shot is still almost static.** From frame 420 to 570 the train remains large, but the locomotive nose stays close to the right edge and shifts slightly left as the crane pulls back. Reframe the high camera farther left and keep its x/target fixed so the train advances rightward in frame during the upward/backward crane.
3. **Mountains still overpower the scene.** The repeated high peaks are very large and similar in shape; vary their scale and overlap to make the train more dominant.

## Motion check
- Subject facing direction: locomotive nose points +X.
- Subject travel direction across sampled frames: side shot moves rightward; low shot moves leftward on screen (wrong); high shot barely moves and drifts slightly left while the camera retreats. Only the side shot clearly reads nose-first in screen space.
- 3+ consecutive near-identical one-second samples: high-shot samples 420, 450, 480, 510, 540, 570 show very little locomotive screen displacement; insufficient subject motion is a problem despite the visible scale change.

## Technical checks
- `npm run check`: passed.
- Round-6 review workflow rendered selected frames and contact sheet successfully.
- Inspected frames: 0, 60, 120, 210, 240, 360, 420, 480, 510, 570.
- Next fix: low shot side-on with slower camera tracking; high shot reframe left so +X motion is visibly rightward.
