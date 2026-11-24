# NightTrainThree — round 4 findings

## Three worst aesthetic problems
1. **Screen-space direction contradicts the locomotive's nose.** The locomotive faces +X, but the camera tracks at the same speed as (and in parts visually overtakes) the train. In the side samples from frame 0 to 120, the nose shifts left on screen; this reads as reverse travel despite the corrected world-space trainX. The camera must move more slowly than the train so the nose-first +X travel is legible.
2. **The closing crane pulls back too far.** From frame 420 to 570 the train remains larger than a quarter of frame width, but shrinks from near edge-to-edge to roughly two-thirds width. The camera should retreat more gently and let the train continue advancing rightward on screen.
3. **Mountain silhouettes still dominate.** The large, repeated triangular peaks occupy much of the upper frame; they need more varied scale and layered depth so the train remains the focal subject.

## Motion check
- Subject facing direction: locomotive nose points +X (screen-right in the side-on view).
- Subject travel direction across sampled frames: world-space +X, but the camera's matching/over-fast tracking makes the subject drift left on screen in the side and closing samples. This does **not** read nose-first; fix camera tracking speed.
- 3+ consecutive near-identical one-second samples: none of the reviewed samples are identical; the closing shot does show clear scale change from the crane move, but its screen-space direction is wrong.

## Technical checks
- `npm run check`: passed.
- Review workflow rendered selected frames and contact sheet successfully.
- Review samples inspected: 0, 60, 120, 210, 240, 360, 420, 480, 510, 570.
- Fix for next round: camera/target travel at roughly half the train's +X displacement; reduce high-shot crane distance while retaining a visible rise and pull-back.
