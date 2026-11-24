import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  extractRegisteredCompositionIds,
  resolveProductionPlanPath,
  validateRenderStrategyAgainstRequest,
} from "../scripts/validate-render-strategy.mjs";
import { COMPOSITION_REGISTRY, renderCompositionRegistryForPrompt } from "../scripts/director-compositions";

const rootSource = await readFile(new URL("../packages/video-engine/src/root.tsx", import.meta.url), "utf8");
const registered = extractRegisteredCompositionIds(rootSource);
const request = { compositionId: "ProjectVideo", projectPath: "projects/demo/scene.json" };
const plan = {
  renderStrategy: {
    renderer: "project-video",
    compositionId: "ProjectVideo",
    availability: "registered",
    rationale: "A structured 2D explainer is appropriate.",
    requiredCapabilities: ["layers", "keyframes"],
    fallback: "Build a custom composition if the requested visual language exceeds the schema.",
  },
};

test("composition catalogue entries are all registered in RemotionRoot", () => {
  assert.ok(COMPOSITION_REGISTRY.every((entry) => registered.includes(entry.id)));
});

test("resolves the conventional plan beside a project's scene file", () => {
  assert.equal(resolveProductionPlanPath(request), "projects/demo/production/production-plan.json");
  assert.equal(resolveProductionPlanPath({ compositionId: "MadridTrip" }), undefined);
  assert.equal(
    resolveProductionPlanPath({ productionPlanPath: "projects/custom-film/production/production-plan.json" }),
    "projects/custom-film/production/production-plan.json",
  );
});

test("accepts an explicitly selected registered composition matching the render request", () => {
  assert.deepEqual(validateRenderStrategyAgainstRequest({ request, plan, registeredCompositionIds: registered }), []);
});

test("rejects a render request that differs from the Director's chosen composition", () => {
  const errors = validateRenderStrategyAgainstRequest({
    request: { ...request, compositionId: "NarratedSkyExplainer" },
    plan,
    registeredCompositionIds: registered,
  });
  assert.ok(errors.some((error) => error.includes("does not match production-plan")));
});

test("rejects a composition proposed as to-be-built until it is implemented and registered", () => {
  const errors = validateRenderStrategyAgainstRequest({
    request,
    plan: { renderStrategy: { ...plan.renderStrategy, availability: "to-be-built" } },
    registeredCompositionIds: registered,
  });
  assert.ok(errors.some((error) => error.includes("to-be-built")));
});

test("rejects a composition ID not registered in RemotionRoot", () => {
  const errors = validateRenderStrategyAgainstRequest({
    request: { ...request, compositionId: "ImaginaryRenderer" },
    plan: { renderStrategy: { ...plan.renderStrategy, compositionId: "ImaginaryRenderer", renderer: "custom-remotion" } },
    registeredCompositionIds: registered,
  });
  assert.ok(errors.some((error) => error.includes("not registered")));
});

test("legacy projects without a production plan still receive composition-registration validation", () => {
  assert.deepEqual(validateRenderStrategyAgainstRequest({ request, plan: undefined, registeredCompositionIds: registered }), []);
});


test("rejects incomplete Director composition decisions", () => {
  const errors = validateRenderStrategyAgainstRequest({
    request,
    plan: { renderStrategy: { renderer: "project-video", compositionId: "ProjectVideo", availability: "registered" } },
    registeredCompositionIds: registered,
  });
  assert.ok(errors.some((error) => error.includes("rationale")));
  assert.ok(errors.some((error) => error.includes("required capabilities")));
  assert.ok(errors.some((error) => error.includes("fallback")));
});

test("composition catalogue and RemotionRoot contain exactly the same unique IDs", () => {
  const catalogueIds = COMPOSITION_REGISTRY.map((entry) => entry.id).sort();
  assert.equal(new Set(registered).size, registered.length, "RemotionRoot IDs must be unique");
  assert.equal(new Set(catalogueIds).size, catalogueIds.length, "catalogue IDs must be unique");
  assert.deepEqual(catalogueIds, [...registered].sort());
});

test("rejects a registered composition that is reference/test-only", () => {
  const errors = validateRenderStrategyAgainstRequest({
    request: { compositionId: "DemoVideo" },
    plan: { renderStrategy: { ...plan.renderStrategy, renderer: "custom-remotion", compositionId: "DemoVideo" } },
    registeredCompositionIds: registered,
  });
  assert.ok(errors.some((error) => error.includes("reference/testing only")));
});

