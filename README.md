# AI Video Studio — Remotion-first

## Commands
- `npm run check` — TypeScript check.
- `npm run still -- CompositionId 0,150,300` — render selected PNG frames to `out/review/`.
- `npm run sheet -- CompositionId` — render a contact sheet, about one frame per second.
- `npm run render -- CompositionId` — render an MP4 to `out/`.

## Structure
- `src/Root.tsx` registers compositions.
- `src/compositions/<slug>/` holds hand-written video scenes.
- `reference/` contains small quality-bar stills from the retained MadridTrip and TinyAstronautCrystalCave compositions for visual comparison.
- `src/shared/` holds reusable animation pieces.
- `public/` holds static assets; `out/` is generated and gitignored.
- `legacy/` preserves the former orchestration system and project materials for reference.

## Visual scene techniques

- Use Three.js (`@remotion/three` + `@react-three/fiber`) when real spatial depth, camera motion, or props/characters matter.
- Use generated images plus `ParallaxLayer` / `CameraPush` for atmospheric or establishing shots; do not draw scenery as SVG stacks.
- Shared scene utilities live in `src/shared/parallax.tsx`, `src/shared/overlays.tsx`, and `src/shared/three-scene.tsx`.
- Store generated assets under `public/<slug>/`: `<scene>-bg.jpg` (up to 1920x1080, about 500 KB max) and optional transparent `<scene>-mid.png` / `<scene>-fg.png` (about 500 KB max each). When transparent layers are unavailable, use one background with camera movement and overlays.
- Review image assets before composing; see `AGENTS.md` for the required style-string, scene plan, review, and rendering-performance process.

## Rendering 3D on CI

The project uses Remotion 4.0.544. Remotion documents `--gl=angle` for WebGL and warns that it fails on GPU-less GitHub Actions runners. In this repository, GitHub Actions also failed to create a WebGL context with `--gl=swiftshader` (Three.js reported `GL_VENDOR = Disabled`). CI therefore runs a minimal non-WebGL baseline still; 3D rendering must be reviewed on a runner with a working WebGL context. Do not treat a passing CI baseline as proof that Three.js renders. The desktop `remotion.config.ts` keeps its `angle` renderer.
