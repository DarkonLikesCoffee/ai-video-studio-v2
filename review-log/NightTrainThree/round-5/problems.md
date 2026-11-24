# NightTrainThree — round 5 findings

## Three worst aesthetic problems
1. **The low-angle locomotive exits the frame.** It moves nose-first toward +X and rightward on screen, but the camera only covers half the train's displacement. By frame 360 the locomotive nose is cropped at the right edge. Increase low-shot camera tracking to about five-sixths of the train's movement so the nose remains visible while still drifting right.
2. **The closing shot's screen-space travel is weak and can drift left.** The train faces +X, but the pull-back increases camera distance while the camera also shifts right; perspective compresses the locomotive's rightward progress. Keep the high-shot camera/target x fixed while it cranes up and backward, allowing the train to advance rightward in frame.
3. **Mountain silhouettes remain oversized and repetitive.** The large pale peaks dominate the upper half and have similar cone-like profiles; vary scale and overlap to create more depth.

## Motion check
- Subject facing direction: locomotive nose points +X (screen-right).
- Subject travel direction across sampled frames: side shot moves rightward; low shot moves rightward but exits the right edge by frame 360; high shot's pull-back causes the train to shrink and its screen-space movement is not clearly rightward. Only the side shot fully reads nose-first in this round.
- 3+ consecutive near-identical one-second samples: the high shot changes scale across 420–570, but the locomotive's screen position changes too little to read continuous travel.

## Technical checks
- `npm run check`: passed.
- Round-5 review workflow rendered all 10 selected stills and the contact sheet successfully.
- Frames inspected: 0, 60, 120, 210, 240, 360, 420, 480, 510, 570.
- Next fix: low camera follows about 5/6 of train movement; high camera x/target stay fixed while y/z crane back.
