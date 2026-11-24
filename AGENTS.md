# AGENTS.md

For every video request, follow this exact sequence:

1. Plan the video in 5–8 lines: story, scenes, visual language, palette, motion, sound, and timing.
2. Write a NEW Remotion composition in `src/compositions/<slug>/`; do not route the idea through a JSON project pipeline.
3. Run `npm run check`.
4. Render stills at the start, middle, and end of EVERY scene with `npm run still -- <CompositionId> <frames>`.
5. Open and inspect the actual rendered images. If you cannot view images, say so and stop; never claim visual quality.
6. List concrete visual problems observed in those images (composition, legibility, motion pose, contrast, continuity, artifacts).
7. Fix the problems in code and render the same review stills again. Complete at least two fix rounds, inspecting each round's actual images.
8. Only after those inspections, run `npm run render -- <CompositionId>`.

Design rules:
- Animate with Remotion `spring()` and `interpolate()`; do not move static plates with camera motion alone.
- Stagger entrances, exits, and related actions so the frame has visual hierarchy.
- Make every scene visually distinct in framing, scale, palette, or visual technique.
- Do not keep large text persistently over footage.
- Keep all text readable at full-frame viewing size.
- Use a consistent, intentional color palette across the video.
- Every scene must contain real motion: character/action, environmental movement, camera movement motivated by action, particles, lighting, or animated graphics.
- Keep source code as the creative source of truth. Reuse small helpers only when they genuinely serve multiple compositions.
- Save stills from every fix round under `out/review/<CompositionId>/round-N/`.
