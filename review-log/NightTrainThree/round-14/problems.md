# NightTrainThree — round 14 findings

## Three worst aesthetic problems
1. **Mountain silhouettes remain oversized and repetitive.** The repeated triangular peaks dominate the skyline and could use more varied profiles and spacing.
2. **The locomotive undercarriage is sparse.** Wheels and lower mechanical detail are simplified, especially in the low-angle shot.
3. **Snowfall is subtle in the wide shots.** The snow particles are visible but could read more clearly against the dark sky.

## Motion check
- Subject facing direction: locomotive nose points +X (screen-right).
- Subject travel direction across sampled frames: +X and screen-right in all three shots. Side samples 0–120, low samples 210–360, and high samples 420–570 all show nose-first travel.
- 3+ consecutive near-identical one-second samples: none in the reviewed coverage. The closing shot continues moving rightward while the camera cranes up and back.
- Framing: the locomotive is fully in frame at the opening, low-shot entry, and closing samples; the train remains well above 25% of frame width in the final shot.

## Technical checks
- `npm run check`: passed.
- Review round 14 selected stills and contact sheet rendered successfully.
- Actual frames inspected: 0, 60, 120, 210, 240, 360, 420, 480, 510, 570.
- Camera motion is driven by the shared ThreeScene CameraRig with shot-local duration; the locomotive moves nose-first in all shots.
