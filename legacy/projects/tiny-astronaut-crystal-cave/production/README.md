# The Last Light — production handoff

**Composition:** `TinyAstronautCrystalCave`  
**Delivery:** 20 seconds, 1920×1080, 30 fps, MP4  
**Sound:** Intentionally silent. No audio track is required.

The composition uses original procedural Three.js geometry and materials for the lander, alien terrain, astronaut, open-front cave and emissive crystal. There are no standalone SVG or raster assets. The five still previews in CI render actual composition frames using software WebGL, and the visual-review record documents the earlier fixes.

The production plan is `production/production-plan.json`. For a future render request, set `compositionId: "TinyAstronautCrystalCave"` and `productionPlanPath: "projects/tiny-astronaut-crystal-cave/production/production-plan.json"`. The request must be a separate request-only commit after the final candidate is frozen. Do not reuse the old feature branch's render request.

CI also tests that the astronaut's planet, cave-approach and crystal-awakening layers are mutually exclusive at every frame.
