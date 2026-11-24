# Migration plan

## Keep
- `src/compositions/madrid-trip/**` — retained map flight and Eiffel sequence, used as a quality reference.
- `src/compositions/tiny-astronaut-crystal-cave/**` — retained 3D astronaut story, the second quality reference.
- Other hand-written Remotion compositions — preserved as source examples, whether registered by default or not.
- `src/shared/camera.ts`, `easing.ts`, `staggered-text.tsx`, `fade-transition.tsx`, `particles.tsx`, and `map-line.tsx` — small reusable motion pieces used by the active compositions.
- `public/**` — static assets used by compositions; the source public folder contained no tracked files at the start of migration.
- `src/Root.tsx`, Remotion config, and root dependencies — required to register and render compositions.

## Archive to /legacy
- `PROGRESS_LOG.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `START_HERE.md` — process history, not required for rendering.
- Former project/studio workspace, JSON project and render-request pipeline, manifests and production state — retained as historical reference only.
- Old `scripts/**`, `tests/**`, `tools/**`, `docs/**`, and `schemas/**` — specific to the old orchestration, validation and approval workflow.
- Old data-driven composition renderer and helpers formerly under `src/compositions/project-video/**`, `src/compositions/narrated-sky-explainer/**`, and `src/shared/**` — moved to `legacy/old-json-pipeline/**`; they are not in the active render path.
- Previous package workspace sources/configuration and agent instructions — retained for reference, superseded by the lean root project and current Remotion skills.

## Delete
- Duplicate old active source paths after their new copies are archived or moved — avoid maintaining two implementations.
- Obsolete CircleCI, render-request, final-delivery and preview workflows — they invoked the retired pipeline.
- No working quality-bar composition or source asset is intentionally discarded.
