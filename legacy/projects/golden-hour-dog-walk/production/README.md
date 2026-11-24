# Golden Hour — production handoff

**Composition:** `ProjectVideo`  
**Delivery:** 20 seconds, 1920×1080, 30 fps, MP4  
**Visual assets:** Four original SVG plates in `assets/`  
**Audio:** Reused original project score plus three transition whooshes, staged by the render workflow.

The production plan and asset manifest are stored in `production/`. The plan maps five acceptance criteria to the four shots. The strict asset-evidence report checks the SVG and staged WAV files, provenance and rights metadata, and shot-to-manifest links; it does not prove the SVG composition is artistically successful.

For a later render request, use `compositionId: "ProjectVideo"`, `projectPath: "projects/golden-hour-dog-walk/scene.json"`, and preferably `productionPlanPath: "projects/golden-hour-dog-walk/production/production-plan.json"`. Create the request in a separate frozen-candidate request-only commit. This migration intentionally does not modify `render-request.json`.
