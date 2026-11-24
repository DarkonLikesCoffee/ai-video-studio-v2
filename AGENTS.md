# AGENTS.md

For every video request, follow this exact sequence:

1. Before coding, write a one-line STYLE STRING and reuse it verbatim in every image prompt. Write a per-scene plan naming the technique (3D or images+parallax) and why.
2. Generate required images with the available image tool, save them under `public/<slug>/`, commit them, and VIEW each image before composing. If image generation or viewing is unavailable, say so and stop; do not substitute hand-drawn scenery.
3. Plan the story, scenes, palette, motion, sound, and timing.
4. Write a NEW Remotion composition in `src/compositions/<slug>/`. Put one substantial scene per file in `scenes/`, then sequence those scene components from `index.tsx`. Keep files focused and generally under about 150 lines.
5. Run `npm run check`.
6. Render stills at the start, middle, and end of EVERY scene. Open and inspect the actual rendered images. If you cannot view images, say so and stop; never claim visual quality.
7. Compare at least two frames from `reference/` next to your own stills. Write one sentence in the round's `problems.md` naming the biggest quality gap versus the references.
8. At the end of each review round, write `out/review/<CompositionId>/round-N/problems.md` with the three WORST AESTHETIC problems, ranked by impact, then copy that file and the stills into `review-log/<CompositionId>/round-N/` for the committed record. Technical bugs (black frames, missing elements, render errors) do not count toward these three; list them separately.
9. A round only counts if code changes address problem #1 or #2 from that round's list. Re-render the same scene coverage, inspect it, and complete at least two fix rounds.
10. Only after review rounds, run `npm run render -- <CompositionId>` when the user explicitly asks for final rendering.

## Visual production rules

- Every scene must use at least two layers or objects moving at different speeds, one animated code overlay, real transitions, and one substantial scene file (not a five-line wrapper).
- Never draw scenery or characters as stacks of handmade SVG shapes. Choose Three.js (`@remotion/three` + `@react-three/fiber`) for real spatial depth, camera movement, and characters/props; choose generated imagery plus parallax for atmospheric and establishing scenes.
- Use a consistent style string across all image prompts in one video. Save generated images under `public/<slug>/` and view them before using them.
- If transparent layers cannot be generated, use one background image with `CameraPush` and animated overlays.
- Every scene needs real motion and a distinct composition, scale, palette, or visual technique. Keep all actions inside the scene duration and transitions.
- Each review round must include a technical-issues check for hard-edged shapes, boxes, seams in overlays, and visible beam edges. List technical issues separately from aesthetic rankings.
- Never claim something looks good unless you viewed the actual rendered frames. If image generation or viewing is unavailable, stop rather than claiming a review.

## Asset convention

- Store scene assets in `public/<slug>/`.
- Background: `<scene>-bg.jpg`, maximum 1920x1080 and approximately 500 KB.
- Optional transparent layers: `<scene>-mid.png` and `<scene>-fg.png`, each approximately 500 KB or less.
- If transparent layers are not available, use the background alone with parallax camera movement and overlays.

## Rendering and performance

- Keep the GitHub Actions workflow minimal: install dependencies, run checks, and render one representative test still. Put multi-frame/manual review stills in a manually triggered workflow if needed.
- Remotion documents `angle` for WebGL on a desktop and warns it fails on GPU-less GitHub Actions runners. In this repository, `--gl=swiftshader` also failed to create a WebGL context (`GL_VENDOR = Disabled`). Keep the minimal CI still non-WebGL until a runner with working WebGL is available; never claim this validates Three.js rendering.
- Measure the 3D smoke still render on a runner with working WebGL and report the elapsed time; do not estimate it from local performance. This repository's current Actions runner disabled both `angle` and `swiftshader` WebGL context creation, so the 3D CI still is not measurable there. The non-WebGL baseline CI run took about 17s for its one-frame still (including bundle/startup); do not report this as a 3D measurement.
- Performance budget: a 20-second 1080p video should render in a reasonable GitHub Actions runtime. If a scene exceeds the budget, simplify geometry, reduce lights/shadows, or switch that scene to generated imagery plus parallax.
- Keep Three.js geometry low-poly and light, with minimal shadows and no heavy post-processing.
- Avoid `Math.floor(frame / N)` hard cuts. Join scenes using real transitions from `@remotion/transitions`.
- Make motion purposeful; stagger entrances, exits, and related actions to establish hierarchy.

## Project commands and review records

- `npm run check` — TypeScript check.
- `npm run still -- <CompositionId> <frames>` — render selected PNG frames.
- `npm run sheet -- <CompositionId>` — render a contact sheet.
- `npm run render -- <CompositionId>` — render an MP4.
- Save round stills and `problems.md` under `out/review/<CompositionId>/round-N/`; copy reviewed stills and notes to `review-log/<CompositionId>/round-N/`.
