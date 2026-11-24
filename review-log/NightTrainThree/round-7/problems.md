# NightTrainThree — round 7 findings

## Three worst aesthetic problems
1. **Low-angle framing is too tight.** The locomotive nose points +X and the train advances rightward, but the close side-on camera leaves the nose almost at the right edge by frame 360. Widen the view by moving the low camera farther back and track it more slowly, keeping the nose safely in frame.
2. **Closing-shot screen motion remains too subtle.** The locomotive faces +X, but frames 420–570 show very little rightward screen displacement. Add a small leftward camera pan while the crane rises and pulls back, making the train's forward motion visible without cropping its nose.
3. **Mountain shapes remain repetitive and oversized.** Large triangular peaks still dominate the background; the foreground and midground could use more varied scale.

## Motion check
- Subject facing direction: locomotive nose points +X (screen-right in side view).
- Subject travel direction across sampled frames: side shot travels rightward; low shot travels rightward but approaches the right frame edge; high shot travels +X in world space but appears almost stationary on screen.
- 3+ consecutive near-identical one-second samples: high-shot samples 420, 450, 480, 510, 540, 570 show near-identical locomotive screen position; insufficient visible subject motion is an aesthetic problem.

## Technical checks
- `npm run check`: passed.
- Round-7 review workflow rendered selected frames and contact sheet successfully.
- Inspected frames: 0, 60, 120, 210, 240, 360, 420, 480, 510, 570.
- Next fix: widen low shot and reduce camera tracking to 60% of train displacement; pan high-shot target slightly left during the crane to reveal rightward train travel.
