# NightTrainThree — round 13 findings

## Three worst aesthetic problems
1. **The low-angle locomotive is slightly clipped at its entry.** Frame 210 shows the rear of the locomotive cut by the left edge, although its nose is visible and the train travels rightward. Move the low-shot starting position forward by two units so the full locomotive is visible immediately.
2. **The high shot now shows clear nose-first travel.** Frames 420–570 show the locomotive moving rightward while the camera cranes up/back and pans left; train width remains comfortably above 25% of the frame.
3. **Mountain silhouettes remain oversized and repetitive.** The large, similar peaks still dominate the upper frame; this is the main remaining aesthetic weakness.

## Motion check
- Subject facing direction: locomotive nose points +X (screen-right).
- Subject travel direction across sampled frames: side shot moves rightward with the locomotive fully in frame at frame 0; low shot moves rightward but its rear is clipped at frame 210; high shot moves clearly rightward through frames 420–570.
- 3+ consecutive near-identical one-second samples: none; the high-shot locomotive shifts visibly right across the sampled frames.

## Technical checks
- `npm run check`: passed.
- Round-13 review workflow rendered selected frames and contact sheet successfully.
- Inspected frames: 0, 60, 120, 210, 240, 360, 420, 480, 510, 570.
- Final correction: move low-shot train start from -7 to -5 so the locomotive clears the left edge at frame 210.
