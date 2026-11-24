# Migration plan

## Keep
- `packages/video-engine/src/scenes/MadridTrip/**` — proven travel composition and scene-specific map assets.
- `packages/video-engine/src/scenes/TinyAstronautCrystalCave.tsx` and `tinyAstronautPhases.ts` — quality-bar 3D scene and phase animation.
- Other working hand-written Remotion scenes — reusable creative work that remains useful as examples.
- Remotion components and rendering dependencies/configuration — required to register, preview, and render compositions.
- `packages/video-engine/public/**` and project asset directories — referenced images, SVGs, audio, and media used by compositions.
- `packages/video-engine/src/animation.ts` and `transitions.ts` — candidate motion helpers to retain or extract where they are actually reusable.
- Existing project source/assets and historical records — move non-core content to `/legacy` rather than destroying history.

## Archive to /legacy
- `PROGRESS_LOG.md`, `PROJECT_STATE.md`, and `ROADMAP.md` — process tracking documents, not needed by Remotion.
- Frozen-candidate / production-state / visual-review ledger material — evidence workflow is not part of the intended render loop.
- Provenance/evidence validators and their tests — remove from active render path while retaining history.
- Storyboard, asset-evidence, planning, and approval gates — prompt-to-code should not depend on structured approval stages.
- `schemas/**` and JSON composition/project/render-request pipeline — the new source of truth is hand-written Remotion code.
- Legacy scripts, tests, docs, agent skills, and studio UI tied only to orchestration — preserve for reference, not execution.
- Non-Remotion project JSON and production folders — retain as historical examples/assets without making them part of the render path.

## Delete
- Duplicate generated outputs, caches, and files proven unused after references are checked — no duplicate active implementation should remain.
- Obsolete CI workflows/status integrations after confirming the simple replacement CI works — the active CI should only typecheck and render one test still.
- No working quality-bar composition or referenced media is intentionally deleted.