test("rejects a Remotion-registered composition missing from the production catalogue", () => {
  const unknownId = "UncataloguedProductionFilm";
  const errors = validateRenderStrategyAgainstRequest({
    request: { compositionId: unknownId },
    plan: { renderStrategy: { ...plan.renderStrategy, renderer: "custom-remotion", compositionId: unknownId } },
    registeredCompositionIds: [...registered, unknownId],
  });
  assert.ok(errors.some((error) => error.includes("not present in the production composition catalogue")));
});

test("rejects a production strategy whose renderer conflicts with the selected catalogue entry", () => {
  const errors = validateRenderStrategyAgainstRequest({
    request,
    plan: { renderStrategy: { ...plan.renderStrategy, renderer: "custom-remotion" } },
    registeredCompositionIds: registered,
  });
  assert.ok(errors.some((error) => error.includes('Production-plan renderer must be "project-video"')));
});

test("accepts a newly added composition only when both registry and RemotionRoot contain it", () => {
  const newEntry = {
    id: "NewStormComposition",
    renderer: "custom-remotion",
    renderMode: "hybrid",
    selectable: true,
    purpose: "Project-specific storm repair narrative.",
    strengths: ["Custom scenes and original visual events."],
    limitations: ["Specialized to this project."],
  };
  const newPlan = {
    renderStrategy: {
      renderer: "custom-remotion",
      compositionId: "NewStormComposition",
      availability: "registered",
      rationale: "The project requires a dedicated, original composition.",
      requiredCapabilities: ["custom SVG scenes", "camera animation"],
      fallback: "Do not substitute an existing unrelated composition.",
    },
  };
  const accepted = validateRenderStrategyAgainstRequest({
    request: { compositionId: "NewStormComposition" },
    plan: newPlan,
    registeredCompositionIds: [...registered, newEntry.id],
    catalogue: [...COMPOSITION_REGISTRY, newEntry],
  });
  assert.deepEqual(accepted, []);

  const missingRegistration = validateRenderStrategyAgainstRequest({
    request: { compositionId: "NewStormComposition" },
    plan: newPlan,
    registeredCompositionIds: registered,
    catalogue: [...COMPOSITION_REGISTRY, newEntry],
  });
  assert.ok(missingRegistration.some((error) => error.includes("not registered in packages/video-engine/src/root.tsx")));
});


test("every production catalogue entry declares an explicit render mode", () => {
  for (const entry of COMPOSITION_REGISTRY) {
    assert.ok(["2d", "3d", "hybrid"].includes(entry.renderMode), `${entry.id} has renderMode=${String(entry.renderMode)}`);
  }
});

test("SVG-only compositions are routed as 2D while ThreeCanvas compositions declare WebGL modes", () => {
  const modes = new Map(COMPOSITION_REGISTRY.map(entry => [entry.id, entry.renderMode]));
  assert.equal(modes.get("JumpingCat"), "2d");
  assert.equal(modes.get("LighthouseRepairFilm"), "2d");
  assert.equal(modes.get("ProjectVideo"), "2d");
  assert.equal(modes.get("ThreeDShowcase"), "3d");
  assert.equal(modes.get("TinyAstronautCrystalCave"), "3d");
  assert.equal(modes.get("MadridNewYorkParis"), "hybrid");
  assert.equal(modes.get("MadridTrip"), "hybrid");
  assert.equal(modes.get("NarratedSkyExplainer"), "hybrid");
});

test("rejects a selected composition with missing or unsupported render mode metadata", () => {
  const withoutMode = COMPOSITION_REGISTRY.map(entry =>
    entry.id === "JumpingCat" ? { ...entry, renderMode: undefined } : entry
  );
  const errors = validateRenderStrategyAgainstRequest({
    request: { compositionId: "JumpingCat" },
    plan: undefined,
    registeredCompositionIds: registered,
    catalogue: withoutMode,
  });
  assert.ok(errors.some(error => error.includes("must declare renderMode")));
});


test("Director composition prompts include the render mode", () => {
  const prompt = renderCompositionRegistryForPrompt();
  assert.ok(prompt.includes("JumpingCat [custom-remotion; 2d; selectable]"));
  assert.ok(prompt.includes("TinyAstronautCrystalCave [custom-remotion; 3d; selectable]"));
  assert.ok(prompt.includes("MadridTrip [custom-remotion; hybrid; selectable]"));
});
