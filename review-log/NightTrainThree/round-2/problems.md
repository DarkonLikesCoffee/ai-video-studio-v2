# Round 2 — actual frame review

## Three worst aesthetic problems, ranked by impact
1. **Closing-shot train scale and contrast still fail.** At frames 420 and 480 the train is a small, low-contrast mass in the center of a fog-dominated landscape; it occupies far less than a quarter of the frame width. Frame 570 is more readable but still washed out. The round-2 camera adjustment did not solve this.
2. **Mountain silhouettes dominate the composition.** The angular cone peaks occupy most of the upper frame and have little visual layering; the train competes with oversized foreground geometry rather than sitting clearly between near/mid/far ridges.
3. **The final shot loses directional light and depth cues.** The locomotive's front is readable at frame 240, but the closing scene's fog and weak warm spill suppress the headlight/window contrast and make the vehicle appear static at a distance.

## Reference comparison
Compared with `reference/tiny-astronaut-01.png` and `reference/tiny-astronaut-02.png`, both stylized low-poly 3D references, the train still has weaker subject-to-background separation and its mountain masses are too uniform in scale. The remaining gap is lighting, depth and framing—not photographic texture.

## Motion check
Frames 420, 450 and 480 show too little *apparent* movement because the train is almost lost in the haze. The images are not pixel-identical, but the motion is not readable enough to satisfy the intended visual check.

## Technical issues
The round-2 stills and contact sheet rendered successfully, and the strict TypeScript check passed. Round 3 removes exponential fog from the high shot, moves the camera closer, adds a forward warm light and converts the sleepers to instanced geometry.
