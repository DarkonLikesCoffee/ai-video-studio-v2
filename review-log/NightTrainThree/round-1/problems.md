# Round 1 — actual frame inspection

## Three worst aesthetic problems, ranked by impact
1. **Closing-shot train visibility and motion fail.** Frames 420, 450 and 480 show the train almost disappearing into fog; the subject is far below a quarter of frame width and its movement is not legible across those consecutive one-second samples.
2. **Locomotive silhouette is unreadable.** Frames 120, 240 and 360 show a mostly dark rectangular body; the nose, cab and front light do not read as a locomotive, so the train is mistaken for a sequence of coaches.
3. **Mountain scale and depth are weak.** The oversized cone silhouettes dominate the upper frame and merge into a dark wall instead of framing the train with distinct foreground, midground and distant ridges.

## Reference comparison
Compared with `reference/tiny-astronaut-01.png` and `reference/tiny-astronaut-02.png`, which are stylized low-poly 3D frames, the references use more varied mountain scales, clearer near/far separation and a stronger lighting hierarchy around the subject. The train render's concrete gaps are depth, lighting and vehicle silhouette—not missing photographic texture.

## Motion check
Frames 420, 450 and 480 are nearly identical at a glance because fog hides the moving train. This violates the rule against three consecutive one-second samples with no legible motion.

## Technical issues
The round-1 still render and contact-sheet workflow completed successfully. The branch's subsequent CI run passed the strict TypeScript check after the JSX and geometry-attribute fixes.
