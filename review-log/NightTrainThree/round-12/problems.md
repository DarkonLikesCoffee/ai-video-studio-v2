# NightTrainThree — round 12 findings

## Three worst aesthetic problems
1. **The locomotive is still partly cropped at the opening.** Frame 0 shows the locomotive's rear extending beyond the left edge, even though its nose remains visible. Move the initial side-shot train position forward by five units so the complete locomotive enters the frame from the start.
2. **Closing shot now has visible forward motion, but it can be stronger.** Across frames 420–570 the locomotive shifts rightward while the camera cranes backward/upward; the train remains comfortably above 25% of frame width. Increase the leftward camera pan modestly to make the travel more legible.
3. **Mountain silhouettes remain oversized and repetitive.** The repeated peaks still dominate the top half of the frame; this is the main remaining aesthetic weakness.

## Motion check
- Subject facing direction: locomotive nose points +X (screen-right).
- Subject travel direction across sampled frames: side shot travels rightward, but the locomotive is partly cropped at frame 0; low shot travels rightward and stays framed; high shot travels rightward while the camera cranes and pulls back.
- 3+ consecutive near-identical one-second samples: none; the high-shot train position changes across 420–570 and remains clearly larger than a quarter of frame width.

## Technical checks
- `npm run check`: passed.
- Round-12 workflow rendered selected frames and contact sheet successfully.
- Inspected frames: 0, 60, 120, 210, 240, 360, 420, 480, 510, 570.
- Next fix: start the side train five units farther forward and increase the high-shot leftward pan by three units.
