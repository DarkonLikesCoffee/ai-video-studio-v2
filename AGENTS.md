# AGENTS.md

For every video request, follow this exact sequence:

1. Plan the story, scenes, visual language, palette, motion, sound, and timing in 5–8 lines.
2. Write a NEW Remotion composition in `src/compositions/<slug>/`. Put one scene per file in `scenes/`, then sequence those scene components from an `index.tsx`. Keep composition/scene files under about 150 lines; extract only genuinely reusable helpers.
3. Run `npm run check`.
4. Render stills at the start, middle, and end of EVERY scene with `npm run still -- <CompositionId> <frames>`.
5. Open and inspect the actual rendered images. If you cannot view images, say so and stop; never claim visual quality.
6. Compare at least two frames from `reference/` next to your own stills. Write one sentence in the round's `problems.md` naming the biggest quality gap versus the references.
7. At the end of each round, write `out/review/<CompositionId>/round-N/problems.md` with the three WORST AESTHETIC problems, ranked by impact, then copy that file and the stills into `review-log/<CompositionId>/round-N/` for the committed record: e.g. flat/lifeless scene, weak composition, no depth, dull lighting, stiff character. Technical bugs (black frames, missing elements, render errors) do not count toward these three; list them separately.
8. A round only counts if code changes address problem #1 or #2 from that round's list. Re-render the same scene coverage, inspect it, and complete at least two fix rounds.
9. Only after the review rounds, run `npm run render -- <CompositionId>`.

Structure and timing:
- Use one file per scene in `src/compositions/<slug>/scenes/` and an index file that sequences them.
- No single-file composition or scene files over approximately 150 lines.
- Join scenes with real transitions from `@remotion/transitions` (fade, slide, wipe, etc.). Never create scene changes using `Math.floor(frame / N)` hard cuts.
- Define scene length and its actions together. Every action must finish before its scene boundary/transition; do not cut motion off mid-action.
- Keep `spring()` and `interpolate()` motion purposeful; do not move static plates with camera motion alone.
- Stagger entrances, exits, and related actions to create visual hierarchy.
- Make every scene visually distinct in framing, scale, palette, or visual technique.
- Avoid large persistent text over footage; keep all text readable at full-frame size.
- Use a consistent, intentional palette and real motion in every scene.
- Save round stills and problems.md under `out/review/<CompositionId>/round-N/`.
- Never claim something looks good unless you viewed its actual rendered frames.
- If image viewing is unavailable, say so and stop rather than claiming a review.
