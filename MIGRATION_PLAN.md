# Migration plan

## Keep
- `src/compositions/madrid-trip/**` — existing Madrid-to-Paris map and Eiffel sequence is a proven authored Remotion composition and quality reference.
- `src/compositions/tiny-astronaut-crystal-cave/**` — existing 3D astronaut story is the other quality-bar composition.
- Remaining hand-written Remotion compositions — preserve useful authored examples, even when they are not registered by default.
- `src/shared/**` — small reusable animation, transition, SVG path, footage and narration helpers needed by retained code.
- `public/**` — static assets used by compositions; the initial source tree contained no tracked files in the former Remotion public folder.
- `remotion.config.ts`, root package dependencies and composition entry point — needed to render in Remotion.
- Original project artifacts and former engine sources — retain under `legacy/**` as historical reference.

## Archive to /legacy
- `PROGRESS_LOG.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `START_HERE.md` — process history and planning, not part of rendering.
- Existing agent playbooks and old Claude skill bundle — superseded by the short root AGENTS.md and official Remotion skills.
- Old studio app and workspace package — unnecessary for the prompt-to-composition renderer.
- Prior `scripts/**`, `tests/**`, and `tools/**` — tied to the JSON production system or review ledger.
- `docs/**` and `schemas/**` — describe the former process and structured pipeline.
- `projects/**`, render requests, status requests, and production manifests — legacy input format and project artifacts, not the new render path.
- Prior video engine package sources/configuration and CircleCI configuration — preserved while the active root project is simplified.

## Delete
- Duplicate old source paths after their new locations are committed — avoid two active copies of each composition.
- Obsolete CircleCI, render-request, final-delivery and preview workflows — they invoke the retired pipeline and must not be triggered in the new project.
- No working composition source or source asset is intentionally discarded.
