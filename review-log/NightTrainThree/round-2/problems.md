# Round 2 — actual frame review

## Three worst aesthetic problems, ranked by impact
1. **Closing-shot train scale and contrast still fail.** At frames 420 and 480 the train is a small, low-contrast mass in the center of a fog-dominated landscape; it occupies far less than a quarter of the frame width. Frame 570 is more readable but still washed out. The round-2 camera adjustment did not solve this.
2. **Mountain silhouettes dominate the composition.** The angular cone peaks occupy most of the upper frame and have little visual layering; the train competes with oversized foreground geometry rather than sitting clearly between near/mid/far ridges.
3. **The final shot loses directional light and depth cues.** The locomotive's front is readable at frame 240, but the closing scene's fog and weak warm spill suppress the headlamp/window contrast and make the vehicle appear static at a distance.

## Motion check
The train changes position across the high shot samples, but the small apparent scale and low contrast make that movement difficult to read. The issue is visibility/scale, not a repeated identical frame.

## Technical issues
The round-2 contact sheet and all 21 stills rendered successfully; TypeScript check passed. Round 3 changes the high-shot camera, removes its exponential fog, adds forward light, and replaces individual sleepers with instanced geometry.
