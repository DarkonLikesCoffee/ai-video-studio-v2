# AI Video Studio — Remotion-first

## Commands
- `npm run check` — TypeScript check.
- `npm run still -- CompositionId 0,150,300` — render selected PNG frames to `out/review/`.
- `npm run sheet -- CompositionId` — render a contact sheet, about one frame per second.
- `npm run render -- CompositionId` — render an MP4 to `out/`.

## Structure
- `src/Root.tsx` registers compositions.
- `src/compositions/<slug>/` holds hand-written video scenes.
- `src/shared/` holds reusable animation pieces.
- `public/` holds static assets; `out/` is generated and gitignored.
- `legacy/` preserves the former orchestration system and project materials for reference.
