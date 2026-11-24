# Pre-animation / 3D asset visual review

## Asset format and review method
No standalone SVG or raster artwork files are used. The astronaut, lander, terrain, cave, shards and central crystal are original procedural Three.js geometry and materials authored in the dedicated Remotion composition. The repository's static image-asset preview utility does not inspect inline Three.js objects, so five stills of the actual composition were rendered at representative story frames.

## Review cycle 1 — initial stills
Rendered at frames 75, 210, 330, 450 and 575.
- Exterior and astronaut: recognizable stylized alien world, warm rust terrain, distant planet and moons.
- Cave / discovery / awakening: failed. A closed sphere blocked the camera and made the cavern and crystal almost entirely black.
- Correction: replaced the closed sphere with an open-front cavern (roof, side walls, back wall and broken rock shoulders), removed duplicate cave shell geometry and corrected camera yaw.

## Review cycle 2 — open cavern
- Cave became readable, with central cyan crystal, surrounding shards, cave walls and particles.
- Defect: astronaut lower body was clipped by the cave floor.
- Correction: lifted both cave-scene astronaut placements to ground level.

## Review cycle 3 — cave character
- Astronaut is fully visible beside the crystal and the reveal reads clearly.
- Defect: exterior astronaut appeared while the landing pod was still descending.
- Correction: lander descent now completes before the astronaut is introduced; landing supports were lengthened to meet the ground.

## Final visual inspection — candidate `3c91c215efd0bbd1ea1880aa7a61fccacbf628d0`
Rendered and visually inspected all five final still PNGs:
- `exterior-landing.png` (frame 75): lander is on its landing supports; astronaut has not appeared early; planet, moons and terrain establish scale.
- `astronaut-exploration.png` (frame 210): astronaut fully visible on the plain; silhouette, suit and reflective visor are readable.
- `cave-entry.png` (frame 330): open-front cavern is readable; character and luminous crystal are visible with atmospheric blue spill.
- `crystal-discovery.png` (frame 450): crystal facets and surrounding shards are visible; astronaut is fully visible beside it.
- `crystal-awakening.png` (frame 575): the crystal's bright core and cave light spill create a distinct final reveal; character remains unclipped.

## Disposition
<approved>Approved for full-motion render based on the five inspected still states.</approved>

This approval is limited to representative still compositions. The final MP4 must still be inspected for continuous motion, camera behavior, temporal continuity, technical metadata and any defects not represented by these five frames.

## First full-render attempt — runtime-only failure
- Render preflight, candidate freeze validation and composition registration all passed.
- The actual render failed at frame 0 because the custom Remotion render invocation did not select software WebGL on the GPU-less GitHub-hosted runner.
- The five scene still previews used `--gl=swangle` and rendered successfully. The render workflow is being corrected to use that same flag with concurrency 1 for all custom Remotion compositions.
- No MP4 was produced; no visual acceptance of a full video is claimed.


## Full-motion render audit — request 02 (2026-11-22)

- The MP4 from render run #45059287954 is 20.000 seconds, 1920×1080, 30 fps, H.264. It intentionally contains video only and no audio stream.
- The run failed in the old Media QA policy on two findings: missing audio stream and a 2.87-second frozen-video interval at approximately 3.0 seconds. The silent output matches the creative brief; after PR #146, missing audio and freeze intervals are informational and no longer invalidate a render. Black-video remains an error.
- Sampled 1-fps contact-sheet inspection shows the intended landing, exterior exploration, cave approach and crystal reveal. The post-touchdown hold is deliberate; it should not be given artificial animation solely to defeat a freeze detector.
- A source audit found two overlapping astronaut layers for frames 270–299. The mainline migration now makes the planet, cave-approach and crystal-awakening layers mutually exclusive and adds a frame-by-frame regression test. A corrected MP4 render is still required to verify the fix in motion.
- The previous still review remains limited to five representative frames; no end-to-end playback or audio listening was performed.
