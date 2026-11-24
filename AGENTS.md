# AGENTS.md

For every video request, follow this sequence:

1. Before coding, write a per-scene plan naming the technique (Three.js or images + parallax) and why. Define a style string only when images are used; reuse it verbatim in every image prompt.
2. Image generation is optional. If it is unavailable, build the video with Three.js scenes and code overlays only, and say so in the plan. Do not stop for unavailable image generation.
3. Plan the story, scenes, palette, motion, sound, and timing.
4. Write a NEW Remotion composition in `src/compositions/<slug>/`. Put one substantial scene per file in `scenes/`, then sequence those scene components from `index.tsx`. Keep files focused and generally under about 150 lines.
5. Run `npm run check`.
6. Render stills at the start, middle, and end of EVERY scene. View the actual PNG frames (locally or through a GitHub Actions artifact) before judging them. The only stop condition is inability to VIEW rendered frames, and you may conclude that only after attempting the render-and-download workflow below.
7. Compare at least two frames from `reference/` next to your own stills when references are available. Write one sentence in the round's `problems.md` naming the biggest quality gap versus the references.
8. At the end of each review round, write `out/review/<CompositionId>/round-N/problems.md` with the three WORST AESTHETIC problems, ranked by impact, then copy that file and the stills into `review-log/<CompositionId>/round-N/` for the committed record. Technical bugs (black frames, missing elements, render errors) do not count toward these three; list them separately.
9. A round only counts if code changes address problem #1 or #2 from that round's list. Re-render the same scene coverage, inspect it, and complete at least two fix rounds.
10. After review rounds, always render the final MP4 with `npm run render -- <CompositionId>`, even when the user did not explicitly ask for a final render. Report the measured render time.

## Render and view without a local machine
- Push a commit to a `review/**` branch; the message must include `composition=ThreeSmoke frames=30 round=1 final=false` (replace values as needed).
- The `review.yml` push fallback reads those values and runs stills, a contact sheet, and optionally the final MP4.
- Wait for the Actions run, download its single artifact, and open the PNGs/contact sheet to inspect them.
- This connector cannot dispatch `workflow_dispatch`; use the `review/**` push trigger.

## Visual production rules

- Every scene must use at least two layers or objects moving at different speeds, one animated code overlay, real transitions, and one substantial scene file (not a five-line wrapper).
- Never draw scenery or characters as stacks of handmade SVG shapes. Choose Three.js (`@remotion/three` + `@react-three/fiber`) for real spatial depth, camera movement, and characters/props; choose generated imagery plus parallax for atmospheric and establishing scenes.
- Use a consistent style string across all image prompts in one video. Save generated images under `public/<slug>/` and view them before using them.
- If transparent layers cannot be generated, use one background image with `CameraPush` and animated overlays.
- Every scene needs real motion and a distinct composition, scale, palette, or visual technique. Keep all actions inside the scene duration and transitions.
- Each review round must include a technical-issues check for hard-edged shapes, boxes, seams in overlays, and visible beam edges. List technical issues separately from aesthetic rankings.
- Never say something looks good unless you viewed the actual rendered frames.

## Asset convention

- Store scene assets in `public/<slug>/`.
- Background: `<scene>-bg.jpg`, maximum 1920x1080 and approximately 500 KB.
- Optional transparent layers: `<scene>-mid.png` and `<scene>-fg.png`, each approximately 500 KB or less.
- If transparent layers are not available, use the background alone with parallax camera movement and overlays.

## Rendering and performance

- Use `--gl=swangle` for Remotion renders on GitHub Actions (CI); the render scripts apply this automatically when `process.env.CI` is set.
- Measure the actual MP4 render duration with `/usr/bin/time` on GitHub Actions and report the measured elapsed time.
- Performance budget: a 20-second 1080p video should render in a reasonable GitHub Actions runtime. If a scene exceeds the budget, simplify geometry, reduce lights/shadows, or switch that scene to generated imagery plus parallax.
- Keep Three.js geometry low-poly and light, with minimal shadows and no heavy post-processing.
- Avoid `Math.floor(frame / N)` hard cuts. Join scenes using real transitions from `@remotion/transitions`.
- Make motion purposeful; stagger entrances, exits, and related actions to establish hierarchy.

## Project commands and review records

- `npm run check` — TypeScript check.
- `npm run still -- <CompositionId> <frame,frame,...>` — render selected PNG frames.
- `npm run sheet -- <CompositionId>` — render a contact sheet.
- `npm run render -- <CompositionId>` — render an MP4.
- Save round stills and `problems.md` under `out/review/<CompositionId>/round-N/`; copy reviewed stills and notes to `review-log/<CompositionId>/round-N/`.
