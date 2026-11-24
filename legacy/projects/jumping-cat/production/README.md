# A Cat's Little Leap — production handoff

Dedicated composition: `JumpingCat` (20 seconds, 1920×1080, 30 fps).

The project uses a procedural inline 2D SVG illustration with a single character performance: anticipation, repeated jumps, squash-and-stretch landings, tail movement and breeze-driven meadow layers. No text, music, narration or external visual assets are required.

The original brief, production plan and criterion-to-shot mappings are stored alongside this file. The sound bed is generated locally by `npm run assets:audio` at `packages/video-engine/public/audio/jumping-cat-wind.wav`.

For a render request, select `compositionId: "JumpingCat"` and explicitly link `productionPlanPath: "projects/jumping-cat/production/production-plan.json"`. The render-request file is deliberately not part of this feature migration; create a separate frozen-candidate request-only commit only after reviewing the exact candidate.
