# The Stormlight Keeper

A wordless 24-second short film about a small service robot restoring an abandoned lighthouse during a storm.

## Production

- New, registered composition: `LighthouseRepairFilm`
- Six story beats: coastal approach, door entry, spiral climb, mechanical repair, beacon ignition, and a distant vessel finding the light
- Ten original SVG design studies, each rendered to PNG preview and visually inspected before animation; multiple assets were revised following visual review
- Original synthesized score and storm ambience
- Production plan, asset/provenance manifest, and shot-to-code audit

The final composition uses GPU-independent SVG and Remotion. A Three.js/WebGL draft was discarded after GitHub-hosted renderers failed to create a WebGL2 context.

## Render and QA status

- Render request 02 completed and produced a 24-second, 1920×1080, 30fps H.264 MP4 with 48kHz stereo AAC.
- Automated media QA passed overall, with one warning: a 1.6-second visual hold at the beginning of the lighthouse-door shot (4.0–5.6s). I visually inspected the contact sheet and individual frames and confirmed the hold was real.
- Render request 03 contains the correction: earlier door movement, gust-driven robot bracing and arm reach, and camera drift. Its MP4 and media-QA result still need final inspection before the production is considered complete.


## SVG study versus runtime rendering

The ten standalone SVGs in `assets/` are generated design studies. They were rendered to PNG previews and visually reviewed before the composition was animated. The current Remotion scene does **not** import those SVG files: it recreates the selected shapes as animated inline SVG groups and paths so the robot, door, mechanism, lens and camera can move independently. Their manifest entries are therefore tagged `usageRole: design-reference`, not runtime image dependencies. The audio files are runtime assets. The asset-evidence report checks file presence, path safety, provenance, rights and plan-to-manifest links; it does not prove that a design-reference file is imported by the component.
